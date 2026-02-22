'use client';

import { useMemo } from 'react';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import type { ScenarioInput, ForecastResult } from '@/lib/types';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Ratio {
  label: string;
  value: number;          // raw value
  display: string;        // formatted string
  pct: number;            // 0–100 for gauge fill
  target: string;
  status: 'green' | 'amber' | 'red' | 'neutral';
  icon: string;
  hint: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

function kFmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency} ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${currency} ${(v / 1_000).toFixed(0)}k`;
  return `${currency} ${v.toFixed(0)}`;
}

// ── Radial gauge ───────────────────────────────────────────────────────────────

const GAUGE_COLOR: Record<Ratio['status'], string> = {
  green:   '#059669',
  amber:   '#d97706',
  red:     '#dc2626',
  neutral: '#94a3b8',
};

function GaugeChart({ pct, status }: { pct: number; status: Ratio['status'] }) {
  const color  = GAUGE_COLOR[status];
  const filled = clamp(pct, 0, 100);
  return (
    <div className="relative w-24 h-24">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%" cy="50%"
          innerRadius="65%" outerRadius="100%"
          startAngle={225} endAngle={-45}
          data={[{ value: filled }]}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            background={{ fill: '#f1f5f9' }}
            dataKey="value"
            fill={color}
            cornerRadius={8}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      {/* Centre text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-bold" style={{ color }}>{filled.toFixed(0)}%</span>
      </div>
    </div>
  );
}

// ── Horizontal progress gauge ─────────────────────────────────────────────────

function ProgressGauge({ ratio }: { ratio: Ratio }) {
  const color = GAUGE_COLOR[ratio.status];
  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm p-4 flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{ratio.icon}</span>
          <div>
            <p className="text-sm font-semibold text-[var(--text)] leading-tight">{ratio.label}</p>
            <p className="text-[11px] text-[var(--muted)]">{ratio.hint}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold leading-none" style={{ color }}>{ratio.display}</p>
          <p className="text-[11px] text-[var(--muted)] mt-0.5">Target: {ratio.target}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1">
        <div className="w-full h-2.5 bg-[#f1f5f9] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${clamp(ratio.pct, 0, 100)}%`, background: color }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--muted)]">
          <span>0</span>
          <span>{ratio.target}</span>
        </div>
      </div>

      {/* Status badge */}
      <div className={`self-start flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
        ratio.status === 'green'  ? 'bg-[#ecfdf5] text-[#059669]' :
        ratio.status === 'amber'  ? 'bg-[#fffbeb] text-[#d97706]' :
        ratio.status === 'red'    ? 'bg-[#fef2f2] text-[#dc2626]' :
                                    'bg-[#f8fafc] text-[#64748b]'
      }`}>
        {ratio.status === 'green' ? '✓ On track' :
         ratio.status === 'amber' ? '⚡ Needs attention' :
         ratio.status === 'red'   ? '⚠ Action needed' : '— No data'}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  scenario: ScenarioInput;
  forecast: ForecastResult;
  emergencyFundMonths: number;
}

export function KeyRatiosPanel({ scenario, forecast, emergencyFundMonths }: Props) {
  const ratios = useMemo<Ratio[]>(() => {
    const snap0  = forecast.snapshots[0];
    const snapL  = forecast.snapshots[forecast.snapshots.length - 1];
    const { summary } = forecast;

    const monthlyIncome   = scenario.incomes.reduce((s, i) => s + i.amount, 0);
    const monthlyExpense  = scenario.expenses.reduce((s, e) => s + e.amount, 0);
    const totalDebt       = scenario.debts.reduce((s, d) => s + d.balance, 0);
    const totalMinPay     = scenario.debts.reduce((s, d) => s + d.minPayment, 0);
    const totalContrib    = scenario.investments.reduce((s, i) => s + i.monthlyContribution, 0);
    const netSavings      = monthlyIncome - monthlyExpense - totalMinPay - totalContrib;
    const currency        = scenario.currency;

    // 1. Savings rate
    const savingsRate = monthlyIncome > 0 ? (netSavings / monthlyIncome) * 100 : 0;

    // 2. Debt-to-income (monthly debt payments / monthly income)
    const dti = monthlyIncome > 0 ? (totalMinPay / monthlyIncome) * 100 : 0;

    // 3. Emergency fund coverage (current cash / monthly expenses)
    const efMonths = monthlyExpense > 0 ? scenario.initialCash / monthlyExpense : 0;

    // 4. Investment allocation (investments / net worth)
    const netWorthNow = snap0 ? snap0.netWorth : 0;
    const invAlloc = netWorthNow > 0 && snap0
      ? (snap0.totalInvestments / Math.max(1, netWorthNow + snap0.totalDebt)) * 100
      : 0;

    return [
      {
        label:   'Savings Rate',
        icon:    '💰',
        value:   savingsRate,
        display: `${savingsRate.toFixed(1)}%`,
        pct:     clamp((savingsRate / 30) * 100, 0, 100),
        target:  '≥ 20%',
        status:  savingsRate >= 20 ? 'green' : savingsRate >= 10 ? 'amber' : 'red',
        hint:    'Net savings as % of income',
      },
      {
        label:   'Debt-to-Income',
        icon:    '💳',
        value:   dti,
        display: `${dti.toFixed(1)}%`,
        pct:     clamp(dti, 0, 100),
        target:  '< 36%',
        status:  dti <= 20 ? 'green' : dti <= 36 ? 'amber' : 'red',
        hint:    'Monthly debt payments / income',
      },
      {
        label:   'Emergency Fund',
        icon:    '🛡️',
        value:   efMonths,
        display: `${efMonths.toFixed(1)} mo`,
        pct:     clamp((efMonths / (emergencyFundMonths * 1.5)) * 100, 0, 100),
        target:  `${emergencyFundMonths} months`,
        status:  efMonths >= emergencyFundMonths ? 'green' : efMonths >= emergencyFundMonths / 2 ? 'amber' : 'red',
        hint:    'Cash buffer in months of expenses',
      },
      {
        label:   'Investment Allocation',
        icon:    '📊',
        value:   invAlloc,
        display: `${invAlloc.toFixed(1)}%`,
        pct:     clamp((invAlloc / 50) * 100, 0, 100),
        target:  '≥ 20%',
        status:  invAlloc >= 20 ? 'green' : invAlloc >= 10 ? 'amber' : 'red',
        hint:    '% of net worth in investments',
      },
      {
        label:   'Projected Net Worth',
        icon:    '📈',
        value:   summary.endNetWorth,
        display: kFmt(summary.endNetWorth, currency),
        pct:     summary.endNetWorth > 0 ? 100 : 0,
        target:  '> 0',
        status:  summary.endNetWorth > 0 ? 'green' : 'red',
        hint:    `End of ${scenario.months}-month forecast`,
      },
      {
        label:   'Interest Burden',
        icon:    '💸',
        value:   summary.totalInterestPaid,
        display: kFmt(summary.totalInterestPaid, currency),
        pct:     totalDebt > 0 ? clamp((summary.totalInterestPaid / totalDebt) * 100, 0, 100) : 0,
        target:  'Minimise',
        status:  summary.totalInterestPaid === 0 ? 'green' : summary.totalInterestPaid < totalDebt * 0.3 ? 'amber' : 'red',
        hint:    'Total interest paid over forecast',
      },
    ];
  }, [scenario, forecast, emergencyFundMonths]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-[var(--text)]">Financial Health Ratios</h3>
        <p className="text-xs text-[var(--muted)] mt-0.5">Key indicators benchmarked against common financial guidelines</p>
      </div>

      {/* Score summary */}
      <div className="flex items-center gap-4 bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm">
        {/* Overall score gauge */}
        <div className="shrink-0">
          {(() => {
            const greenCount = ratios.filter((r) => r.status === 'green').length;
            const score = Math.round((greenCount / ratios.length) * 100);
            const status: Ratio['status'] = score >= 67 ? 'green' : score >= 33 ? 'amber' : 'red';
            return <GaugeChart pct={score} status={status} />;
          })()}
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">Overall health score</p>
          <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
            {ratios.filter((r) => r.status === 'green').length} of {ratios.length} ratios on track. {' '}
            {ratios.filter((r) => r.status === 'red').length > 0
              ? `${ratios.filter((r) => r.status === 'red').length} need action.`
              : 'Great financial position!'}
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {(['green', 'amber', 'red'] as const).map((s) => {
              const n = ratios.filter((r) => r.status === s).length;
              return n > 0 ? (
                <span key={s} className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{
                  color: GAUGE_COLOR[s],
                  background: s === 'green' ? '#ecfdf5' : s === 'amber' ? '#fffbeb' : '#fef2f2',
                }}>
                  {n} {s === 'green' ? '✓' : s === 'amber' ? '⚡' : '⚠'} {s}
                </span>
              ) : null;
            })}
          </div>
        </div>
      </div>

      {/* Individual ratio cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ratios.map((r) => <ProgressGauge key={r.label} ratio={r} />)}
      </div>
    </div>
  );
}
