'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts';
import type { ExpenseInput } from '@/lib/types';

// ── Palette ───────────────────────────────────────────────────────────────────

const CAT_COLOR: Record<string, string> = {
  rent:          '#6366f1',
  fixed:         '#0ea5e9',
  discretionary: '#f59e0b',
};
const CAT_LABEL: Record<string, string> = {
  rent: 'Rent / Housing', fixed: 'Fixed', discretionary: 'Discretionary',
};

const ITEM_COLORS = [
  '#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function kFmt(v: number, currency: string) {
  if (v >= 1_000_000) return `${currency} ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${currency} ${(v / 1_000).toFixed(0)}k`;
  return `${currency} ${v.toFixed(0)}`;
}

function pct(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

// ── Custom donut label ────────────────────────────────────────────────────────

function DonutLabel({ cx, cy, total, currency }: { cx: number; cy: number; total: number; currency: string }) {
  return (
    <>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#0f172a" fontSize={18} fontWeight={700}>
        {kFmt(total, '')}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize={11}>
        {currency}/mo
      </text>
    </>
  );
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

function DonutTooltip({ active, payload, currency }: {
  active?: boolean; payload?: Array<{ name: string; value: number; payload: { pct: number } }>; currency: string;
}) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-[#0f172a]">{name}</p>
      <p className="text-[#64748b]">{kFmt(value, currency)} · {p.pct}% of total</p>
    </div>
  );
}

function BarTooltip({ active, payload, currency }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string; currency: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-[#0f172a]">{kFmt(payload[0].value, currency)}/mo</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props { expenses: ExpenseInput[]; currency: string; }

export function ExpenseBreakdown({ expenses, currency }: Props) {
  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  // Data for donut (by category)
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) map[e.category] = (map[e.category] ?? 0) + e.amount;
    return Object.entries(map).map(([cat, value]) => ({
      name: CAT_LABEL[cat] ?? cat,
      value,
      pct: pct(value, total),
      fill: CAT_COLOR[cat] ?? '#94a3b8',
    }));
  }, [expenses, total]);

  // Data for ranked bar (individual items, sorted desc)
  const itemData = useMemo(() =>
    [...expenses]
      .sort((a, b) => b.amount - a.amount)
      .map((e, i) => ({
        name: e.label,
        value: e.amount,
        fill: ITEM_COLORS[i % ITEM_COLORS.length],
        pct: pct(e.amount, total),
      })),
  [expenses, total]);

  if (expenses.length === 0) {
    return <Empty label="No expenses added yet" />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--muted)] uppercase tracking-widest font-medium">Total monthly expenses</p>
          <p className="text-3xl font-bold text-[var(--text)] mt-0.5">{kFmt(total, currency)}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {categoryData.map((c) => (
            <div key={c.name} className="flex items-center gap-1.5 text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2.5 py-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.fill }} />
              <span className="font-medium text-[var(--text-2)]">{c.name}</span>
              <span className="text-[var(--muted)]">{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two charts side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Donut chart */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-[var(--text)]">By category</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%" cy="50%"
                innerRadius={62} outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {categoryData.map((c, i) => (
                  <Cell key={i} fill={c.fill} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip currency={currency} />} />
              {/* Centre label */}
              <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle"
                fill="#0f172a" fontSize={18} fontWeight={700}>
                {kFmt(total, '')}
              </text>
              <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle"
                fill="#64748b" fontSize={11}>
                {currency}/mo
              </text>
            </PieChart>
          </ResponsiveContainer>

          {/* Legend list */}
          <div className="flex flex-col gap-1.5">
            {categoryData.map((c) => (
              <div key={c.name} className="flex items-center gap-2">
                <div className="w-1.5 rounded-full h-8 shrink-0" style={{ background: c.fill }} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="text-xs font-medium text-[var(--text-2)]">{c.name}</span>
                    <span className="text-xs text-[var(--muted)]">{kFmt(c.value, currency)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${c.pct}%`, background: c.fill }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranked bar chart by item */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-[var(--text)]">By line item</p>
          <ResponsiveContainer width="100%" height={Math.max(180, itemData.length * 38)}>
            <BarChart data={itemData} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={100} />
              <Tooltip content={<BarTooltip currency={currency} />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {itemData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                <LabelList
                  dataKey="pct"
                  position="right"
                  formatter={(v: number) => `${v}%`}
                  style={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-[var(--muted)]">{label}</div>
  );
}
