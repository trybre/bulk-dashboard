import { z } from 'zod';

const parseNum = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return 0;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  });

export const BaselineProjectSchema = z.object({
  project_id: z.string().trim(),

  // ── Schedule ────────────────────────────────────────────────────────────────
  planned_completion_rate: parseNum,           // % complete expected at baseline date
  planned_time_status: z.enum(['RED', 'YELLOW', 'GREEN']).optional().default('GREEN'),

  // ── Cost ────────────────────────────────────────────────────────────────────
  planned_budget_nok: parseNum,                // original contract sum (NOK)
  planned_spend_to_date_nok: parseNum,         // expected spend by baseline date (NOK)
  planned_eac_nok: parseNum,                   // planned EAC at contract award
  planned_variation_orders: parseNum,          // expected number of VOs

  // ── Quality ─────────────────────────────────────────────────────────────────
  planned_quality_status: z.enum(['RED', 'YELLOW', 'GREEN']).optional().default('GREEN'),
  planned_punch_registered: parseNum,          // expected punch points registered
  planned_punch_cleared: parseNum,             // expected punch points cleared
  planned_mc_inspections: parseNum,            // expected MC inspections completed
  planned_deviations: parseNum,                // expected quality deviations

  // ── H&S ─────────────────────────────────────────────────────────────────────
  planned_injuries: parseNum,                  // target: 0
  planned_near_misses: parseNum,               // planned near-miss reports
  planned_hipo: parseNum,                      // target: 0 HiPo events
  planned_headcount: parseNum,                 // planned workforce headcount
  planned_hours_worked: parseNum,              // planned total hours worked to date

  // ── Overall ─────────────────────────────────────────────────────────────────
  planned_rag_status: z.enum(['RED', 'YELLOW', 'GREEN']),
});

export type BaselineProject = z.infer<typeof BaselineProjectSchema>;

export const BaselineMilestoneSchema = z.object({
  project_id: z.string().trim(),
  milestone_nr: z.coerce.number(),
  milestone_name: z.string(),
  planned_date: z.string(),
});

export type BaselineMilestone = z.infer<typeof BaselineMilestoneSchema>;

export interface BaselineData {
  projects: BaselineProject[];
  milestones: BaselineMilestone[];
  uploadedAt: string;
  fileName: string;
}
