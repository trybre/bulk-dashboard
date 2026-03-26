import { z } from 'zod';

const parseNum = z
  .union([z.string(), z.number()])
  .optional()
  .transform((val) => {
    if (val === undefined || val === '' || val === null) return 0;
    if (typeof val === 'number') return val;
    const n = parseFloat(String(val).trim());
    return isNaN(n) ? 0 : n;
  });

const parseIntNum = z
  .union([z.string(), z.number()])
  .optional()
  .transform((val) => {
    if (val === undefined || val === '' || val === null) return 0;
    if (typeof val === 'number') return Math.round(val);
    const n = parseInt(String(val).trim());
    return isNaN(n) ? 0 : n;
  });

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
  // Financials KPIs
  completion_rate: parseNum,
  variation_orders: parseIntNum,
  // Risk & Challenges
  risk_comment: z.string().optional().default(''),
  // Health & Safety KPIs (format: "current|previous")
  hs_injuries: z.string().optional().default('0|0'),
  hs_near_misses: z.string().optional().default('0|0'),
  hs_hipo: z.string().optional().default('0|0'),
  hs_headcount: z.string().optional().default('0|0'),
  hs_hours_worked: z.string().optional().default('0|0'),
  // Quality KPIs (format: "current|previous")
  quality_punch_registered: z.string().optional().default('0|0'),
  quality_punch_cleared: z.string().optional().default('0|0'),
  quality_mc_inspections: z.string().optional().default('0|0'),
  quality_deviations: z.string().optional().default('0|0'),
});

export type Project = z.infer<typeof ProjectSchema>;

export function statusToColor(status: string): 'green' | 'yellow' | 'red' {
  const s = status.toLowerCase().trim();
  // Explicit enum values
  if (s === 'red') return 'red';
  if (s === 'yellow') return 'yellow';
  if (s === 'green') return 'green';
  // Text-based status values
  if (s.includes('critical') || s.includes('major deviation')) return 'red';
  if (
    s.includes('deviation') ||
    s.includes('delay') ||
    s.includes('at risk') ||
    s.includes('minor')
  ) return 'yellow';
  return 'green';
}

export function parsePair(val: string | undefined, defaultVal = '0|0'): [string, string] {
  const str = val ?? defaultVal;
  const [a, b] = str.split('|');
  return [a?.trim() ?? '0', b?.trim() ?? '0'];
}
