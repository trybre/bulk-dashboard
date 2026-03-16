import { z } from 'zod';

export const ProjectSchema = z.object({
  project_id: z.string(),
  project_name: z.string(),
  company: z.string(),
  project_manager: z.string(),
  report_date: z.string(),
  overall_status: z.enum(['RED', 'YELLOW', 'GREEN']),
  time_status: z.string(),
  time_comment: z.string().default(''),
  cost_status: z.string(),
  cost_comment: z.string().default(''),
  quality_status: z.string(),
  quality_comment: z.string().default(''),
});

export type Project = z.infer<typeof ProjectSchema>;

export function statusToColor(status: string): 'green' | 'yellow' | 'red' {
  const s = status.toLowerCase();
  if (s.includes('major deviation') || s === 'red') return 'red';
  if (s.includes('deviation')) return 'yellow';
  return 'green';
}
