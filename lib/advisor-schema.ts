import { z } from 'zod';

export const InsightSchema = z.object({
  title: z.string(),
  why: z.string(),
  impact_aed: z.number(),
  confidence: z.enum(['low', 'med', 'high']),
});

export const AlertSchema = z.object({
  type: z.enum(['cash', 'debt', 'rent', 'fx', 'portfolio']),
  message: z.string(),
  monthIndex: z.number().int().min(0),
});

export const ActionChangesSchema = z.object({
  debtStrategy: z.enum(['min', 'aggressive', 'instant']).optional(),
  expenseAdjustments: z.array(z.object({ expenseId: z.string(), delta: z.number() })).optional(),
  incomeAdjustments: z.array(z.object({ incomeId: z.string(), delta: z.number() })).optional(),
  investmentAdjustments: z.array(
    z.object({
      accountId: z.string(),
      monthlyContributionDelta: z.number(),
      expectedReturnDelta: z.number(),
    })
  ).optional(),
  fxOverride: z.object({ from: z.string(), to: z.string(), rate: z.number() }).optional(),
});

export const AdvisorActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  changes: ActionChangesSchema,
  expectedOutcome: z.object({
    netWorthDelta: z.number(),
    minCashDelta: z.number(),
  }),
});

export const AdvisorResponseSchema = z.object({
  insights: z.array(InsightSchema).min(1).max(6),
  alerts: z.array(AlertSchema),
  actions: z.array(AdvisorActionSchema),
});

export type AdvisorResponse = z.infer<typeof AdvisorResponseSchema>;
export type AdvisorAction = z.infer<typeof AdvisorActionSchema>;
export type AdvisorInsight = z.infer<typeof InsightSchema>;
export type AdvisorAlert = z.infer<typeof AlertSchema>;
