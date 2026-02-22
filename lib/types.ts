// ── Scenario input types ──────────────────────────────────────────────────────

export interface IncomeInput {
  id: string;
  label: string;
  amount: number;
  startMonth: number;
  endMonth?: number | null;
  growthRate: number; // annual %
}

export interface ExpenseInput {
  id: string;
  label: string;
  amount: number;
  category: 'fixed' | 'discretionary' | 'rent';
  startMonth: number;
  endMonth?: number | null;
  growthRate: number; // annual %
  isOneTime?: boolean; // if true, only applies in startMonth
}

export interface DebtInput {
  id: string;
  label: string;
  balance: number;
  annualRate: number;
  minPayment: number;
  strategy: 'min' | 'aggressive' | 'instant';
}

export interface InvestmentInput {
  id: string;
  label: string;
  currentValue: number;
  monthlyContribution: number;
  expectedAnnualReturn: number;
}

/** A single one-time cash event (bonus, home purchase, windfall, etc.) */
export interface OneTimeEvent {
  id: string;
  label: string;
  amount: number;   // positive = inflow, negative = outflow
  month: number;    // 0-based month index when it occurs
}

/** Financial goals: work backwards from a target */
export interface FinancialGoal {
  id: string;
  label: string;
  targetAmount: number;
  targetMonth: number;  // 0-based month by which goal should be reached
  type: 'savings' | 'net_worth' | 'investment';
}

export interface ScenarioInput {
  id: string;
  currency: string;
  months: number;
  initialCash: number;
  incomes: IncomeInput[];
  expenses: ExpenseInput[];
  debts: DebtInput[];
  investments: InvestmentInput[];
  // Financial depth fields (all optional for backwards compatibility)
  inflationRate?: number;     // annual %, e.g. 3 = 3%
  taxRate?: number;           // effective marginal tax rate %, applied to income
  oneTimeEvents?: OneTimeEvent[];
  goals?: FinancialGoal[];
}

// ── Forecast output types ─────────────────────────────────────────────────────

export interface MonthSnapshot {
  month: number;         // 0-based index
  cash: number;
  netWorth: number;
  totalDebt: number;
  totalInvestments: number;
  totalIncome: number;
  totalExpenses: number;
  totalDebtPayment: number;
  totalInvestmentContribution: number;
}

export interface GoalProgress {
  goalId: string;
  label: string;
  targetAmount: number;
  targetMonth: number;
  achievedMonth: number | null;  // null if not achieved within forecast horizon
  endValue: number;              // actual value at targetMonth (or end of forecast)
  onTrack: boolean;
}

export interface ForecastResult {
  snapshots: MonthSnapshot[];
  summary: {
    endCash: number;
    endNetWorth: number;
    minCash: number;
    minCashMonth: number;
    negativeCashMonths: number[];
    debtFreeMonth: number | null;
    totalInterestPaid: number;
    endInvestmentValue: number;
    totalTaxPaid: number;
  };
  goalProgress: GoalProgress[];
}

// ── User preferences ──────────────────────────────────────────────────────────

export interface UserPreferences {
  baseCurrency: string;
  riskProfile: 'low' | 'med' | 'high';
  emergencyFundMonths: number;
  advisorTone: 'concise' | 'neutral';
}
