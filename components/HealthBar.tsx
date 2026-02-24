'use client';

import { useEffect, useState, useRef } from 'react';
import type { ForecastResult } from '@/lib/types';

function kFmt(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(0)}k`;
  return `${sign}${abs.toFixed(0)}`;
}

interface Props {
  summary: ForecastResult['summary'];
  currency: string;
  /** ref to the element after which the bar becomes visible */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

export function HealthBar({ summary, currency, sentinelRef }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [sentinelRef]);

  const debtFree = summary.debtFreeMonth;
  const negMonths = summary.negativeCashMonths.length;

  const pills = [
    {
      label: 'Net Worth',
      value: kFmt(summary.endNetWorth) + ' ' + currency,
      color: summary.endNetWorth >= 0 ? '#16a34a' : '#dc2626',
      bg:    summary.endNetWorth >= 0 ? '#dcfce7' : '#fee2e2',
    },
    {
      label: 'Cash',
      value: kFmt(summary.endCash) + ' ' + currency,
      color: summary.endCash >= 0 && negMonths === 0 ? '#16a34a' : '#d97706',
      bg:    summary.endCash >= 0 && negMonths === 0 ? '#dcfce7' : '#fef3c7',
    },
    {
      label: 'Investments',
      value: kFmt(summary.endInvestmentValue) + ' ' + currency,
      color: '#6366f1',
      bg:    '#eef2ff',
    },
    {
      label: 'Debt-free',
      value: debtFree !== null ? `Month ${debtFree + 1}` : 'Not reached',
      color: debtFree !== null ? '#16a34a' : '#d97706',
      bg:    debtFree !== null ? '#dcfce7' : '#fef3c7',
    },
  ];

  return (
    <div
      className={`fixed top-14 left-0 right-0 z-30 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
    >
      <div className="bg-[var(--surface)]/95 backdrop-blur-sm border-b border-[var(--border)] shadow-sm px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest shrink-0 mr-1">
            Forecast
          </span>
          {pills.map((p) => (
            <div
              key={p.label}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full shrink-0 text-xs font-semibold"
              style={{ background: p.bg, color: p.color }}
            >
              <span className="text-[10px] font-medium opacity-70">{p.label}</span>
              <span>{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
