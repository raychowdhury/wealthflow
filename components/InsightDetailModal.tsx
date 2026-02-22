'use client';

import { useEffect } from 'react';
import { ForecastChart }    from './ForecastChart';
import { CashFlowChart }    from './CashFlowChart';
import { DebtPaydownChart } from './DebtPaydownChart';
import { SavingsRateChart } from './SavingsRateChart';
import { KeyRatiosPanel }   from './KeyRatiosPanel';
import type { ForecastResult, ScenarioInput } from '@/lib/types';

// ── Config ────────────────────────────────────────────────────────────────────

type Status = 'green' | 'amber' | 'red' | 'neutral';

const STATUS_STYLE: Record<Status, { bg: string; border: string; text: string; dot: string; label: string }> = {
  green:   { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#22c55e', label: 'On track'        },
  amber:   { bg: '#fffbeb', border: '#fde68a', text: '#b45309', dot: '#f59e0b', label: 'Needs attention'  },
  red:     { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', dot: '#ef4444', label: 'Action needed'    },
  neutral: { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', dot: '#94a3b8', label: 'Neutral'          },
};

const TAB_LABEL: Record<string, { title: string; description: string }> = {
  chart:    { title: 'Net Worth Trajectory',      description: 'How your total net worth evolves month by month over the forecast period.' },
  cashflow: { title: 'Monthly Cash Flow',         description: 'Your income, expenses and debt payments each month — and the resulting cash surplus or deficit.' },
  debt:     { title: 'Debt Paydown Timeline',     description: 'How your outstanding debt shrinks over time, plus cumulative interest cost.' },
  savings:  { title: 'Savings Rate Over Time',    description: 'Your net savings as a percentage of income each month, benchmarked against the 20% guideline.' },
  ratios:   { title: 'Financial Health Ratios',   description: 'Six key ratios benchmarked against common financial guidelines, with a composite health score.' },
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface InsightMeta {
  tab:    string;
  icon:   string;
  text:   string;
  sub?:   string;
  status: Status;
}

interface Props extends InsightMeta {
  forecast:            ForecastResult;
  scenario:            ScenarioInput;
  currency:            string;
  emergencyFundMonths: number;
  onClose:             () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InsightDetailModal({
  tab, icon, text, sub, status,
  forecast, scenario, currency, emergencyFundMonths,
  onClose,
}: Props) {

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const s    = STATUS_STYLE[status];
  const meta = TAB_LABEL[tab];

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* ── Modal card ────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-4 md:inset-10 z-50 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-modal-in"
        style={{ maxWidth: 960, margin: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-6 pb-5 border-b border-[#e2e8f0] shrink-0">
          <div className="flex items-start gap-4">
            {/* Icon badge */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 border-2"
              style={{ background: s.bg, borderColor: s.border }}
            >
              {icon}
            </div>

            <div>
              {/* Title + status badge */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold text-[#0f172a] leading-tight">{text}</h2>
                <span
                  className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border"
                  style={{ background: s.bg, borderColor: s.border, color: s.text }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
                  {s.label}
                </span>
              </div>

              {/* Sub line */}
              {sub && <p className="text-sm text-[#64748b] mt-1">{sub}</p>}

              {/* Chart section label + description */}
              {meta && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-semibold text-[#6366f1]">{meta.title}</span>
                  <span className="text-[#e2e8f0]">·</span>
                  <span className="text-xs text-[#94a3b8]">{meta.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#94a3b8] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-all shrink-0 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Chart content area */}
        <div className="flex-1 overflow-y-auto px-7 py-6 bg-[#fafafa]">
          {tab === 'chart'    && <ForecastChart    snapshots={forecast.snapshots} currency={currency} />}
          {tab === 'cashflow' && <CashFlowChart    snapshots={forecast.snapshots} currency={currency} />}
          {tab === 'debt'     && <DebtPaydownChart snapshots={forecast.snapshots} currency={currency} totalInterestPaid={forecast.summary.totalInterestPaid} />}
          {tab === 'savings'  && <SavingsRateChart snapshots={forecast.snapshots} currency={currency} />}
          {tab === 'ratios'   && <KeyRatiosPanel   scenario={scenario} forecast={forecast} emergencyFundMonths={emergencyFundMonths} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4 border-t border-[#e2e8f0] bg-white shrink-0">
          <p className="text-xs text-[#94a3b8]">Press Esc or click outside to close</p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-semibold transition-all shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
