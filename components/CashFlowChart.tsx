'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
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
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
  return `${v.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label, currency }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill?: string; stroke?: string }>;
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const income  = payload.find((p) => p.name === 'Income')?.value   ?? 0;
  const expense = payload.find((p) => p.name === 'Expenses')?.value ?? 0;
  const debt    = payload.find((p) => p.name === 'Debt Pmt')?.value ?? 0;
  const net     = income - expense - debt;

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-3 text-xs shadow-xl min-w-[180px]">
      <p className="font-semibold text-[#0f172a] mb-2 pb-1.5 border-b border-[#f1f5f9]">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill ?? p.stroke }} />
            <span className="text-[#64748b]">{p.name}</span>
          </div>
          <span className="font-semibold text-[#0f172a]">
            {currency} {Math.abs(p.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-4 mt-2 pt-2 border-t border-[#f1f5f9]">
        <span className="font-medium text-[#64748b]">Net</span>
        <span className={`font-bold ${net >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'}`}>
          {net >= 0 ? '+' : '−'}{currency} {Math.abs(net).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  );
}

export function CashFlowChart({ snapshots, currency }: { snapshots: MonthSnapshot[]; currency: string }) {
  const [rangeIdx, setRangeIdx] = useState(0);

  const data = useMemo(() => {
    const limit = RANGES[rangeIdx].months;
    return snapshots
      .filter((s) => s.month < limit)
      .map((s) => ({
        month:      `M${s.month + 1}`,
        Income:     s.totalIncome,
        Expenses:   s.totalExpenses,
        'Debt Pmt': s.totalDebtPayment,
        Cash:       s.cash,
      }));
  }, [snapshots, rangeIdx]);

  const tickInterval = Math.max(0, Math.ceil(data.length / 10) - 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-[var(--muted)]">Monthly income vs outflows · {currency}</p>
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

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          barCategoryGap="35%" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false}
            axisLine={false} interval={tickInterval} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
            tickFormatter={kFmt} width={52} />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12, color: '#64748b' }} />
          <ReferenceLine y={0} stroke="#fca5a5" strokeDasharray="4 2" />
          <Bar dataKey="Income"   fill="#059669" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Expenses" fill="#dc2626" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Debt Pmt" fill="#d97706" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="Cash" stroke="#6366f1" strokeWidth={2} dot={false} name="Cash balance" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
