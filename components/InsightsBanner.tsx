'use client';

import { useMemo } from 'react';
import type { ForecastResult, ScenarioInput } from '@/lib/types';
import type { InsightMeta } from './InsightDetailModal';

// ── Types ────────────────────────────────────────────────────────────────────

type Status = 'green' | 'amber' | 'red' | 'neutral';

interface Insight {
  icon: string;
  text: string;
  sub?: string;
  status: Status;
  tab?: string;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const STYLE: Record<Status, { bg: string; border: string; text: string; dot: string; hover: string }> = {
  green:   { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#22c55e', hover: '#dcfce7' },
  amber:   { bg: '#fffbeb', border: '#fde68a', text: '#b45309', dot: '#f59e0b', hover: '#fef3c7' },
  red:     { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', dot: '#ef4444', hover: '#fee2e2' },
  neutral: { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', dot: '#94a3b8', hover: '#f1f5f9' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function kFmt(v: number, currency: string) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${currency} ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${currency} ${(abs / 1_000).toFixed(0)}k`;
  return `${currency} ${abs.toFixed(0)}`;
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  forecast:            ForecastResult;
  scenario:            ScenarioInput;
  emergencyFundMonths: number;
  onInsightClick?:     (meta: InsightMeta) => void;
}

export function InsightsBanner({ forecast, scenario, emergencyFundMonths, onInsightClick }: Props) {
  const insights = useMemo<Insight[]>(() => {
    const { summary, snapshots } = forecast;
    const result: Insight[] = [];

    const monthlyIncome  = scenario.incomes.reduce((s, i) => s + i.amount, 0);
    const monthlyExpense = scenario.expenses.reduce((s, e) => s + e.amount, 0);
    const monthlyDebt    = scenario.debts.reduce((s, d) => s + d.minPayment, 0);
    const monthlyInvest  = scenario.investments.reduce((s, i) => s + i.monthlyContribution, 0);
    const netSavings     = monthlyIncome - monthlyExpense - monthlyDebt - monthlyInvest;
    const savingsRate    = monthlyIncome > 0 ? (netSavings / monthlyIncome) * 100 : 0;
    const startNW        = snapshots[0]?.netWorth ?? 0;
    const totalDebt      = scenario.debts.reduce((s, d) => s + d.balance, 0);

    // 1 ── Net worth trajectory
    const growthPct = startNW !== 0 ? ((summary.endNetWorth - startNW) / Math.abs(startNW)) * 100 : 0;
    result.push({
      icon:   summary.endNetWorth >= startNW ? '📈' : '📉',
      text:   `Net worth ${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(0)}% → ${kFmt(summary.endNetWorth, scenario.currency)}`,
      sub:    `over ${scenario.months} months`,
      status: summary.endNetWorth > startNW ? (growthPct >= 30 ? 'green' : 'amber') : 'red',
      tab:    'chart',
    });

    // 2 ── Cash-flow health
    if (summary.negativeCashMonths.length > 0) {
      result.push({
        icon:   '⚠',
        text:   `Cash negative in ${summary.negativeCashMonths.length} month${summary.negativeCashMonths.length > 1 ? 's' : ''}`,
        sub:    `First: month ${summary.negativeCashMonths[0] + 1}`,
        status: 'red',
        tab:    'cashflow',
      });
    } else {
      result.push({
        icon:   '✓',
        text:   'Positive cash flow every month',
        sub:    `Lowest: ${kFmt(summary.minCash, scenario.currency)} (M${summary.minCashMonth + 1})`,
        status: 'green',
        tab:    'cashflow',
      });
    }

    // 3 ── Savings rate
    result.push({
      icon:   savingsRate >= 20 ? '💰' : '⚡',
      text:   `Savings rate ${savingsRate.toFixed(1)}%`,
      sub:    savingsRate >= 20
        ? 'Above 20% guideline ✓'
        : `${(20 - savingsRate).toFixed(1)}pp below 20% target`,
      status: savingsRate >= 20 ? 'green' : savingsRate >= 10 ? 'amber' : 'red',
      tab:    'savings',
    });

    // 4 ── Debt-free milestone
    if (totalDebt > 0) {
      if (summary.debtFreeMonth !== null) {
        const yrs = Math.floor(summary.debtFreeMonth / 12);
        const mos = summary.debtFreeMonth % 12;
        const label = yrs > 0 ? `${yrs}y${mos > 0 ? ` ${mos}m` : ''}` : `${mos} months`;
        result.push({
          icon:   '🎉',
          text:   `Debt-free in ${label}`,
          sub:    `Month ${summary.debtFreeMonth + 1} · saved ${kFmt(summary.totalInterestPaid, scenario.currency)} in interest`,
          status: summary.debtFreeMonth <= 24 ? 'green' : summary.debtFreeMonth <= 48 ? 'amber' : 'neutral',
          tab:    'debt',
        });
      } else {
        result.push({
          icon:   '💳',
          text:   'Debt not cleared this forecast',
          sub:    `${kFmt(summary.totalInterestPaid, scenario.currency)} in interest paid`,
          status: 'amber',
          tab:    'debt',
        });
      }
    }

    // 5 ── Investment growth
    const startInv = snapshots[0]?.totalInvestments ?? 0;
    const endInv   = summary.endInvestmentValue;
    if (endInv > 0) {
      const invGrowth = startInv > 0 ? ((endInv - startInv) / startInv) * 100 : 0;
      result.push({
        icon:   '💎',
        text:   `Investments → ${kFmt(endInv, scenario.currency)}`,
        sub:    startInv > 0 ? `+${invGrowth.toFixed(0)}% from ${kFmt(startInv, scenario.currency)}` : 'from contributions',
        status: invGrowth >= 50 ? 'green' : invGrowth >= 10 ? 'amber' : 'neutral',
        tab:    'ratios',
      });
    }

    // 6 ── Emergency fund
    const efMonths = monthlyExpense > 0 ? scenario.initialCash / monthlyExpense : 0;
    result.push({
      icon:   efMonths >= emergencyFundMonths ? '🛡' : '🔓',
      text:   `Emergency fund: ${efMonths.toFixed(1)} months`,
      sub:    `Target is ${emergencyFundMonths} months`,
      status: efMonths >= emergencyFundMonths ? 'green' : efMonths >= emergencyFundMonths / 2 ? 'amber' : 'red',
      tab:    'ratios',
    });

    return result;
  }, [forecast, scenario, emergencyFundMonths]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-widest px-0.5">
        Forecast insights
      </p>
      <div
        className="flex gap-2 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {insights.map((ins, i) => {
          const s = STYLE[ins.status];
          const clickable = !!ins.tab;
          const handleClick = () => {
            if (!ins.tab) return;
            onInsightClick?.({ tab: ins.tab, icon: ins.icon, text: ins.text, sub: ins.sub, status: ins.status });
          };
          return (
            <button
              key={i}
              onClick={handleClick}
              disabled={!clickable}
              className="group flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border shrink-0 text-left transition-all"
              style={{
                background:   s.bg,
                borderColor:  s.border,
                color:        s.text,
                cursor:       clickable ? 'pointer' : 'default',
                minWidth:     '180px',
              }}
              onMouseEnter={(e) => { if (clickable) (e.currentTarget as HTMLButtonElement).style.background = s.hover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = s.bg; }}
            >
              {/* Status dot */}
              <span
                className="mt-0.5 w-2 h-2 rounded-full shrink-0"
                style={{ background: s.dot, boxShadow: `0 0 5px ${s.dot}88` }}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight flex items-center gap-1.5">
                  <span>{ins.icon}</span>
                  <span>{ins.text}</span>
                </p>
                {ins.sub && (
                  <p className="text-[10px] mt-0.5 opacity-75 leading-snug">{ins.sub}</p>
                )}
                {clickable && (
                  <p className="text-[10px] mt-1 font-semibold opacity-0 group-hover:opacity-60 transition-opacity">
                    Click to explore →
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
