'use client';

import { useState } from 'react';
import { type Milestone } from '@/lib/schemas/milestone-schema';
import { type BaselineMilestone } from '@/lib/schemas/baseline-schema';

interface GanttChartProps {
  milestones: Milestone[];
  baselineMilestones: BaselineMilestone[];
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return dateStr;
  }
}

function formatMonthYear(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('nb-NO', { month: 'short', year: '2-digit' });
  } catch {
    return dateStr;
  }
}

function calcDays(a: string, b: string): number {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
}

interface TooltipData {
  name: string;
  plannedDate: string | null;
  actualDate: string | null;
  deltaDays: number | null;
  isCompleted: boolean;
  x: number;
  y: number;
}

export function GanttChart({ milestones, baselineMilestones }: GanttChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  if (milestones.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-12">
        Ingen milepæler funnet for dette prosjektet.
      </div>
    );
  }

  const blMap = new Map<number, BaselineMilestone>(
    baselineMilestones.map((bm) => [bm.milestone_nr, bm])
  );

  const sorted = [...milestones].sort((a, b) => a.milestone_nr - b.milestone_nr);

  const today = new Date();
  const todayMs = today.getTime();

  // Date range: earliest planned/actual to latest planned/actual (or today)
  const allDates: number[] = [todayMs];
  for (const m of sorted) {
    allDates.push(new Date(m.date).getTime());
    const bl = blMap.get(m.milestone_nr);
    if (bl) allDates.push(new Date(bl.planned_date).getTime());
  }
  const minMs = Math.min(...allDates);
  const maxMs = Math.max(...allDates);
  const spanMs = maxMs - minMs || 1;

  // SVG dimensions
  const LABEL_W = 220;
  const PAD_L = 12;
  const PAD_R = 24;
  const CHART_W = 680;
  const TOTAL_W = LABEL_W + PAD_L + CHART_W + PAD_R;
  const ROW_H = 48;
  const BAR_H = 13;
  const AXIS_H = 52;
  const HEIGHT = AXIS_H + sorted.length * ROW_H + 8;

  function xPos(ms: number): number {
    return LABEL_W + PAD_L + ((ms - minMs) / spanMs) * CHART_W;
  }

  // Generate month tick marks
  const ticks: { x: number; label: string }[] = [];
  const startDate = new Date(minMs);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);
  const tickDate = new Date(startDate);
  while (tickDate.getTime() <= maxMs) {
    const x = xPos(tickDate.getTime());
    ticks.push({ x, label: formatMonthYear(tickDate.toISOString()) });
    tickDate.setMonth(tickDate.getMonth() + 1);
  }

  const todayX = xPos(todayMs);

  return (
    <div className="relative overflow-x-auto">
      <svg
        viewBox={`0 0 ${TOTAL_W} ${HEIGHT}`}
        className="w-full"
        style={{ minWidth: 640, fontFamily: 'inherit' }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Background grid */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x} y1={AXIS_H} x2={t.x} y2={HEIGHT - 4}
            stroke="#f1f5f9" strokeWidth={1}
          />
        ))}

        {/* Axis labels — rotated -60° so they never overlap */}
        {ticks.map((t, i) => (
          <text
            key={i}
            x={0} y={0}
            transform={`translate(${t.x}, ${AXIS_H - 6}) rotate(-60)`}
            textAnchor="end"
            fontSize={10}
            fill="#94a3b8"
            fontWeight="600"
          >
            {t.label}
          </text>
        ))}

        {/* TODAY line */}
        {todayX >= LABEL_W + PAD_L && todayX <= LABEL_W + PAD_L + CHART_W && (
          <>
            <line
              x1={todayX} y1={AXIS_H - 2} x2={todayX} y2={HEIGHT - 4}
              stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4,3"
            />
            <rect x={todayX - 16} y={2} width={32} height={14} rx={7} fill="#3b82f6" />
            <text x={todayX} y={12} textAnchor="middle" fontSize={8} fill="white" fontWeight="700">TODAY</text>
          </>
        )}

        {/* Rows */}
        {sorted.map((m, i) => {
          const bl = blMap.get(m.milestone_nr);
          const rowY = AXIS_H + i * ROW_H;
          const midY = rowY + ROW_H / 2;
          const isOk = m.status === 'OK';

          // Planned bar (blue/grey diamond or short bar)
          let plannedX: number | null = null;
          if (bl) {
            plannedX = xPos(new Date(bl.planned_date).getTime());
          }

          // Actual bar: show as a dot/marker at actual date
          const actualX = xPos(new Date(m.date).getTime());

          // Connector line between planned and actual (if both exist)
          const plannedMs = bl ? new Date(bl.planned_date).getTime() : null;
          const actualMs = new Date(m.date).getTime();

          // Colour for actual marker
          let actualColor = '#94a3b8'; // grey: not yet due
          if (isOk) {
            if (plannedMs !== null && actualMs > plannedMs) {
              actualColor = '#f97316'; // orange: late
            } else {
              actualColor = '#10b981'; // green: on time or early
            }
          } else {
            if (plannedMs !== null && todayMs > plannedMs) {
              actualColor = '#ef4444'; // red: overdue
            } else {
              actualColor = '#94a3b8'; // grey: not yet due
            }
          }

          const isHovered = tooltip?.name === m.name;

          return (
            <g key={`${m.project_id}-${m.milestone_nr}`}>
              {/* Row background on hover */}
              {isHovered && (
                <rect x={0} y={rowY} width={TOTAL_W} height={ROW_H} fill="#f0fdfa" rx={2} />
              )}

              {/* Milestone label */}
              <text
                x={LABEL_W - 8}
                y={midY + 4}
                textAnchor="end"
                fontSize={11}
                fill={isHovered ? '#0f766e' : '#374151'}
                fontWeight={isHovered ? '700' : '500'}
              >
                {m.milestone_nr}. {m.name.length > 28 ? m.name.slice(0, 28) + '…' : m.name}
              </text>

              {/* Connector line between planned and actual positions */}
              {plannedX !== null && (
                <line
                  x1={Math.min(plannedX, isOk ? actualX : (todayMs > (plannedMs ?? 0) ? xPos(todayMs) : plannedX))}
                  y1={midY}
                  x2={Math.max(plannedX, isOk ? actualX : plannedX)}
                  y2={midY}
                  stroke="#e2e8f0"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              )}

              {/* Planned diamond marker */}
              {plannedX !== null && (
                <g
                  transform={`translate(${plannedX}, ${midY})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    const svgRect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                    setTooltip({
                      name: m.name,
                      plannedDate: bl?.planned_date ?? null,
                      actualDate: isOk ? m.date : null,
                      deltaDays: isOk && bl ? calcDays(m.date, bl.planned_date) : (bl && todayMs > new Date(bl.planned_date).getTime() ? Math.round((todayMs - new Date(bl.planned_date).getTime()) / 86400000) : null),
                      isCompleted: isOk,
                      x: plannedX! / TOTAL_W * 100,
                      y: rowY,
                    });
                  }}
                >
                  <polygon
                    points={`0,${-BAR_H / 2 - 2} ${BAR_H / 2 + 2},0 0,${BAR_H / 2 + 2} ${-BAR_H / 2 - 2},0`}
                    fill="#94a3b8"
                    stroke="white"
                    strokeWidth={1.5}
                  />
                </g>
              )}

              {/* Actual marker (circle) */}
              <g
                transform={`translate(${actualX}, ${midY})`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  setTooltip({
                    name: m.name,
                    plannedDate: bl?.planned_date ?? null,
                    actualDate: isOk ? m.date : null,
                    deltaDays: isOk && bl ? calcDays(m.date, bl.planned_date) : (bl && todayMs > new Date(bl.planned_date).getTime() ? Math.round((todayMs - new Date(bl.planned_date).getTime()) / 86400000) : null),
                    isCompleted: isOk,
                    x: actualX / TOTAL_W * 100,
                    y: rowY,
                  });
                }}
              >
                {/* Hit area */}
                <circle r={10} fill="transparent" />
                {isOk ? (
                  <circle r={BAR_H / 2 + 1} fill={actualColor} stroke="white" strokeWidth={2} />
                ) : (
                  <>
                    <circle r={BAR_H / 2 + 1} fill="white" stroke={actualColor} strokeWidth={2} />
                    <circle r={BAR_H / 2 - 2} fill={actualColor} opacity={0.7} />
                  </>
                )}
              </g>
            </g>
          );
        })}

      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 pb-1 px-1 border-t border-gray-100 mt-1">
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="-7 -7 14 14"><polygon points="0,-6 6,0 0,6 -6,0" fill="#94a3b8" /></svg>
          <span className="text-xs text-gray-500">Planlagt dato</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="-7 -7 14 14"><circle r="5.5" fill="#10b981" stroke="white" strokeWidth="2" /></svg>
          <span className="text-xs text-gray-500">Ferdig (i tide)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="-7 -7 14 14"><circle r="5.5" fill="#f97316" stroke="white" strokeWidth="2" /></svg>
          <span className="text-xs text-gray-500">Ferdig (forsinket)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="-7 -7 14 14">
            <circle r="5.5" fill="white" stroke="#ef4444" strokeWidth="2" />
            <circle r="2.5" fill="#ef4444" opacity="0.7" />
          </svg>
          <span className="text-xs text-gray-500">Ikke ferdig (forfalt)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="-7 -7 14 14"><circle r="5.5" fill="white" stroke="#94a3b8" strokeWidth="2" /><circle r="2.5" fill="#94a3b8" opacity="0.5" /></svg>
          <span className="text-xs text-gray-500">Ikke ferdig (ikke forfalt)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="-7 -7 14 14"><line x1="0" y1="-6" x2="0" y2="6" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3,2" /></svg>
          <span className="text-xs text-gray-500">I dag</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 bg-gray-900 text-white rounded-xl px-4 py-3 text-xs shadow-xl border border-gray-700 min-w-48 max-w-64"
          style={{
            left: `clamp(0px, calc(${tooltip.x}% - 96px), calc(100% - 256px))`,
            top: `${tooltip.y + 8}px`,
          }}
        >
          <p className="font-bold mb-2 leading-snug text-white">{tooltip.name}</p>
          {tooltip.plannedDate && (
            <p className="text-gray-300 text-[10px]">Planlagt: {formatDate(tooltip.plannedDate)}</p>
          )}
          {tooltip.actualDate && (
            <p className="text-gray-300 text-[10px]">Faktisk: {formatDate(tooltip.actualDate)}</p>
          )}
          {!tooltip.actualDate && tooltip.isCompleted === false && (
            <p className="text-gray-400 text-[10px] italic">Ikke ferdig</p>
          )}
          {tooltip.deltaDays !== null && (
            <p className={`text-[10px] font-bold mt-1 ${tooltip.deltaDays > 0 ? 'text-red-400' : tooltip.deltaDays < 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
              {tooltip.deltaDays > 0 ? `+${tooltip.deltaDays} dager forsinket` : tooltip.deltaDays < 0 ? `${tooltip.deltaDays} dager tidlig` : 'På plan'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
