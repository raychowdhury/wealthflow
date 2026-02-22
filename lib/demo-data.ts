import type { ScenarioInput } from './types';

export interface ScenarioTemplate {
  name: string;
  tagline: string;
  emoji: string;
  color: string;            // accent hex
  tags: string[];
  scenario: Omit<ScenarioInput, 'id'>;
}

export const TEMPLATES: ScenarioTemplate[] = [
  {
    name: 'Young Professional',
    tagline: 'Early career · renting · paying off student debt',
    emoji: '🚀',
    color: '#6366f1',
    tags: ['Renting', 'Student debt', 'Starting out'],
    scenario: {
      currency: 'USD',
      months: 60,
      initialCash: 8_000,
      incomes: [
        { id: 'i1', label: 'Salary',    amount: 4_500, growthRate: 5, startMonth: 0 },
        { id: 'i2', label: 'Freelance', amount:   500, growthRate: 0, startMonth: 0 },
      ],
      expenses: [
        { id: 'e1', label: 'Rent',            amount: 1_400, category: 'rent',          growthRate: 3, startMonth: 0 },
        { id: 'e2', label: 'Groceries',       amount:   350, category: 'fixed',         growthRate: 2, startMonth: 0 },
        { id: 'e3', label: 'Transport',       amount:   200, category: 'fixed',         growthRate: 2, startMonth: 0 },
        { id: 'e4', label: 'Dining & Social', amount:   300, category: 'discretionary', growthRate: 2, startMonth: 0 },
        { id: 'e5', label: 'Subscriptions',   amount:    80, category: 'discretionary', growthRate: 0, startMonth: 0 },
        { id: 'e6', label: 'Utilities',       amount:   120, category: 'fixed',         growthRate: 2, startMonth: 0 },
      ],
      debts: [
        { id: 'd1', label: 'Student Loan', balance: 18_000, annualRate:  5.5, minPayment: 200, strategy: 'aggressive' },
        { id: 'd2', label: 'Credit Card',  balance:  2_500, annualRate: 19.9, minPayment:  75, strategy: 'aggressive' },
      ],
      investments: [
        { id: 'inv1', label: '401(k)',      currentValue: 5_000, monthlyContribution: 300, expectedAnnualReturn: 7 },
        { id: 'inv2', label: 'Index Fund',  currentValue: 2_000, monthlyContribution: 150, expectedAnnualReturn: 8 },
      ],
    },
  },

  {
    name: 'Family with Mortgage',
    tagline: 'Dual income · homeowner · building family wealth',
    emoji: '🏠',
    color: '#10b981',
    tags: ['Mortgage', 'Dual income', 'Kids'],
    scenario: {
      currency: 'USD',
      months: 60,
      initialCash: 22_000,
      incomes: [
        { id: 'i1', label: 'Primary salary', amount: 6_000, growthRate: 4, startMonth: 0 },
        { id: 'i2', label: 'Partner salary', amount: 4_200, growthRate: 3, startMonth: 0 },
      ],
      expenses: [
        { id: 'e1', label: 'Mortgage',        amount: 2_100, category: 'rent',          growthRate: 0, startMonth: 0 },
        { id: 'e2', label: 'Groceries',       amount:   700, category: 'fixed',         growthRate: 3, startMonth: 0 },
        { id: 'e3', label: 'Car & Transport', amount:   450, category: 'fixed',         growthRate: 2, startMonth: 0 },
        { id: 'e4', label: 'Childcare',       amount:   900, category: 'fixed',         growthRate: 3, startMonth: 0 },
        { id: 'e5', label: 'Dining & Leisure',amount:   400, category: 'discretionary', growthRate: 2, startMonth: 0 },
        { id: 'e6', label: 'Utilities & Bills',amount:  280, category: 'fixed',         growthRate: 2, startMonth: 0 },
        { id: 'e7', label: 'Insurance',       amount:   250, category: 'fixed',         growthRate: 2, startMonth: 0 },
      ],
      debts: [
        { id: 'd1', label: 'Car Loan', balance: 12_000, annualRate: 6.5, minPayment: 280, strategy: 'min' },
      ],
      investments: [
        { id: 'inv1', label: '401(k) Primary', currentValue: 45_000, monthlyContribution: 600, expectedAnnualReturn: 7 },
        { id: 'inv2', label: '401(k) Partner', currentValue: 28_000, monthlyContribution: 420, expectedAnnualReturn: 7 },
        { id: 'inv3', label: 'College Fund',   currentValue:  8_000, monthlyContribution: 200, expectedAnnualReturn: 6 },
      ],
    },
  },

  {
    name: 'Wealth Builder',
    tagline: 'Debt-free · high savings rate · FIRE journey',
    emoji: '💎',
    color: '#f59e0b',
    tags: ['Debt-free', 'FIRE', 'Investing'],
    scenario: {
      currency: 'USD',
      months: 60,
      initialCash: 35_000,
      incomes: [
        { id: 'i1', label: 'Salary',        amount: 7_500, growthRate: 4, startMonth: 0 },
        { id: 'i2', label: 'Side business', amount: 1_200, growthRate: 8, startMonth: 0 },
      ],
      expenses: [
        { id: 'e1', label: 'Rent',             amount: 1_600, category: 'rent',          growthRate: 3, startMonth: 0 },
        { id: 'e2', label: 'Food & Groceries', amount:   500, category: 'fixed',         growthRate: 2, startMonth: 0 },
        { id: 'e3', label: 'Transport',        amount:   150, category: 'fixed',         growthRate: 1, startMonth: 0 },
        { id: 'e4', label: 'Travel & Hobbies', amount:   400, category: 'discretionary', growthRate: 2, startMonth: 0 },
        { id: 'e5', label: 'Utilities',        amount:   180, category: 'fixed',         growthRate: 2, startMonth: 0 },
      ],
      debts: [],
      investments: [
        { id: 'inv1', label: 'Index Funds',    currentValue: 85_000, monthlyContribution: 1_500, expectedAnnualReturn: 8 },
        { id: 'inv2', label: 'Roth IRA',       currentValue: 30_000, monthlyContribution:   500, expectedAnnualReturn: 8 },
        { id: 'inv3', label: 'Real estate ETF',currentValue: 20_000, monthlyContribution:   300, expectedAnnualReturn: 6 },
      ],
    },
  },
];
