'use client';

import { CheckCircle2, Clock, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Milestone } from '@/lib/schemas/milestone-schema';
import { type BaselineData, type BaselineMilestone } from '@/lib/schemas/baseline-schema';

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return dateStr;
  }
}

function calcDays(actualDate: string, plannedDate: string): number {
  const actual = new Date(actualDate).getTime();
  const planned = new Date(plannedDate).getTime();
  return Math.round((actual - planned) / 86400000);
}

function DaysDelta({ days }: { days: number }) {
  if (days === 0) return <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5"><Minus className="w-3 h-3" /> 0 d</span>;
  const positive = days > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${positive ? 'text-red-600' : 'text-emerald-600'}`}>
      {positive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      {positive ? '+' : ''}{days} d
    </span>
  );
}

interface BaselineMilestoneTableProps {
  projectId: string;
  milestones: Milestone[];
  baselineData: BaselineData;
}

export function BaselineMilestoneTable({ projectId, milestones, baselineData }: BaselineMilestoneTableProps) {
  const today = new Date();

  const baselineMilestones = baselineData.milestones.filter(
    (bm) => bm.project_id.toLowerCase().trim() === projectId.toLowerCase().trim()
  );

  const blMap = new Map<number, BaselineMilestone>(
    baselineMilestones.map((bm) => [bm.milestone_nr, bm])
  );

  // Merge: all milestones from current data, sorted by milestone_nr
  const sorted = [...milestones].sort((a, b) => a.milestone_nr - b.milestone_nr);

  if (sorted.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-8">
        Ingen milepæler funnet for dette prosjektet.
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-80">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
            <TableHead className="text-xs w-10">#</TableHead>
            <TableHead className="text-xs">Milepæl</TableHead>
            <TableHead className="text-xs w-28">Planlagt dato</TableHead>
            <TableHead className="text-xs w-28">Faktisk dato</TableHead>
            <TableHead className="text-xs w-20 text-center">Δ dager</TableHead>
            <TableHead className="text-xs w-24">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((m) => {
            const bl = blMap.get(m.milestone_nr);
            const isOk = m.status === 'OK';

            let deltaEl: React.ReactNode = <span className="text-[10px] text-gray-300">–</span>;
            if (bl) {
              if (isOk) {
                const days = calcDays(m.date, bl.planned_date);
                deltaEl = <DaysDelta days={days} />;
              } else {
                // Not yet done — show how many days past planned (if overdue)
                const todayMs = today.getTime();
                const plannedMs = new Date(bl.planned_date).getTime();
                if (todayMs > plannedMs) {
                  const overdueDays = Math.round((todayMs - plannedMs) / 86400000);
                  deltaEl = <DaysDelta days={overdueDays} />;
                } else {
                  deltaEl = <span className="text-[10px] text-gray-400">–</span>;
                }
              }
            }

            return (
              <TableRow key={`${m.project_id}-${m.milestone_nr}`}>
                <TableCell className="font-mono text-xs text-gray-400 font-bold">{m.milestone_nr}</TableCell>
                <TableCell className="text-xs text-gray-800 font-medium">{m.name}</TableCell>
                <TableCell className="text-xs text-gray-500 tabular-nums">
                  {bl ? formatDate(bl.planned_date) : <span className="text-gray-300">–</span>}
                </TableCell>
                <TableCell className="text-xs text-gray-500 tabular-nums">
                  {isOk ? formatDate(m.date) : <span className="text-gray-400 italic">Ikke ferdig</span>}
                </TableCell>
                <TableCell className="text-center">{deltaEl}</TableCell>
                <TableCell>
                  {isOk ? (
                    <Badge variant="outline" className="gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Ferdig
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border-amber-200">
                      <Clock className="w-2.5 h-2.5" /> Pågår
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
