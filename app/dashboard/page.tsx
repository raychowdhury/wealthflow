'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { ScenarioForm }       from '@/components/ScenarioForm';
import { ForecastChart }      from '@/components/ForecastChart';
import { CashFlowChart }      from '@/components/CashFlowChart';
import { ExpenseBreakdown }   from '@/components/ExpenseBreakdown';
import { DebtPaydownChart }   from '@/components/DebtPaydownChart';
import { SavingsRateChart }   from '@/components/SavingsRateChart';
import { KeyRatiosPanel }     from '@/components/KeyRatiosPanel';
import { SummaryCards }       from '@/components/SummaryCards';
import { AdvisorPanel }       from '@/components/AdvisorPanel';
import { InsightsBanner }     from '@/components/InsightsBanner';
import { QuickAdjustBar }     from '@/components/QuickAdjustBar';
import { InsightDetailModal } from '@/components/InsightDetailModal';
import { GoalsPanel }         from '@/components/GoalsPanel';
import { HealthBar }          from '@/components/HealthBar';
import { OnboardingWizard }   from '@/components/OnboardingWizard';
import type { InsightMeta }   from '@/components/InsightDetailModal';
import { computeForecast }    from '@/lib/forecast';
import type { ScenarioInput, ForecastResult, MonthSnapshot } from '@/lib/types';
import type { AdvisorAction } from '@/lib/advisor-schema';
import type { ScenarioTemplate } from '@/lib/demo-data';

const DEMO_SCENARIO_ID = 'demo-scenario-001';
const LS_KEY           = 'wealthflow-scenario-v1';
const LS_THEME_KEY     = 'wealthflow-theme';
type FormData  = Omit<ScenarioInput, 'id'>;
type Tab       = 'chart' | 'cashflow' | 'expenses' | 'debt' | 'savings' | 'ratios' | 'table';
type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  onUndo?: () => void;
}

const STEPS = [
  { id: 1, label: 'Enter numbers',   icon: '📝' },
  { id: 2, label: 'View forecast',   icon: '📈' },
  { id: 3, label: 'Get AI insights', icon: '✨' },
];

// ── Chart descriptions ─────────────────────────────────────────────────────────

function kFmtShort(v: number, currency: string) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${currency} ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}${currency} ${(abs / 1_000).toFixed(0)}k`;
  return `${sign}${currency} ${abs.toFixed(0)}`;
}

function getChartDescription(tab: Tab, forecast: ForecastResult, currency: string): string {
  const s = forecast.summary;
  switch (tab) {
    case 'chart':
      return s.endNetWorth >= 0
        ? `Net worth reaches ${kFmtShort(s.endNetWorth, currency)} by end of forecast`
        : `Net worth stays negative — review expenses and debt`;
    case 'cashflow': {
      const avg = forecast.snapshots.reduce((a, b) => a + (b.totalIncome - b.totalExpenses - b.totalDebtPayment), 0) / (forecast.snapshots.length || 1);
      return avg >= 0
        ? `Average monthly surplus of ${kFmtShort(avg, currency)}`
        : `Average monthly shortfall of ${kFmtShort(Math.abs(avg), currency)} — consider cutting costs`;
    }
    case 'expenses':
      return `Breakdown of ${kFmtShort(forecast.snapshots[0]?.totalExpenses ?? 0, currency)}/mo in outflows by category`;
    case 'debt':
      return s.debtFreeMonth !== null
        ? `Debt-free at month ${s.debtFreeMonth + 1} · ${kFmtShort(s.totalInterestPaid, currency)} total interest paid`
        : `Debt not fully paid off — try aggressive or instant payoff strategy`;
    case 'savings': {
      const lastSnap = forecast.snapshots[forecast.snapshots.length - 1];
      const rate = lastSnap && lastSnap.totalIncome > 0
        ? ((lastSnap.totalIncome - lastSnap.totalExpenses - lastSnap.totalDebtPayment) / lastSnap.totalIncome * 100).toFixed(0)
        : '0';
      return `Savings rate trends over time — ending at ~${rate}% of income`;
    }
    case 'ratios':
      return 'Key financial health ratios: debt-to-income, emergency fund coverage, savings rate';
    case 'table':
      return 'Month-by-month snapshot of every key metric across the full horizon';
    default:
      return '';
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();

  const [scenarioData, setScenarioData]     = useState<FormData | null>(null);
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const [mobileSidebar, setMobileSidebar]   = useState(false);
  const [activeTab, setActiveTab]           = useState<Tab>('chart');
  const [riskProfile, setRiskProfile]       = useState<'low' | 'med' | 'high'>('med');
  const [emergencyMonths, setEmergencyMonths] = useState(3);
  const [advisorTone, setAdvisorTone]       = useState<'concise' | 'neutral'>('concise');
  const [prefsOpen, setPrefsOpen]           = useState(false);
  const [toast, setToast]                   = useState<ToastState | null>(null);
  const [incomeAdj, setIncomeAdj]           = useState(0);
  const [expenseAdj, setExpenseAdj]         = useState(0);
  const [investAdj, setInvestAdj]           = useState(0);
  const [insightModal, setInsightModal]     = useState<InsightMeta | null>(null);
  const [scenarioKey, setScenarioKey]       = useState(0);
  const [darkMode, setDarkMode]             = useState(false);
  const [userMenuOpen, setUserMenuOpen]     = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [hasAutoGenerated, setHasAutoGenerated] = useState(false);

  // Undo AI action
  const [undoData, setUndoData]     = useState<FormData | null>(null);
  const undoTimerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sentinel ref for sticky HealthBar
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Toast timer ref
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Restore from localStorage ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setScenarioData(JSON.parse(saved));
      const theme = localStorage.getItem(LS_THEME_KEY);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = theme === 'dark' || (!theme && prefersDark);
      setDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!scenarioData) return;
    try { localStorage.setItem(LS_KEY, JSON.stringify(scenarioData)); } catch { /* ignore */ }
  }, [scenarioData]);

  // ── Dark mode ──────────────────────────────────────────────────────────────
  const toggleDark = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      try { localStorage.setItem(LS_THEME_KEY, next ? 'dark' : 'light'); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, type: ToastType = 'success', onUndo?: () => void) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message: msg, type, onUndo });
    toastTimerRef.current = setTimeout(() => setToast(null), onUndo ? 5000 : 3200);
  }, []);

  // ── Computed scenario values ───────────────────────────────────────────────
  const scenarioInput = useMemo<ScenarioInput | null>(() => {
    if (!scenarioData) return null;
    return { id: DEMO_SCENARIO_ID, ...scenarioData };
  }, [scenarioData]);

  const hasWhatIf = incomeAdj !== 0 || expenseAdj !== 0 || investAdj !== 0;

  const liveScenario = useMemo<ScenarioInput | null>(() => {
    if (!scenarioInput) return null;
    if (!hasWhatIf) return scenarioInput;
    const m = (base: number, pct: number) => Math.max(0, base * (1 + pct / 100));
    return {
      ...scenarioInput,
      incomes:     scenarioInput.incomes.map((i) => ({ ...i, amount: m(i.amount, incomeAdj) })),
      expenses:    scenarioInput.expenses.map((e) => ({ ...e, amount: m(e.amount, expenseAdj) })),
      investments: scenarioInput.investments.map((i) => ({
        ...i, monthlyContribution: m(i.monthlyContribution, investAdj),
      })),
    };
  }, [scenarioInput, hasWhatIf, incomeAdj, expenseAdj, investAdj]);

  const forecast = useMemo<ForecastResult | null>(() => {
    if (!liveScenario) return null;
    return computeForecast(liveScenario);
  }, [liveScenario]);

  // Baseline forecast (no what-if) for delta comparison in SummaryCards
  const baselineForecast = useMemo<ForecastResult | null>(() => {
    if (!scenarioInput || !hasWhatIf) return null;
    return computeForecast(scenarioInput);
  }, [scenarioInput, hasWhatIf]);

  const hasForecast  = !!(scenarioInput && forecast);
  const currentStep  = !hasForecast ? 1 : 2;
  const chartDesc    = forecast ? getChartDescription(activeTab, forecast, scenarioData!.currency) : '';

  // ── Auto-generate AI insights after first forecast ─────────────────────────
  useEffect(() => {
    if (!hasForecast || hasAutoGenerated) return;
    const t = setTimeout(() => setHasAutoGenerated(true), 2000);
    return () => clearTimeout(t);
  }, [hasForecast, hasAutoGenerated]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSave = useCallback((data: FormData) => {
    setScenarioData(data);
  }, []);

  const handleUndo = useCallback(() => {
    if (!undoData) return;
    setScenarioData(undoData);
    setScenarioKey((k) => k + 1);
    setUndoData(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    showToast('Action undone ✓');
  }, [undoData, showToast]);

  const handleApplyAction = useCallback((action: AdvisorAction) => {
    if (!scenarioData) return;

    // Save state for undo before modifying
    const snapshot = scenarioData;
    const next: FormData = { ...scenarioData };

    if (action.changes.debtStrategy) {
      next.debts = next.debts.map((d) => ({ ...d, strategy: action.changes.debtStrategy! }));
    }
    if (action.changes.expenseAdjustments) {
      next.expenses = next.expenses.map((e) => {
        const adj = action.changes.expenseAdjustments!.find((a) => a.expenseId === e.id);
        return adj ? { ...e, amount: Math.max(0, e.amount + adj.delta) } : e;
      });
    }
    if (action.changes.incomeAdjustments) {
      next.incomes = next.incomes.map((i) => {
        const adj = action.changes.incomeAdjustments!.find((a) => a.incomeId === i.id);
        return adj ? { ...i, amount: Math.max(0, i.amount + adj.delta) } : i;
      });
    }
    if (action.changes.investmentAdjustments) {
      next.investments = next.investments.map((inv) => {
        const adj = action.changes.investmentAdjustments!.find((a) => a.accountId === inv.id);
        if (!adj) return inv;
        return {
          ...inv,
          monthlyContribution: Math.max(0, inv.monthlyContribution + adj.monthlyContributionDelta),
          expectedAnnualReturn: Math.max(0, inv.expectedAnnualReturn + adj.expectedReturnDelta),
        };
      });
    }

    setUndoData(snapshot);
    setScenarioData(next);
    setScenarioKey((k) => k + 1);

    // Show 5-second undo toast
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    showToast(`"${action.label}" applied`, 'success', () => {
      setScenarioData(snapshot);
      setScenarioKey((k) => k + 1);
      setUndoData(null);
      setToast(null);
    });
    undoTimerRef.current = setTimeout(() => setUndoData(null), 5000);
  }, [scenarioData, showToast]);

  const handleLoadTemplate = useCallback((tpl: ScenarioTemplate) => {
    setScenarioData(tpl.scenario);
    setScenarioKey((k) => k + 1);
    setSidebarOpen(true);
    setMobileSidebar(false);
    showToast(`"${tpl.name}" loaded — tweak it to match your situation`);
  }, [showToast]);

  const handleExportJSON = useCallback(() => {
    if (!scenarioInput) return;
    const blob = new Blob([JSON.stringify(scenarioInput, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'wealthflow-scenario.json'; a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
    showToast('Exported as JSON');
  }, [scenarioInput, showToast]);

  const handleExportCSV = useCallback(() => {
    if (!forecast || !scenarioData) return;
    const headers = ['Month', 'Income', 'Expenses', 'Debt Payment', 'Cash', 'Net Worth', 'Investments', 'Total Debt'];
    const rows = forecast.snapshots.map((s) => [
      s.month + 1, s.totalIncome.toFixed(2), s.totalExpenses.toFixed(2),
      s.totalDebtPayment.toFixed(2), s.cash.toFixed(2),
      s.netWorth.toFixed(2), s.totalInvestments.toFixed(2), s.totalDebt.toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `wealthflow-${scenarioData.currency}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
    showToast('Exported as CSV');
  }, [forecast, scenarioData, showToast]);

  const handleReset = useCallback(() => {
    if (!confirm('Clear all data and start over?')) return;
    setScenarioData(null);
    setHasAutoGenerated(false);
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    setActiveTab('chart');
    showToast('Scenario cleared');
  }, [showToast]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">

      {/* ── Sticky HealthBar (appears when scrolled past summary cards) ───── */}
      {forecast && (
        <HealthBar
          summary={forecast.summary}
          currency={scenarioData!.currency}
          sentinelRef={sentinelRef}
        />
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 text-white text-sm font-medium rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in ${
          toast.type === 'error' ? 'bg-red-600' : toast.type === 'info' ? 'bg-[#6366f1]' : 'bg-[#1e293b]'
        } ${toast.onUndo ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            toast.type === 'error' ? 'bg-red-200' : toast.type === 'info' ? 'bg-blue-200' : 'bg-[#4ade80]'
          }`} />
          <span>{toast.message}</span>
          {toast.onUndo && (
            <button
              onClick={toast.onUndo}
              className="ml-1 text-xs font-bold underline underline-offset-2 opacity-90 hover:opacity-100"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="h-14 bg-[var(--surface)] border-b border-[var(--border)] px-4 flex items-center justify-between shrink-0 shadow-sm z-20">
        {/* Brand */}
        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setMobileSidebar((o) => !o)}
            className="lg:hidden w-8 h-8 flex flex-col gap-1.5 justify-center items-center rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            aria-label="Toggle sidebar"
          >
            <span className="w-4 h-0.5 bg-[var(--muted)]" />
            <span className="w-4 h-0.5 bg-[var(--muted)]" />
            <span className="w-4 h-0.5 bg-[var(--muted)]" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm shadow-sm select-none">
            W
          </div>
          <span className="font-semibold text-[var(--text)] tracking-tight">WealthFlow</span>
          <span className="hidden md:block text-[var(--border)] text-lg leading-none">|</span>
          <span className="hidden md:block text-[var(--muted)] text-sm">Forecast Engine</span>
        </div>

        {/* Step progress — desktop only */}
        <div className="hidden lg:flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                s.id < currentStep   ? 'bg-[var(--positive-light)] text-[var(--positive)]'
                : s.id === currentStep ? 'bg-[var(--accent-light)] text-[var(--accent)] font-semibold'
                : 'bg-[var(--bg)] text-[var(--muted-2)]'
              }`}>
                <span>{s.id < currentStep ? '✓' : s.icon}</span>
                <span>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-px ${s.id < currentStep ? 'bg-[var(--positive)]' : 'bg-[var(--border)]'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {hasForecast && (
            <>
              {/* Export — click-based dropdown */}
              <div className="relative">
                <button
                  onClick={() => setExportMenuOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
                >
                  ↓ <span className="hidden sm:block">Export</span>
                </button>
                {exportMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-50 min-w-[140px]">
                      <button onClick={handleExportJSON} className="px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] text-left transition-colors">📄 Export JSON</button>
                      <button onClick={handleExportCSV}  className="px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] text-left transition-colors">📊 Export CSV</button>
                    </div>
                  </>
                )}
              </div>
              <button onClick={handleReset} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-red-300 hover:text-red-500 transition-all">
                ✕ <span className="hidden sm:block">Reset</span>
              </button>
            </>
          )}

          <button onClick={toggleDark} title={darkMode ? 'Light mode' : 'Dark mode'}
            className="flex items-center text-sm px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all">
            {darkMode ? '☀' : '🌙'}
          </button>

          {/* User menu */}
          {session ? (
            <div className="relative">
              <button onClick={() => setUserMenuOpen((o) => !o)}
                className="w-8 h-8 rounded-full bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity">
                {session.user?.name?.[0]?.toUpperCase() ?? session.user?.email?.[0]?.toUpperCase() ?? 'U'}
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-50 min-w-[180px]">
                    <div className="px-4 py-2.5 border-b border-[var(--border)]">
                      <p className="text-xs font-semibold text-[var(--text)] truncate">{session.user?.name}</p>
                      <p className="text-[10px] text-[var(--muted)] truncate">{session.user?.email}</p>
                    </div>
                    <button onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                      className="px-4 py-2 text-sm text-[var(--negative)] hover:bg-[var(--negative-light)] text-left transition-colors">
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button onClick={() => signIn()}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all font-medium">
              Sign in
            </button>
          )}

          <button onClick={() => setPrefsOpen((o) => !o)}
            className={`items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg border transition-all hidden sm:flex ${
              prefsOpen ? 'bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)]'
              : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
            }`}>
            ⚙
          </button>

          {/* Desktop sidebar toggle */}
          <button onClick={() => setSidebarOpen((o) => !o)}
            className={`hidden lg:flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all font-medium ${
              sidebarOpen ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
              : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
            }`}>
            {sidebarOpen ? '◀' : '▶'} <span>{sidebarOpen ? 'Hide' : 'Inputs'}</span>
          </button>
        </div>
      </header>

      {/* ── Settings drawer ────────────────────────────────────────────────── */}
      {prefsOpen && (
        <div className="bg-[var(--surface)] border-b border-[var(--border)] px-6 py-4 shrink-0">
          <div className="flex flex-wrap gap-8 items-start max-w-3xl">
            <PrefGroup label="Risk Profile" hint="Affects advisor recommendations">
              {(['low', 'med', 'high'] as const).map((v) => (
                <PillBtn key={v} active={riskProfile === v} onClick={() => setRiskProfile(v)}>
                  {v === 'low' ? '🛡 Low' : v === 'med' ? '⚖ Medium' : '🚀 High'}
                </PillBtn>
              ))}
            </PrefGroup>
            <PrefGroup label="Emergency Fund" hint="Target buffer (months of expenses)">
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={24} value={emergencyMonths}
                  onChange={(e) => setEmergencyMonths(+e.target.value)}
                  className="w-14 text-center border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)] bg-[var(--surface)] text-[var(--text)]" />
                <span className="text-sm text-[var(--muted)]">months</span>
              </div>
            </PrefGroup>
            <PrefGroup label="Advisor Tone" hint="How advice is phrased">
              {(['concise', 'neutral'] as const).map((v) => (
                <PillBtn key={v} active={advisorTone === v} onClick={() => setAdvisorTone(v)}>
                  {v === 'concise' ? '⚡ Concise' : '📋 Detailed'}
                </PillBtn>
              ))}
            </PrefGroup>
          </div>
        </div>
      )}

      {/* ── Insight detail modal ──────────────────────────────────────────── */}
      {insightModal && forecast && liveScenario && (
        <InsightDetailModal
          {...insightModal}
          forecast={forecast}
          scenario={liveScenario}
          currency={scenarioData!.currency}
          emergencyFundMonths={emergencyMonths}
          onClose={() => setInsightModal(null)}
        />
      )}

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">

        {/* Mobile sidebar overlay backdrop */}
        {mobileSidebar && (
          <div className="lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileSidebar(false)} />
        )}

        {/* Sidebar — desktop: fixed column | mobile: slide-in overlay */}
        <aside className={`
          bg-[var(--surface)] border-r border-[var(--border)] flex flex-col shadow-sm z-30
          transition-transform duration-300
          lg:static lg:translate-x-0 lg:shrink-0
          fixed top-14 bottom-0 left-0
          ${mobileSidebar ? 'translate-x-0 w-[340px]' : '-translate-x-full w-[340px]'}
          ${sidebarOpen ? 'lg:w-[360px]' : 'lg:w-0 lg:overflow-hidden lg:border-r-0'}
        `}>
          <div className="px-5 pt-5 pb-3 border-b border-[var(--border)] shrink-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <div className="flex items-center gap-2">
                <StepBadge n={1} />
                <h2 className="text-sm font-semibold text-[var(--text)]">Your Financial Snapshot</h2>
              </div>
              <div className="flex items-center gap-2">
                {scenarioData && (
                  <span className="text-[10px] text-[var(--positive)] bg-[var(--positive-light)] px-2 py-0.5 rounded-full font-medium border border-[#bbf7d0]">
                    ✓ Saved
                  </span>
                )}
                {/* Close button — mobile only */}
                <button onClick={() => setMobileSidebar(false)}
                  className="lg:hidden w-6 h-6 rounded flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] text-xs transition-colors">
                  ✕
                </button>
              </div>
            </div>
            <p className="text-xs text-[var(--muted)] pl-7">Changes auto-save and update forecast instantly</p>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <ScenarioForm key={scenarioKey} onSave={handleSave} initial={scenarioData ?? undefined} />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {!hasForecast ? (
            <OnboardingWizard
              onStartBlank={() => { setSidebarOpen(true); setMobileSidebar(true); }}
              onLoadTemplate={handleLoadTemplate}
            />
          ) : (
            <div className="p-4 lg:p-5 flex flex-col xl:flex-row gap-5 min-h-full items-start">

              {/* ── Centre column ──────────────────────────────────────────── */}
              <div className="flex-1 min-w-0 flex flex-col gap-4 w-full">

                {/* Forecast heading */}
                <div className="flex items-center gap-2 flex-wrap">
                  <StepBadge n={2} />
                  <h2 className="text-sm font-semibold text-[var(--text)]">Your Forecast</h2>
                  <span className="text-xs text-[var(--muted)]">
                    {scenarioData!.months} months · {scenarioData!.currency}
                  </span>
                  {hasWhatIf && (
                    <span className="text-[10px] font-semibold bg-[var(--accent-light)] text-[var(--accent)] px-2 py-0.5 rounded-full border border-[var(--accent)]/20">
                      ⚡ What-if active
                    </span>
                  )}
                </div>

                {/* Summary cards — sentinel div placed here for HealthBar */}
                <div ref={sentinelRef}>
                  <SummaryCards
                    summary={forecast!.summary}
                    currency={scenarioData!.currency}
                    baselineSummary={baselineForecast?.summary ?? null}
                  />
                </div>

                <InsightsBanner
                  forecast={forecast!}
                  scenario={liveScenario!}
                  emergencyFundMonths={emergencyMonths}
                  onInsightClick={(meta) => setInsightModal(meta)}
                />

                {forecast!.goalProgress.length > 0 && (
                  <GoalsPanel goals={forecast!.goalProgress} currency={scenarioData!.currency} />
                )}

                <QuickAdjustBar
                  incomeAdj={incomeAdj}   onIncomeChange={setIncomeAdj}
                  expenseAdj={expenseAdj} onExpenseChange={setExpenseAdj}
                  investAdj={investAdj}   onInvestChange={setInvestAdj}
                  onReset={() => { setIncomeAdj(0); setExpenseAdj(0); setInvestAdj(0); }}
                />

                {/* Chart panel */}
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm">
                  {/* Tab bar */}
                  <div className="flex items-center border-b border-[var(--border)] px-2 bg-[var(--surface-2)] overflow-x-auto rounded-t-2xl">
                    {([
                      { key: 'chart',    icon: '📈', label: 'Net Worth'     },
                      { key: 'cashflow', icon: '💸', label: 'Cash Flow'     },
                      { key: 'expenses', icon: '🧾', label: 'Expenses'      },
                      { key: 'debt',     icon: '💳', label: 'Debt'          },
                      { key: 'savings',  icon: '💰', label: 'Savings Rate'  },
                      { key: 'ratios',   icon: '📊', label: 'Ratios'        },
                      { key: 'table',    icon: '📋', label: 'Table'         },
                    ] as { key: Tab; icon: string; label: string }[]).map((t) => (
                      <button key={t.key} onClick={() => setActiveTab(t.key)}
                        className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                          activeTab === t.key
                            ? 'text-[var(--accent)] border-[var(--accent)]'
                            : 'text-[var(--muted)] border-transparent hover:text-[var(--text)] hover:border-[var(--border)]'
                        }`}>
                        <span>{t.icon}</span>
                        <span className="hidden sm:block">{t.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Chart description */}
                  {chartDesc && (
                    <div className="px-5 pt-3 pb-0">
                      <p className="text-xs text-[var(--muted)] leading-relaxed">{chartDesc}</p>
                    </div>
                  )}

                  {/* Chart content */}
                  <div className="p-5">
                    {activeTab === 'chart'    && <ForecastChart    snapshots={forecast!.snapshots} currency={scenarioData!.currency} />}
                    {activeTab === 'cashflow' && <CashFlowChart    snapshots={forecast!.snapshots} currency={scenarioData!.currency} />}
                    {activeTab === 'expenses' && <ExpenseBreakdown expenses={liveScenario!.expenses} currency={scenarioData!.currency} />}
                    {activeTab === 'debt'     && <DebtPaydownChart snapshots={forecast!.snapshots} currency={scenarioData!.currency} totalInterestPaid={forecast!.summary.totalInterestPaid} />}
                    {activeTab === 'savings'  && <SavingsRateChart snapshots={forecast!.snapshots} currency={scenarioData!.currency} />}
                    {activeTab === 'ratios'   && <KeyRatiosPanel   scenario={liveScenario!} forecast={forecast!} emergencyFundMonths={emergencyMonths} />}
                    {activeTab === 'table'    && <MonthlyTable     snapshots={forecast!.snapshots} currency={scenarioData!.currency} />}
                  </div>
                </div>

                {/* AI Advisor — below charts on mobile/tablet */}
                <div className="xl:hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <StepBadge n={3} />
                    <h2 className="text-sm font-semibold text-[var(--text)]">AI Advisor</h2>
                  </div>
                  <AdvisorPanel
                    scenario={scenarioInput!}
                    currency={scenarioData!.currency}
                    forecastBefore={forecast!.summary}
                    onApplyAction={handleApplyAction}
                    preferences={{ riskProfile, emergencyFundMonths: emergencyMonths, advisorTone }}
                    autoTrigger={hasAutoGenerated}
                  />
                </div>
              </div>

              {/* ── Advisor column — desktop right panel ───────────────────── */}
              <div className="hidden xl:flex w-[300px] shrink-0 flex-col gap-3">
                <div className="flex items-center gap-2">
                  <StepBadge n={3} />
                  <h2 className="text-sm font-semibold text-[var(--text)]">AI Advisor</h2>
                </div>
                <AdvisorPanel
                  scenario={scenarioInput!}
                  currency={scenarioData!.currency}
                  forecastBefore={forecast!.summary}
                  onApplyAction={handleApplyAction}
                  preferences={{ riskProfile, emergencyFundMonths: emergencyMonths, advisorTone }}
                  autoTrigger={hasAutoGenerated}
                />
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Monthly table ──────────────────────────────────────────────────────────────

function MonthlyTable({ snapshots, currency }: { snapshots: MonthSnapshot[]; currency: string }) {
  const fmt  = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const rows = snapshots.filter((_, i) => i === 0 || (i + 1) % 3 === 0);
  const COLS = ['Month', 'Income', 'Expenses', 'Debt Pmt', 'Cash', 'Net Worth', 'Investments'];

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr>
            {COLS.map((h, i) => (
              <th key={h} className={`text-left py-2.5 px-3 text-xs font-semibold text-[var(--muted)] bg-[var(--surface-2)] border-b border-[var(--border)] whitespace-nowrap ${i === 0 ? 'rounded-tl-xl' : ''} ${i === COLS.length - 1 ? 'rounded-tr-xl' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s, ri) => (
            <tr key={s.month} className={`${ri % 2 === 1 ? 'bg-[var(--surface-2)]' : 'bg-[var(--surface)]'} hover:bg-[var(--accent-light)] transition-colors`}>
              <td className="py-2 px-3 text-xs font-medium text-[var(--muted)]">M{s.month + 1}</td>
              <td className="py-2 px-3 text-xs font-semibold text-[var(--positive)]">{fmt(s.totalIncome)}</td>
              <td className="py-2 px-3 text-xs text-[var(--negative)]">{fmt(s.totalExpenses)}</td>
              <td className="py-2 px-3 text-xs text-[var(--warn)]">{fmt(s.totalDebtPayment)}</td>
              <td className={`py-2 px-3 text-xs font-semibold ${s.cash < 0 ? 'text-[var(--negative)]' : 'text-[var(--text-2)]'}`}>{fmt(s.cash)}</td>
              <td className={`py-2 px-3 text-xs font-semibold ${s.netWorth < 0 ? 'text-[var(--negative)]' : 'text-[var(--positive)]'}`}>{fmt(s.netWorth)}</td>
              <td className="py-2 px-3 text-xs text-[var(--warn)]">{fmt(s.totalInvestments)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-[var(--muted)] px-3 py-2 bg-[var(--surface-2)] border-t border-[var(--border)] rounded-b-xl">
        Every 3rd month shown · All values in {currency}
      </p>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function StepBadge({ n }: { n: number }) {
  return (
    <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm">
      {n}
    </div>
  );
}

function PrefGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-xs font-semibold text-[var(--text-2)]">{label}</p>
        {hint && <p className="text-[11px] text-[var(--muted)]">{hint}</p>}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
    </div>
  );
}

function PillBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
        active ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
        : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
      }`}>
      {children}
    </button>
  );
}
