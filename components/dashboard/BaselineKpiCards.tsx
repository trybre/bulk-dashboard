'use client';

import { type Project } from '@/lib/schemas/project-schema';
import { type BaselineData } from '@/lib/schemas/baseline-schema';
import { type BudgetLine } from '@/lib/schemas/budget-schema';
import { type Milestone } from '@/lib/schemas/milestone-schema';
import { calcScheduleDeviation, calcCostDeviation, calcCompletionGap } from './BaselineDeviationCells';
import { Calendar, DollarSign, TrendingUp, Activity, HardHat, ClipboardCheck } from 'lucide-react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

type OStatus = 'RED' | 'YELLOW' | 'GREEN';

const statusColors: Record<OStatus, { bg: string; text: string; dot: string }> = {
  GREEN: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  YELLOW: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
  RED: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

const statusLabel: Record<OStatus, string> = {
  GREEN: 'På plan',
  YELLOW: 'Avvik',
  RED: 'Kritisk',
};

function formatNok(nok: number): string {
  if (Math.abs(nok) >= 1_000_000_000) return `${(nok / 1_000_000_000).toFixed(2)} BNOK`;
  if (Math.abs(nok) >= 1_000_000) return `${(nok / 1_000_000).toFixed(1)} MNOK`;
  return `${Math.round(nok).toLocaleString('nb-NO')} NOK`;
}

function formatNum(n: number): string {
  return n.toLocaleString('nb-NO');
}

type DeltaColor = 'positive' | 'negative' | 'neutral';

function DeltaBadge({ value, unit = '', invert = false }: { value: number | null; unit?: string; invert?: boolean }) {
  if (value === null) return null;
  if (Math.abs(value) < 0.05) return (
    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
      <Minus className="w-3 h-3" /> På plan
    </span>
  );
  const better = invert ? value < 0 : value > 0;
  const sign = value > 0 ? '+' : '';
  const colorClass = better
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-red-50 text-red-700 border-red-200';
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold border ${colorClass}`}>
      {better ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {sign}{typeof value === 'number' && Math.abs(value) < 10 ? value.toFixed(1) : Math.round(value)}{unit}
    </span>
  );
}

interface MetricRowProps {
  label: string;
  planned: string;
  actual: string;
  delta?: React.ReactNode;
  actualBold?: boolean;
  actualColor?: string;
}

function MetricRow({ label, planned, actual, delta, actualBold = true, actualColor }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <p className="text-xs text-gray-500 shrink-0">{label}</p>
      <div className="flex items-center gap-3 ml-auto">
        <span className="text-xs text-gray-400 tabular-nums">{planned}</span>
        <span className="text-gray-300 text-xs">→</span>
        <span className={`text-sm tabular-nums ${actualBold ? 'font-bold' : 'font-medium'} ${actualColor ?? 'text-gray-900'}`}>
          {actual}
        </span>
        {delta}
      </div>
    </div>
  );
}

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  accent?: string;
}

function KpiCard({ icon, label, children, accent = 'bg-teal-50 text-teal-600' }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
      <div className="flex items-center gap-2.5 mb-1">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
          {icon}
        </div>
        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">{label}</p>
      </div>
      <div className="divide-y divide-gray-50">
        {children}
      </div>
    </div>
  );
}

interface BaselineKpiCardsProps {
  project: Project;
  budget: BudgetLine[];
  milestones: Milestone[];
  baselineData: BaselineData;
}

export function BaselineKpiCards({ project, budget, milestones, baselineData }: BaselineKpiCardsProps) {
  const bp = baselineData.projects.find(
    (b) => b.project_id.toLowerCase().trim() === project.project_id.toLowerCase().trim()
  );

  if (!bp) {
    return (
      <div className="text-sm text-gray-400 text-center py-8">
        Ingen baseline-data funnet for prosjekt <span className="font-mono font-bold">{project.project_id}</span>.
        Sjekk at prosjekt-ID stemmer i baseline-filen.
      </div>
    );
  }

  const projectMilestones = baselineData.milestones.filter(
    (bm) => bm.project_id.toLowerCase().trim() === project.project_id.toLowerCase().trim()
  );
  const today = new Date();

  // ── Schedule ────────────────────────────────────────────────────────────────
  const schedDev = calcScheduleDeviation(milestones, projectMilestones, today);
  const schedStr = schedDev === null ? '–' : schedDev === 0 ? 'På plan' : `${schedDev > 0 ? '+' : ''}${schedDev} dager`;
  const completionGap = calcCompletionGap(project, bp);
  const timeStatus = project.time_status === 'According to plan' ? 'GREEN'
    : project.time_status?.toLowerCase().includes('critical') ? 'RED'
    : project.time_status?.toLowerCase().includes('delay') || project.time_status === 'Minor delays' ? 'YELLOW'
    : 'GREEN';

  // ── Cost ────────────────────────────────────────────────────────────────────
  const sumRow = budget.find((b) => b.budget_post.toLowerCase().includes('sum'));
  const paidNok = sumRow?.paid_nok ?? 0;
  const eacNok = sumRow?.eac_nok ?? 0;
  const costDev = calcCostDeviation(budget, bp);
  const eacDevPct = bp.planned_eac_nok > 0 && eacNok > 0
    ? ((eacNok - bp.planned_eac_nok) / bp.planned_eac_nok) * 100
    : null;
  const voActual = project.variation_orders ?? 0;
  const voDelta = voActual - bp.planned_variation_orders;

  // ── Quality ─────────────────────────────────────────────────────────────────
  const [punchReg] = (project.quality_punch_registered ?? '0|0').split('|').map(Number);
  const [punchClr] = (project.quality_punch_cleared ?? '0|0').split('|').map(Number);
  const [mcInsp] = (project.quality_mc_inspections ?? '0|0').split('|').map(Number);
  const [devCount] = (project.quality_deviations ?? '0|0').split('|').map(Number);

  // ── H&S ─────────────────────────────────────────────────────────────────────
  const [inj] = (project.hs_injuries ?? '0|0').split('|').map(Number);
  const [nm] = (project.hs_near_misses ?? '0|0').split('|').map(Number);
  const [hipo] = (project.hs_hipo ?? '0|0').split('|').map(Number);
  const [hc] = (project.hs_headcount ?? '0|0').split('|').map(Number);
  const [hrs] = (project.hs_hours_worked ?? '0|0').split('|').map(Number);

  // ── RAG ─────────────────────────────────────────────────────────────────────
  const ragFrom = bp.planned_rag_status;
  const ragTo = project.overall_status;

  return (
    <div className="space-y-4">
      {/* Row 1: Schedule + Cost */}
      <div className="grid grid-cols-2 gap-4">
        {/* Fremdrift */}
        <KpiCard icon={<Calendar className="w-4 h-4" />} label="Fremdrift" accent="bg-blue-50 text-blue-600">
          <MetricRow
            label="Forsinkelse (snitt)"
            planned="Iht. plan"
            actual={schedStr}
            actualColor={schedDev !== null && schedDev > 0 ? 'text-red-600' : schedDev !== null && schedDev < 0 ? 'text-emerald-600' : 'text-gray-900'}
            delta={schedDev !== null ? <DeltaBadge value={schedDev} unit=" d" invert={false} /> : undefined}
          />
          <MetricRow
            label="Ferdigstillelse"
            planned={`${bp.planned_completion_rate.toFixed(1)}%`}
            actual={`${(project.completion_rate ?? 0).toFixed(1)}%`}
            actualColor={completionGap !== null && completionGap < -2 ? 'text-red-600' : completionGap !== null && completionGap > 2 ? 'text-emerald-600' : 'text-gray-900'}
            delta={completionGap !== null ? <DeltaBadge value={completionGap} unit="pp" invert={false} /> : undefined}
          />
          <MetricRow
            label="Tidsstatus"
            planned={statusLabel[bp.planned_time_status ?? 'GREEN']}
            actual={statusLabel[timeStatus as OStatus]}
            actualColor={statusColors[timeStatus as OStatus].text}
          />
        </KpiCard>

        {/* Kostnad */}
        <KpiCard icon={<DollarSign className="w-4 h-4" />} label="Kostnad" accent="bg-emerald-50 text-emerald-600">
          <MetricRow
            label="Forbruk hittil"
            planned={formatNok(bp.planned_spend_to_date_nok)}
            actual={formatNok(paidNok)}
            actualColor={costDev !== null && costDev > 2 ? 'text-red-600' : 'text-gray-900'}
            delta={costDev !== null ? <DeltaBadge value={costDev} unit="%" invert={true} /> : undefined}
          />
          <MetricRow
            label="EAC"
            planned={formatNok(bp.planned_eac_nok)}
            actual={eacNok > 0 ? formatNok(eacNok) : '–'}
            actualColor={eacDevPct !== null && eacDevPct > 2 ? 'text-red-600' : 'text-gray-900'}
            delta={eacDevPct !== null && eacNok > 0 ? <DeltaBadge value={eacDevPct} unit="%" invert={true} /> : undefined}
          />
          <MetricRow
            label="Endringsordrer"
            planned={formatNum(bp.planned_variation_orders)}
            actual={formatNum(voActual)}
            actualColor={voDelta > 2 ? 'text-amber-600' : 'text-gray-900'}
            delta={<DeltaBadge value={voDelta} unit="" invert={true} />}
          />
        </KpiCard>
      </div>

      {/* Row 2: Quality + H&S */}
      <div className="grid grid-cols-2 gap-4">
        {/* Kvalitet */}
        <KpiCard icon={<ClipboardCheck className="w-4 h-4" />} label="Kvalitet" accent="bg-violet-50 text-violet-600">
          <MetricRow
            label="Punch registrert"
            planned={formatNum(bp.planned_punch_registered)}
            actual={formatNum(punchReg)}
            delta={<DeltaBadge value={punchReg - bp.planned_punch_registered} unit="" invert={true} />}
          />
          <MetricRow
            label="Punch lukket"
            planned={formatNum(bp.planned_punch_cleared)}
            actual={formatNum(punchClr)}
            delta={<DeltaBadge value={punchClr - bp.planned_punch_cleared} unit="" invert={false} />}
          />
          <MetricRow
            label="MC-inspeksjoner"
            planned={formatNum(bp.planned_mc_inspections)}
            actual={formatNum(mcInsp)}
            delta={<DeltaBadge value={mcInsp - bp.planned_mc_inspections} unit="" invert={false} />}
          />
          <MetricRow
            label="Avvik"
            planned={formatNum(bp.planned_deviations)}
            actual={formatNum(devCount)}
            actualColor={devCount > bp.planned_deviations ? 'text-red-600' : 'text-gray-900'}
            delta={<DeltaBadge value={devCount - bp.planned_deviations} unit="" invert={true} />}
          />
        </KpiCard>

        {/* HMS */}
        <KpiCard icon={<HardHat className="w-4 h-4" />} label="HMS" accent="bg-amber-50 text-amber-600">
          <MetricRow
            label="Skader"
            planned={formatNum(bp.planned_injuries)}
            actual={formatNum(inj)}
            actualColor={inj > bp.planned_injuries ? 'text-red-600' : 'text-gray-900'}
            delta={inj > bp.planned_injuries ? <DeltaBadge value={inj - bp.planned_injuries} unit="" invert={true} /> : undefined}
          />
          <MetricRow
            label="Nestenulykker"
            planned={formatNum(bp.planned_near_misses)}
            actual={formatNum(nm)}
            delta={<DeltaBadge value={nm - bp.planned_near_misses} unit="" invert={true} />}
          />
          <MetricRow
            label="HiPo-hendelser"
            planned={formatNum(bp.planned_hipo)}
            actual={formatNum(hipo)}
            actualColor={hipo > bp.planned_hipo ? 'text-red-600' : 'text-gray-900'}
            delta={hipo > bp.planned_hipo ? <DeltaBadge value={hipo - bp.planned_hipo} unit="" invert={true} /> : undefined}
          />
          <MetricRow
            label="Bemanning"
            planned={formatNum(bp.planned_headcount)}
            actual={formatNum(hc)}
            delta={<DeltaBadge value={hc - bp.planned_headcount} unit="" invert={false} />}
          />
          <MetricRow
            label="Timer arbeidet"
            planned={formatNum(bp.planned_hours_worked)}
            actual={formatNum(hrs)}
            delta={<DeltaBadge value={hrs - bp.planned_hours_worked} unit="" invert={false} />}
          />
        </KpiCard>
      </div>

      {/* Row 3: RAG — full width */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500">
            <Activity className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Overordnet RAG-status</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide">Planlagt</p>
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${statusColors[ragFrom].bg} ${statusColors[ragFrom].text}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${statusColors[ragFrom].dot}`} />
              {statusLabel[ragFrom]}
            </span>
          </div>
          <span className="text-2xl text-gray-200 font-light">→</span>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide">Faktisk</p>
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${statusColors[ragTo].bg} ${statusColors[ragTo].text}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${statusColors[ragTo].dot}`} />
              {statusLabel[ragTo]}
            </span>
          </div>
          {ragFrom !== ragTo && (
            <div className={`ml-2 inline-flex items-center px-3 py-2 rounded-xl text-sm font-bold border ${
              ragTo === 'GREEN' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
              ragTo === 'RED' ? 'text-red-700 bg-red-50 border-red-200' :
              'text-amber-700 bg-amber-50 border-amber-200'
            }`}>
              {ragTo === 'GREEN' ? '↑' : ragTo === 'RED' ? '↓' : '→'} Endret fra {statusLabel[ragFrom]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
