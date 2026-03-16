'use client';

import { DollarSign, CreditCard, Percent, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { type BudgetLine, formatMnok } from '@/lib/schemas/budget-schema';

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
