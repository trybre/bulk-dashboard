'use client';

import { Card, CardContent } from '@/components/ui/card';
import { parsePair, type Project } from '@/lib/schemas/project-schema';
import { type BudgetLine } from '@/lib/schemas/budget-schema';

interface KpiPanelsProps {
  project: Project;
}

function KpiCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center px-3 py-2 border-r last:border-r-0 border-gray-100">
      <p className="text-sm font-bold text-gray-800 tabular-nums leading-tight">{value}</p>
      <p className="text-xs font-semibold text-gray-600 mt-0.5 leading-tight">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function KpiBigCell({ label, values }: { label: string; values: [string, string] }) {
  return (
    <div className="text-center px-4 py-5 border-r last:border-r-0 border-gray-100">
      <p className="text-3xl font-black text-gray-800 tabular-nums">
        {values[0]}
        <span className="text-gray-300 mx-2 font-light">|</span>
        <span className="text-xl text-gray-400">{values[1]}</span>
      </p>
      <p className="text-sm font-semibold text-gray-500 mt-2 leading-tight">{label}</p>
    </div>
  );
}

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="bg-teal-700 text-white px-4 py-1.5 flex items-center justify-between">
      <p className="text-[10px] font-bold uppercase tracking-wide">{title}</p>
      {note && <p className="text-[9px] text-teal-200 italic">{note}</p>}
    </div>
  );
}

export function KpiPanels({ project }: KpiPanelsProps) {
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
    <div className="grid grid-cols-2 gap-4">
      {/* Health & Safety */}
      <Card className="shadow-sm border-teal-100 overflow-hidden">
        <SectionHeader title="Health &amp; Safety KPIs" />
        <CardContent className="p-0">
          <div className="grid grid-cols-2">
            <KpiBigCell label="Injuries" values={[inj, injPrev]} />
            <div className="px-4 py-5 border-l border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-2">&#34;Near misses&#34;</p>
              <p className="text-xl font-bold text-gray-800">
                # RUH&#39;s: {nm}
                <span className="text-gray-300 mx-1">|</span>
                <span className="text-gray-400">{nmPrev}</span>
              </p>
              <p className="text-xl font-bold text-gray-800 mt-1">
                # HiPo&#39;s: {hipo}
                <span className="text-gray-300 mx-1">|</span>
                <span className="text-gray-400">{hipoPrev}</span>
              </p>
            </div>
          </div>
          <div className="border-t border-gray-100 grid grid-cols-2">
            <KpiBigCell label="Average daily headcount" values={[head, headPrev]} />
            <KpiBigCell label="Total Worked Hours" values={[hours, hoursPrev]} />
          </div>
          <div className="border-t border-gray-100 px-4 py-2">
            <p className="text-[10px] font-semibold text-gray-500">Comments</p>
          </div>
        </CardContent>
      </Card>

      {/* Quality */}
      <Card className="shadow-sm border-teal-100 overflow-hidden">
        <SectionHeader title="Quality KPIs" />
        <CardContent className="p-0">
          <div className="grid grid-cols-2">
            <KpiBigCell label="Punch points registered" values={[punchReg, punchRegPrev]} />
            <KpiBigCell label="Punch points cleared" values={[punchCl, punchClPrev]} />
          </div>
          <div className="border-t border-gray-100 grid grid-cols-2">
            <KpiBigCell label="MC Inspections performed" values={[mcInsp, mcInspPrev]} />
            <KpiBigCell label="Quality deviations" values={[qDev, qDevPrev]} />
          </div>
          <div className="border-t border-gray-100 px-4 py-2">
            <p className="text-[10px] font-semibold text-gray-500">Comments</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


interface BudgetKpiCardsProps {
  budget: BudgetLine[];
}

interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  badge?: string;
  badgeVariant?: 'emerald' | 'blue' | 'slate';
  progress?: number;
}

const badgeClasses = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
};

function KpiCard({ label, value, sub, icon, iconBg, iconColor, badge, badgeVariant = 'slate', progress }: KpiCardProps) {
  return (
    <Card className="shadow-sm border-gray-100 hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
            <span className={iconColor}>{icon}</span>
          </div>
          {/* Badge */}
          {badge && (
            <Badge variant="outline" className={`text-[10px] font-semibold shrink-0 ${badgeClasses[badgeVariant]}`}>
              {badge}
            </Badge>
          )}
        </div>

        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{sub}</p>

        {progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BudgetKpiCards({ budget }: BudgetKpiCardsProps) {
  const isSumRow = (b: BudgetLine) =>
    b.budget_post.toLowerCase().includes('sum') || b.budget_post.toLowerCase().includes('total');

  const sumRow = budget.find(isSumRow);
  const totalBudget = sumRow?.budget_incl_additional_nok ?? 0;
  const totalPaid = sumRow?.paid_nok ?? 0;
  const pct = totalBudget > 0 ? (totalPaid / totalBudget) * 100 : 0;
  const remaining = totalBudget - totalPaid;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard
        label="Total Budget"
        value={`${formatMnok(totalBudget)} MNOK`}
        sub="incl. additional costs"
        icon={<DollarSign className="w-5 h-5" />}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
        badge="Budget"
        badgeVariant="blue"
      />
      <KpiCard
        label="Paid to Date"
        value={`${formatMnok(totalPaid)} MNOK`}
        sub="invoices processed"
        icon={<CreditCard className="w-5 h-5" />}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        badge={`${pct.toFixed(0)}% spent`}
        badgeVariant="emerald"
        progress={pct}
      />
      <KpiCard
        label="Payment Rate"
        value={`${pct.toFixed(1)}%`}
        sub="of total budget used"
        icon={<Percent className="w-5 h-5" />}
        iconBg="bg-violet-50"
        iconColor="text-violet-600"
        progress={pct}
      />
      <KpiCard
        label="Remaining"
        value={`${formatMnok(remaining)} MNOK`}
        sub="available budget"
        icon={<Wallet className="w-5 h-5" />}
        iconBg="bg-slate-50"
        iconColor="text-slate-600"
        badge={`${(100 - pct).toFixed(0)}% left`}
        badgeVariant="slate"
      />
    </div>
  );
}
