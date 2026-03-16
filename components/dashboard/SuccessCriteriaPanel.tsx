'use client';

import { useState } from 'react';
import { Clock, DollarSign, CheckCircle2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { statusToColor, type Project } from '@/lib/schemas/project-schema';

interface SuccessCriteriaPanelProps {
  project: Project;
}

const colorConfig = {
  green: {
    cardBorder: 'border-emerald-100',
    cardBg: 'bg-gradient-to-b from-emerald-50/50 to-white',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50',
    dot: 'bg-emerald-500',
    statusIcon: TrendingUp,
    headerAccent: 'text-emerald-600',
  },
  yellow: {
    cardBorder: 'border-amber-100',
    cardBg: 'bg-gradient-to-b from-amber-50/50 to-white',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50',
    dot: 'bg-amber-500',
    statusIcon: Minus,
    headerAccent: 'text-amber-600',
  },
  red: {
    cardBorder: 'border-red-100',
    cardBg: 'bg-gradient-to-b from-red-50/50 to-white',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    badge: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50',
    dot: 'bg-red-500',
    statusIcon: TrendingDown,
    headerAccent: 'text-red-600',
  },
};

interface CriteriaCardProps {
  name: string;
  weight: string;
  priority: number;
  status: string;
  comment: string;
  icon: React.ReactNode;
}

function CriteriaCard({ name, weight, priority, status, comment, icon }: CriteriaCardProps) {
  const color = statusToColor(status);
  const cfg = colorConfig[color];
  const StatusIcon = cfg.statusIcon;
  const [expanded, setExpanded] = useState(false);
  const isLong = comment.length > 100;

  return (
    <Card className={`flex-1 shadow-sm border ${cfg.cardBorder} overflow-hidden`}>
      <CardHeader className={`px-5 pt-5 pb-4 ${cfg.cardBg}`}>
        <div className="flex items-start justify-between gap-2">
          {/* Icon + name */}
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.iconBg}`}>
              <span className={cfg.iconColor}>{icon}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{name}</p>
              <p className="text-[10px] text-gray-400 font-medium">Priority {priority}</p>
            </div>
          </div>
          {/* Weight badge */}
          <Badge variant="secondary" className="text-[10px] font-bold px-2 shrink-0">
            {weight}
          </Badge>
        </div>

        <Separator className="mt-3 bg-gray-100" />

        {/* Status badge */}
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="outline" className={`gap-1.5 font-semibold text-xs px-2.5 py-1 h-auto ${cfg.badge}`}>
            <StatusIcon className="w-3 h-3" />
            {status}
          </Badge>
        </div>
      </CardHeader>

      {comment && (
        <CardContent className="px-5 pb-4 pt-0">
          <p className={`text-xs text-gray-500 leading-relaxed ${!expanded && isLong ? 'line-clamp-2' : ''}`}>
            {comment}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 mt-2 font-medium"
            >
              {expanded ? (
                <><ChevronUp className="w-3 h-3" /> Show less</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> Read more</>
              )}
            </button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function SuccessCriteriaPanel({ project }: SuccessCriteriaPanelProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Success Criteria
        </h2>
        <Separator className="flex-1" />
      </div>
      <div className="flex gap-4">
        <CriteriaCard
          name="Time"
          weight="35%"
          priority={1}
          status={project.time_status}
          comment={project.time_comment}
          icon={<Clock className="w-4 h-4" />}
        />
        <CriteriaCard
          name="Cost"
          weight="35%"
          priority={2}
          status={project.cost_status}
          comment={project.cost_comment}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <CriteriaCard
          name="Quality"
          weight="30%"
          priority={3}
          status={project.quality_status}
          comment={project.quality_comment}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
      </div>
    </section>
  );
}
