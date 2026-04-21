'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { type Project } from '@/lib/schemas/project-schema';
import { type BaselineData, type BaselineProject, type BaselineMilestone } from '@/lib/schemas/baseline-schema';
import { type BudgetLine } from '@/lib/schemas/budget-schema';
import { type Milestone } from '@/lib/schemas/milestone-schema';

type OStatus = 'RED' | 'YELLOW' | 'GREEN';

const statusDot: Record<OStatus, string> = {
  GREEN: 'bg-emerald-400',
  YELLOW: 'bg-amber-400',
  RED: 'bg-red-400',
};

const statusRank: Record<OStatus, number> = { GREEN: 0, YELLOW: 1, RED: 2 };

// ─── Deviation helpers ────────────────────────────────────────────────────────

export function calcScheduleDeviation(
  milestones: Milestone[],
  baselineMilestones: BaselineMilestone[],
  today: Date
): number | null {
  const blMap = new Map<number, string>(
    baselineMilestones.map((bm) => [bm.milestone_nr, bm.planned_date])
  );

  const deviations: number[] = [];
  for (const m of milestones) {
    const plannedDate = blMap.get(m.milestone_nr);
    if (!plannedDate) continue;
    const planned = new Date(plannedDate).getTime();
    const todayMs = today.getTime();

    let deviation: number;
    if (m.status === 'OK') {
      const actual = new Date(m.date).getTime();
      deviation = Math.round((actual - planned) / 86400000);
    } else if (todayMs > planned) {
      deviation = Math.round((todayMs - planned) / 86400000);
    } else {
      deviation = 0;
    }
    deviations.push(deviation);
  }

  if (deviations.length === 0) return null;
  return Math.round(deviations.reduce((a, b) => a + b, 0) / deviations.length);
}

export function calcCostDeviation(
  budget: BudgetLine[],
  baselineProject: BaselineProject
): number | null {
  const sumRow = budget.find((b) => b.budget_post.toLowerCase().includes('sum'));
  if (!sumRow) return null;
  if (baselineProject.planned_budget_nok === 0) return null;
  return ((sumRow.paid_nok - baselineProject.planned_spend_to_date_nok) / baselineProject.planned_budget_nok) * 100;
}

export function calcCompletionGap(
  project: Project,
  baselineProject: BaselineProject
): number | null {
  return (project.completion_rate ?? 0) - baselineProject.planned_completion_rate;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DeviationPill({
  value,
  unit,
  invert = false,
  tooltip,
}: {
  value: number | null;
  unit: string;
  invert?: boolean;
  tooltip?: string;
}) {
  if (value === null) {
    return <span className="text-[10px] text-gray-300">–</span>;
  }
  if (Math.abs(value) < 0.05) {
    return (
      <span className="text-[10px] text-gray-400 font-medium" title={tooltip}>
        <Minus className="w-3 h-3 inline" />
      </span>
    );
  }
  const isPositive = invert ? value < 0 : value > 0;
  const isNegative = invert ? value > 0 : value < 0;
  const colorClass = isPositive ? 'text-red-600' : isNegative ? 'text-emerald-600' : 'text-gray-400';
  const sign = value > 0 ? '+' : '';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${colorClass}`} title={tooltip}>
      {isPositive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      {sign}{Math.abs(value) < 10 ? value.toFixed(1) : Math.round(value)}{unit}
    </span>
  );
}

function RagDriftCell({
  from,
  to,
}: {
  from: OStatus;
  to: OStatus;
}) {
  const improved = statusRank[to] < statusRank[from];
  const degraded = statusRank[to] > statusRank[from];
  const arrow = improved ? '↑' : degraded ? '↓' : '→';
  const arrowColor = improved ? 'text-emerald-600' : degraded ? 'text-red-600' : 'text-gray-400';

  return (
    <div className="flex items-center justify-center gap-1">
      <span className={`w-2 h-2 rounded-full ${statusDot[from]}`} />
      <span className={`text-[10px] font-bold ${arrowColor}`}>{arrow}</span>
      <span className={`w-2 h-2 rounded-full ${statusDot[to]}`} />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface BaselineDeviationCellsProps {
  project: Project;
  budget: BudgetLine[];
  milestones: Milestone[];
  baselineData: BaselineData;
}

export function BaselineDeviationCells({
  project,
  budget,
  milestones,
  baselineData,
}: BaselineDeviationCellsProps) {
  const baselineProject = baselineData.projects.find(
    (bp) => bp.project_id.toLowerCase().trim() === project.project_id.toLowerCase().trim()
  );

  if (!baselineProject) {
    return (
      <>
        <td className="px-3 py-3.5 text-center"><span className="text-[10px] text-gray-300">–</span></td>
        <td className="px-3 py-3.5 text-center"><span className="text-[10px] text-gray-300">–</span></td>
        <td className="px-3 py-3.5 text-center"><span className="text-[10px] text-gray-300">–</span></td>
        <td className="px-3 py-3.5 text-center"><span className="text-[10px] text-gray-300">–</span></td>
      </>
    );
  }

  const projectMilestones = baselineData.milestones.filter(
    (bm) => bm.project_id.toLowerCase().trim() === project.project_id.toLowerCase().trim()
  );

  const today = new Date();
  const schedDev = calcScheduleDeviation(milestones, projectMilestones, today);
  const costDev = calcCostDeviation(budget, baselineProject);
  const completionGap = calcCompletionGap(project, baselineProject);

  return (
    <>
      <td className="px-3 py-3.5 text-center">
        <DeviationPill
          value={schedDev}
          unit=" d"
          invert={true}
          tooltip={schedDev !== null ? `Gjennomsnittlig forsinkelse: ${schedDev > 0 ? '+' : ''}${schedDev} dager` : undefined}
        />
      </td>
      <td className="px-3 py-3.5 text-center">
        <DeviationPill
          value={costDev !== null ? parseFloat(costDev.toFixed(1)) : null}
          unit="%"
          invert={true}
          tooltip={costDev !== null ? `Kostnadsavvik: ${costDev > 0 ? '+' : ''}${costDev.toFixed(1)}%` : undefined}
        />
      </td>
      <td className="px-3 py-3.5 text-center">
        <DeviationPill
          value={completionGap !== null ? parseFloat(completionGap.toFixed(1)) : null}
          unit="%"
          invert={false}
          tooltip={completionGap !== null ? `Ferdigstillelse: ${completionGap > 0 ? '+' : ''}${completionGap.toFixed(1)}pp vs plan` : undefined}
        />
      </td>
      <td className="px-3 py-3.5 text-center">
        <RagDriftCell
          from={baselineProject.planned_rag_status}
          to={project.overall_status}
        />
      </td>
    </>
  );
}
