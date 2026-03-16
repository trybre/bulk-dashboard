import { z } from 'zod';

export const MilestoneSchema = z.object({
  project_id: z.string(),
  milestone_nr: z.coerce.number(),
  name: z.string(),
  date: z.string(),
  status: z.enum(['OK', 'MIDLERTIDIG']),
});

export type Milestone = z.infer<typeof MilestoneSchema>;
