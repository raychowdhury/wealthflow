'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell,
} from 'recharts';
import type { MonthSnapshot } from '@/lib/types';

const RANGES = [
  { label: '12M', months: 12 },
  { label: '24M', months: 24 },
  { label: '60M', months: 60 },
  { label: 'All', months: Infinity },
];

// Financial benchmarks
const TARGETS = {
  savingsRate:   20,   // 20% of income saved — common guideline
  investPct:     10,   // 10% of income invested
};

function CustomTooltip({ active, payload, label, currency }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-3 text-xs shadow-xl min-w-[180px]">
      <p className="font-semibold text-[#0f172a] mb-2 pb-1.5 border-b border-[#f1f5f9]">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-[#64748b]">{p.name}</span>
          </div>
          <span className="font-semibold text-[#0f172a]">
            {p.name.includes('%') || p.name.includes('Rate') ? `${p.value.toFixed(1)}%` : `${currency} ${Math.abs(p.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          </span>
        </div>
      ))}
    </div>
  );
}

interface Props { snapshots: MonthSnapshot[]; currency: string; }

export function SavingsRateChart({ snapshots, currency }: Props) {
  const [rangeIdx, setRangeIdx] = useState(0);

  const data = useMemo(() => {
    const limit = RANGES[rangeIdx].months;
    return snapshots
      .filter((s) => s.month < limit)
      .map((s) => {
        const netSavings = s.totalIncome - s.totalExpenses - s.totalDebtPayment - s.totalInvestmentContribution;
        const savingsRate = s.totalIncome > 0 ? (netSavings / s.totalIncome) * 100 : 0;
        const investRate  = s.totalIncome > 0 ? (s.totalInvestmentContribution / s.totalIncome) * 100 : 0;
        return {
          month: `M${s.month + 1}`,
          'Net savings':    Math.round(netSavings),
          'Savings Rate %': Math.round(savingsRate * 10) / 10,
          'Invest Rate %':  Math.round(investRate * 10) / 10,
          positive: netSavings >= 0,
        };
      });
  }, [snapshots, rangeIdx]);

  // Aggregate stats
  const avgSavingsRate = useMemo(() => {
    if (!data.length) return 0;
    return data.reduce((s, d) => s + d['Savings Rate %'], 0) / data.length;
  }, [data]);

  const posMonths = data.filter((d) => d.positive).length;
  const tickInterval = Math.max(0, Math.ceil(data.length / 10) - 1);

  return (
    <div className="flex flex-col gap-5">

      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryPill
          label="Avg savings rate"
          value={`${avgSavingsRate.toFixed(1)}%`}
          sub={avgSavingsRate >= TARGETS.savingsRate ? '✓ Above target' : `Target: ${TARGETS.savingsRate}%`}
          status={avgSavingsRate >= TARGETS.savingsRate ? 'positive' : 'warn'}
        />
        <SummaryPill
          label="Positive cash months"
          value={`${posMonths} / ${data.length}`}
          sub={`${Math.round((posMonths / Math.max(1, data.length)) * 100)}% of forecast`}
          status={posMonths === data.length ? 'positive' : posMonths > data.length / 2 ? 'warn' : 'negative'}
        />
        <SummaryPill
          label="Savings target"
          value={`${TARGETS.savingsRate}%`}
          sub="Common financial guideline"
          status="neutral"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-semibold text-[var(--text)]">Monthly savings rate & net surplus</p>
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

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={tickInterval} />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} width={52} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
            tickFormatter={(v) => `${v}%`} width={40} />
          <Tooltip content={<CustomTooltip currency={currency} />} />

          {/* 20% target line */}
          <ReferenceLine yAxisId="right" y={TARGETS.savingsRate} stroke="#059669" strokeDasharray="5 3"
            label={{ value: `${TARGETS.savingsRate}% target`, position: 'right', fontSize: 10, fill: '#059669' }} />
          <ReferenceLine yAxisId="left" y={0} stroke="#fca5a5" />

          {/* Net savings bars — green if positive, red if negative */}
          <Bar yAxisId="left" dataKey="Net savings" radius={[4, 4, 0, 0]} barSize={16}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.positive ? '#059669' : '#dc2626'} fillOpacity={0.7} />
            ))}
          </Bar>

          {/* Savings rate line */}
          <Line yAxisId="right" type="monotone" dataKey="Savings Rate %" stroke="#6366f1" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="Invest Rate %"  stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap text-xs text-[var(--muted)]">
        <LegendItem color="#059669" label="Positive net savings (bars)" />
        <LegendItem color="#dc2626" label="Negative month (bars)" />
        <LegendItem color="#6366f1" label="Savings rate % (line)" />
        <LegendItem color="#f59e0b" label="Investment rate % (dashed)" />
        <LegendItem color="#059669" dash label={`${TARGETS.savingsRate}% guideline`} />
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

type Status = 'positive' | 'negative' | 'warn' | 'neutral';
const STATUS_STYLE: Record<Status, { text: string; bg: string; border: string }> = {
  positive: { text: 'text-[#059669]', bg: 'bg-[#ecfdf5]', border: 'border-[#bbf7d0]' },
  negative: { text: 'text-[#dc2626]', bg: 'bg-[#fef2f2]', border: 'border-[#fecaca]' },
  warn:     { text: 'text-[#d97706]', bg: 'bg-[#fffbeb]', border: 'border-[#fde68a]' },
  neutral:  { text: 'text-[#64748b]', bg: 'bg-[#f8fafc]', border: 'border-[#e2e8f0]' },
};

function SummaryPill({ label, value, sub, status }: { label: string; value: string; sub: string; status: Status }) {
  const s = STATUS_STYLE[status];
  return (
    <div className={`rounded-xl border p-3 ${s.bg} ${s.border}`}>
      <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className={`text-lg font-bold leading-none ${s.text}`}>{value}</p>
      <p className="text-[11px] text-[var(--muted)] mt-1">{sub}</p>
    </div>
  );
}

function LegendItem({ color, label, dash }: { color: string; label: string; dash?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-6 h-0.5 rounded shrink-0" style={{ background: dash ? 'transparent' : color, borderTop: dash ? `2px dashed ${color}` : undefined }} />
      <span>{label}</span>
    </div>
  );
}
