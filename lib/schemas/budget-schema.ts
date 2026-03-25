import { z } from 'zod';

const parseNok = z
  .union([z.string(), z.number(), z.undefined()])
  .transform((val) => {
    if (val === undefined || val === '' || val === null) return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[\s\u00a0]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  });

export const BudgetLineSchema = z.object({
  project_id: z.string(),
  budget_post: z.string(),
  budget_nok: parseNok,
  additional_nok: parseNok,
  budget_incl_additional_nok: parseNok,
  paid_nok: parseNok,
  eac_nok: parseNok,
});

export type BudgetLine = z.infer<typeof BudgetLineSchema>;

export function formatMnok(nok: number): string {
  if (nok === 0) return '0';
  return (nok / 1_000_000).toFixed(1);
}
