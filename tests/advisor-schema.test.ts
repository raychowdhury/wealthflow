import { describe, it, expect } from 'vitest';
import { AdvisorResponseSchema } from '@/lib/advisor-schema';

describe('AdvisorResponseSchema', () => {
  it('accepts valid advisor response', () => {
    const valid = {
      insights: [{ title: 'Test', why: 'Because math', impact_aed: 1000, confidence: 'high' }],
      alerts: [{ type: 'cash', message: 'Cash goes negative', monthIndex: 2 }],
      actions: [{
        id: 'action-1',
        label: 'Pay off debt',
        changes: { debtStrategy: 'aggressive' },
        expectedOutcome: { netWorthDelta: 5000, minCashDelta: -500 },
      }],
    };
    const result = AdvisorResponseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects extra keys (strict fields enforced)', () => {
    const invalid = {
      insights: [{ title: 'T', why: 'W', impact_aed: 0, confidence: 'UNKNOWN' }], // bad confidence
      alerts: [],
      actions: [],
    };
    const result = AdvisorResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects response with 0 insights', () => {
    const empty = { insights: [], alerts: [], actions: [] };
    const result = AdvisorResponseSchema.safeParse(empty);
    expect(result.success).toBe(false);
  });
});
