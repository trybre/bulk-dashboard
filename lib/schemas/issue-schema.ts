import { z } from 'zod';

export const IssueSchema = z.object({
  project_id: z.string(),
  issue_nr: z.coerce.number(),
  problem: z.string(),
  handling_plan: z.string().default(''),
  responsible: z.string(),
  deadline: z.string(),
});

export type Issue = z.infer<typeof IssueSchema>;
