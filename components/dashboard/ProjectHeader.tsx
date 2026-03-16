'use client';

import { CalendarDays, User2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { type Project } from '@/lib/schemas/project-schema';

interface ProjectHeaderProps {
  project: Project;
  allProjects: Project[];
  onNavigate: (projectId: string) => void;
}

const statusConfig = {
  GREEN: {
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15',
    icon: TrendingUp,
    label: 'On Track',
    dot: 'bg-emerald-400',
  },
  YELLOW: {
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-400',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/15',
    icon: Minus,
    label: 'Deviation',
    dot: 'bg-amber-400',
  },
  RED: {
    bg: 'bg-red-500/10 border-red-500/20',
    text: 'text-red-400',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/15',
    icon: TrendingDown,
    label: 'At Risk',
    dot: 'bg-red-400',
  },
};

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const cfg = statusConfig[project.overall_status];
  const StatusIcon = cfg.icon;

  return (
    <div className="bg-white border-b border-gray-100 px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        {/* Left: project identity */}
        <div className="min-w-0 flex-1">
          {/* Project ID chip */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded tracking-widest uppercase">
              {project.project_id}
            </span>
          </div>

          <h1 className="text-xl font-bold text-gray-900 leading-tight truncate">
            {project.project_name}
          </h1>
          {project.company && (
            <p className="text-sm text-gray-400 font-normal mt-0.5 truncate">{project.company}</p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-4 mt-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <User2 className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-medium text-gray-700">{project.project_manager}</span>
            </div>
            <Separator orientation="vertical" className="h-3 bg-gray-200" />
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
              <span>{project.report_date}</span>
            </div>
          </div>
        </div>

        {/* Right: overall status */}
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${cfg.bg} shrink-0`}>
          <div className="text-right">
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold mb-1">
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
        </div>
      </div>
    </div>
  );
}
