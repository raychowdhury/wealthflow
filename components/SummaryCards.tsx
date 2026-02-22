'use client';

import type { ForecastResult } from '@/lib/types';

function kFmt(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

type Status = 'positive' | 'negative' | 'warn' | 'neutral';

const STYLE: Record<Status, { value: string; bg: string; border: string; icon_bg: string }> = {
  positive: {
    value:   'text-[var(--positive)]',
    bg:      'bg-[var(--positive-light)]',
    border:  'border-[#bbf7d0]',
    icon_bg: 'bg-[#bbf7d0]',
  },
  negative: {
    value:   'text-[var(--negative)]',
    bg:      'bg-[var(--negative-light)]',
    border:  'border-[#fecaca]',
    icon_bg: 'bg-[#fecaca]',
  },
  warn: {
    value:   'text-[var(--warn)]',
    bg:      'bg-[var(--warn-light)]',
    border:  'border-[#fde68a]',
    icon_bg: 'bg-[#fde68a]',
  },
  neutral: {
    value:   'text-[var(--text)]',
    bg:      'bg-[var(--surface)]',
    border:  'border-[var(--border)]',
    icon_bg: 'bg-[var(--surface-2)]',
  },
};

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  currency?: string;
  sub?: string;
  status: Status;
}

function StatCard({ icon, label, value, currency, sub, status }: StatCardProps) {
  const s = STYLE[status];
  return (
    <div className={`flex flex-col gap-3 p-4 rounded-2xl border ${s.border} ${s.bg} shadow-sm`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${s.icon_bg}`}>
        {icon}
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

export function SummaryCards({ summary, currency }: { summary: ForecastResult['summary']; currency: string }) {
  const negMonths = summary.negativeCashMonths.length;
  const debtFree  = summary.debtFreeMonth;
  const hasTax    = (summary.totalTaxPaid ?? 0) > 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      <StatCard
        icon="📈"
        label="End Net Worth"
        value={kFmt(summary.endNetWorth)}
        currency={currency}
        status={summary.endNetWorth >= 0 ? 'positive' : 'negative'}
      />
      <StatCard
        icon="💵"
        label="End Cash"
        value={kFmt(summary.endCash)}
        currency={currency}
        sub={negMonths > 0 ? `⚠ ${negMonths} month${negMonths > 1 ? 's' : ''} go negative` : '✓ No cash dips'}
        status={summary.endCash >= 0 ? 'positive' : 'negative'}
      />
      <StatCard
        icon="⚠️"
        label="Lowest Cash"
        value={kFmt(summary.minCash)}
        currency={currency}
        sub={`Occurs at month ${summary.minCashMonth + 1}`}
        status={summary.minCash < 0 ? 'negative' : summary.minCash < 5000 ? 'warn' : 'positive'}
      />
      <StatCard
        icon="📊"
        label="Investments"
        value={kFmt(summary.endInvestmentValue)}
        currency={currency}
        sub="Projected end value"
        status={summary.endInvestmentValue > 0 ? 'positive' : 'neutral'}
      />
      <StatCard
        icon="💸"
        label="Interest Paid"
        value={kFmt(summary.totalInterestPaid)}
        currency={currency}
        sub="Total cost of debt"
        status={summary.totalInterestPaid > 0 ? 'warn' : 'neutral'}
      />
      {hasTax ? (
        <StatCard
          icon="🏛"
          label="Tax Paid"
          value={kFmt(summary.totalTaxPaid ?? 0)}
          currency={currency}
          sub="Total income tax"
          status="warn"
        />
      ) : (
        <StatCard
          icon={debtFree !== null ? '🎉' : '⏳'}
          label="Debt-free"
          value={debtFree !== null ? `Month ${debtFree + 1}` : 'Not reached'}
          sub={debtFree !== null ? 'Congratulations!' : 'Extend horizon or pay more'}
          status={debtFree !== null ? 'positive' : 'warn'}
        />
      )}
    </div>
  );
}
