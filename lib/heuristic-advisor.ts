/**
 * Rule-based advisor fallback — no LLM required.
 * Generates deterministic insights, alerts, and actions from scenario + forecast data.
 */
import type { ScenarioInput, ForecastResult } from './types';
import type { AdvisorResponse } from './advisor-schema';

const r2 = (n: number) => Math.round(n * 100) / 100;

export function runHeuristicAdvisor(
  scenario: ScenarioInput,
  forecast: ForecastResult,
  emergencyFundMonths = 3
): AdvisorResponse {
  const { summary, snapshots } = forecast;
  const currency = scenario.currency;

  const monthlyExpenses = snapshots.length > 0
    ? r2(snapshots.slice(0, 3).reduce((s, sn) => s + sn.totalExpenses, 0) / Math.min(3, snapshots.length))
    : 0;
  const emergencyTarget = r2(monthlyExpenses * emergencyFundMonths);
  const totalDebt = r2(scenario.debts.reduce((s, d) => s + d.balance, 0));
  const totalInterestEstimate = r2(scenario.debts.reduce((s, d) => s + d.balance * (d.annualRate / 100), 0));

  // ── Alerts ───────────────────────────────────────────────────────────────
  const alerts: AdvisorResponse['alerts'] = [];

  for (const m of summary.negativeCashMonths.slice(0, 5)) {
    alerts.push({
      type: 'cash',
      message: `Cash goes negative (${currency} ${r2(snapshots[m].cash).toLocaleString()}) in month ${m + 1}.`,
      monthIndex: m,
    });
  }

  // Rent spike: month where rent expense jumps > 20% vs previous month
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1].totalExpenses;
    const curr = snapshots[i].totalExpenses;
    if (prev > 0 && (curr - prev) / prev > 0.2) {
      alerts.push({ type: 'rent', message: `Expense spike of ${r2(curr - prev).toLocaleString()} ${currency} in month ${i + 1}.`, monthIndex: i });
      break; // one alert max for brevity
    }
  }

  if (totalInterestEstimate > 0) {
    alerts.push({
      type: 'debt',
      message: `Estimated annual interest drag: ${currency} ${totalInterestEstimate.toLocaleString()}. Consider accelerating repayment.`,
      monthIndex: 0,
    });
  }

  if (summary.endCash < emergencyTarget) {
    alerts.push({
      type: 'cash',
      message: `Emergency buffer below target (${emergencyFundMonths}× expenses = ${currency} ${emergencyTarget.toLocaleString()}). Current end cash: ${currency} ${summary.endCash.toLocaleString()}.`,
      monthIndex: snapshots.length - 1,
    });
  }

  // ── Insights ─────────────────────────────────────────────────────────────
  const insights: AdvisorResponse['insights'] = [];

  insights.push({
    title: 'Projected net worth',
    why: `Based on current income, expenses, debt repayment, and investment growth over ${scenario.months} months.`,
    impact_aed: summary.endNetWorth,
    confidence: 'high',
  });

  if (summary.debtFreeMonth !== null) {
    insights.push({
      title: `Debt-free in month ${summary.debtFreeMonth + 1}`,
      why: `At current repayment pace all debts clear by month ${summary.debtFreeMonth + 1}, saving ~${currency} ${totalInterestEstimate.toLocaleString()} in future interest.`,
      impact_aed: totalInterestEstimate,
      confidence: 'med',
    });
  }

  if (summary.negativeCashMonths.length > 0) {
    insights.push({
      title: `${summary.negativeCashMonths.length} months of negative cash`,
      why: 'Expenses + debt payments exceed income in these months. Consider reducing discretionary spending or delaying large payments.',
      impact_aed: r2(summary.minCash),
      confidence: 'high',
    });
  }

  if (scenario.investments.length > 0) {
    const totalContrib = r2(scenario.investments.reduce((s, i) => s + i.monthlyContribution, 0));
    insights.push({
      title: 'Investment contributions active',
      why: `Monthly contributions of ${currency} ${totalContrib.toLocaleString()} compound over time. Projected end value: ${currency} ${summary.endInvestmentValue.toLocaleString()}.`,
      impact_aed: summary.endInvestmentValue,
      confidence: 'med',
    });
  }

  if (insights.length < 3) {
    insights.push({
      title: 'Cash flow appears stable',
      why: 'No critical cash shortfalls detected over the forecast horizon.',
      impact_aed: summary.minCash,
      confidence: 'med',
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const actions: AdvisorResponse['actions'] = [];

  if (totalDebt > 0 && scenario.debts.some((d) => d.strategy !== 'aggressive')) {
    actions.push({
      id: 'aggressive-debt',
      label: 'Accelerate debt repayment',
      changes: { debtStrategy: 'aggressive' },
      expectedOutcome: {
        netWorthDelta: r2(totalInterestEstimate * 0.4),
        minCashDelta: r2(-scenario.debts[0].minPayment * 0.3),
      },
    });
  }

  const discretionary = scenario.expenses.filter((e) => e.category === 'discretionary');
  if (discretionary.length > 0 && summary.negativeCashMonths.length > 0) {
    const totalDisc = r2(discretionary.reduce((s, e) => s + e.amount, 0));
    const cut = r2(totalDisc * 0.15);
    actions.push({
      id: 'reduce-discretionary',
      label: 'Reduce discretionary spending 15%',
      changes: {
        expenseAdjustments: discretionary.map((e) => ({
          expenseId: e.id,
          delta: r2(-e.amount * 0.15),
        })),
      },
      expectedOutcome: { netWorthDelta: r2(cut * scenario.months), minCashDelta: r2(cut) },
    });
  }

  if (scenario.investments.length > 0) {
    const firstInv = scenario.investments[0];
    actions.push({
      id: 'boost-investments',
      label: 'Increase investment contribution by 10%',
      changes: {
        investmentAdjustments: [
          {
            accountId: firstInv.id,
            monthlyContributionDelta: r2(firstInv.monthlyContribution * 0.1),
            expectedReturnDelta: 0,
          },
        ],
      },
      expectedOutcome: {
        netWorthDelta: r2(firstInv.monthlyContribution * 0.1 * scenario.months * 1.3),
        minCashDelta: r2(-firstInv.monthlyContribution * 0.1),
      },
    });
  }

  return { insights: insights.slice(0, 6), alerts, actions };
}
