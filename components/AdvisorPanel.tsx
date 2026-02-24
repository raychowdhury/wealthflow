'use client';

import { useState, useCallback, useEffect } from 'react';
import type { AdvisorResponse, AdvisorAction } from '@/lib/advisor-schema';
import type { ForecastResult, ScenarioInput } from '@/lib/types';

interface AdvisorMeta {
  model: string;
  runAt: string;
  fromCache: boolean;
  inputHash: string;
}

interface Props {
  scenario: ScenarioInput;
  currency: string;
  forecastBefore?: ForecastResult['summary'];
  onApplyAction: (action: AdvisorAction) => void;
  preferences?: {
    riskProfile?: 'low' | 'med' | 'high';
    emergencyFundMonths?: number;
    advisorTone?: 'concise' | 'neutral';
  };
  /** When true, auto-trigger generate() if no insights loaded yet */
  autoTrigger?: boolean;
}

const CONFIDENCE_STYLE = {
  high: { text: 'text-[#059669]', bg: 'bg-[#ecfdf5]', border: 'border-[#bbf7d0]', dot: '#059669' },
  med:  { text: 'text-[#d97706]', bg: 'bg-[#fffbeb]', border: 'border-[#fde68a]', dot: '#d97706' },
  low:  { text: 'text-[#64748b]', bg: 'bg-[#f8fafc]', border: 'border-[#e2e8f0]', dot: '#94a3b8' },
} as const;

const ALERT_STYLE = {
  cash:      { icon: '💵', bg: 'bg-[#fef2f2]', border: 'border-l-[#dc2626]', label: 'text-[#dc2626]' },
  debt:      { icon: '💳', bg: 'bg-[#fffbeb]', border: 'border-l-[#d97706]', label: 'text-[#d97706]' },
  rent:      { icon: '🏠', bg: 'bg-[#fffbeb]', border: 'border-l-[#d97706]', label: 'text-[#d97706]' },
  fx:        { icon: '💱', bg: 'bg-[#eef2ff]', border: 'border-l-[#6366f1]', label: 'text-[#6366f1]' },
  portfolio: { icon: '📊', bg: 'bg-[#eef2ff]', border: 'border-l-[#6366f1]', label: 'text-[#6366f1]' },
} as const;

function fmtDelta(v: number, currency: string) {
  const sign = v >= 0 ? '+' : '−';
  return `${sign}${currency} ${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function AdvisorPanel({ scenario, currency, onApplyAction, preferences, autoTrigger }: Props) {
  const [loading, setLoading]     = useState(false);
  const [advisor, setAdvisor]     = useState<AdvisorResponse | null>(null);
  const [meta, setMeta]           = useState<AdvisorMeta | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, preferences }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        if (res.status === 429) {
          throw new Error('Rate limit reached — please wait a minute before refreshing insights.');
        }
        throw new Error(errBody?.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setAdvisor(data.advisor);
      setMeta(data.meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Advisor unavailable');
      console.error('[advisor]', e);
    } finally {
      setLoading(false);
    }
  }, [scenario, preferences]);

  // Auto-trigger once when parent signals first forecast is ready
  useEffect(() => {
    if (autoTrigger && !advisor && !loading) {
      generate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTrigger]);

  const applyAction = (action: AdvisorAction) => {
    setAppliedId(action.id);
    onApplyAction(action);
  };

  return (
    <div className="flex flex-col gap-3">

      {/* Generate card */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
          <div className="flex items-center gap-2">
            <span className="text-base">✨</span>
            <span className="text-sm font-semibold text-[var(--text)]">AI Advisor</span>
          </div>
          {meta && (
            <span className="text-[10px] bg-[var(--accent-light)] text-[var(--accent)] px-2 py-0.5 rounded-full font-medium border border-[var(--accent)]/20">
              {meta.model}
            </span>
          )}
        </div>

        <div className="p-4 flex flex-col gap-3">
          {/* Prompt + button */}
          {!advisor && !loading && (
            <div className="text-center py-2">
              <p className="text-sm text-[var(--muted)] mb-3">
                Get personalized insights and action suggestions based on your forecast.
              </p>
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 ${
              loading
                ? 'bg-[var(--accent-light)] text-[var(--accent)] cursor-wait'
                : 'bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white hover:shadow-md'
            }`}
          >
            {loading ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                Analysing your scenario…
              </>
            ) : advisor ? (
              '↻ Refresh insights'
            ) : (
              '✨ Generate insights'
            )}
          </button>

          {meta && (
            <p className="text-[11px] text-[var(--muted)] text-center">
              {meta.fromCache ? '⚡ Cached' : '🔄 Fresh'} · {new Date(meta.runAt).toLocaleTimeString()}
            </p>
          )}

          {error && (
            <div className="flex gap-2 items-start p-3 bg-[var(--negative-light)] border border-[#fecaca] rounded-xl text-xs text-[var(--negative)]">
              <span className="shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {advisor && (
        <>
          {/* Insights */}
          <Section title="Insights" icon="💡" count={advisor.insights.length}>
            {advisor.insights.map((ins, i) => {
              const cs = CONFIDENCE_STYLE[ins.confidence];
              return (
                <div key={i} className="bg-white rounded-xl border border-[var(--border)] p-3.5 shadow-sm flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--text)] leading-snug">{ins.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 border ${cs.text} ${cs.bg} ${cs.border}`}>
                      {ins.confidence}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">{ins.why}</p>
                  {ins.impact_aed !== 0 && (
                    <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg w-fit ${
                      ins.impact_aed >= 0 ? 'bg-[var(--positive-light)] text-[var(--positive)]' : 'bg-[var(--negative-light)] text-[var(--negative)]'
                    }`}>
                      {ins.impact_aed >= 0 ? '↑' : '↓'} {currency} {Math.abs(ins.impact_aed).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  )}
                </div>
              );
            })}
          </Section>

          {/* Alerts */}
          {advisor.alerts.length > 0 && (
            <Section title="Risks & Alerts" icon="⚠️" count={advisor.alerts.length}>
              {advisor.alerts.map((alert, i) => {
                const as_ = ALERT_STYLE[alert.type];
                return (
                  <div key={i} className={`flex gap-2.5 items-start rounded-xl p-3 border-l-4 border border-[var(--border)] ${as_.bg} ${as_.border}`}>
                    <span className="text-base leading-none shrink-0 mt-0.5">{as_.icon}</span>
                    <div>
                      <span className={`text-xs font-semibold capitalize ${as_.label}`}>{alert.type}</span>
                      <p className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed">{alert.message}</p>
                    </div>
                  </div>
                );
              })}
            </Section>
          )}

          {/* Actions */}
          {advisor.actions.length > 0 && (
            <Section title="Suggested Actions" icon="⚡" count={advisor.actions.length}>
              {advisor.actions.map((action) => {
                const isApplied = appliedId === action.id;
                return (
                  <div key={action.id} className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
                    <div className="px-3.5 pt-3.5 pb-2 flex flex-col gap-1.5">
                      <p className="text-sm font-semibold text-[var(--text)]">{action.label}</p>
                      <div className="flex gap-3 text-xs">
                        <span className={`flex items-center gap-1 font-medium ${action.expectedOutcome.netWorthDelta >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                          📈 Net worth: {fmtDelta(action.expectedOutcome.netWorthDelta, currency)}
                        </span>
                        <span className={`flex items-center gap-1 font-medium ${action.expectedOutcome.minCashDelta >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                          💵 Min cash: {fmtDelta(action.expectedOutcome.minCashDelta, currency)}
                        </span>
                      </div>
                    </div>
                    <div className="px-3.5 pb-3.5">
                      <button
                        onClick={() => applyAction(action)}
                        disabled={isApplied}
                        className={`text-xs py-1.5 px-4 rounded-lg font-semibold transition-all ${
                          isApplied
                            ? 'bg-[var(--positive-light)] text-[var(--positive)] border border-[#bbf7d0] cursor-default'
                            : 'bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)] hover:text-white hover:shadow-sm'
                        }`}
                      >
                        {isApplied ? '✓ Applied to forecast' : 'Apply this action'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </Section>
          )}
        </>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-[var(--muted)] text-center leading-relaxed px-1">
        For informational purposes only. Not financial advice. Based solely on your inputs — no market predictions.
      </p>
    </div>
  );
}

function Section({ title, icon, count, children }: {
  title: string; icon: string; count?: number; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <h4 className="text-sm font-semibold text-[var(--text)]">{title}</h4>
        {count !== undefined && (
          <span className="text-[11px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] px-1.5 py-0.5 rounded-full font-medium">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
