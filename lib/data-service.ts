import Papa from 'papaparse';
import { ProjectSchema, type Project } from './schemas/project-schema';
import { MilestoneSchema, type Milestone } from './schemas/milestone-schema';
import { BudgetLineSchema, type BudgetLine } from './schemas/budget-schema';
import { IssueSchema, type Issue } from './schemas/issue-schema';
import {
  getStoredExcelData,
  getProjectsFromExcel,
  getBudgetFromExcel,
  getMilestonesFromExcel,
  getIssuesFromExcel,
  getBaselineData,
} from './excel-service';

export { getBaselineData } from './excel-service';
export type { BaselineData } from './schemas/baseline-schema';

const BASE_PATH = '/data';

async function fetchCsv<T>(
  path: string,
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: unknown } }
): Promise<T[]> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
  const text = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const parsed: T[] = [];
        for (const row of results.data as Record<string, string>[]) {
          const result = schema.safeParse(row);
          if (result.success) {
            parsed.push(result.data as T);
          } else {
            console.warn('CSV row validation failed:', result.error, row);
          }
        }
        resolve(parsed);
      },
      error: (err: Error) => reject(err),
    });
  });
}

export async function fetchProjects(): Promise<Project[]> {
  const excel = getStoredExcelData();
  if (excel) return getProjectsFromExcel(excel);
  return fetchCsv<Project>(`${BASE_PATH}/projects.csv`, ProjectSchema);
}

export async function fetchMilestones(projectId?: string): Promise<Milestone[]> {
  const excel = getStoredExcelData();
  if (excel) return getMilestonesFromExcel(excel, projectId);
  const all = await fetchCsv<Milestone>(`${BASE_PATH}/milestones.csv`, MilestoneSchema);
  return projectId ? all.filter((m) => m.project_id === projectId) : all;
}

export async function fetchBudget(projectId?: string): Promise<BudgetLine[]> {
  const excel = getStoredExcelData();
  if (excel) return getBudgetFromExcel(excel, projectId);
  const all = await fetchCsv<BudgetLine>(`${BASE_PATH}/budget.csv`, BudgetLineSchema);
  return projectId ? all.filter((b) => b.project_id === projectId) : all;
}

export async function fetchIssues(projectId?: string): Promise<Issue[]> {
  const excel = getStoredExcelData();
  if (excel) return getIssuesFromExcel(excel, projectId);
  const all = await fetchCsv<Issue>(`${BASE_PATH}/issues.csv`, IssueSchema);
  return projectId ? all.filter((i) => i.project_id === projectId) : all;
}

export interface DashboardData {
  project: Project;
  milestones: Milestone[];
  budget: BudgetLine[];
  issues: Issue[];
}

export async function fetchDashboardData(projectId: string): Promise<DashboardData | null> {
  const [projects, milestones, budget, issues] = await Promise.all([
    fetchProjects(),
    fetchMilestones(projectId),
    fetchBudget(projectId),
    fetchIssues(projectId),
  ]);
  const project = projects.find((p) => p.project_id === projectId);
  if (!project) return null;
  return { project, milestones, budget, issues };
}
