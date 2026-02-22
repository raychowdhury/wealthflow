import { describe, it, expect } from 'vitest';
import { runHeuristicAdvisor } from '@/lib/heuristic-advisor';
import { computeForecast } from '@/lib/forecast';
import { AdvisorResponseSchema } from '@/lib/advisor-schema';
import type { ScenarioInput } from '@/lib/types';

const SCENARIO: ScenarioInput = {
  id: 'test-1',
  currency: 'AED',
  months: 12,
  initialCash: 5000,
  incomes: [{ id: 'i1', label: 'Salary', amount: 10000, startMonth: 0, growthRate: 0 }],
  expenses: [
    { id: 'e1', label: 'Rent', amount: 7000, category: 'rent', startMonth: 0, growthRate: 0 },
    { id: 'e2', label: 'Entertainment', amount: 5000, category: 'discretionary', startMonth: 0, growthRate: 0 },
  ],
  debts: [{ id: 'd1', label: 'Loan', balance: 50000, annualRate: 8, minPayment: 1200, strategy: 'min' }],
  investments: [{ id: 'inv1', label: 'Stocks', currentValue: 20000, monthlyContribution: 500, expectedAnnualReturn: 0.08 }],
};

describe('heuristic-advisor', () => {
  it('produces schema-valid output', () => {
    const forecast = computeForecast(SCENARIO);
    const result = runHeuristicAdvisor(SCENARIO, forecast, 3);
    const parsed = AdvisorResponseSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('generates a cash alert when cash goes negative', () => {
    const forecast = computeForecast(SCENARIO);
    const result = runHeuristicAdvisor(SCENARIO, forecast, 3);
    const cashAlerts = result.alerts.filter((a) => a.type === 'cash');
    // expenses (12k) > income (10k) so cash should go negative
    expect(cashAlerts.length).toBeGreaterThan(0);
  });

  it('generates a debt alert', () => {
    const forecast = computeForecast(SCENARIO);
    const result = runHeuristicAdvisor(SCENARIO, forecast, 3);
    const debtAlerts = result.alerts.filter((a) => a.type === 'debt');
    expect(debtAlerts.length).toBeGreaterThan(0);
  });

  it('suggests reduce-discretionary action when cash negative', () => {
    const forecast = computeForecast(SCENARIO);
    const result = runHeuristicAdvisor(SCENARIO, forecast, 3);
    const hasDisc = result.actions.some((a) => a.id === 'reduce-discretionary');
    expect(hasDisc).toBe(true);
  });

  it('all impact_aed values are 2dp rounded', () => {
    const forecast = computeForecast(SCENARIO);
    const result = runHeuristicAdvisor(SCENARIO, forecast, 3);
    for (const ins of result.insights) {
      expect(ins.impact_aed).toBe(Math.round(ins.impact_aed * 100) / 100);
    }
  });
});
