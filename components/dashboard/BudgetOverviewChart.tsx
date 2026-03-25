'use client';

import { Card, CardContent } from '@/components/ui/card';
import { type BudgetLine } from '@/lib/schemas/budget-schema';
import { parsePair, type Project } from '@/lib/schemas/project-schema';

interface BudgetOverviewChartProps {
  budget: BudgetLine[];
  project: Project;
}

const BAR_COLORS = ['#0f766e', '#134e4a', '#14b8a6', '#5eead4'];
const LEGEND_LABELS = ['Booked PTD', 'Original Budget', 'Revised Budget', 'Current Estimate'];

function FinancialsBarChart({ budget }: { budget: BudgetLine[] }) {
  const isSumRow = (b: BudgetLine) =>
    b.budget_post.toLowerCase().includes('sum') || b.budget_post.toLowerCase().includes('total');
  const sumRow = budget.find(isSumRow);
  if (!sumRow) return null;

  const values = [
    sumRow.paid_nok,
    sumRow.budget_nok,
    sumRow.budget_incl_additional_nok,
    sumRow.eac_nok || sumRow.budget_incl_additional_nok,
  ];
  const maxVal = Math.max(...values) * 1.18;

  const BAR_W = 44;
  const GAP = 20;
  const CHART_H = 120;
  const CHART_Y = 20;
  const CHART_BOTTOM = CHART_Y + CHART_H;
  const totalW = values.length * (BAR_W + GAP) + GAP;

  return (
    <div className="flex-1 min-w-0">
      <div className="flex gap-6 items-end">
        <svg viewBox={`0 0 ${totalW} ${CHART_BOTTOM + 30}`} className="flex-1" style={{ minWidth: 200, maxWidth: 300 }}>
          {values.map((val, i) => {
            const x = GAP + i * (BAR_W + GAP);
            const barH = maxVal > 0 ? (val / maxVal) * CHART_H : 0;
            const y = CHART_BOTTOM - barH;
            return (
              <g key={i}>
                <rect x={x} y={y} width={BAR_W} height={barH} fill={BAR_COLORS[i]} rx={2} />
                <text x={x + BAR_W / 2} y={y - 4} textAnchor="middle" fontSize={8} fill="#374151" fontWeight="700">
                  {(val / 1_000_000_000).toFixed(3)}
                </text>
              </g>
            );
          })}
          <line x1={GAP / 2} y1={CHART_BOTTOM} x2={totalW - GAP / 2} y2={CHART_BOTTOM} stroke="#e5e7eb" strokeWidth={1} />
        </svg>
        <div className="space-y-2 shrink-0 pb-1">
          {LEGEND_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: BAR_COLORS[i] }} />
              <span className="text-[10px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiTile({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-center ${highlight ? 'border-teal-200 bg-teal-50' : 'border-gray-100 bg-gray-50'}`}>
      <p className={`text-xl font-black tabular-nums leading-tight ${highlight ? 'text-teal-800' : 'text-gray-900'}`}>{value}</p>
      <p className={`text-[10px] font-semibold mt-0.5 ${highlight ? 'text-teal-600' : 'text-gray-500'}`}>{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function KpiBigCell({ label, values }: { label: string; values: [string, string] }) {
  return (
    <div className="text-center px-4 py-3 border-r last:border-r-0 border-gray-100">
      <p className="text-sm font-black text-gray-800 tabular-nums">
        {values[0]}
        <span className="text-gray-300 mx-1 font-light">|</span>
        <span className="text-xs text-gray-400">{values[1]}</span>
      </p>
      <p className="text-[10px] font-semibold text-gray-600 mt-1 leading-tight">{label}</p>
    </div>
  );
}

function KpiSubHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="bg-teal-50 border-y border-teal-100 px-5 py-1.5 flex items-center justify-between">
      <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wide">{title}</p>
      {note && <p className="text-[9px] text-teal-500 italic">{note}</p>}
    </div>
  );
}

export function BudgetOverviewChart({ budget, project }: BudgetOverviewChartProps) {
  const isSumRow = (b: BudgetLine) =>
    b.budget_post.toLowerCase().includes('sum') || b.budget_post.toLowerCase().includes('total');
  const sumRow = budget.find(isSumRow);

  const completionRate = project.completion_rate ?? 0;
  const variationOrders = project.variation_orders ?? 0;
  const eac = sumRow?.eac_nok ?? 0;
  const devBudgetPct =
    sumRow && sumRow.budget_incl_additional_nok > 0
      ? ((eac - sumRow.budget_incl_additional_nok) / sumRow.budget_incl_additional_nok) * 100
      : 0;

  const [inj, injPrev] = parsePair(project.hs_injuries);
  const [nm, nmPrev] = parsePair(project.hs_near_misses);
  const [hipo, hipoPrev] = parsePair(project.hs_hipo);
  const [head, headPrev] = parsePair(project.hs_headcount);
  const [hours, hoursPrev] = parsePair(project.hs_hours_worked);
  const [punchReg, punchRegPrev] = parsePair(project.quality_punch_registered);
  const [punchCl, punchClPrev] = parsePair(project.quality_punch_cleared);
  const [mcInsp, mcInspPrev] = parsePair(project.quality_mc_inspections);
  const [qDev, qDevPrev] = parsePair(project.quality_deviations);

  return (
    <Card className="shadow-sm border-teal-100 overflow-hidden">
      {/* Header */}
      <div className="bg-teal-700 text-white px-5 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide">
          Financials and Cash Flow Profile (NOKm)
        </p>
      </div>

      {/* Bar chart + KPI tiles */}
      <CardContent className="p-5">
        <div className="flex gap-6">
          <FinancialsBarChart budget={budget} />
          <div className="grid grid-cols-1 gap-3 w-40 shrink-0">
            <KpiTile label="Completion rate" value={`${completionRate.toFixed(1)}%`} highlight />
            <KpiTile
              label="Dev. Budget"
              value={devBudgetPct >= 0 ? `+${devBudgetPct.toFixed(1)}%` : `${devBudgetPct.toFixed(1)}%`}
              sub={eac > 0 ? `EAC: ${(eac / 1_000_000_000).toFixed(3)} BNOK` : undefined}
            />
            <KpiTile label="Variation orders" value={`${variationOrders}`} />
          </div>
        </div>
      </CardContent>

      {/* Health & Safety KPIs */}
      <KpiSubHeader title="Health &amp; Safety KPIs" />
      <div className="grid grid-cols-2">
        <KpiBigCell label="Injuries" values={[inj, injPrev]} />
        <div className="px-4 py-3 border-l border-gray-100">
          <p className="text-[10px] font-semibold text-gray-600 mb-1">&ldquo;Near misses&rdquo;</p>
          <p className="text-xs font-bold text-gray-800">
            # RUH&apos;s: {nm}<span className="text-gray-300 mx-1">|</span><span className="text-gray-400">{nmPrev}</span>
          </p>
          <p className="text-xs font-bold text-gray-800 mt-0.5">
            # HiPo&apos;s: {hipo}<span className="text-gray-300 mx-1">|</span><span className="text-gray-400">{hipoPrev}</span>
          </p>
        </div>
      </div>
      <div className="border-t border-gray-100 grid grid-cols-2">
        <KpiBigCell label="Average daily headcount" values={[head, headPrev]} />
        <KpiBigCell label="Total Worked Hours" values={[hours, hoursPrev]} />
      </div>

      {/* Quality KPIs */}
      <KpiSubHeader title="Quality KPIs" />
      <div className="grid grid-cols-2">
        <KpiBigCell label="Punch points registered" values={[punchReg, punchRegPrev]} />
        <KpiBigCell label="Punch points cleared" values={[punchCl, punchClPrev]} />
      </div>
      <div className="border-t border-gray-100 grid grid-cols-2">
        <KpiBigCell label="MC Inspections performed" values={[mcInsp, mcInspPrev]} />
        <KpiBigCell label="Quality deviations" values={[qDev, qDevPrev]} />
      </div>
    </Card>
  );
}
