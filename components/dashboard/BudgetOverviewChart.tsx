'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type BudgetLine, formatMnok } from '@/lib/schemas/budget-schema';

interface BudgetOverviewChartProps {
  budget: BudgetLine[];
}

function pct(paid: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.round((paid / total) * 100));
}

type PctLevel = 'high' | 'mid' | 'low';
function pctLevel(p: number): PctLevel {
  if (p >= 90) return 'high';
  if (p >= 60) return 'mid';
  return 'low';
}

const barColors: Record<PctLevel, string> = {
  high: 'bg-emerald-600',
  mid: 'bg-blue-500',
  low: 'bg-slate-300',
};

const badgeColors: Record<PctLevel, string> = {
  high: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  mid: 'bg-blue-50 text-blue-700 border-blue-200',
  low: 'bg-slate-50 text-slate-600 border-slate-200',
};

interface BudgetRowProps {
  label: string;
  paid: number;
  total: number;
  isSummary?: boolean;
}

function BudgetBarRow({ label, paid, total, isSummary }: BudgetRowProps) {
  const p = pct(paid, total);
  const level = pctLevel(p);

  return (
    <div className={`group ${isSummary ? 'pt-1' : ''}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className={`text-xs truncate max-w-[50%] ${isSummary ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
          {label}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 tabular-nums">
            {formatMnok(paid)}&thinsp;/&thinsp;{formatMnok(total)} MNOK
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] font-bold tabular-nums px-1.5 h-5 min-w-[2.5rem] justify-center ${badgeColors[level]}`}
          >
            {p}%
          </Badge>
        </div>
      </div>
      {/* Progress bar track */}
      <div className={`w-full rounded-full overflow-hidden ${isSummary ? 'h-2.5 bg-gray-200' : 'h-1.5 bg-gray-100'}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColors[level]}`}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}

export function BudgetOverviewChart({ budget }: BudgetOverviewChartProps) {
  const isSumRow = (b: BudgetLine) =>
    b.budget_post.toLowerCase().includes('sum') || b.budget_post.toLowerCase().includes('total');

  const lines = budget.filter((b) => !isSumRow(b));
  const sumRow = budget.find(isSumRow);

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Budget Overview
        </h2>
        <Separator className="flex-1" />
      </div>

      <Tabs defaultValue="bars">
        <div className="flex items-center justify-between mb-3">
          <TabsList className="h-8">
            <TabsTrigger value="bars" className="text-xs px-3 h-6">Progress view</TabsTrigger>
            <TabsTrigger value="table" className="text-xs px-3 h-6">Table view</TabsTrigger>
          </TabsList>
          {sumRow && (
            <Badge variant="outline" className="text-[10px] font-semibold text-gray-500 border-gray-200">
              Total: {formatMnok(sumRow.budget_incl_additional_nok)} MNOK
            </Badge>
          )}
        </div>

        {/* Progress bars view */}
        <TabsContent value="bars" className="mt-0">
          <Card className="shadow-sm border-gray-100">
            <CardContent className="p-5 space-y-4">
              {lines.map((b) => (
                <BudgetBarRow
                  key={b.budget_post}
                  label={b.budget_post}
                  paid={b.paid_nok}
                  total={b.budget_incl_additional_nok}
                />
              ))}

              {sumRow && (
                <>
                  <Separator />
                  <BudgetBarRow
                    label={sumRow.budget_post}
                    paid={sumRow.paid_nok}
                    total={sumRow.budget_incl_additional_nok}
                    isSummary
                  />
                </>
              )}

              {/* Legend */}
              <div className="flex items-center gap-4 pt-1 border-t border-gray-50">
                {([['high', 'bg-emerald-600', '≥90%'], ['mid', 'bg-blue-500', '60–90%'], ['low', 'bg-slate-300', '<60%']] as const).map(([, color, label]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-[10px] text-gray-400">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Table view */}
        <TabsContent value="table" className="mt-0">
          <Card className="shadow-sm border-gray-100 overflow-hidden">
            <ScrollArea>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-xs font-semibold">Budget Post</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Budget (MNOK)</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Additional</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Total Budget</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Paid</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Spent %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budget.map((b) => {
                    const p = pct(b.paid_nok, b.budget_incl_additional_nok);
                    const level = pctLevel(p);
                    const isSum = isSumRow(b);
                    return (
                      <TableRow key={b.budget_post} className={isSum ? 'bg-gray-50 font-semibold' : ''}>
                        <TableCell className={`text-sm ${isSum ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                          {b.budget_post}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-gray-600">
                          {formatMnok(b.budget_nok)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-gray-400">
                          {formatMnok(b.additional_nok)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-medium text-gray-900">
                          {formatMnok(b.budget_incl_additional_nok)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-emerald-700 font-medium">
                          {formatMnok(b.paid_nok)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold tabular-nums ${badgeColors[level]}`}
                          >
                            {p}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
