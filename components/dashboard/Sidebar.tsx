'use client';

import { LayoutDashboard, FolderKanban, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { type Project } from '@/lib/schemas/project-schema';

interface SidebarProps {
  allProjects: Project[];
  selectedProjectId: string;
  onSelect: (projectId: string) => void;
}

const statusConfig: Record<'RED' | 'YELLOW' | 'GREEN', { dot: string; badge: string; label: string }> = {
  GREEN: { dot: 'bg-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'On track' },
  YELLOW: { dot: 'bg-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: 'Deviation' },
  RED: { dot: 'bg-red-400', badge: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'At risk' },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Sidebar({ allProjects, selectedProjectId, onSelect }: SidebarProps) {
  const selected = allProjects.find((p) => p.project_id === selectedProjectId);

  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen sticky top-0 bg-slate-950 border-r border-slate-800/60">
      {/* Brand */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-bold tracking-tight leading-none">BULK</p>
            <p className="text-slate-500 text-[10px] tracking-widest uppercase mt-0.5 leading-none">
              Project Monitor
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-slate-800/60" />

      {/* Nav label */}
      <div className="px-4 pt-4 pb-1.5 flex items-center gap-2">
        <FolderKanban className="w-3 h-3 text-slate-500" />
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          Projects
        </span>
        <Badge className="ml-auto bg-slate-800 text-slate-400 border-slate-700 text-[9px] px-1.5 h-4">
          {allProjects.length}
        </Badge>
      </div>

      {/* Project list */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5 py-1">
          {allProjects.map((p) => {
            const isActive = p.project_id === selectedProjectId;
            const cfg = statusConfig[p.overall_status];
            return (
              <button
                key={p.project_id}
                onClick={() => onSelect(p.project_id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all group ${
                  isActive
                    ? 'bg-blue-600/20 border border-blue-500/30 text-white'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                {/* Status pulse dot */}
                <div className="relative shrink-0">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  {isActive && (
                    <div className={`absolute inset-0 w-2 h-2 rounded-full ${cfg.dot} animate-ping opacity-60`} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : ''}`}>
                    {p.project_id}
                  </p>
                  {p.company && (
                    <p className="text-[10px] text-slate-500 truncate mt-0.5 leading-none">
                      {p.company}
                    </p>
                  )}
                </div>

                <ChevronRight
                  className={`w-3 h-3 shrink-0 transition-transform ${
                    isActive ? 'text-blue-400 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <Separator className="bg-slate-800/60" />

      {/* Selected project manager footer */}
      {selected && (
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <Avatar size="sm" className="shrink-0">
              <AvatarFallback className="bg-slate-700 text-slate-300 text-[10px] font-bold">
                {getInitials(selected.project_manager)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold leading-none mb-0.5">
                Manager
              </p>
              <p className="text-xs text-slate-300 font-medium truncate">
                {selected.project_manager}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Report date
            </span>
            <Badge
              variant="outline"
              className="text-[10px] border-slate-700 text-slate-400 bg-slate-800/50 h-5 px-2"
            >
              {selected.report_date}
            </Badge>
          </div>
        </div>
      )}
    </aside>
  );
}
