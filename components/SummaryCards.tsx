'use client';

import type { ForecastResult } from '@/lib/types';

function kFmt(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function deltaFmt(v: number) {
  if (Math.abs(v) < 1) return null;
  const sign = v > 0 ? '+' : '−';
  return `${sign}${kFmt(Math.abs(v))}`;
}

type Status = 'positive' | 'negative' | 'warn' | 'neutral';

const STYLE: Record<Status, { value: string; bg: string; border: string; icon_bg: string; delta_pos: string; delta_neg: string }> = {
  positive: {
    value:     'text-[var(--positive)]',
    bg:        'bg-[var(--positive-light)]',
    border:    'border-[#bbf7d0]',
    icon_bg:   'bg-[#bbf7d0]',
    delta_pos: 'bg-[#dcfce7] text-[#16a34a]',
    delta_neg: 'bg-[#fee2e2] text-[#dc2626]',
  },
  negative: {
    value:     'text-[var(--negative)]',
    bg:        'bg-[var(--negative-light)]',
    border:    'border-[#fecaca]',
    icon_bg:   'bg-[#fecaca]',
    delta_pos: 'bg-[#dcfce7] text-[#16a34a]',
    delta_neg: 'bg-[#fee2e2] text-[#dc2626]',
  },
  warn: {
    value:     'text-[var(--warn)]',
    bg:        'bg-[var(--warn-light)]',
    border:    'border-[#fde68a]',
    icon_bg:   'bg-[#fde68a]',
    delta_pos: 'bg-[#dcfce7] text-[#16a34a]',
    delta_neg: 'bg-[#fee2e2] text-[#dc2626]',
  },
  neutral: {
    value:     'text-[var(--text)]',
    bg:        'bg-[var(--surface)]',
    border:    'border-[var(--border)]',
    icon_bg:   'bg-[var(--surface-2)]',
    delta_pos: 'bg-[#dcfce7] text-[#16a34a]',
    delta_neg: 'bg-[#fee2e2] text-[#dc2626]',
  },
};

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  currency?: string;
  sub?: string;
  status: Status;
  delta?: number | null;   // positive = improvement
}

function StatCard({ icon, label, value, currency, sub, status, delta }: StatCardProps) {
  const s = STYLE[status];
  const d = delta != null ? deltaFmt(delta) : null;
  const isPositiveDelta = delta != null && delta > 0;

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-2xl border ${s.border} ${s.bg} shadow-sm transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${s.icon_bg} shrink-0`}>
          {icon}
        </div>
        {d && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPositiveDelta ? s.delta_pos : s.delta_neg}`}>
            {d}
          </span>
        )}
      </div>
      <div>
        <p className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-2xl font-bold leading-none tracking-tight ${s.value}`}>{value}</p>
        {currency && <p className="text-[11px] text-[var(--muted)] mt-0.5">{currency}</p>}
      </div>
      {sub && <p className="text-xs text-[var(--muted)] leading-snug">{sub}</p>}
    </div>
  );
}

// ── Health score ───────────────────────────────────────────────────────────────

function computeHealthScore(summary: ForecastResult['summary']): { grade: string; color: string; bg: string; score: number } {
  let score = 100;
  if (summary.negativeCashMonths.length > 0)  score -= summary.negativeCashMonths.length * 3;
  if (summary.endNetWorth < 0)                score -= 30;
  if (summary.totalInterestPaid > summary.endNetWorth * 0.3) score -= 10;
  if (summary.debtFreeMonth === null)         score -= 10;
  if (summary.endInvestmentValue <= 0)        score -= 10;
  score = Math.max(0, Math.min(100, score));

  if (score >= 85) return { grade: 'A', color: '#16a34a', bg: '#dcfce7', score };
  if (score >= 70) return { grade: 'B', color: '#2563eb', bg: '#dbeafe', score };
  if (score >= 55) return { grade: 'C', color: '#d97706', bg: '#fef3c7', score };
  if (score >= 40) return { grade: 'D', color: '#ea580c', bg: '#ffedd5', score };
  return            { grade: 'F', color: '#dc2626', bg: '#fee2e2', score };
}

// ── Main export ────────────────────────────────────────────────────────────────

interface Props {
  summary: ForecastResult['summary'];
  currency: string;
  baselineSummary?: ForecastResult['summary'] | null;   // for what-if delta display
}

export function SummaryCards({ summary, currency, baselineSummary }: Props) {
  const negMonths = summary.negativeCashMonths.length;
  const debtFree  = summary.debtFreeMonth;
  const health    = computeHealthScore(summary);
  const hasWhatIf = !!baselineSummary;

  const netWorthDelta    = hasWhatIf ? summary.endNetWorth - baselineSummary!.endNetWorth : null;
  const cashDelta        = hasWhatIf ? summary.endCash - baselineSummary!.endCash : null;
  const investmentsDelta = hasWhatIf ? summary.endInvestmentValue - baselineSummary!.endInvestmentValue : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Health score banner — only when what-if is active */}
      {hasWhatIf && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium"
          style={{ background: health.bg, borderColor: health.color + '40', color: health.color }}>
          <span className="text-lg font-black">{health.grade}</span>
          <span className="text-xs">Financial health score: {health.score}/100 — what-if active</span>
          <span className="ml-auto text-[11px] opacity-70">vs baseline ↓</span>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          icon="📈"
          label="End Net Worth"
          value={kFmt(summary.endNetWorth)}
          currency={currency}
          status={summary.endNetWorth >= 0 ? 'positive' : 'negative'}
          delta={netWorthDelta}
        />
        <StatCard
          icon="💵"
          label="End Cash"
          value={kFmt(summary.endCash)}
          currency={currency}
          sub={negMonths > 0 ? `⚠ ${negMonths} month${negMonths > 1 ? 's' : ''} go negative` : '✓ No cash dips'}
          status={summary.endCash >= 0 ? 'positive' : 'negative'}
          delta={cashDelta}
        />
        <StatCard
          icon="📊"
          label="Investments"
          value={kFmt(summary.endInvestmentValue)}
          currency={currency}
          sub="Projected end value"
          status={summary.endInvestmentValue > 0 ? 'positive' : 'neutral'}
          delta={investmentsDelta}
        />
        <StatCard
          icon={debtFree !== null ? '🎉' : '💸'}
          label={debtFree !== null ? 'Debt-free' : 'Interest Cost'}
          value={debtFree !== null ? `Month ${debtFree + 1}` : kFmt(summary.totalInterestPaid)}
          currency={debtFree !== null ? undefined : currency}
          sub={debtFree !== null ? '🎊 Congratulations!' : 'Total cost of debt'}
          status={debtFree !== null ? 'positive' : summary.totalInterestPaid > 0 ? 'warn' : 'neutral'}
        />
      </div>

      {/* Health score row — always visible, bottom of cards */}
      {!hasWhatIf && (
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--muted)]">Financial health</span>
            <span
              className="text-xs font-black px-2.5 py-0.5 rounded-full"
              style={{ background: health.bg, color: health.color }}
            >
              {health.grade}
            </span>
          </div>
          <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${health.score}%`, background: health.color }}
            />
          </div>
          <span className="text-[11px] text-[var(--muted)]">{health.score}/100</span>
        </div>
      )}
    </div>
  );
}
