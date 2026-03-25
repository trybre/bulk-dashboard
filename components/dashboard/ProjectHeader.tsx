'use client';

import { CalendarDays, User2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { type Project } from '@/lib/schemas/project-schema';

interface ProjectHeaderProps {
  project: Project;
  allProjects: Project[];
  onNavigate: (projectId: string) => void;
}

const statusConfig = {
  GREEN: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: TrendingUp,
    label: 'On Track',
  },
  YELLOW: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Minus,
    label: 'Deviation',
  },
  RED: {
    badge: 'bg-red-50 text-red-700 border-red-200',
    icon: TrendingDown,
    label: 'At Risk',
  },
};

function formatReportDate(dateStr: string): string {
  try {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const fullYear = parseInt(year) < 100 ? 2000 + parseInt(year) : parseInt(year);
      const d = new Date(fullYear, parseInt(month) - 1, parseInt(day));
      return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    }
    return new Date(dateStr).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const cfg = statusConfig[project.overall_status];
  const StatusIcon = cfg.icon;

  return (
    <header className="bg-white border-b border-gray-100 px-8 py-5 relative overflow-hidden">
      {/* Teal left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-700" />

      <div className="flex items-start justify-between gap-6 pl-3">
        {/* Left: identity */}
        <div className="min-w-0 flex-1">
          <div className="mb-2">
            <span className="inline-block text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-0.5 rounded-sm uppercase tracking-widest">
              Infra Projects
            </span>
          </div>

          <h1 className="text-2xl font-bold text-teal-800 leading-tight">
            Bulk Infrastructure | Management Report
          </h1>
          <p className="text-base text-gray-500 mt-1 font-normal">
            Project status: {project.project_name} – {formatReportDate(project.report_date)}
          </p>

          <div className="flex items-center gap-5 mt-2.5 flex-wrap text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <User2 className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-medium text-gray-700">{project.project_manager}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
              <span>{project.report_date}</span>
            </div>
          </div>
        </div>

        {/* Right: overall status + Bulk wordmark */}
        <div className="flex items-center gap-5 shrink-0">
          <div className="text-right">
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold mb-1.5">
              Overall Status
            </p>
            <Badge
              variant="outline"
              className={`gap-1.5 font-semibold text-sm px-3 py-1 h-auto ${cfg.badge}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {cfg.label}
            </Badge>
          </div>

          {/* Bulk wordmark */}
          <div className="border-l border-gray-100 pl-5">
            <p className="text-3xl font-black text-teal-800 tracking-tight leading-none">bulk</p>
            <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-0.5">Infrastructure</p>
          </div>
        </div>
      </div>
    </header>
  );
}


