import { describe, it, expect } from 'vitest';
import { computeForecast } from '@/lib/forecast';
import type { ScenarioInput } from '@/lib/types';

const BASE: ScenarioInput = {
  id: 'fc-1',
  currency: 'AED',
  months: 60,
  initialCash: 100000,
  incomes: [{ id: 'i1', label: 'Salary', amount: 20000, startMonth: 0, growthRate: 0 }],
  expenses: [{ id: 'e1', label: 'Living', amount: 10000, category: 'fixed', startMonth: 0, growthRate: 0 }],
  debts: [],
  investments: [],
};

describe('computeForecast', () => {
  it('produces correct snapshot count', () => {
    const r = computeForecast(BASE);
    expect(r.snapshots).toHaveLength(60);
  });

  it('cash grows by net income each month (no debt/investments)', () => {
    const r = computeForecast(BASE);
    expect(r.snapshots[0].cash).toBe(110000); // 100k + 20k - 10k
    expect(r.snapshots[1].cash).toBe(120000);
  });

  it('all values are 2dp rounded', () => {
    const r = computeForecast(BASE);
    for (const s of r.snapshots) {
      expect(s.cash).toBe(Math.round(s.cash * 100) / 100);
      expect(s.netWorth).toBe(Math.round(s.netWorth * 100) / 100);
    }
  });

  it('debt pays off and debtFreeMonth is set', () => {
    const s: ScenarioInput = {
      ...BASE,
      debts: [{ id: 'd1', label: 'Loan', balance: 5000, annualRate: 0, minPayment: 5000, strategy: 'min' }],
    };
    const r = computeForecast(s);
    expect(r.summary.debtFreeMonth).toBe(0); // paid off in month 0
  });

  it('negative cash months detected', () => {
    const s: ScenarioInput = {
      ...BASE,
      initialCash: 0,
      expenses: [{ id: 'e1', label: 'Huge cost', amount: 30000, category: 'fixed', startMonth: 0, growthRate: 0 }],
    };
    const r = computeForecast(s);
    expect(r.summary.negativeCashMonths.length).toBeGreaterThan(0);
  });
});
