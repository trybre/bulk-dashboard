'use client';

import { Card } from '@/components/ui/card';
import { statusToColor, type Project } from '@/lib/schemas/project-schema';

interface SuccessCriteriaPanelProps {
  project: Project;
}

const circleColors: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-emerald-500 shadow-emerald-200',
  yellow: 'bg-amber-400 shadow-amber-200',
  red: 'bg-red-500 shadow-red-200',
};

function CommentBullets({ text }: { text: string }) {
  if (!text) return null;
  const bullets = text
    .split(/\.\s+|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  return (
    <ul className="space-y-2">
      {bullets.map((b, i) => (
        <li key={i} className="flex gap-2 text-xs text-gray-600 leading-relaxed">
          <span className="text-teal-600 font-bold shrink-0 mt-0.5">›</span>
          <span>{b.endsWith('.') ? b : b + '.'}</span>
        </li>
      ))}
    </ul>
  );
}

interface CriterionRowProps {
  name: string;
  weight: string;
  status: string;
  comment: string;
  isLast?: boolean;
}

function CriterionRow({ name, weight, status, comment, isLast }: CriterionRowProps) {
  const color = statusToColor(status);
  const circleCls = circleColors[color];
  return (
    <div className={`flex gap-4 px-5 py-4 ${!isLast ? 'border-b border-gray-100' : ''}`}>
      {/* Status circle + label */}
      <div className="flex flex-col items-center gap-1.5 shrink-0 w-14 text-center">
        <div className={`w-9 h-9 rounded-full shadow-md ${circleCls}`} />
        <p className="text-[11px] font-bold text-gray-700 leading-tight">{name}</p>
        <p className="text-[10px] text-gray-400">{weight}</p>
      </div>
      {/* Comment bullets */}
      <div className="flex-1 min-w-0 pt-0.5">
        <CommentBullets text={comment} />
      </div>
    </div>
  );
}

export function SuccessCriteriaPanel({ project }: SuccessCriteriaPanelProps) {
  return (
    <Card className="shadow-sm border-teal-100 overflow-hidden">
      {/* Section header */}
      <div className="bg-teal-50 border-b border-teal-100 px-5 py-2.5">
        <h2 className="text-xs font-bold text-teal-900 uppercase tracking-wide">
          Overall Project Status
        </h2>
      </div>

      <CriterionRow
        name="Time"
        weight="45%"
        status={project.time_status}
        comment={project.time_comment}
      />
      <CriterionRow
        name="Cost"
        weight="45%"
        status={project.cost_status}
        comment={project.cost_comment}
      />
      <CriterionRow
        name="Quality"
        weight="10%"
        status={project.quality_status}
        comment={project.quality_comment}
        isLast
      />
    </Card>
  );
}
