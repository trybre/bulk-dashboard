'use client';

import { type Project, statusToColor } from '@/lib/schemas/project-schema';
import { type HistoryEntry } from '@/lib/excel-service';
import { TrendingUp, AlertTriangle, CheckCircle2, Clock, Users, ArrowUp, ArrowDown, Minus, GitCompareArrows } from 'lucide-react';

type OStatus = 'RED' | 'YELLOW' | 'GREEN';

interface PortfolioViewProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  previousProjects?: Project[];
  previousEntry?: HistoryEntry;
  currentEntry?: HistoryEntry;
}

const statusDot: Record<OStatus, string> = {
  GREEN: 'bg-emerald-400',
  YELLOW: 'bg-amber-400',
  RED: 'bg-red-400',
};

const statusLabel: Record<OStatus, string> = {
  GREEN: 'På plan',
  YELLOW: 'Avvik',
  RED: 'Kritisk',
};

const statusRowBg: Record<OStatus, string> = {
  GREEN: 'hover:bg-emerald-50/50',
  YELLOW: 'hover:bg-amber-50/50',
  RED: 'hover:bg-red-50/50',
};

// Status rank for determining direction of change (higher = worse)
const statusRank: Record<OStatus, number> = { GREEN: 0, YELLOW: 1, RED: 2 };

function StatusPill({ status }: { status: OStatus }) {
  const colors: Record<OStatus, string> = {
    GREEN: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    YELLOW: 'bg-amber-100 text-amber-800 border border-amber-200',
    RED: 'bg-red-100 text-red-800 border border-red-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${statusDot[status]}`} />
      {statusLabel[status]}
    </span>
  );
}

function StatusChangePill({ from, to }: { from: OStatus; to: OStatus }) {
  if (from === to) return null;
  const improved = statusRank[to] < statusRank[from];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${improved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
      <span className={`w-1 h-1 rounded-full ${statusDot[from]}`} />
      →
      <span className={`w-1 h-1 rounded-full ${statusDot[to]}`} />
    </span>
  );
}

function DeltaBadge({ delta, unit = 'pp', invert = false }: { delta: number; unit?: string; invert?: boolean }) {
  if (Math.abs(delta) < 0.05) {
    return <span className="text-[10px] text-gray-400 font-medium">–</span>;
  }
  const positive = invert ? delta < 0 : delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
      {positive ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      {Math.abs(delta).toFixed(1)}{unit}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch { return iso; }
}

function deriveStatus(val: string): OStatus {
  const color = statusToColor(val);
  if (color === 'red') return 'RED';
  if (color === 'yellow') return 'YELLOW';
  return 'GREEN';
}

export function PortfolioView({ projects, onSelectProject, previousProjects, previousEntry, currentEntry }: PortfolioViewProps) {
  const total = projects.length;
  const green = projects.filter((p) => p.overall_status === 'GREEN').length;
  const yellow = projects.filter((p) => p.overall_status === 'YELLOW').length;
  const red = projects.filter((p) => p.overall_status === 'RED').length;

  const avgCompletion =
    total > 0 ? projects.reduce((s, p) => s + (p.completion_rate ?? 0), 0) / total : 0;

  // Build a lookup map for previous projects
  const prevMap = new Map<string, Project>(
    (previousProjects ?? []).map((p) => [p.project_id, p])
  );

  const hasPrev = previousProjects && previousProjects.length > 0;

  // Previous averages for KPI delta
  const prevAvgCompletion =
    hasPrev
      ? (previousProjects!.reduce((s, p) => s + (p.completion_rate ?? 0), 0) / previousProjects!.length)
      : null;
  const prevRed = hasPrev ? previousProjects!.filter((p) => p.overall_status === 'RED').length : null;

  // Biggest movers by completion delta
  const movers = hasPrev
    ? projects
        .map((p) => {
          const prev = prevMap.get(p.project_id);
          if (!prev) return null;
          const delta = (p.completion_rate ?? 0) - (prev.completion_rate ?? 0);
          const statusChanged = p.overall_status !== prev.overall_status;
          return { p, prev, delta, statusChanged };
        })
        .filter(Boolean)
        .sort((a, b) => Math.abs(b!.delta) - Math.abs(a!.delta))
        .slice(0, 3)
    : [];

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-1">Infra Projects</p>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Bulk Infrastructure | Porteføljeoversikt</h1>
        <p className="text-sm text-gray-500 mt-1">{total} prosjekter totalt</p>
      </div>

      <main className="px-6 py-6 space-y-6 max-w-7xl pb-12">

        {/* Comparison banner */}
        {hasPrev && previousEntry && (
          <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
            <GitCompareArrows className="w-4 h-4 text-teal-600 shrink-0" />
            <p className="text-xs text-teal-800 font-medium">
              Sammenligner{currentEntry ? ` «${currentEntry.fileName}»` : ''} med forrige rapport:
              {' '}<span className="font-bold">«{previousEntry.fileName}»</span>
              {' '}({formatDate(previousEntry.uploadedAt)})
            </p>
          </div>
        )}

        {/* KPI summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{total}</p>
              <p className="text-xs text-gray-500 font-medium">Totalt prosjekter</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-700">{green}</p>
              <p className="text-xs text-gray-500 font-medium">På plan</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-amber-700">{yellow}</p>
              <p className="text-xs text-gray-500 font-medium">Avvik</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-black ${red > 0 ? 'text-red-700' : 'text-gray-900'}`}>{red}</p>
                {prevRed !== null && <DeltaBadge delta={red - prevRed} invert={true} unit="" />}
              </div>
              <p className="text-xs text-gray-500 font-medium">Kritiske</p>
            </div>
          </div>
        </div>

        {/* Completion bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-semibold text-gray-700">Gjennomsnittlig ferdigstillelsesgrad</span>
            <div className="ml-auto flex items-center gap-2">
              {prevAvgCompletion !== null && (
                <DeltaBadge delta={avgCompletion - prevAvgCompletion} />
              )}
              <span className="text-lg font-black text-teal-700">{avgCompletion.toFixed(1)}%</span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all"
              style={{ width: `${avgCompletion}%` }}
            />
          </div>
          {prevAvgCompletion !== null && (
            <div className="mt-2 relative h-1">
              {/* Previous marker */}
              <div
                className="absolute top-0 w-0.5 h-3 bg-gray-300 rounded-full -translate-y-1"
                style={{ left: `${prevAvgCompletion}%` }}
                title={`Forrige: ${prevAvgCompletion.toFixed(1)}%`}
              />
            </div>
          )}
        </div>

        {/* Biggest movers */}
        {movers.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-3.5 border-b border-gray-100 bg-gray-50/60">
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Største endringer siden forrige rapport</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-x divide-gray-100">
              {movers.map((m) => {
                if (!m) return null;
                const { p, prev, delta, statusChanged } = m;
                const improved = delta > 0;
                return (
                  <button
                    key={p.project_id}
                    onClick={() => onSelectProject(p.project_id)}
                    className="px-5 py-4 text-left hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-xs font-bold text-gray-900 group-hover:text-teal-700 transition-colors">{p.project_id}</p>
                        {p.company && <p className="text-[10px] text-gray-400 mt-0.5">{p.company}</p>}
                      </div>
                      {statusChanged && (
                        <StatusChangePill from={prev.overall_status} to={p.overall_status} />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-black ${improved ? 'text-emerald-600' : 'text-red-600'}`}>
                        {improved ? '+' : ''}{delta.toFixed(1)}pp
                      </span>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${improved ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        {improved
                          ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                          : <ArrowDown className="w-3.5 h-3.5 text-red-600" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {(prev.completion_rate ?? 0).toFixed(1)}% → {(p.completion_rate ?? 0).toFixed(1)}%
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Project table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800">Prosjektliste</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Prosjekt</th>
                  <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Selskap</th>
                  <th className="text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Tid</th>
                  <th className="text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Kostnad</th>
                  <th className="text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Kvalitet</th>
                  <th className="text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Ferdig %</th>
                  {hasPrev && (
                    <th className="text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Δ</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projects.map((p) => {
                  const prev = prevMap.get(p.project_id);
                  const completionDelta = prev ? (p.completion_rate ?? 0) - (prev.completion_rate ?? 0) : null;
                  const statusChanged = prev && prev.overall_status !== p.overall_status;

                  const timeStatus = deriveStatus(p.time_status);
                  const costStatus = deriveStatus(p.cost_status);
                  const qualityStatus = deriveStatus(p.quality_status);

                  return (
                    <tr
                      key={p.project_id}
                      onClick={() => onSelectProject(p.project_id)}
                      className={`cursor-pointer transition-colors ${statusRowBg[p.overall_status]}`}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot[p.overall_status]}`} />
                          <div>
                            <p className="font-bold text-gray-900 text-xs">{p.project_id}</p>
                            {p.project_name && p.project_name !== p.project_id && (
                              <p className="text-[10px] text-gray-500 truncate max-w-[160px]">{p.project_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600">{p.company}</td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <StatusPill status={p.overall_status} />
                          {statusChanged && prev && (
                            <StatusChangePill from={prev.overall_status} to={p.overall_status} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${statusDot[timeStatus]}`} title={p.time_status} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${statusDot[costStatus]}`} title={p.cost_status} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${statusDot[qualityStatus]}`} title={p.quality_status} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-xs font-bold text-teal-700">{(p.completion_rate ?? 0).toFixed(1)}%</span>
                      </td>
                      {hasPrev && (
                        <td className="px-6 py-3.5 text-right">
                          {completionDelta !== null
                            ? <DeltaBadge delta={completionDelta} />
                            : <span className="text-[10px] text-gray-300">Ny</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

