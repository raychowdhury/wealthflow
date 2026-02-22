import type {
  ScenarioInput,
  MonthSnapshot,
  ForecastResult,
  GoalProgress,
  IncomeInput,
  ExpenseInput,
  DebtInput,
  InvestmentInput,
} from './types';

const r2 = (n: number) => Math.round(n * 100) / 100;

function monthlyIncome(income: IncomeInput, month: number): number {
  if (month < income.startMonth) return 0;
  if (income.endMonth != null && month > income.endMonth) return 0;
  const years = Math.floor(month / 12);
  return r2(income.amount * Math.pow(1 + income.growthRate / 100, years));
}

function monthlyExpense(expense: ExpenseInput, month: number): number {
  if (month < expense.startMonth) return 0;
  if (expense.endMonth != null && month > expense.endMonth) return 0;
  // One-time expenses only occur in their startMonth
  if (expense.isOneTime && month !== expense.startMonth) return 0;
  const years = Math.floor(month / 12);
  return r2(expense.amount * Math.pow(1 + expense.growthRate / 100, years));
}

interface DebtState {
  balance: number;
  annualRate: number;
  minPayment: number;
  strategy: DebtInput['strategy'];
  paidOff: boolean;
}

function stepDebt(state: DebtState, extraCash: number): { payment: number; interest: number; newBalance: number } {
  if (state.paidOff || state.balance <= 0) return { payment: 0, interest: 0, newBalance: 0 };

  const monthlyRate = state.annualRate / 100 / 12;
  const interest = r2(state.balance * monthlyRate);
  let payment = 0;

  if (state.strategy === 'instant') {
    payment = r2(state.balance + interest);
  } else if (state.strategy === 'aggressive') {
    payment = r2(Math.min(state.balance + interest, state.minPayment + Math.max(0, extraCash * 0.3)));
  } else {
    payment = r2(Math.min(state.balance + interest, state.minPayment));
  }

  const newBalance = r2(Math.max(0, state.balance + interest - payment));
  return { payment, interest, newBalance };
}

function stepInvestment(value: number, contribution: number, annualReturn: number): number {
  const monthlyRate = annualReturn / 100 / 12;   // annualReturn is stored as % (e.g. 8 = 8%)
  return r2(value * (1 + monthlyRate) + contribution);
}

export function computeForecast(scenario: ScenarioInput): ForecastResult {
  const {
    months, initialCash, incomes, expenses, debts, investments,
    inflationRate = 0,
    taxRate = 0,
    oneTimeEvents = [],
    goals = [],
  } = scenario;

  let cash = initialCash;
  const debtStates: DebtState[] = debts.map((d) => ({
    balance: d.balance,
    annualRate: d.annualRate,
    minPayment: d.minPayment,
    strategy: d.strategy,
    paidOff: false,
  }));
  const invValues: number[] = investments.map((i) => i.currentValue);

  const snapshots: MonthSnapshot[] = [];
  let totalInterestPaid = 0;
  let totalTaxPaid = 0;
  const negativeCashMonths: number[] = [];
  let debtFreeMonth: number | null = null;
  let minCash = cash;
  let minCashMonth = 0;

  // Goal tracking: for each goal, track when it was first achieved
  const goalAchievedMonth: (number | null)[] = goals.map(() => null);

  // Inflation deflator: purchasing power of future cash is reduced.
  // We apply it to real income and expenses as a real-terms adjustment.
  const monthlyInflation = inflationRate / 100 / 12;

  for (let m = 0; m < months; m++) {
    // ── Income ──────────────────────────────────────────────────────────────
    const grossIncome = r2(incomes.reduce((s, inc) => s + monthlyIncome(inc, m), 0));
    const taxThisMonth = r2(grossIncome * (taxRate / 100));
    const netIncome = r2(grossIncome - taxThisMonth);
    totalTaxPaid = r2(totalTaxPaid + taxThisMonth);

    // ── Expenses (inflation-adjusted) ────────────────────────────────────────
    const inflationMultiplier = Math.pow(1 + monthlyInflation, m);
    const totalExpenses = r2(
      expenses.reduce((s, exp) => s + monthlyExpense(exp, m) * inflationMultiplier, 0)
    );

    // ── One-time events ──────────────────────────────────────────────────────
    const oneTimeNet = r2(
      oneTimeEvents
        .filter((ev) => ev.month === m)
        .reduce((s, ev) => s + ev.amount, 0)
    );

    // Compute available cash before debt/investments
    const preDebtCash = r2(cash + netIncome - totalExpenses + oneTimeNet);

    // ── Debt payments ────────────────────────────────────────────────────────
    let totalDebtPayment = 0;
    let totalInterestThisMonth = 0;
    const extraCash = Math.max(0, preDebtCash);

    for (let di = 0; di < debtStates.length; di++) {
      const { payment, interest, newBalance } = stepDebt(debtStates[di], extraCash);
      debtStates[di].balance = newBalance;
      if (newBalance <= 0) debtStates[di].paidOff = true;
      totalDebtPayment = r2(totalDebtPayment + payment);
      totalInterestThisMonth = r2(totalInterestThisMonth + interest);
    }
    totalInterestPaid = r2(totalInterestPaid + totalInterestThisMonth);

    // ── Investment contributions ─────────────────────────────────────────────
    let totalContrib = 0;
    for (let ii = 0; ii < invValues.length; ii++) {
      const contrib = investments[ii].monthlyContribution;
      invValues[ii] = stepInvestment(invValues[ii], contrib, investments[ii].expectedAnnualReturn);
      totalContrib = r2(totalContrib + contrib);
    }

    cash = r2(preDebtCash - totalDebtPayment - totalContrib);

    if (cash < minCash) { minCash = cash; minCashMonth = m; }
    if (cash < 0) negativeCashMonths.push(m);

    const totalDebt = r2(debtStates.reduce((s, d) => s + d.balance, 0));
    const totalInv = r2(invValues.reduce((s, v) => s + v, 0));
    const netWorth = r2(cash + totalInv - totalDebt);

    if (debtFreeMonth === null && totalDebt === 0 && debts.length > 0) {
      debtFreeMonth = m;
    }

    // ── Goal tracking ────────────────────────────────────────────────────────
    goals.forEach((goal, gi) => {
      if (goalAchievedMonth[gi] !== null) return;
      const actual =
        goal.type === 'savings'     ? cash :
        goal.type === 'net_worth'   ? netWorth :
        /* investment */              totalInv;
      if (actual >= goal.targetAmount) goalAchievedMonth[gi] = m;
    });

    snapshots.push({
      month: m,
      cash,
      netWorth,
      totalDebt,
      totalInvestments: totalInv,
      totalIncome: netIncome,
      totalExpenses,
      totalDebtPayment,
      totalInvestmentContribution: totalContrib,
    });
  }

  const last = snapshots[snapshots.length - 1];

  // ── Goal progress summary ────────────────────────────────────────────────
  const goalProgress: GoalProgress[] = goals.map((goal, gi) => {
    const achievedMonth = goalAchievedMonth[gi];
    const snapshotAtTarget = snapshots[Math.min(goal.targetMonth, snapshots.length - 1)];
    const endValue =
      goal.type === 'savings'   ? snapshotAtTarget.cash :
      goal.type === 'net_worth' ? snapshotAtTarget.netWorth :
      snapshotAtTarget.totalInvestments;
    return {
      goalId: goal.id,
      label: goal.label,
      targetAmount: goal.targetAmount,
      targetMonth: goal.targetMonth,
      achievedMonth,
      endValue,
      onTrack: achievedMonth !== null && achievedMonth <= goal.targetMonth,
    };
  });

  return {
    snapshots,
    summary: {
      endCash: last.cash,
      endNetWorth: last.netWorth,
      minCash,
      minCashMonth,
      negativeCashMonths,
      debtFreeMonth,
      totalInterestPaid,
      endInvestmentValue: last.totalInvestments,
      totalTaxPaid,
    },
    goalProgress,
  };
}
