/**
 * Excel upload service using SheetJS.
 * Reads an .xlsx file with sheets: projects, budget, milestones, issues.
 * Data is stored in localStorage so it survives page refresh.
 * Falls back to CSV files in /public/data/ when no Excel has been uploaded.
 */

import * as XLSX from 'xlsx';
import { ProjectSchema, type Project } from './schemas/project-schema';
import { BudgetLineSchema, type BudgetLine } from './schemas/budget-schema';
import { MilestoneSchema, type Milestone } from './schemas/milestone-schema';
import { IssueSchema, type Issue } from './schemas/issue-schema';

const STORAGE_KEY = 'bulk_dashboard_excel';
const HISTORY_KEY = 'bulk_dashboard_history';
const MAX_HISTORY = 20;

export interface ExcelData {
  projects: Record<string, string>[];
  budget: Record<string, string>[];
  milestones: Record<string, string>[];
  issues: Record<string, string>[];
  uploadedAt: string;
  fileName: string;
}

export interface HistoryEntry {
  id: string;
  fileName: string;
  uploadedAt: string;
}

export function getStoredExcelData(): ExcelData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ExcelData) : null;
  } catch {
    return null;
  }
}

export function clearStoredExcelData(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
}

// ─── History management ───────────────────────────────────────────────────────

export function getExcelHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function loadHistorySnapshot(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(`bulk_dashboard_snapshot_${id}`);
    if (!raw) return false;
    localStorage.setItem(STORAGE_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the ExcelData for the second-most-recent upload (the "previous report").
 * Used for automatic delta comparison on the portfolio view.
 */
export function getPreviousSnapshot(): ExcelData | null {
  const history = getExcelHistory();
  if (history.length < 2) return null;
  const prevEntry = history[1]; // [0] = newest, [1] = previous
  try {
    const raw = localStorage.getItem(`bulk_dashboard_snapshot_${prevEntry.id}`);
    return raw ? (JSON.parse(raw) as ExcelData) : null;
  } catch {
    return null;
  }
}

export function deleteHistoryEntry(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`bulk_dashboard_snapshot_${id}`);
  const history = getExcelHistory().filter((e) => e.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function saveToHistory(entry: HistoryEntry, data: ExcelData): void {
  localStorage.setItem(`bulk_dashboard_snapshot_${entry.id}`, JSON.stringify(data));
  const existing = getExcelHistory();
  const updated = [entry, ...existing].slice(0, MAX_HISTORY);
  // Clean up excess entries
  const keptIds = new Set(updated.map((e) => e.id));
  existing.forEach((e) => {
    if (!keptIds.has(e.id)) localStorage.removeItem(`bulk_dashboard_snapshot_${e.id}`);
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

// ─── Parse .xlsx file ─────────────────────────────────────────────────────────

function sheetToRows(wb: XLSX.WorkBook, sheetName: string): Record<string, string>[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false, // everything as strings so schemas can parse them
  });
  // trim all keys and stringify values
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.trim(), String(v ?? '').trim()])
    )
  );
}

export async function parseExcelFile(file: File): Promise<ExcelData> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false });

  const data: ExcelData = {
    projects: sheetToRows(wb, 'projects'),
    budget: sheetToRows(wb, 'budget'),
    milestones: sheetToRows(wb, 'milestones'),
    issues: sheetToRows(wb, 'issues'),
    uploadedAt: new Date().toISOString(),
    fileName: file.name,
  };

  if (data.projects.length === 0) {
    throw new Error(
      'Fant ingen data i "projects"-fanen. Sjekk at fanene heter: projects, budget, milestones, issues.'
    );
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  const historyEntry: HistoryEntry = {
    id: Date.now().toString(),
    fileName: file.name,
    uploadedAt: data.uploadedAt,
  };
  saveToHistory(historyEntry, data);

  return data;
}

// ─── Validate rows with Zod schemas ──────────────────────────────────────────

function parseRows<T>(
  rows: Record<string, string>[],
  schema: { safeParse: (d: unknown) => { success: true; data: T } | { success: false; error: unknown } }
): T[] {
  return rows.flatMap((row) => {
    const r = schema.safeParse(row);
    if (r.success) return [r.data];
    console.warn('Row validation failed:', r.error, row);
    return [];
  });
}

export function getProjectsFromExcel(data: ExcelData): Project[] {
  return parseRows(data.projects, ProjectSchema);
}

export function getBudgetFromExcel(data: ExcelData, projectId?: string): BudgetLine[] {
  const all = parseRows(data.budget, BudgetLineSchema);
  return projectId ? all.filter((b) => b.project_id === projectId) : all;
}

export function getMilestonesFromExcel(data: ExcelData, projectId?: string): Milestone[] {
  const all = parseRows(data.milestones, MilestoneSchema);
  return projectId ? all.filter((m) => m.project_id === projectId) : all;
}

export function getIssuesFromExcel(data: ExcelData, projectId?: string): Issue[] {
  const all = parseRows(data.issues, IssueSchema);
  return projectId ? all.filter((i) => i.project_id === projectId) : all;
}

// ─── Seed demo history (cut-off 2 weeks prior) ───────────────────────────────

/**
 * Seeds two demo history snapshots to simulate the cut-off workflow:
 *   history[0] = Rapport_03.02.26.xlsx  ← current active report
 *   history[1] = Rapport_20.01.26.xlsx  ← previous cut-off (2 weeks earlier)
 *
 * This mimics how the real flow works: uploading a new Excel pushes the
 * previous active snapshot into history, enabling delta comparison.
 * Safe to call multiple times – re-seeds only when the v3 seed is missing.
 */
export function seedDemoHistory(): void {
  if (typeof window === 'undefined') return;

  const NEW_ID = 'demo_seed_03feb26_v5';
  const OLD_ID = 'demo_seed_20jan26_v5';

  // Already seeded with this version
  if (localStorage.getItem(`bulk_dashboard_snapshot_${NEW_ID}`)) return;

  // Clean up any previous seed versions
  ['demo_history_20jan26', 'demo_history_20jan26_v2', 'demo_seed_20jan26', 'demo_seed_03feb26', 'demo_seed_03feb26_v3', 'demo_seed_20jan26_v3', 'demo_seed_03feb26_v4', 'demo_seed_20jan26_v4'].forEach((id) => {
    localStorage.removeItem(`bulk_dashboard_snapshot_${id}`);
  });

  // ── 20.01.26 snapshot (previous cut-off) ───────────────────────────────────
  const snapshotOld: ExcelData = {
    fileName: 'Rapport_20.01.26.xlsx',
    uploadedAt: new Date('2026-01-20T08:00:00Z').toISOString(),
    projects: [
      {
        project_id: 'NOVA-305', project_name: 'E01 Nova Edge 1',
        company: 'Bulk Infrastructure NOVA-305 AS', project_manager: 'Silje Rasmussen Vik',
        report_date: '20.01.26', overall_status: 'GREEN',
        time_status: 'According to plan', time_comment: 'All works progressing on programme. Steel fabrication on schedule with StructoFab AB. No critical path concerns identified.',
        cost_status: 'According to plan', cost_comment: 'Contract baseline 1.68 BNOK. EAC tracking at baseline. No approved change orders yet.',
        quality_status: 'According to plan', quality_comment: 'All QC inspections passing. No NCRs raised this period.',
        completion_rate: '20.6', variation_orders: '1',
        risk_comment: '1. HV connection agreement with Lnett pending.\n2. MEP design lead consultant workload high.',
        hs_injuries: '0|0', hs_near_misses: '51|0', hs_hipo: '1|0', hs_headcount: '19|0', hs_hours_worked: '14200|0',
        quality_punch_registered: '62|0', quality_punch_cleared: '55|0', quality_mc_inspections: '7|0', quality_deviations: '0|0',
      },
      {
        project_id: 'TITAN-202', project_name: 'S01 Titan Park 1',
        company: 'Bulk Infrastructure TITAN-202 AS', project_manager: 'Kristoffer Dahl Moe',
        report_date: '20.01.26', overall_status: 'GREEN',
        time_status: 'According to plan', time_comment: 'Structural concrete floors 1–3 completed ahead of schedule. Floors 4–6 now underway.',
        cost_status: 'According to plan', cost_comment: 'Contract baseline 2.10 BNOK. EAC tracking at baseline.',
        quality_status: 'According to plan', quality_comment: 'Concrete QC passing consistently.',
        completion_rate: '37.3', variation_orders: '5',
        risk_comment: '1. UPS redundancy scope change request under assessment.\n2. Grid operator Tensio permit processing — monitoring.',
        hs_injuries: '1|0', hs_near_misses: '163|0', hs_hipo: '3|0', hs_headcount: '28|0', hs_hours_worked: '46800|0',
        quality_punch_registered: '241|0', quality_punch_cleared: '218|0', quality_mc_inspections: '18|0', quality_deviations: '1|0',
      },
      {
        project_id: 'ORION-101', project_name: 'Orion Data Centre Phase 1',
        company: 'Bulk Infrastructure ORION-101 AS', project_manager: 'Marte Elise Solberg',
        report_date: '20.01.26', overall_status: 'YELLOW',
        time_status: 'According to plan', time_comment: 'Structural steel 65% complete. MEP rough-in commenced level 1.',
        cost_status: 'Minor overrun', cost_comment: 'EAC trending at 1.49 BNOK vs baseline 1.45 BNOK (+2.8%).',
        quality_status: 'According to plan', quality_comment: 'QC inspections passing. Minor punch points on cable tray tolerances.',
        completion_rate: '55.8', variation_orders: '11',
        risk_comment: '1. Facade cladding supplier flagging production delays.\n2. Cooling scope upgrade cost impact under assessment.',
        hs_injuries: '1|0', hs_near_misses: '378|0', hs_hipo: '7|0', hs_headcount: '44|0', hs_hours_worked: '78100|0',
        quality_punch_registered: '581|0', quality_punch_cleared: '543|0', quality_mc_inspections: '38|0', quality_deviations: '2|0',
      },
      {
        project_id: 'HELIOS-404', project_name: 'Helios Hyperscale Campus Ph1',
        company: 'Bulk Infrastructure HELIOS-404 AS', project_manager: 'Anders Bergström Haug',
        report_date: '20.01.26', overall_status: 'YELLOW',
        time_status: 'Minor delays', time_comment: 'Sub-contractor StålBygg AS has entered administration. Replacement tender underway.',
        cost_status: 'Minor overrun', cost_comment: 'Remobilisation costs estimated at NOK 95M. EAC revision in progress.',
        quality_status: 'According to plan', quality_comment: 'Structural QC paused during sub-contractor transition.',
        completion_rate: '8.9', variation_orders: '6',
        risk_comment: '1. Sub-contractor insolvency (StålBygg AS) — replacement tender underway.\n2. Cost overrun risk — EAC revision pending Board approval.',
        hs_injuries: '0|0', hs_near_misses: '14|0', hs_hipo: '0|0', hs_headcount: '9|0', hs_hours_worked: '4900|0',
        quality_punch_registered: '28|0', quality_punch_cleared: '19|0', quality_mc_inspections: '1|0', quality_deviations: '2|0',
      },
    ],
    budget: [
      { project_id: 'NOVA-305', budget_post: 'SUM - PROJECT COST', budget_nok: '1680000000', additional_nok: '0', budget_incl_additional_nok: '1680000000', paid_nok: '264400000', eac_nok: '1680000000' },
      { project_id: 'TITAN-202', budget_post: 'SUM - PROJECT COST', budget_nok: '2080000000', additional_nok: '0', budget_incl_additional_nok: '2080000000', paid_nok: '500900000', eac_nok: '2080000000' },
      { project_id: 'ORION-101', budget_post: 'SUM - PROJECT COST', budget_nok: '1400000000', additional_nok: '0', budget_incl_additional_nok: '1400000000', paid_nok: '497500000', eac_nok: '1490000000' },
      { project_id: 'HELIOS-404', budget_post: 'SUM - PROJECT COST', budget_nok: '2450000000', additional_nok: '0', budget_incl_additional_nok: '2450000000', paid_nok: '272900000', eac_nok: '2570000000' },
    ],
    milestones: [
      // HELIOS-404: milestones 1-6 done before 20.01.26
      { project_id: 'HELIOS-404', milestone_nr: '1', name: 'Project governance and organisation established', date: '2025-01-15', status: 'OK' },
      { project_id: 'HELIOS-404', milestone_nr: '2', name: 'Site acquisition and geotechnical survey complete', date: '2025-04-03', status: 'OK' },
      { project_id: 'HELIOS-404', milestone_nr: '3', name: 'Stage 2 concept design approved by Board', date: '2025-06-19', status: 'OK' },
      { project_id: 'HELIOS-404', milestone_nr: '4', name: 'Planning permission granted (rammesøknad)', date: '2025-09-08', status: 'OK' },
      { project_id: 'HELIOS-404', milestone_nr: '5', name: 'Main contractor (NordFabrikk Group) contract signed', date: '2025-10-30', status: 'OK' },
      { project_id: 'HELIOS-404', milestone_nr: '6', name: 'Site mobilisation and groundworks start', date: '2025-11-17', status: 'OK' },
      { project_id: 'HELIOS-404', milestone_nr: '7', name: 'Foundation and basement slab complete', date: '2026-02-20', status: 'MIDLERTIDIG' },
      { project_id: 'HELIOS-404', milestone_nr: '8', name: 'Structural frame floors 1–4 complete', date: '2026-06-12', status: 'MIDLERTIDIG' },
      { project_id: 'HELIOS-404', milestone_nr: '9', name: 'Structural frame floors 5–8 complete', date: '2026-09-04', status: 'MIDLERTIDIG' },
      { project_id: 'HELIOS-404', milestone_nr: '10', name: 'Building weathertight — facade and roof closed', date: '2026-11-27', status: 'MIDLERTIDIG' },
      { project_id: 'HELIOS-404', milestone_nr: '11', name: 'MEP rough-in complete all levels', date: '2027-03-05', status: 'MIDLERTIDIG' },
      { project_id: 'HELIOS-404', milestone_nr: '12', name: 'HV switchgear and generator yard energised', date: '2027-05-16', status: 'MIDLERTIDIG' },
      { project_id: 'HELIOS-404', milestone_nr: '13', name: 'Commissioning Phase 1 — 20 MW IT load ready', date: '2027-08-22', status: 'MIDLERTIDIG' },
      { project_id: 'HELIOS-404', milestone_nr: '14', name: 'Customer acceptance and handover Phase 1', date: '2027-10-10', status: 'MIDLERTIDIG' },
      // NOVA-305: milestone 7 (2026-01-26) not yet done as of 20.01.26
      { project_id: 'NOVA-305', milestone_nr: '1', name: 'Project governance and organisation established', date: '2025-03-10', status: 'OK' },
      { project_id: 'NOVA-305', milestone_nr: '2', name: 'Site selection and land acquisition complete', date: '2025-05-22', status: 'OK' },
      { project_id: 'NOVA-305', milestone_nr: '3', name: 'Geotechnical and environmental investigation complete', date: '2025-07-14', status: 'OK' },
      { project_id: 'NOVA-305', milestone_nr: '4', name: 'Concept design (Stage 2) approved by Board', date: '2025-09-04', status: 'OK' },
      { project_id: 'NOVA-305', milestone_nr: '5', name: 'Planning permission (rammesøknad) granted', date: '2025-11-28', status: 'OK' },
      { project_id: 'NOVA-305', milestone_nr: '6', name: 'Main contractor (NordFjord Bygg JV) contract signed', date: '2026-01-09', status: 'OK' },
      { project_id: 'NOVA-305', milestone_nr: '7', name: 'Site mobilisation and groundworks start', date: '2026-01-26', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '8', name: 'Piling and foundation works complete', date: '2026-05-08', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '9', name: 'Structural steel erection complete', date: '2026-09-18', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '10', name: 'Building weathertight — facade and roof closed', date: '2026-12-04', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '11', name: 'MEP rough-in complete all levels', date: '2027-02-19', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '12', name: 'HV switchgear and generator yard energised', date: '2027-04-10', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '13', name: 'Commissioning level 2 complete', date: '2027-05-23', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '14', name: 'Commissioning level 3 — integrated systems test', date: '2027-07-11', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '15', name: 'White Space ready — Phase 1 (12 MW IT load)', date: '2027-08-29', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '16', name: 'Customer acceptance and handover Phase 1', date: '2027-10-03', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '17', name: 'HV upgrade complete — full 30 MW available', date: '2028-01-16', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '18', name: 'White Space ready — full capacity Phase 2', date: '2028-04-25', status: 'MIDLERTIDIG' },
      // TITAN-202: milestone 8 (2026-02-06) not yet done as of 20.01.26
      { project_id: 'TITAN-202', milestone_nr: '1', name: 'Project kick-off and governance framework established', date: '2024-10-01', status: 'OK' },
      { project_id: 'TITAN-202', milestone_nr: '2', name: 'Site acquisition and geotechnical survey complete', date: '2025-01-14', status: 'OK' },
      { project_id: 'TITAN-202', milestone_nr: '3', name: 'Stage 2 concept design approved by Board', date: '2025-03-20', status: 'OK' },
      { project_id: 'TITAN-202', milestone_nr: '4', name: 'Planning permission granted (rammesøknad)', date: '2025-06-05', status: 'OK' },
      { project_id: 'TITAN-202', milestone_nr: '5', name: 'Main contractor (NordBuild Consortium) contract signed', date: '2025-08-22', status: 'OK' },
      { project_id: 'TITAN-202', milestone_nr: '6', name: 'Site mobilisation and groundworks start', date: '2025-09-15', status: 'OK' },
      { project_id: 'TITAN-202', milestone_nr: '7', name: 'Foundation and basement slab complete', date: '2025-12-12', status: 'OK' },
      { project_id: 'TITAN-202', milestone_nr: '8', name: 'Structural frame floors 1–3 complete', date: '2026-02-06', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '9', name: 'Structural frame floors 4–6 complete', date: '2026-04-18', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '10', name: 'Building weathertight — facade and roof closed', date: '2026-07-03', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '11', name: 'MEP rough-in complete all levels', date: '2026-09-11', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '12', name: 'Generator yard and HV switchgear energised (Phase 1 — 20 MW)', date: '2026-10-29', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '13', name: 'Commissioning level 2 complete', date: '2026-11-20', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '14', name: 'Commissioning level 3 — integrated systems test', date: '2027-01-08', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '15', name: 'White Space ready — Phase 1 (8 MW IT load)', date: '2027-02-14', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '16', name: 'Customer acceptance and handover Phase 1', date: '2027-03-28', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '17', name: 'HV upgrade complete — full 40 MW available', date: '2027-06-30', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '18', name: 'White Space ready — Phase 2 (full capacity)', date: '2027-09-15', status: 'MIDLERTIDIG' },
      // ORION-101: milestones 1-7 done before 20.01.26
      { project_id: 'ORION-101', milestone_nr: '1', name: 'Project kick-off and governance established', date: '2024-09-15', status: 'OK' },
      { project_id: 'ORION-101', milestone_nr: '2', name: 'Site survey and geotechnical investigation complete', date: '2024-11-30', status: 'OK' },
      { project_id: 'ORION-101', milestone_nr: '3', name: 'Concept design approved by Board', date: '2025-01-20', status: 'OK' },
      { project_id: 'ORION-101', milestone_nr: '4', name: 'Planning permission granted', date: '2025-04-10', status: 'OK' },
      { project_id: 'ORION-101', milestone_nr: '5', name: 'Main contractor EPCI contract signed', date: '2025-06-01', status: 'OK' },
      { project_id: 'ORION-101', milestone_nr: '6', name: 'Site mobilisation and groundworks start', date: '2025-07-14', status: 'OK' },
      { project_id: 'ORION-101', milestone_nr: '7', name: 'Foundation and basement slab complete', date: '2025-10-30', status: 'OK' },
      { project_id: 'ORION-101', milestone_nr: '8', name: 'Structural steel erection complete', date: '2026-02-27', status: 'MIDLERTIDIG' },
      { project_id: 'ORION-101', milestone_nr: '9', name: 'Building weathertight (facade and roof)', date: '2026-05-15', status: 'MIDLERTIDIG' },
      { project_id: 'ORION-101', milestone_nr: '10', name: 'MEP rough-in complete all levels', date: '2026-06-30', status: 'MIDLERTIDIG' },
      { project_id: 'ORION-101', milestone_nr: '11', name: 'Generator yard and HV switchgear energised', date: '2026-08-18', status: 'MIDLERTIDIG' },
      { project_id: 'ORION-101', milestone_nr: '12', name: 'Commissioning level 2 complete', date: '2026-09-25', status: 'MIDLERTIDIG' },
      { project_id: 'ORION-101', milestone_nr: '13', name: 'Commissioning level 3 - integrated systems test', date: '2026-11-10', status: 'MIDLERTIDIG' },
      { project_id: 'ORION-101', milestone_nr: '14', name: 'White Space ready - Phase 1 (10 MW IT load)', date: '2026-12-16', status: 'MIDLERTIDIG' },
      { project_id: 'ORION-101', milestone_nr: '15', name: 'Customer acceptance and handover', date: '2027-01-30', status: 'MIDLERTIDIG' },
    ],
    issues: [
      { project_id: 'HELIOS-404', issue_nr: '1', problem: 'Sub-contractor insolvency (StålBygg AS) — 9-week programme impact and remobilisation costs NOK 95M', handling_plan: 'StålBygg AS declared insolvency 12.12.2025. NordicSteel JV engaged as replacement 18.01.2026 via emergency tender. Remobilisation costs estimated NOK 95M. Productivity currently 30% below plan. Recovery programme to be submitted to Board 01.02.2026.', responsible: 'ABH', deadline: '2026-06-30' },
      { project_id: 'HELIOS-404', issue_nr: '2', problem: 'Cost overrun tracking at NOK 123M above baseline — contingency draw requested', handling_plan: 'EAC revision in progress. Overrun driven by sub-contractor insolvency (NOK 95M) and fire suppression scope change (NOK 28M). Total EAC estimated at 2.61 BNOK. Contingency of NOK 60M to be formally requested. Board approval for additional funding required.', responsible: 'ABH', deadline: '2026-03-15' },
      { project_id: 'HELIOS-404', issue_nr: '3', problem: 'Grid connection with Elvia stalled — revised load profile submission required', handling_plan: 'Elvia paused connection works 07.01.2026 following revised load profile increasing Phase 2 demand from 40 MW to 55 MW. New capacity assessment required (8–12 weeks). Risk of Phase 1 commissioning delay if assessment exceeds 10 weeks.', responsible: 'ABH', deadline: '2026-04-30' },
      { project_id: 'NOVA-305', issue_nr: '1', problem: 'Steel fabrication delay at StructoFab AB — impact on structural erection programme', handling_plan: 'StructoFab AB notified NordFjord Bygg JV 19.01.2026 of 4-week capacity reduction. Resequencing plan developed to absorb 2 weeks through overlapping works. Net programme impact assessed at 2 weeks. Decision on further mitigation pending.', responsible: 'SRV', deadline: '2026-04-30' },
      { project_id: 'NOVA-305', issue_nr: '2', problem: 'PFAS soil contamination identified on northern plot — NOK 38M scope addition', handling_plan: 'Multiconsult sampling confirmed PFAS contamination on 1.4 ha northern site. Remediation scope assessed at NOK 38M. Change order being prepared citing land vendor warranty provisions. Legal review initiated.', responsible: 'SRV', deadline: '2026-03-31' },
      { project_id: 'NOVA-305', issue_nr: '3', problem: 'HV connection agreement with Lnett not yet signed — 30 MW capacity at risk', handling_plan: 'Lnett indicated 30 MW HV upgrade approval delayed due to NVE permit backlog. Phase 1 at 12 MW unaffected. Phase 2 capacity at risk. Escalation to Lnett management being arranged.', responsible: 'ABN', deadline: '2026-06-30' },
      { project_id: 'NOVA-305', issue_nr: '4', problem: 'Lead MEP design engineer on extended sick leave — knowledge transfer risk', handling_plan: 'Lead MEP engineer placed on sick leave from 05.01.2026. Deputy engineer (Halvard Tveit) assigned. Knowledge transfer sessions underway. MEP design freeze extended 2 weeks to 28.02.2026.', responsible: 'SRV', deadline: '2026-02-28' },
      { project_id: 'NOVA-305', issue_nr: '5', problem: 'Main contractor programme baseline not yet formally accepted', handling_plan: 'NordFjord Bygg JV submitted Level 3 programme 16.01.2026. Bulk review identified 4 activities with insufficient float. Revision and resubmission requested. Acceptance target 14.02.2026.', responsible: 'PEK', deadline: '2026-02-14' },
      { project_id: 'TITAN-202', issue_nr: '1', problem: 'Cold-weather curing delay on structural concrete floors 4–6', handling_plan: 'Frost period causing extended curing times per NS-EN 13670. NordBuild submitted recovery plan proposing 6-day working weeks and supplemental heating. Plan under review by Bulk.', responsible: 'KDM', deadline: '2026-03-15' },
      { project_id: 'TITAN-202', issue_nr: '2', problem: 'Scope change request — UPS redundancy upgrade levels 3 and 4', handling_plan: 'HyperScale Nordic AS submitted formal change request 18.01.2026 to upgrade UPS redundancy from N to N+1. Preliminary cost assessment: NOK 55M. Fixed-price proposal being prepared. Schedule impact under assessment.', responsible: 'KDM', deadline: '2026-02-28' },
      { project_id: 'TITAN-202', issue_nr: '3', problem: 'HV connection upgrade by Tensio delayed by permit backlog', handling_plan: 'Tensio notified project 22.01.2026 of 8-week delay to HV substation permit due to NVE backlog. Phase 1 at 20 MW unaffected. Phase 2 at risk. Diesel bridging being assessed. Meeting with Tensio management to be arranged.', responsible: 'ABH', deadline: '2026-05-31' },
      { project_id: 'TITAN-202', issue_nr: '4', problem: 'Financial stability of structural sub-contractor ByggeNord AS', handling_plan: 'ByggeNord AS flagged cash-flow difficulties. Daily progress monitoring initiated. NordBuild placed on notice to activate contingency sub-contractor if needed.', responsible: 'KDM', deadline: '2026-03-01' },
      { project_id: 'ORION-101', issue_nr: '1', problem: 'Facade cladding supplier (AluForm GmbH) declared force majeure following factory fire', handling_plan: 'Alternative supplier being sourced. Revised delivery schedule expected to add 6 weeks. Resequencing plan under development to absorb delay on critical path. Cost impact estimated NOK 8–12M.', responsible: 'MES', deadline: '2026-03-15' },
      { project_id: 'ORION-101', issue_nr: '2', problem: 'Cooling system scope upgrade driving cost overrun', handling_plan: 'Cooling redundancy upgraded from N to N+1 across all IT halls. Budget increase approximately NOK 40M. Value engineering exercise initiated targeting NOK 30M in savings.', responsible: 'MES', deadline: '2026-02-28' },
      { project_id: 'ORION-101', issue_nr: '3', problem: 'Key commissioning engineer (external) resigned with 3 weeks notice', handling_plan: 'Lead commissioning engineer (Torsten Brandt, Technode GmbH) resigned January 2026. Interim support from OPS team. Recruitment underway — two candidates shortlisted.', responsible: 'KL', deadline: '2026-03-01' },
    ],
  };

  // ── 03.02.26 snapshot (current active report) ──────────────────────────────
  const snapshotNew: ExcelData = {
    fileName: 'Rapport_03.02.26.xlsx',
    uploadedAt: new Date('2026-02-03T08:00:00Z').toISOString(),
    projects: [
      {
        project_id: 'NOVA-305', project_name: 'E01 Nova Edge 1',
        company: 'Bulk Infrastructure NOVA-305 AS', project_manager: 'Silje Rasmussen Vik',
        report_date: '03.02.26', overall_status: 'YELLOW',
        time_status: 'Minor delays', time_comment: 'Groundworks and piling progressing well but 4-week delay on steel fabrication. Net impact 2 weeks on ITB milestone.',
        cost_status: 'YELLOW', cost_comment: 'EAC tracking at 1.73 BNOK (+3.0%). PFAS remediation NOK 38M change order submitted.',
        quality_status: 'According to plan', quality_comment: 'Civil and geotechnical QC passing. One NCR raised and corrected.',
        completion_rate: '35.2', variation_orders: '3',
        risk_comment: '1. Steel fabrication delay (StructoFab AB): 2-week net impact.\n2. PFAS soil contamination NOK 38M scope addition.\n3. HV connection agreement with Lnett not yet signed.',
        hs_injuries: '0|0', hs_near_misses: '84|0', hs_hipo: '1|0', hs_headcount: '26|0', hs_hours_worked: '28600|0',
        quality_punch_registered: '124|0', quality_punch_cleared: '108|0', quality_mc_inspections: '6|0', quality_deviations: '2|0',
      },
      {
        project_id: 'TITAN-202', project_name: 'S01 Titan Park 1',
        company: 'Bulk Infrastructure TITAN-202 AS', project_manager: 'Kristoffer Dahl Moe',
        report_date: '03.02.26', overall_status: 'YELLOW',
        time_status: 'Minor delays', time_comment: 'Concrete floors 4–6 running 3 weeks behind schedule. Recovery plan approved.',
        cost_status: 'YELLOW', cost_comment: 'EAC tracking at 2.18 BNOK (+3.8%). UPS scope change NOK 55M under negotiation.',
        quality_status: 'According to plan', quality_comment: 'Concrete QC passing. NCR for waterproofing on level B2 closed out.',
        completion_rate: '52.8', variation_orders: '7',
        risk_comment: '1. Cold-weather delay: 2-week net impact.\n2. UPS redundancy scope change under negotiation.\n3. Tensio grid connection permit at risk of 8-week delay.',
        hs_injuries: '2|0', hs_near_misses: '231|0', hs_hipo: '6|0', hs_headcount: '38|0', hs_hours_worked: '74800|0',
        quality_punch_registered: '387|0', quality_punch_cleared: '352|0', quality_mc_inspections: '22|0', quality_deviations: '3|0',
      },
      {
        project_id: 'ORION-101', project_name: 'Orion Data Centre Phase 1',
        company: 'Bulk Infrastructure ORION-101 AS', project_manager: 'Marte Elise Solberg',
        report_date: '03.02.26', overall_status: 'YELLOW',
        time_status: 'Minor delays', time_comment: 'Structural steel 80% complete. MEP rough-in started levels 1–3. Facade delayed 6 weeks.',
        cost_status: 'YELLOW', cost_comment: 'EAC tracking at 1.54 BNOK (+6.2%). Cost reduction plan targeting 30 MNOK.',
        quality_status: 'According to plan', quality_comment: 'QC inspections passing. Punch points on cable tray tolerances being actioned.',
        completion_rate: '71.4', variation_orders: '14',
        risk_comment: '1. AluForm GmbH force majeure — alternative supplier sourced, 6-week delay.\n2. Cooling system cost overrun risk 40 MNOK.\n3. Key commissioning engineer resigned.',
        hs_injuries: '1|0', hs_near_misses: '487|0', hs_hipo: '10|0', hs_headcount: '56|0', hs_hours_worked: '112400|0',
        quality_punch_registered: '798|0', quality_punch_cleared: '744|0', quality_mc_inspections: '52|0', quality_deviations: '4|0',
      },
      {
        project_id: 'HELIOS-404', project_name: 'Helios Hyperscale Campus Ph1',
        company: 'Bulk Infrastructure HELIOS-404 AS', project_manager: 'Anders Bergström Haug',
        report_date: '03.02.26', overall_status: 'RED',
        time_status: 'Critical delay', time_comment: 'Steel erection 11 weeks behind. NordicSteel JV mobilised but 30% below plan productivity.',
        cost_status: 'RED', cost_comment: 'EAC tracking at 2.61 BNOK (+6.5%). Contingency draw NOK 60M requested.',
        quality_status: 'YELLOW', quality_comment: 'Three NCRs raised for weld quality. MEP design coordination ongoing.',
        completion_rate: '24.1', variation_orders: '9',
        risk_comment: '1. Sub-contractor insolvency: 9-week net impact.\n2. Cost overrun NOK 123M — Board approval pending.\n3. Grid connection with Elvia stalled.\n4. Client formal notice of concern issued.',
        hs_injuries: '0|0', hs_near_misses: '31|0', hs_hipo: '0|0', hs_headcount: '18|0', hs_hours_worked: '16400|0',
        quality_punch_registered: '68|0', quality_punch_cleared: '55|0', quality_mc_inspections: '3|0', quality_deviations: '5|0',
      },
    ],
    budget: [
      { project_id: 'NOVA-305', budget_post: 'Building costs', budget_nok: '1120000000', additional_nok: '38000000', budget_incl_additional_nok: '1158000000', paid_nok: '187400000', eac_nok: '0' },
      { project_id: 'NOVA-305', budget_post: 'Outdoor areas', budget_nok: '22000000', additional_nok: '0', budget_incl_additional_nok: '22000000', paid_nok: '3100000', eac_nok: '0' },
      { project_id: 'NOVA-305', budget_post: 'General costs', budget_nok: '76000000', additional_nok: '0', budget_incl_additional_nok: '76000000', paid_nok: '19800000', eac_nok: '0' },
      { project_id: 'NOVA-305', budget_post: 'Technical infrastructure', budget_nok: '245000000', additional_nok: '0', budget_incl_additional_nok: '245000000', paid_nok: '28600000', eac_nok: '0' },
      { project_id: 'NOVA-305', budget_post: 'Land/area', budget_nok: '74000000', additional_nok: '0', budget_incl_additional_nok: '74000000', paid_nok: '74000000', eac_nok: '0' },
      { project_id: 'NOVA-305', budget_post: 'Finance cost', budget_nok: '21000000', additional_nok: '0', budget_incl_additional_nok: '21000000', paid_nok: '4900000', eac_nok: '0' },
      { project_id: 'NOVA-305', budget_post: 'Contingency', budget_nok: '122000000', additional_nok: '0', budget_incl_additional_nok: '122000000', paid_nok: '0', eac_nok: '0' },
      { project_id: 'NOVA-305', budget_post: 'SUM - PROJECT COST', budget_nok: '1680000000', additional_nok: '38000000', budget_incl_additional_nok: '1718000000', paid_nok: '317800000', eac_nok: '1730000000' },
      { project_id: 'TITAN-202', budget_post: 'Building costs', budget_nok: '1540000000', additional_nok: '55000000', budget_incl_additional_nok: '1595000000', paid_nok: '412800000', eac_nok: '0' },
      { project_id: 'TITAN-202', budget_post: 'Outdoor areas', budget_nok: '14000000', additional_nok: '0', budget_incl_additional_nok: '14000000', paid_nok: '1200000', eac_nok: '0' },
      { project_id: 'TITAN-202', budget_post: 'General costs', budget_nok: '98000000', additional_nok: '0', budget_incl_additional_nok: '98000000', paid_nok: '31400000', eac_nok: '0' },
      { project_id: 'TITAN-202', budget_post: 'Technical infrastructure', budget_nok: '178000000', additional_nok: '12000000', budget_incl_additional_nok: '190000000', paid_nok: '44700000', eac_nok: '0' },
      { project_id: 'TITAN-202', budget_post: 'Land/area', budget_nok: '62000000', additional_nok: '0', budget_incl_additional_nok: '62000000', paid_nok: '62000000', eac_nok: '0' },
      { project_id: 'TITAN-202', budget_post: 'Finance cost', budget_nok: '18000000', additional_nok: '0', budget_incl_additional_nok: '18000000', paid_nok: '5200000', eac_nok: '0' },
      { project_id: 'TITAN-202', budget_post: 'Contingency', budget_nok: '170000000', additional_nok: '0', budget_incl_additional_nok: '170000000', paid_nok: '0', eac_nok: '0' },
      { project_id: 'TITAN-202', budget_post: 'SUM - PROJECT COST', budget_nok: '2080000000', additional_nok: '67000000', budget_incl_additional_nok: '2147000000', paid_nok: '557300000', eac_nok: '2180000000' },
      { project_id: 'ORION-101', budget_post: 'Building costs', budget_nok: '980000000', additional_nok: '42000000', budget_incl_additional_nok: '1022000000', paid_nok: '385600000', eac_nok: '0' },
      { project_id: 'ORION-101', budget_post: 'Outdoor areas', budget_nok: '18000000', additional_nok: '0', budget_incl_additional_nok: '18000000', paid_nok: '4200000', eac_nok: '0' },
      { project_id: 'ORION-101', budget_post: 'General costs', budget_nok: '85000000', additional_nok: '0', budget_incl_additional_nok: '85000000', paid_nok: '38750000', eac_nok: '0' },
      { project_id: 'ORION-101', budget_post: 'Technical infrastructure', budget_nok: '210000000', additional_nok: '14000000', budget_incl_additional_nok: '224000000', paid_nok: '96800000', eac_nok: '0' },
      { project_id: 'ORION-101', budget_post: 'Land/area', budget_nok: '28000000', additional_nok: '0', budget_incl_additional_nok: '28000000', paid_nok: '28000000', eac_nok: '0' },
      { project_id: 'ORION-101', budget_post: 'Finance cost', budget_nok: '15000000', additional_nok: '0', budget_incl_additional_nok: '15000000', paid_nok: '6100000', eac_nok: '0' },
      { project_id: 'ORION-101', budget_post: 'Contingency', budget_nok: '64000000', additional_nok: '0', budget_incl_additional_nok: '64000000', paid_nok: '0', eac_nok: '0' },
      { project_id: 'ORION-101', budget_post: 'SUM - PROJECT COST', budget_nok: '1400000000', additional_nok: '56000000', budget_incl_additional_nok: '1456000000', paid_nok: '559450000', eac_nok: '1540000000' },
      { project_id: 'HELIOS-404', budget_post: 'Building costs', budget_nok: '1780000000', additional_nok: '95000000', budget_incl_additional_nok: '1875000000', paid_nok: '198400000', eac_nok: '0' },
      { project_id: 'HELIOS-404', budget_post: 'Outdoor areas', budget_nok: '26000000', additional_nok: '0', budget_incl_additional_nok: '26000000', paid_nok: '2800000', eac_nok: '0' },
      { project_id: 'HELIOS-404', budget_post: 'General costs', budget_nok: '112000000', additional_nok: '0', budget_incl_additional_nok: '112000000', paid_nok: '22100000', eac_nok: '0' },
      { project_id: 'HELIOS-404', budget_post: 'Technical infrastructure', budget_nok: '298000000', additional_nok: '28000000', budget_incl_additional_nok: '326000000', paid_nok: '19600000', eac_nok: '0' },
      { project_id: 'HELIOS-404', budget_post: 'Land/area', budget_nok: '88000000', additional_nok: '0', budget_incl_additional_nok: '88000000', paid_nok: '88000000', eac_nok: '0' },
      { project_id: 'HELIOS-404', budget_post: 'Finance cost', budget_nok: '34000000', additional_nok: '0', budget_incl_additional_nok: '34000000', paid_nok: '6900000', eac_nok: '0' },
      { project_id: 'HELIOS-404', budget_post: 'Contingency', budget_nok: '112000000', additional_nok: '0', budget_incl_additional_nok: '112000000', paid_nok: '0', eac_nok: '0' },
      { project_id: 'HELIOS-404', budget_post: 'SUM - PROJECT COST', budget_nok: '2450000000', additional_nok: '123000000', budget_incl_additional_nok: '2573000000', paid_nok: '337800000', eac_nok: '2610000000' },
    ],
    milestones: [
      // HELIOS-404: same status as old snapshot (no new milestones completed)
      { project_id: 'HELIOS-404', milestone_nr: '1', name: 'Project governance and organisation established', date: '2025-01-15', status: 'OK' },
      { project_id: 'HELIOS-404', milestone_nr: '2', name: 'Site acquisition and geotechnical survey complete', date: '2025-04-03', status: 'OK' },
      { project_id: 'HELIOS-404', milestone_nr: '3', name: 'Stage 2 concept design approved by Board', date: '2025-06-19', status: 'OK' },
      { project_id: 'HELIOS-404', milestone_nr: '4', name: 'Planning permission granted (rammesøknad)', date: '2025-09-08', status: 'OK' },
      { project_id: 'HELIOS-404', milestone_nr: '5', name: 'Main contractor (NordFabrikk Group) contract signed', date: '2025-10-30', status: 'OK' },
      { project_id: 'HELIOS-404', milestone_nr: '6', name: 'Site mobilisation and groundworks start', date: '2025-11-17', status: 'OK' },
      { project_id: 'HELIOS-404', milestone_nr: '7', name: 'Foundation and basement slab complete', date: '2026-02-20', status: 'MIDLERTIDIG' },
      { project_id: 'HELIOS-404', milestone_nr: '8', name: 'Structural frame floors 1–4 complete', date: '2026-06-12', status: 'MIDLERTIDIG' },
      { project_id: 'HELIOS-404', milestone_nr: '9', name: 'Structural frame floors 5–8 complete', date: '2026-09-04', status: 'MIDLERTIDIG' },
      { project_id: 'HELIOS-404', milestone_nr: '10', name: 'Building weathertight — facade and roof closed', date: '2026-11-27', status: 'MIDLERTIDIG' },
      { project_id: 'HELIOS-404', milestone_nr: '11', name: 'MEP rough-in complete all levels', date: '2027-03-05', status: 'MIDLERTIDIG' },
      { project_id: 'HELIOS-404', milestone_nr: '12', name: 'HV switchgear and generator yard energised', date: '2027-05-16', status: 'MIDLERTIDIG' },
      { project_id: 'HELIOS-404', milestone_nr: '13', name: 'Commissioning Phase 1 — 20 MW IT load ready', date: '2027-08-22', status: 'MIDLERTIDIG' },
      { project_id: 'HELIOS-404', milestone_nr: '14', name: 'Customer acceptance and handover Phase 1', date: '2027-10-10', status: 'MIDLERTIDIG' },
      // NOVA-305: milestone 7 now completed (2026-01-26 is before 03.02.26)
      { project_id: 'NOVA-305', milestone_nr: '1', name: 'Project governance and organisation established', date: '2025-03-10', status: 'OK' },
      { project_id: 'NOVA-305', milestone_nr: '2', name: 'Site selection and land acquisition complete', date: '2025-05-22', status: 'OK' },
      { project_id: 'NOVA-305', milestone_nr: '3', name: 'Geotechnical and environmental investigation complete', date: '2025-07-14', status: 'OK' },
      { project_id: 'NOVA-305', milestone_nr: '4', name: 'Concept design (Stage 2) approved by Board', date: '2025-09-04', status: 'OK' },
      { project_id: 'NOVA-305', milestone_nr: '5', name: 'Planning permission (rammesøknad) granted', date: '2025-11-28', status: 'OK' },
      { project_id: 'NOVA-305', milestone_nr: '6', name: 'Main contractor (NordFjord Bygg JV) contract signed', date: '2026-01-09', status: 'OK' },
      { project_id: 'NOVA-305', milestone_nr: '7', name: 'Site mobilisation and groundworks start', date: '2026-01-26', status: 'OK' },
      { project_id: 'NOVA-305', milestone_nr: '8', name: 'Piling and foundation works complete', date: '2026-05-08', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '9', name: 'Structural steel erection complete', date: '2026-09-18', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '10', name: 'Building weathertight — facade and roof closed', date: '2026-12-04', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '11', name: 'MEP rough-in complete all levels', date: '2027-02-19', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '12', name: 'HV switchgear and generator yard energised', date: '2027-04-10', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '13', name: 'Commissioning level 2 complete', date: '2027-05-23', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '14', name: 'Commissioning level 3 — integrated systems test', date: '2027-07-11', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '15', name: 'White Space ready — Phase 1 (12 MW IT load)', date: '2027-08-29', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '16', name: 'Customer acceptance and handover Phase 1', date: '2027-10-03', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '17', name: 'HV upgrade complete — full 30 MW available', date: '2028-01-16', status: 'MIDLERTIDIG' },
      { project_id: 'NOVA-305', milestone_nr: '18', name: 'White Space ready — full capacity Phase 2', date: '2028-04-25', status: 'MIDLERTIDIG' },
      // TITAN-202: milestone 8 now completed (2026-02-06 is before 03.02.26)
      { project_id: 'TITAN-202', milestone_nr: '1', name: 'Project kick-off and governance framework established', date: '2024-10-01', status: 'OK' },
      { project_id: 'TITAN-202', milestone_nr: '2', name: 'Site acquisition and geotechnical survey complete', date: '2025-01-14', status: 'OK' },
      { project_id: 'TITAN-202', milestone_nr: '3', name: 'Stage 2 concept design approved by Board', date: '2025-03-20', status: 'OK' },
      { project_id: 'TITAN-202', milestone_nr: '4', name: 'Planning permission granted (rammesøknad)', date: '2025-06-05', status: 'OK' },
      { project_id: 'TITAN-202', milestone_nr: '5', name: 'Main contractor (NordBuild Consortium) contract signed', date: '2025-08-22', status: 'OK' },
      { project_id: 'TITAN-202', milestone_nr: '6', name: 'Site mobilisation and groundworks start', date: '2025-09-15', status: 'OK' },
      { project_id: 'TITAN-202', milestone_nr: '7', name: 'Foundation and basement slab complete', date: '2025-12-12', status: 'OK' },
      { project_id: 'TITAN-202', milestone_nr: '8', name: 'Structural frame floors 1–3 complete', date: '2026-02-06', status: 'OK' },
      { project_id: 'TITAN-202', milestone_nr: '9', name: 'Structural frame floors 4–6 complete', date: '2026-04-18', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '10', name: 'Building weathertight — facade and roof closed', date: '2026-07-03', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '11', name: 'MEP rough-in complete all levels', date: '2026-09-11', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '12', name: 'Generator yard and HV switchgear energised (Phase 1 — 20 MW)', date: '2026-10-29', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '13', name: 'Commissioning level 2 complete', date: '2026-11-20', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '14', name: 'Commissioning level 3 — integrated systems test', date: '2027-01-08', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '15', name: 'White Space ready — Phase 1 (8 MW IT load)', date: '2027-02-14', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '16', name: 'Customer acceptance and handover Phase 1', date: '2027-03-28', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '17', name: 'HV upgrade complete — full 40 MW available', date: '2027-06-30', status: 'MIDLERTIDIG' },
      { project_id: 'TITAN-202', milestone_nr: '18', name: 'White Space ready — Phase 2 (full capacity)', date: '2027-09-15', status: 'MIDLERTIDIG' },
      // ORION-101: same as old snapshot
      { project_id: 'ORION-101', milestone_nr: '1', name: 'Project kick-off and governance established', date: '2024-09-15', status: 'OK' },
      { project_id: 'ORION-101', milestone_nr: '2', name: 'Site survey and geotechnical investigation complete', date: '2024-11-30', status: 'OK' },
      { project_id: 'ORION-101', milestone_nr: '3', name: 'Concept design approved by Board', date: '2025-01-20', status: 'OK' },
      { project_id: 'ORION-101', milestone_nr: '4', name: 'Planning permission granted', date: '2025-04-10', status: 'OK' },
      { project_id: 'ORION-101', milestone_nr: '5', name: 'Main contractor EPCI contract signed', date: '2025-06-01', status: 'OK' },
      { project_id: 'ORION-101', milestone_nr: '6', name: 'Site mobilisation and groundworks start', date: '2025-07-14', status: 'OK' },
      { project_id: 'ORION-101', milestone_nr: '7', name: 'Foundation and basement slab complete', date: '2025-10-30', status: 'OK' },
      { project_id: 'ORION-101', milestone_nr: '8', name: 'Structural steel erection complete', date: '2026-02-27', status: 'MIDLERTIDIG' },
      { project_id: 'ORION-101', milestone_nr: '9', name: 'Building weathertight (facade and roof)', date: '2026-05-15', status: 'MIDLERTIDIG' },
      { project_id: 'ORION-101', milestone_nr: '10', name: 'MEP rough-in complete all levels', date: '2026-06-30', status: 'MIDLERTIDIG' },
      { project_id: 'ORION-101', milestone_nr: '11', name: 'Generator yard and HV switchgear energised', date: '2026-08-18', status: 'MIDLERTIDIG' },
      { project_id: 'ORION-101', milestone_nr: '12', name: 'Commissioning level 2 complete', date: '2026-09-25', status: 'MIDLERTIDIG' },
      { project_id: 'ORION-101', milestone_nr: '13', name: 'Commissioning level 3 - integrated systems test', date: '2026-11-10', status: 'MIDLERTIDIG' },
      { project_id: 'ORION-101', milestone_nr: '14', name: 'White Space ready - Phase 1 (10 MW IT load)', date: '2026-12-16', status: 'MIDLERTIDIG' },
      { project_id: 'ORION-101', milestone_nr: '15', name: 'Customer acceptance and handover', date: '2027-01-30', status: 'MIDLERTIDIG' },
    ],
    issues: [
      { project_id: 'HELIOS-404', issue_nr: '1', problem: 'Sub-contractor insolvency (StålBygg AS) — 9-week programme impact and remobilisation costs NOK 95M', handling_plan: 'StålBygg AS declared insolvency 12.12.2025. NordicSteel JV engaged as replacement 18.01.2026 via emergency tender. Remobilisation costs NOK 95M. Recovery programme submitted to Board 01.02.2026. Productivity 30% below plan — monitoring weekly.', responsible: 'ABH', deadline: '2026-06-30' },
      { project_id: 'HELIOS-404', issue_nr: '2', problem: 'Cost overrun tracking at NOK 123M above baseline — contingency draw requested', handling_plan: 'EAC revision completed 30.01.2026. Overrun driven by sub-contractor insolvency (NOK 95M) and fire suppression scope change (NOK 28M). Total EAC now 2.61 BNOK. Contingency reserve NOK 60M formally requested. Board approval for additional NOK 63M required.', responsible: 'ABH', deadline: '2026-03-15' },
      { project_id: 'HELIOS-404', issue_nr: '3', problem: 'Grid connection with Elvia stalled — revised load profile submission required', handling_plan: 'Elvia paused connection works 07.01.2026 following revised load profile (Phase 2 demand up from 40 MW to 55 MW). New capacity assessment required (8–12 weeks). Risk of Phase 1 commissioning delay if assessment exceeds 10 weeks.', responsible: 'ABH', deadline: '2026-04-30' },
      { project_id: 'HELIOS-404', issue_nr: '4', problem: 'Client issued formal notice of schedule concern — relationship risk', handling_plan: 'NordCloud AS issued formal notice 29.01.2026 citing 9-week programme slip. Recovery plan with milestones requested by 14.02.2026. Legal review of liquidated damages clause ongoing (LD rate: NOK 500K/day). Engagement meeting with customer technical director scheduled 10.02.2026.', responsible: 'ABH', deadline: '2026-02-14' },
      { project_id: 'NOVA-305', issue_nr: '1', problem: 'Steel fabrication delay at StructoFab AB — impact on structural erection programme', handling_plan: 'StructoFab AB notified NordFjord Bygg JV 19.01.2026 of 4-week capacity reduction. Resequencing plan approved by Bulk. StructoFab confirmed first steel delivery from revised schedule 12.03.2026. Net programme impact 2 weeks. Monitoring weekly.', responsible: 'SRV', deadline: '2026-04-30' },
      { project_id: 'NOVA-305', issue_nr: '2', problem: 'PFAS soil contamination identified on northern plot — NOK 38M scope addition', handling_plan: 'PFAS contamination confirmed on 1.4 ha northern site. Remediation scope NOK 38M. Change order submitted 28.01.2026 — land vendor engaged their own advisor. Remediation tender issued to three contractors to avoid programme delay.', responsible: 'SRV', deadline: '2026-03-31' },
      { project_id: 'NOVA-305', issue_nr: '3', problem: 'HV connection agreement with Lnett not yet signed — 30 MW capacity at risk', handling_plan: 'Escalation meeting with Lnett held 01.02.2026. NVE permit submission confirmed received and under review. Exploring temporary diesel bridging (NOK 4–7M) as mitigation for Phase 2 gap.', responsible: 'ABN', deadline: '2026-06-30' },
      { project_id: 'NOVA-305', issue_nr: '4', problem: 'Lead MEP design engineer on extended sick leave — knowledge transfer risk', handling_plan: 'Lead MEP engineer on sick leave from 05.01.2026. Deputy (Halvard Tveit) assigned. Additional review sessions scheduled with Bulk MEP specialist. Design freeze deadline extended 2 weeks to 28.02.2026.', responsible: 'SRV', deadline: '2026-02-28' },
      { project_id: 'NOVA-305', issue_nr: '5', problem: 'Main contractor programme baseline not yet formally accepted', handling_plan: 'Revised programme submitted 31.01.2026. Bulk review in progress — acceptance expected by 14.02.2026.', responsible: 'PEK', deadline: '2026-02-14' },
      { project_id: 'NOVA-305', issue_nr: '6', problem: 'NCR — compaction layer thickness in eastern access road sub-base', handling_plan: 'QC inspection 22.01.2026 identified sub-base thickness deviation (220mm vs required 300mm) over ~180m. NCR NOV-NCR-0003 raised. Full removal and re-compaction completed. Re-inspected and passed 29.01.2026. NCR closed — no programme impact.', responsible: 'PEK', deadline: '2026-01-29' },
      { project_id: 'TITAN-202', issue_nr: '1', problem: 'Cold-weather curing delay on structural concrete floors 4–6', handling_plan: 'Recovery plan approved 03.02.2026. Extended shifts (6 days/week) and supplemental heating approved. Net impact reduced from 3 to 2 weeks. Concrete pours on floor 4 resumed. Monitoring closely.', responsible: 'KDM', deadline: '2026-03-15' },
      { project_id: 'TITAN-202', issue_nr: '2', problem: 'Scope change request — UPS redundancy upgrade levels 3 and 4', handling_plan: 'HyperScale Nordic AS requested N to N+1 UPS upgrade. Preliminary cost NOK 55M. Cost proposal submitted to customer 01.02.2026. Awaiting acceptance. Potential 3-week schedule impact on White Space ready date.', responsible: 'KDM', deadline: '2026-02-28' },
      { project_id: 'TITAN-202', issue_nr: '3', problem: 'HV connection upgrade by Tensio delayed by permit backlog', handling_plan: 'Escalation letter sent to Tensio and NVE. Phase 1 at 20 MW unaffected. Phase 2 at risk. Diesel bridging cost estimated NOK 6–9M — within contingency. Senior management meeting scheduled 20.02.2026.', responsible: 'ABH', deadline: '2026-05-31' },
      { project_id: 'TITAN-202', issue_nr: '4', problem: 'Financial stability of structural sub-contractor ByggeNord AS', handling_plan: 'ByggeNord AS flagged cash-flow difficulties. Daily monitoring initiated. NordBuild placed on notice to activate contingency sub-contractor if required.', responsible: 'KDM', deadline: '2026-03-01' },
      { project_id: 'TITAN-202', issue_nr: '5', problem: 'Waterproofing membrane NCR on level B2', handling_plan: 'NCR TIT-NCR-0014 raised 14.01.2026. Non-compliant membrane on 420m² B2 slab. Rework completed 27.01.2026. Re-inspection passed 30.01.2026. NCR closed — no programme impact.', responsible: 'PLA', deadline: '2026-01-30' },
      { project_id: 'TITAN-202', issue_nr: '6', problem: 'BIM coordination — 12 open MEP clashes pending resolution', handling_plan: '12 active clashes between HVAC ductwork and cable tray on levels 2–3. VVS-Gruppen AS and ElNord AS given resolution deadline 14.02.2026. No physical works affected — physical installation 6 weeks away.', responsible: 'PLA', deadline: '2026-02-14' },
      { project_id: 'ORION-101', issue_nr: '1', problem: 'Facade cladding supplier (AluForm GmbH) declared force majeure following factory fire', handling_plan: 'Contract with PolyFacade SA (Gdansk) signed. New delivery schedule confirmed. Programme impact absorbed through resequencing. Cost delta finalised at NOK 9.4M — covered by contingency.', responsible: 'MES', deadline: '2026-03-15' },
      { project_id: 'ORION-101', issue_nr: '2', problem: 'Cooling system scope upgrade driving cost overrun', handling_plan: 'Value engineering workshop completed. Savings of NOK 22M identified. Remaining gap of NOK 18M covered by contingency. EAC revised to 1.54 BNOK.', responsible: 'MES', deadline: '2026-02-28' },
      { project_id: 'ORION-101', issue_nr: '3', problem: 'Key commissioning engineer (external) resigned with 3 weeks notice', handling_plan: 'Candidate selected, offer accepted. Start date 01.03.2026. Knowledge transfer plan in place with OPS interim team.', responsible: 'KL', deadline: '2026-03-01' },
    ],
  };

  // Save both snapshot blobs
  localStorage.setItem(`bulk_dashboard_snapshot_${OLD_ID}`, JSON.stringify(snapshotOld));
  localStorage.setItem(`bulk_dashboard_snapshot_${NEW_ID}`, JSON.stringify(snapshotNew));

  // Set the current active data to the new snapshot so projects load from here
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshotNew));

  // History: newest first → [03.02.26, 20.01.26]
  const newHistory: HistoryEntry[] = [
    { id: NEW_ID, fileName: snapshotNew.fileName, uploadedAt: snapshotNew.uploadedAt },
    { id: OLD_ID, fileName: snapshotOld.fileName, uploadedAt: snapshotOld.uploadedAt },
  ];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
}

// ─── Generate a blank template .xlsx ─────────────────────────────────────────

export function downloadTemplate(): void {
  const wb = XLSX.utils.book_new();

  const projectHeaders = [
    'project_id', 'project_name', 'company', 'project_manager', 'report_date',
    'overall_status', 'time_status', 'time_comment', 'cost_status', 'cost_comment',
    'quality_status', 'quality_comment', 'completion_rate', 'variation_orders',
    'risk_comment', 'hs_injuries', 'hs_near_misses', 'hs_hipo', 'hs_headcount',
    'hs_hours_worked', 'quality_punch_registered', 'quality_punch_cleared',
    'quality_mc_inspections', 'quality_deviations',
  ];
  const projectExample = [
    'PROJ-001', 'My Project', 'My Company', 'Project Manager Name', '01.03.26',
    'GREEN', 'According to plan', 'Time comment here', 'According to plan', 'Cost comment here',
    'According to plan', 'Quality comment here', '99.5', '12',
    'Risk line 1\nRisk line 2', '0|0', '5|0', '0|0', '10|0',
    '48000|0', '100|0', '95|5', '100|0', '2|0',
  ];

  const budgetHeaders = [
    'project_id', 'budget_post', 'budget_nok', 'additional_nok',
    'budget_incl_additional_nok', 'paid_nok', 'eac_nok',
  ];
  const budgetExample = ['PROJ-001', 'Building costs', '10000000', '0', '10000000', '5000000', '0'];
  const budgetSum = ['PROJ-001', 'SUM - PROJECT COST', '10000000', '0', '10000000', '5000000', '11000000'];

  const milestoneHeaders = ['project_id', 'milestone_nr', 'name', 'date', 'status'];
  const milestoneExample = ['PROJ-001', '1', 'Project start', '2025-01-01', 'OK'];
  const milestoneExample2 = ['PROJ-001', '2', 'Design complete', '2026-06-01', 'MIDLERTIDIG'];

  const issueHeaders = ['project_id', 'issue_nr', 'problem', 'handling_plan', 'responsible', 'deadline'];
  const issueExample = ['PROJ-001', '1', 'Example issue description', 'Handling plan details', 'John Doe', '2026-04-01'];

  const addSheet = (name: string, headers: string[], ...rows: string[][]) => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // Bold the header row
    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
      if (cell) cell.s = { font: { bold: true } };
    }
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  addSheet('projects', projectHeaders, projectExample);
  addSheet('budget', budgetHeaders, budgetExample, budgetSum);
  addSheet('milestones', milestoneHeaders, milestoneExample, milestoneExample2);
  addSheet('issues', issueHeaders, issueExample);

  XLSX.writeFile(wb, 'bulk_dashboard_template.xlsx');
}
