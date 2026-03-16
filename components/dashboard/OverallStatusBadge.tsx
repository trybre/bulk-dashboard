'use client';

type OverallStatus = 'RED' | 'YELLOW' | 'GREEN';

interface OverallStatusBadgeProps {
  status: OverallStatus;
}

const statusConfig: Record<
  OverallStatus,
  { bg: string; border: string; text: string; dot: string; label: string; description: string }
> = {
  GREEN: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    dot: 'bg-green-500',
    label: 'GREEN',
    description: 'According to plan',
  },
  YELLOW: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    dot: 'bg-yellow-400',
    label: 'YELLOW',
    description: 'Deviation to plan',
  },
  RED: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    dot: 'bg-red-500',
    label: 'RED',
    description: 'Major deviation to plan',
  },
};

export function OverallStatusBadge({ status }: OverallStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div className={`${config.bg} ${config.border} border rounded-xl px-6 py-4 flex items-center gap-4`}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Overall Project Status
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center gap-3">
        <div className={`w-4 h-4 rounded-full ${config.dot} shadow-sm`} />
        <span className={`text-2xl font-bold ${config.text}`}>{config.label}</span>
        <span className={`text-lg ${config.text} opacity-80`}>— {config.description}</span>
      </div>
    </div>
  );
}
