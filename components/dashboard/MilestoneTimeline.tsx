'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type Milestone } from '@/lib/schemas/milestone-schema';

interface MilestoneTimelineProps {
  milestones: Milestone[];
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  } catch {
    return dateStr;
  }
}

function formatFullDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

interface HoveredMilestone {
  milestone: Milestone;
  svgX: number;
}

export function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
  const [tableOpen, setTableOpen] = useState(false);
  const [hovered, setHovered] = useState<HoveredMilestone | null>(null);

  if (milestones.length === 0) {
    return (
      <Card className="shadow-sm border-gray-100">
        <CardContent className="p-8 text-center text-gray-400 text-sm">
          No milestone data available
        </CardContent>
      </Card>
    );
  }

  const sorted = [...milestones].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const okCount = sorted.filter((m) => m.status === 'OK').length;
  const inProgressCount = sorted.length - okCount;

  const minDate = new Date(sorted[0].date).getTime();
  const maxDate = new Date(sorted[sorted.length - 1].date).getTime();
  const today = Date.now();
  const totalSpan = maxDate - minDate;

  const PAD_L = 30;
  const PAD_R = 30;
  const WIDTH = 800;
  const TRACK_WIDTH = WIDTH - PAD_L - PAD_R;
  const HEIGHT = 90;
  const CY = 48;
  const R = 8;

  function xPos(dateStr: string): number {
    const t = new Date(dateStr).getTime();
    if (totalSpan === 0) return PAD_L + TRACK_WIDTH / 2;
    return PAD_L + ((t - minDate) / totalSpan) * TRACK_WIDTH;
  }

  const todayX =
    today >= minDate && today <= maxDate
      ? Math.min(Math.max(PAD_L, PAD_L + ((today - minDate) / totalSpan) * TRACK_WIDTH), PAD_L + TRACK_WIDTH)
      : null;

  function tooltipStyle(svgX: number): React.CSSProperties {
    const pct = (svgX / WIDTH) * 100;
    return { left: `clamp(0px, calc(${pct}% - 80px), calc(100% - 168px))`, top: '0px' };
  }

  return (
    <Collapsible open={tableOpen} onOpenChange={setTableOpen}>
      <section>
        {/* Section header */}
        <div className="bg-teal-700 text-white px-5 py-2.5 rounded-t-lg flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wide">Milestones</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-teal-300" />
              <span className="text-[10px] text-teal-200">{okCount} done</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-amber-300" />
              <span className="text-[10px] text-teal-200">{inProgressCount} pending</span>
            </div>
            <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-teal-300 hover:text-white font-semibold ml-1">
              {tableOpen ? <><ChevronUp className="w-3.5 h-3.5" />Hide list</> : <><ChevronDown className="w-3.5 h-3.5" />Show list</>}
            </CollapsibleTrigger>
          </div>
        </div>

        {/* SVG timeline card */}
        <Card className="shadow-sm border-teal-100 rounded-tl-none rounded-tr-none">
          <CardContent className="p-5 overflow-x-auto">
            <div className="relative" onMouseLeave={() => setHovered(null)}>
              <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ minWidth: 480 }}>
                {/* Track background */}
                <line x1={PAD_L} y1={CY} x2={PAD_L + TRACK_WIDTH} y2={CY} stroke="#f1f5f9" strokeWidth={4} strokeLinecap="round" />
                {/* Track filled up to today */}
                {todayX !== null && (
                  <line x1={PAD_L} y1={CY} x2={todayX} y2={CY} stroke="#e2e8f0" strokeWidth={4} strokeLinecap="round" />
                )}

                {/* Today marker */}
                {todayX !== null && (
                  <>
                    <line x1={todayX} y1={14} x2={todayX} y2={HEIGHT - 8} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4,3" strokeLinecap="round" />
                    <rect x={todayX - 14} y={3} width={28} height={11} rx={5.5} fill="#3b82f6" />
                    <text x={todayX} y={11} textAnchor="middle" fontSize={6.5} fill="white" fontWeight="700" letterSpacing="0.5">TODAY</text>
                  </>
                )}

                {/* Milestone dots */}
                {sorted.map((m) => {
                  const cx = xPos(m.date);
                  const isOk = m.status === 'OK';
                  const isHovered = hovered?.milestone.milestone_nr === m.milestone_nr;

                  return (
                    <g
                      key={`${m.project_id}-${m.milestone_nr}`}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHovered({ milestone: m, svgX: cx })}
                    >
                      {/* Halo on hover */}
                      {isHovered && (
                        <circle cx={cx} cy={CY} r={R + 6} fill={isOk ? '#d1fae5' : '#fef3c7'} opacity={0.6} />
                      )}
                      {isOk ? (
                        <circle cx={cx} cy={CY} r={R} fill="#10b981" stroke="white" strokeWidth={2} />
                      ) : (
                        <>
                          <circle cx={cx} cy={CY} r={R} fill="white" stroke="#f59e0b" strokeWidth={2.5} />
                          <circle cx={cx} cy={CY} r={R - 4} fill="#fbbf24" />
                        </>
                      )}
                      {/* Milestone number */}
                      <text x={cx} y={CY - R - 5} textAnchor="middle" fontSize={7.5} fill={isOk ? '#059669' : '#d97706'} fontWeight="700">
                        {m.milestone_nr}
                      </text>
                      {/* Date */}
                      <text x={cx} y={CY + R + 13} textAnchor="middle" fontSize={7} fill="#94a3b8">
                        {formatDate(m.date)}
                      </text>
                      {/* Hit area */}
                      <circle cx={cx} cy={CY} r={R + 8} fill="transparent" />
                    </g>
                  );
                })}
              </svg>

              {/* Hover tooltip */}
              {hovered && (
                <div
                  className="absolute pointer-events-none z-10 bg-gray-900 text-white rounded-xl px-3.5 py-2.5 text-xs shadow-xl border border-gray-700 w-42"
                  style={tooltipStyle(hovered.svgX)}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {hovered.milestone.status === 'OK' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <p className="font-semibold leading-snug text-white">
                      {hovered.milestone.milestone_nr}. {hovered.milestone.name}
                    </p>
                  </div>
                  <p className="text-gray-400 text-[10px]">{formatFullDate(hovered.milestone.date)}</p>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 mt-3 pt-3 border-t border-gray-50 justify-end">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                <span className="text-[10px] text-gray-400">Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow-sm" />
                <span className="text-[10px] text-gray-400">In progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-px h-4 bg-blue-500" />
                <span className="text-[10px] text-gray-400">Today</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collapsible milestone table */}
        <CollapsibleContent>
          <Card className="mt-3 shadow-sm border-gray-100 overflow-hidden">
            <ScrollArea className="max-h-64">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-xs w-14">#</TableHead>
                    <TableHead className="text-xs">Milestone name</TableHead>
                    <TableHead className="text-xs w-28">Date</TableHead>
                    <TableHead className="text-xs w-28">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((m) => (
                    <TableRow key={`${m.project_id}-${m.milestone_nr}`}>
                      <TableCell className="font-mono text-xs text-gray-400 font-bold">
                        {m.milestone_nr}
                      </TableCell>
                      <TableCell className="text-sm text-gray-800 font-medium">{m.name}</TableCell>
                      <TableCell className="text-xs text-gray-500 tabular-nums">
                        {formatFullDate(m.date)}
                      </TableCell>
                      <TableCell>
                        {m.status === 'OK' ? (
                          <Badge variant="outline" className="gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Done
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border-amber-200">
                            <Clock className="w-2.5 h-2.5" /> Pending
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
