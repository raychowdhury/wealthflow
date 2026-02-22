'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Area, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import type { MonthSnapshot } from '@/lib/types';

const RANGES = [
  { label: '12M', months: 12 },
  { label: '24M', months: 24 },
  { label: '60M', months: 60 },
  { label: 'All', months: Infinity },
];

function kFmt(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
  return `${v.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label, currency }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; currency: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-3 text-xs shadow-xl min-w-[180px]">
      <p className="font-semibold text-[#0f172a] mb-2 pb-1.5 border-b border-[#f1f5f9]">{label}</p>
      {payload.map((p) => p.value > 0 && (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="text-[#64748b]">{p.name}</span>
          <span className="font-semibold text-[#0f172a]">{currency} {p.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      ))}
    </div>
  );
}

interface Props { snapshots: MonthSnapshot[]; currency: string; totalInterestPaid: number; }

export function DebtPaydownChart({ snapshots, currency, totalInterestPaid }: Props) {
  const [rangeIdx, setRangeIdx] = useState(RANGES.length - 1);

  const initialDebt = snapshots[0]?.totalDebt ?? 0;
  const debtFreeIdx = snapshots.findIndex((s) => s.totalDebt === 0);

  // Cumulative interest: approximate by tracking debt reduction vs payments
  const data = useMemo(() => {
    const limit = RANGES[rangeIdx].months;
    let cumInterest = 0;
    return snapshots
      .filter((s) => s.month < limit)
      .map((s, i, arr) => {
        const prevDebt   = i === 0 ? initialDebt : arr[i - 1].totalDebt;
        const payment    = s.totalDebtPayment;
        const debtDrop   = prevDebt - s.totalDebt;
        const interest   = Math.max(0, payment - debtDrop);
        cumInterest += interest;
        return {
          month:              `M${s.month + 1}`,
          'Remaining debt':   Math.round(s.totalDebt),
          'Monthly payment':  Math.round(s.totalDebtPayment),
          'Cumul. interest':  Math.round(cumInterest),
        };
      });
  }, [snapshots, rangeIdx, initialDebt]);

  const tickInterval = Math.max(0, Math.ceil(data.length / 10) - 1);

  return (
    <div className="flex flex-col gap-5">

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <StatPill
          label="Starting debt"
          value={`${currency} ${initialDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          color="var(--negative)"
          bg="var(--negative-light)"
        />
        <StatPill
          label="Total interest cost"
          value={`${currency} ${totalInterestPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          color="var(--warn)"
          bg="var(--warn-light)"
        />
        <StatPill
          label="Debt-free month"
          value={debtFreeIdx >= 0 ? `Month ${debtFreeIdx + 1}` : 'Not in range'}
          color="var(--positive)"
          bg="var(--positive-light)"
        />
      </div>

      {/* Range selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--text)]">Debt reduction over time</p>
        <div className="flex gap-1 bg-[var(--surface-2)] p-1 rounded-lg border border-[var(--border)]">
          {RANGES.map((r, i) => (
            <button key={r.label} onClick={() => setRangeIdx(i)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                rangeIdx === i
                  ? 'bg-white text-[var(--accent)] shadow-sm border border-[var(--border)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main chart */}
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#dc2626" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#dc2626" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="intGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#d97706" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#d97706" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={tickInterval} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
            tickFormatter={kFmt} width={52} />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#64748b', paddingTop: 12 }} />

          {debtFreeIdx >= 0 && debtFreeIdx < data.length && (
            <ReferenceLine
              x={data[debtFreeIdx]?.month}
              stroke="#059669" strokeDasharray="6 3"
              label={{ value: '🎉 Debt-free', position: 'top', fontSize: 10, fill: '#059669' }}
            />
          )}

          <Area type="monotone" dataKey="Remaining debt"  stroke="#dc2626" strokeWidth={2} fill="url(#debtGrad)" dot={false} />
          <Area type="monotone" dataKey="Cumul. interest" stroke="#d97706" strokeWidth={1.5} fill="url(#intGrad)" dot={false} strokeDasharray="5 3" />
          <Bar  dataKey="Monthly payment" fill="#6366f1" fillOpacity={0.6} radius={[3, 3, 0, 0]} barSize={8} />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Cost breakdown bar */}
      {initialDebt > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--muted)] mb-2">Principal vs interest split (total repayment)</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-5 rounded-full overflow-hidden flex bg-[var(--border)]">
              <div
                className="h-full bg-[#6366f1] flex items-center justify-center text-[10px] text-white font-semibold transition-all"
                style={{ width: `${Math.max(5, pct(initialDebt, initialDebt + totalInterestPaid))}%` }}
              >
                {pct(initialDebt, initialDebt + totalInterestPaid)}%
              </div>
              <div
                className="h-full bg-[#d97706] flex items-center justify-center text-[10px] text-white font-semibold transition-all"
                style={{ width: `${Math.max(5, pct(totalInterestPaid, initialDebt + totalInterestPaid))}%` }}
              >
                {pct(totalInterestPaid, initialDebt + totalInterestPaid)}%
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-1.5 text-[11px]">
            <span className="flex items-center gap-1.5 text-[var(--muted)]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#6366f1]" /> Principal: {currency} {initialDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="flex items-center gap-1.5 text-[var(--muted)]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#d97706]" /> Interest: {currency} {totalInterestPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3" style={{ background: bg }}>
      <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className="text-sm font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function pct(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}
