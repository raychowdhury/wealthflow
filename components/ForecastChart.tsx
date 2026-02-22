'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Dot,
} from 'recharts';
import type { MonthSnapshot } from '@/lib/types';

// ── Config ──────────────────────────────────────────────────────────────────

const RANGES = [
  { label: '12M', months: 12 },
  { label: '24M', months: 24 },
  { label: '36M', months: 36 },
  { label: 'All', months: Infinity },
];

const SERIES = [
  { key: 'Net Worth',   color: '#6366f1', grad: ['#6366f1', '#a5b4fc'], hero: true  },
  { key: 'Investments', color: '#f59e0b', grad: ['#f59e0b', '#fcd34d'], hero: false },
  { key: 'Cash',        color: '#10b981', grad: ['#10b981', '#6ee7b7'], hero: false },
  { key: 'Debt (−)',    color: '#f43f5e', grad: ['#f43f5e', '#fda4af'], hero: false },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function kFmt(v: number, currency: string) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${currency} ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}${currency} ${(abs / 1_000).toFixed(0)}k`;
  return `${sign}${currency} ${abs.toFixed(0)}`;
}

function pctChange(start: number, end: number) {
  if (start === 0) return null;
  const p = ((end - start) / Math.abs(start)) * 100;
  return p;
}

// ── Tooltip ─────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, currency }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-2xl p-3.5 shadow-2xl min-w-[190px]" style={{ backdropFilter: 'blur(8px)' }}>
      <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-widest mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-5 py-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color, boxShadow: `0 0 4px ${p.color}` }} />
            <span className="text-xs text-[#64748b]">{p.name}</span>
          </div>
          <span className="text-xs font-bold text-[#0f172a]">
            {kFmt(p.value, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] text-[#94a3b8] uppercase tracking-widest font-medium">{label}</p>
      <p className="text-lg font-bold leading-none" style={{ color }}>{value}</p>
      {sub && <p className="text-[11px] text-[#94a3b8]">{sub}</p>}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function ForecastChart({ snapshots, currency }: { snapshots: MonthSnapshot[]; currency: string }) {
  const [rangeIdx, setRangeIdx] = useState(RANGES.length - 1);
  const [hidden, setHidden]     = useState<Set<string>>(new Set());

  const data = useMemo(() => {
    const limit = RANGES[rangeIdx].months;
    return snapshots
      .filter((s) => s.month < limit)
      .map((s) => ({
        month:         `M${s.month + 1}`,
        'Net Worth':   s.netWorth,
        'Cash':        s.cash,
        'Investments': s.totalInvestments,
        'Debt (−)':    -s.totalDebt,
        _raw:          s,
      }));
  }, [snapshots, rangeIdx]);

  const toggle = (key: string) =>
    setHidden((h) => { const n = new Set(h); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const startNW   = data[0]?.['Net Worth'] ?? 0;
  const endNW     = data[data.length - 1]?.['Net Worth'] ?? 0;
  const growth    = pctChange(startNW, endNW);
  const endInv    = data[data.length - 1]?.['Investments'] ?? 0;
  const endCash   = data[data.length - 1]?.['Cash'] ?? 0;
  const isPositive = endNW >= startNW;

  const tickInterval  = Math.max(0, Math.ceil(data.length / 10) - 1);
  const visibleSeries = SERIES.filter((s) => !hidden.has(s.key));

  return (
    <div className="flex flex-col gap-5">

      {/* ── Stat bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-6 items-end px-1">
        <StatPill
          label="End net worth"
          value={kFmt(endNW, currency)}
          sub={growth !== null
            ? `${isPositive ? '+' : ''}${growth.toFixed(1)}% over ${data.length} months`
            : undefined}
          color={isPositive ? '#6366f1' : '#f43f5e'}
        />
        <div className="w-px h-8 bg-[#e2e8f0] self-center hidden sm:block" />
        <StatPill label="End investments" value={kFmt(endInv, currency)}  color="#f59e0b" />
        <div className="w-px h-8 bg-[#e2e8f0] self-center hidden sm:block" />
        <StatPill label="End cash"        value={kFmt(endCash, currency)} color="#10b981" />

        {/* Range selector — pushed right */}
        <div className="ml-auto flex gap-1 bg-[#f8fafc] p-1 rounded-xl border border-[#e2e8f0] self-end">
          {RANGES.map((r, i) => (
            <button key={r.label} onClick={() => setRangeIdx(i)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                rangeIdx === i
                  ? 'bg-white text-[#6366f1] shadow-sm border border-[#e2e8f0]'
                  : 'text-[#94a3b8] hover:text-[#64748b]'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl" style={{
        background: 'linear-gradient(160deg, #f8faff 0%, #fafafa 100%)',
        border: '1px solid #ede9fe',
      }}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.key} id={`grad-${s.key.replace(/\s|\(|\)/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={s.grad[0]} stopOpacity={s.hero ? 0.30 : 0.18} />
                  <stop offset="60%"  stopColor={s.grad[1]} stopOpacity={s.hero ? 0.08 : 0.04} />
                  <stop offset="100%" stopColor={s.grad[1]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
              tickLine={false} axisLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false} axisLine={false}
              tickFormatter={(v) => kFmt(v, currency)}
              width={72}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 2' }} />
            <ReferenceLine y={0} stroke="#fda4af" strokeWidth={1} strokeDasharray="4 3" />

            {visibleSeries.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={s.hero ? 2.5 : 1.5}
                dot={false}
                activeDot={{ r: 4, fill: s.color, stroke: '#fff', strokeWidth: 2 }}
                fill={`url(#grad-${s.key.replace(/\s|\(|\)/g, '')})`}
                fillOpacity={1}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Series toggles ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {SERIES.map((s) => {
          const off = hidden.has(s.key);
          return (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                off
                  ? 'opacity-40 bg-[#f8fafc] border-[#e2e8f0] text-[#94a3b8]'
                  : 'bg-white border-[#e2e8f0] shadow-sm text-[#334155]'
              }`}
              style={off ? {} : { borderColor: s.color + '55' }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: off ? '#cbd5e1' : s.color, boxShadow: off ? 'none' : `0 0 5px ${s.color}88` }}
              />
              {s.key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
