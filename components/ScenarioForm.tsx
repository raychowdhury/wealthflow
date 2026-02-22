'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type { ScenarioInput, IncomeInput, ExpenseInput, DebtInput, InvestmentInput, OneTimeEvent, FinancialGoal } from '@/lib/types';

type FormData = Omit<ScenarioInput, 'id'>;
type TabKey = 'basics' | 'income' | 'expenses' | 'debt' | 'investments' | 'advanced';

interface Props {
  initial?: Partial<FormData>;
  onSave: (data: FormData) => void;
}

// ── Validation ────────────────────────────────────────────────────────────────

interface ValidationErrors {
  basics?: { currency?: string; months?: string; initialCash?: string };
  incomes?: Record<string, { label?: string; amount?: string; growthRate?: string }>;
  expenses?: Record<string, { label?: string; amount?: string }>;
  debts?: Record<string, { label?: string; balance?: string; annualRate?: string; minPayment?: string }>;
  investments?: Record<string, { label?: string; currentValue?: string; monthlyContribution?: string; expectedAnnualReturn?: string }>;
}

function validateForm(form: FormData): ValidationErrors {
  const errors: ValidationErrors = {};

  // Basics
  const basics: ValidationErrors['basics'] = {};
  if (!form.currency || form.currency.length !== 3) basics.currency = 'Must be a 3-letter code (e.g. USD)';
  if (form.months < 1 || form.months > 360) basics.months = 'Must be between 1 and 360 months';
  if (form.initialCash < 0) basics.initialCash = 'Cannot be negative';
  if (Object.keys(basics).length) errors.basics = basics;

  // Incomes
  const incomes: ValidationErrors['incomes'] = {};
  form.incomes.forEach((inc) => {
    const e: Record<string, string> = {};
    if (!inc.label.trim()) e.label = 'Name is required';
    if (inc.amount < 0) e.amount = 'Cannot be negative';
    if (inc.growthRate < -50 || inc.growthRate > 100) e.growthRate = 'Must be between −50% and 100%';
    if (Object.keys(e).length) incomes[inc.id] = e;
  });
  if (Object.keys(incomes).length) errors.incomes = incomes;

  // Expenses
  const expenses: ValidationErrors['expenses'] = {};
  form.expenses.forEach((exp) => {
    const e: Record<string, string> = {};
    if (!exp.label.trim()) e.label = 'Name is required';
    if (exp.amount < 0) e.amount = 'Cannot be negative';
    if (Object.keys(e).length) expenses[exp.id] = e;
  });
  if (Object.keys(expenses).length) errors.expenses = expenses;

  // Debts
  const debts: ValidationErrors['debts'] = {};
  form.debts.forEach((d) => {
    const e: Record<string, string> = {};
    if (!d.label.trim()) e.label = 'Name is required';
    if (d.balance < 0) e.balance = 'Cannot be negative';
    if (d.annualRate < 0 || d.annualRate > 100) e.annualRate = 'Must be 0–100%';
    if (d.minPayment < 0) e.minPayment = 'Cannot be negative';
    if (Object.keys(e).length) debts[d.id] = e;
  });
  if (Object.keys(debts).length) errors.debts = debts;

  // Investments
  const investments: ValidationErrors['investments'] = {};
  form.investments.forEach((inv) => {
    const e: Record<string, string> = {};
    if (!inv.label.trim()) e.label = 'Name is required';
    if (inv.currentValue < 0) e.currentValue = 'Cannot be negative';
    if (inv.monthlyContribution < 0) e.monthlyContribution = 'Cannot be negative';
    if (inv.expectedAnnualReturn < 0 || inv.expectedAnnualReturn > 100) e.expectedAnnualReturn = 'Must be 0–100%';
    if (Object.keys(e).length) investments[inv.id] = e;
  });
  if (Object.keys(investments).length) errors.investments = investments;

  return errors;
}

function genId() { return Math.random().toString(36).slice(2, 9); }

const DEFAULT: FormData = {
  currency: 'AED',
  months: 60,
  initialCash: 50000,
  incomes:  [{ id: genId(), label: 'Salary', amount: 20000, startMonth: 0, growthRate: 3 }],
  expenses: [
    { id: genId(), label: 'Rent',          amount: 7000, category: 'rent',          startMonth: 0, growthRate: 0 },
    { id: genId(), label: 'Living costs',  amount: 5000, category: 'fixed',         startMonth: 0, growthRate: 2 },
    { id: genId(), label: 'Entertainment', amount: 2000, category: 'discretionary', startMonth: 0, growthRate: 0 },
  ],
  debts: [{ id: genId(), label: 'Car loan', balance: 80000, annualRate: 6.5, minPayment: 1500, strategy: 'min' }],
  investments: [{ id: genId(), label: 'Stocks ETF', currentValue: 30000, monthlyContribution: 2000, expectedAnnualReturn: 9 }],
  inflationRate: 0,
  taxRate: 0,
  oneTimeEvents: [],
  goals: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function kFmt(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(0)}k`;
  return `${sign}${abs.toFixed(0)}`;
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// ── Input style ───────────────────────────────────────────────────────────────

const inp = 'w-full border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text)] bg-[var(--surface)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all';
const inpErr = 'w-full border border-red-400 rounded-lg px-3 py-1.5 text-sm text-[var(--text)] bg-[var(--surface)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all';

// ── Main component ────────────────────────────────────────────────────────────

export function ScenarioForm({ initial, onSave }: Props) {
  const [form, setForm]     = useState<FormData>({ ...DEFAULT, ...initial });
  const [tab, setTab]       = useState<TabKey>('basics');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const [touched, setTouched] = useState(false);
  const saveRef             = useRef(onSave);
  saveRef.current           = onSave;

  const errors = useMemo(() => touched ? validateForm(form) : {}, [form, touched]);

  // ── Auto-save with 500ms debounce ──────────────────────────────────────────
  useEffect(() => {
    setStatus('saving');
    const t = setTimeout(() => {
      saveRef.current(form);
      setStatus('saved');
    }, 500);
    return () => clearTimeout(t);
  }, [form]);                   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Updaters ────────────────────────────────────────────────────────────────
  const up = <K extends keyof FormData>(k: K, v: FormData[K]) => {
    setTouched(true);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const upIncome  = (id: string, k: keyof IncomeInput,     v: unknown) => {
    setTouched(true);
    setForm((f) => ({ ...f, incomes:     f.incomes.map((i)  => i.id === id ? { ...i, [k]: v } : i) }));
  };
  const upExpense = (id: string, k: keyof ExpenseInput,    v: unknown) => {
    setTouched(true);
    setForm((f) => ({ ...f, expenses:    f.expenses.map((e) => e.id === id ? { ...e, [k]: v } : e) }));
  };
  const upDebt    = (id: string, k: keyof DebtInput,       v: unknown) => {
    setTouched(true);
    setForm((f) => ({ ...f, debts:       f.debts.map((d)   => d.id === id ? { ...d, [k]: v } : d) }));
  };
  const upInv     = (id: string, k: keyof InvestmentInput, v: unknown) => {
    setTouched(true);
    setForm((f) => ({ ...f, investments: f.investments.map((i) => i.id === id ? { ...i, [k]: v } : i) }));
  };

  const addIncome  = () => setForm((f) => ({ ...f, incomes:     [...f.incomes,     { id: genId(), label: 'New income',     amount: 0,     startMonth: 0, growthRate: 0 }] }));
  const rmIncome   = (id: string) => setForm((f) => ({ ...f, incomes:     f.incomes.filter((i)  => i.id !== id) }));
  const addExpense = () => setForm((f) => ({ ...f, expenses:    [...f.expenses,    { id: genId(), label: 'New expense',    amount: 0,     category: 'fixed' as const, startMonth: 0, growthRate: 0 }] }));
  const rmExpense  = (id: string) => setForm((f) => ({ ...f, expenses:    f.expenses.filter((e) => e.id !== id) }));
  const addDebt    = () => setForm((f) => ({ ...f, debts:       [...f.debts,       { id: genId(), label: 'New debt',       balance: 0,    annualRate: 5, minPayment: 500, strategy: 'min' as const }] }));
  const rmDebt     = (id: string) => setForm((f) => ({ ...f, debts:       f.debts.filter((d)   => d.id !== id) }));
  const addInv     = () => setForm((f) => ({ ...f, investments: [...f.investments, { id: genId(), label: 'New account',    currentValue: 0, monthlyContribution: 0, expectedAnnualReturn: 7 }] }));
  const rmInv      = (id: string) => setForm((f) => ({ ...f, investments: f.investments.filter((i) => i.id !== id) }));

  // ── Live totals ─────────────────────────────────────────────────────────────
  const totalIncome  = form.incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpense = form.expenses.reduce((s, e) => s + e.amount, 0);
  const totalDebtPay = form.debts.reduce((s, d) => s + d.minPayment, 0);
  const totalInvest  = form.investments.reduce((s, i) => s + i.monthlyContribution, 0);
  const surplus      = totalIncome - totalExpense - totalDebtPay - totalInvest;
  const savingsRate  = totalIncome > 0 ? (surplus / totalIncome) * 100 : 0;

  // Bar segments (% of income)
  const expPct  = clamp(totalIncome > 0 ? (totalExpense  / totalIncome) * 100 : 0, 0, 100);
  const debtPct = clamp(totalIncome > 0 ? (totalDebtPay  / totalIncome) * 100 : 0, 0, 100 - expPct);
  const invPct  = clamp(totalIncome > 0 ? (totalInvest   / totalIncome) * 100 : 0, 0, 100 - expPct - debtPct);
  const surPct  = clamp(100 - expPct - debtPct - invPct, 0, 100);

  // Tab badges
  const evCount = (form.oneTimeEvents ?? []).length;
  const goalCount = (form.goals ?? []).length;
  const badges: Record<TabKey, string | null> = {
    basics:      null,
    income:      form.incomes.length > 0      ? `${form.incomes.length} · ${kFmt(totalIncome)}/mo`      : null,
    expenses:    form.expenses.length > 0     ? `${form.expenses.length} · ${kFmt(totalExpense)}/mo`     : null,
    debt:        form.debts.length > 0        ? `${form.debts.length} · ${kFmt(form.debts.reduce((s,d) => s+d.balance,0))}`          : null,
    investments: form.investments.length > 0  ? `${form.investments.length} · ${kFmt(totalInvest)}/mo`   : null,
    advanced:    (evCount + goalCount) > 0    ? `${evCount + goalCount} item${evCount + goalCount > 1 ? 's' : ''}` : null,
  };

  // Tab-level error indicators
  const tabHasError: Record<TabKey, boolean> = {
    basics:      !!(errors.basics && Object.keys(errors.basics).length),
    income:      !!(errors.incomes && Object.keys(errors.incomes).length),
    expenses:    !!(errors.expenses && Object.keys(errors.expenses).length),
    debt:        !!(errors.debts && Object.keys(errors.debts).length),
    investments: !!(errors.investments && Object.keys(errors.investments).length),
    advanced:    false,
  };

  // Advanced tab helpers
  const addEvent = () => setForm((f) => ({
    ...f,
    oneTimeEvents: [...(f.oneTimeEvents ?? []), { id: genId(), label: 'New event', amount: 0, month: 0 }],
  }));
  const rmEvent = (id: string) => setForm((f) => ({ ...f, oneTimeEvents: (f.oneTimeEvents ?? []).filter((e) => e.id !== id) }));
  const upEvent = (id: string, k: keyof OneTimeEvent, v: unknown) => {
    setTouched(true);
    setForm((f) => ({ ...f, oneTimeEvents: (f.oneTimeEvents ?? []).map((e) => e.id === id ? { ...e, [k]: v } : e) }));
  };
  const addGoal = () => setForm((f) => ({
    ...f,
    goals: [...(f.goals ?? []), { id: genId(), label: 'New goal', targetAmount: 100000, targetMonth: 24, type: 'net_worth' as const }],
  }));
  const rmGoal = (id: string) => setForm((f) => ({ ...f, goals: (f.goals ?? []).filter((g) => g.id !== id) }));
  const upGoal = (id: string, k: keyof FinancialGoal, v: unknown) => {
    setTouched(true);
    setForm((f) => ({ ...f, goals: (f.goals ?? []).map((g) => g.id === id ? { ...g, [k]: v } : g) }));
  };

  return (
    <div className="flex flex-col gap-4">

      {/* ── Live cash-flow snapshot ──────────────────────────────────────── */}
      <div className="bg-[var(--surface-2)] rounded-2xl border border-[var(--border)] p-4 flex flex-col gap-3">

        {/* Top row: income / expenses / surplus */}
        <div className="grid grid-cols-3 gap-2">
          <SnapCell label="Income"   value={kFmt(totalIncome)}  color="#059669" sub={`${form.currency}/mo`} />
          <SnapCell label="Outflows" value={kFmt(totalExpense + totalDebtPay + totalInvest)} color="#dc2626" sub={`${form.currency}/mo`} />
          <SnapCell
            label="Surplus"
            value={kFmt(Math.abs(surplus))}
            color={surplus >= 0 ? '#6366f1' : '#dc2626'}
            sub={surplus >= 0 ? 'free cash' : 'shortfall'}
          />
        </div>

        {/* Visual allocation bar */}
        <div className="flex flex-col gap-1">
          <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
            <div className="transition-all duration-300" style={{ width: `${expPct}%`,  background: '#f87171', opacity: 0.85 }} title={`Expenses ${expPct.toFixed(0)}%`} />
            <div className="transition-all duration-300" style={{ width: `${debtPct}%`, background: '#fb923c', opacity: 0.85 }} title={`Debt ${debtPct.toFixed(0)}%`} />
            <div className="transition-all duration-300" style={{ width: `${invPct}%`,  background: '#fbbf24', opacity: 0.85 }} title={`Invest ${invPct.toFixed(0)}%`} />
            <div className="transition-all duration-300 rounded-r-full" style={{ width: `${surPct}%`,  background: '#34d399', opacity: 0.85 }} title={`Surplus ${surPct.toFixed(0)}%`} />
            {totalIncome === 0 && <div className="flex-1 bg-[#e2e8f0] rounded-full" />}
          </div>
          <div className="flex gap-3 flex-wrap text-[10px] text-[#94a3b8]">
            <LegendDot color="#f87171" label={`Expenses ${expPct.toFixed(0)}%`} />
            <LegendDot color="#fb923c" label={`Debt ${debtPct.toFixed(0)}%`} />
            <LegendDot color="#fbbf24" label={`Invest ${invPct.toFixed(0)}%`} />
            <LegendDot color="#34d399" label={`Free ${surPct.toFixed(0)}%`} />
          </div>
        </div>

        {/* Savings rate */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#64748b]">Net savings rate</span>
          <span
            className="text-xs font-bold px-2.5 py-0.5 rounded-full"
            style={{
              color:      savingsRate >= 20 ? '#059669' : savingsRate >= 0 ? '#b45309' : '#dc2626',
              background: savingsRate >= 20 ? '#f0fdf4' : savingsRate >= 0 ? '#fffbeb' : '#fef2f2',
            }}
          >
            {savingsRate >= 0 ? '' : '−'}{Math.abs(savingsRate).toFixed(1)}%
            {savingsRate >= 20 ? ' ✓' : savingsRate >= 0 ? ' ⚡ below 20% target' : ' ⚠ shortfall'}
          </span>
        </div>

        {/* Auto-save status */}
        <div className="flex items-center gap-1.5 text-[10px] text-[#94a3b8]">
          {status === 'saving' ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" /> Updating forecast…</>
          ) : (
            <><span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Forecast live — changes apply instantly</>
          )}
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex border-b border-[var(--border)] -mx-5 px-3 overflow-x-auto">
        {([ 'basics', 'income', 'expenses', 'debt', 'investments', 'advanced' ] as TabKey[]).map((key) => {
          const icons: Record<TabKey, string> = { basics: '⚙', income: '💰', expenses: '🧾', debt: '💳', investments: '📈', advanced: '🔬' };
          const labels: Record<TabKey, string> = { basics: 'Basics', income: 'Income', expenses: 'Expenses', debt: 'Debt', investments: 'Invest', advanced: 'Advanced' };
          const badge = badges[key];
          const hasErr = tabHasError[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`relative flex flex-col items-center px-3 py-2.5 border-b-2 -mb-px transition-all whitespace-nowrap shrink-0 ${
                tab === key
                  ? 'text-[var(--accent)] border-[var(--accent)]'
                  : 'text-[var(--muted-2)] border-transparent hover:text-[var(--muted)] hover:border-[var(--border)]'
              }`}
            >
              <div className="flex items-center gap-1 text-xs font-semibold">
                <span>{icons[key]}</span>
                <span>{labels[key]}</span>
                {hasErr && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title="Validation errors" />}
              </div>
              {badge && (
                <span className="text-[9px] font-medium mt-0.5 opacity-70 max-w-[80px] truncate">{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 min-h-[220px]">

        {tab === 'basics' && (
          <div className="flex flex-col gap-3">
            <Field label="Currency" hint="3-letter code" error={errors.basics?.currency}>
              <div className="flex gap-2">
                <input className={`${errors.basics?.currency ? inpErr : inp} w-20`} value={form.currency} maxLength={3}
                  onChange={(e) => up('currency', e.target.value.toUpperCase())} placeholder="AED" />
                <div className="flex gap-1 flex-wrap">
                  {['AED', 'USD', 'EUR', 'GBP'].map((c) => (
                    <button key={c} type="button" onClick={() => up('currency', c)}
                      className={`px-2 py-1.5 rounded-lg text-xs border transition-all ${form.currency === c ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </Field>
            <Field label="Forecast horizon" error={errors.basics?.months}>
              <div className="flex gap-2 items-center">
                <input className={`${errors.basics?.months ? inpErr : inp} w-20`} type="number" min={1} max={360} value={form.months}
                  onChange={(e) => up('months', +e.target.value)} />
                <span className="text-xs text-[var(--muted-2)]">months</span>
                <div className="flex gap-1 ml-auto">
                  {[12, 24, 60, 120].map((m) => (
                    <button key={m} type="button" onClick={() => up('months', m)}
                      className={`px-2 py-1.5 rounded-lg text-xs border transition-all ${form.months === m ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]'}`}>
                      {m}M
                    </button>
                  ))}
                </div>
              </div>
            </Field>
            <Field label="Starting cash" hint={`Current ${form.currency} balance`} error={errors.basics?.initialCash}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-2)]">{form.currency}</span>
                <input className={`${errors.basics?.initialCash ? inpErr : inp} pl-10`} type="number" value={form.initialCash}
                  onChange={(e) => up('initialCash', +e.target.value)} placeholder="50000" />
              </div>
            </Field>
          </div>
        )}

        {tab === 'income' && (
          <ListSection items={form.incomes} onAdd={addIncome} addLabel="+ Add income source" renderItem={(inc) => {
            const ie = errors.incomes?.[inc.id];
            return (
              <ItemCard key={inc.id} title={inc.label || 'Income'} amount={`${form.currency} ${kFmt(inc.amount)}/mo`} amountColor="var(--positive)" onRemove={() => rmIncome(inc.id)}>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Name" error={ie?.label}>
                    <input className={ie?.label ? inpErr : inp} value={inc.label} placeholder="e.g. Salary"
                      onChange={(e) => upIncome(inc.id, 'label', e.target.value)} />
                  </Field>
                  <Field label={`Amount (${form.currency}/mo)`} error={ie?.amount}>
                    <input className={ie?.amount ? inpErr : inp} type="number" value={inc.amount} placeholder="20000"
                      onChange={(e) => upIncome(inc.id, 'amount', +e.target.value)} />
                  </Field>
                  <Field label="Start month">
                    <input className={inp} type="number" min={0} value={inc.startMonth}
                      onChange={(e) => upIncome(inc.id, 'startMonth', +e.target.value)} />
                  </Field>
                  <Field label="Annual growth %" error={ie?.growthRate}>
                    <input className={ie?.growthRate ? inpErr : inp} type="number" step={0.5} value={inc.growthRate}
                      onChange={(e) => upIncome(inc.id, 'growthRate', +e.target.value)} />
                  </Field>
                </div>
              </ItemCard>
            );
          }} />
        )}

        {tab === 'expenses' && (
          <ListSection items={form.expenses} onAdd={addExpense} addLabel="+ Add expense" renderItem={(exp) => {
            const ee = errors.expenses?.[exp.id];
            return (
              <ItemCard key={exp.id} title={exp.label || 'Expense'} amount={`${form.currency} ${kFmt(exp.amount)}/mo`} amountColor="var(--negative)" onRemove={() => rmExpense(exp.id)}>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Name" error={ee?.label}>
                    <input className={ee?.label ? inpErr : inp} value={exp.label} placeholder="e.g. Rent"
                      onChange={(e) => upExpense(exp.id, 'label', e.target.value)} />
                  </Field>
                  <Field label={`Amount (${form.currency}/mo)`} error={ee?.amount}>
                    <input className={ee?.amount ? inpErr : inp} type="number" value={exp.amount} placeholder="5000"
                      onChange={(e) => upExpense(exp.id, 'amount', +e.target.value)} />
                  </Field>
                  <Field label="Category">
                    <select className={inp} value={exp.category}
                      onChange={(e) => upExpense(exp.id, 'category', e.target.value)}>
                      <option value="rent">🏠 Housing / Rent</option>
                      <option value="fixed">📌 Fixed</option>
                      <option value="discretionary">🎯 Discretionary</option>
                    </select>
                  </Field>
                  <Field label="Annual growth %">
                    <input className={inp} type="number" step={0.5} value={exp.growthRate}
                      onChange={(e) => upExpense(exp.id, 'growthRate', +e.target.value)} />
                  </Field>
                </div>
              </ItemCard>
            );
          }} />
        )}

        {tab === 'debt' && (
          <ListSection items={form.debts} onAdd={addDebt} addLabel="+ Add debt" renderItem={(debt) => {
            const de = errors.debts?.[debt.id];
            return (
              <ItemCard key={debt.id} title={debt.label || 'Debt'} amount={`${form.currency} ${kFmt(debt.balance)} owed`} amountColor="var(--warn)" onRemove={() => rmDebt(debt.id)}>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Name" error={de?.label}>
                    <input className={de?.label ? inpErr : inp} value={debt.label} placeholder="e.g. Car loan"
                      onChange={(e) => upDebt(debt.id, 'label', e.target.value)} />
                  </Field>
                  <Field label={`Balance (${form.currency})`} error={de?.balance}>
                    <input className={de?.balance ? inpErr : inp} type="number" value={debt.balance} placeholder="50000"
                      onChange={(e) => upDebt(debt.id, 'balance', +e.target.value)} />
                  </Field>
                  <Field label="Interest rate % p.a." error={de?.annualRate}>
                    <input className={de?.annualRate ? inpErr : inp} type="number" step={0.1} value={debt.annualRate}
                      onChange={(e) => upDebt(debt.id, 'annualRate', +e.target.value)} />
                  </Field>
                  <Field label={`Min payment (${form.currency}/mo)`} error={de?.minPayment}>
                    <input className={de?.minPayment ? inpErr : inp} type="number" value={debt.minPayment}
                      onChange={(e) => upDebt(debt.id, 'minPayment', +e.target.value)} />
                  </Field>
                  <Field label="Strategy" className="col-span-2">
                    <div className="flex gap-1.5">
                      {([
                        { v: 'min',        label: '📉 Minimum',    hint: 'Pay as little as possible' },
                        { v: 'aggressive', label: '💪 Aggressive', hint: 'Pay more when possible'    },
                        { v: 'instant',    label: '⚡ Instant',    hint: 'Clear immediately'          },
                      ] as { v: 'min' | 'aggressive' | 'instant'; label: string; hint: string }[]).map((s) => (
                        <button key={s.v} type="button" title={s.hint} onClick={() => upDebt(debt.id, 'strategy', s.v)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            debt.strategy === s.v
                              ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                              : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                          }`}>{s.label}</button>
                      ))}
                    </div>
                  </Field>
                </div>
              </ItemCard>
            );
          }} />
        )}

        {tab === 'investments' && (
          <ListSection items={form.investments} onAdd={addInv} addLabel="+ Add account" renderItem={(inv) => {
            const ive = errors.investments?.[inv.id];
            return (
              <ItemCard key={inv.id} title={inv.label || 'Investment'} amount={`+${form.currency} ${kFmt(inv.monthlyContribution)}/mo`} amountColor="#f59e0b" onRemove={() => rmInv(inv.id)}>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Account name" error={ive?.label}>
                    <input className={ive?.label ? inpErr : inp} value={inv.label} placeholder="e.g. ETF portfolio"
                      onChange={(e) => upInv(inv.id, 'label', e.target.value)} />
                  </Field>
                  <Field label={`Current value (${form.currency})`} error={ive?.currentValue}>
                    <input className={ive?.currentValue ? inpErr : inp} type="number" value={inv.currentValue}
                      onChange={(e) => upInv(inv.id, 'currentValue', +e.target.value)} />
                  </Field>
                  <Field label="Monthly contribution" error={ive?.monthlyContribution}>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-2)]">{form.currency}</span>
                      <input className={`${ive?.monthlyContribution ? inpErr : inp} pl-10`} type="number" value={inv.monthlyContribution}
                        onChange={(e) => upInv(inv.id, 'monthlyContribution', +e.target.value)} />
                    </div>
                  </Field>
                  <Field label="Expected return % p.a." error={ive?.expectedAnnualReturn}>
                    <div className="relative">
                      <input className={`${ive?.expectedAnnualReturn ? inpErr : inp} pr-7`} type="number" step={0.5} min={0} max={100} value={inv.expectedAnnualReturn}
                        onChange={(e) => upInv(inv.id, 'expectedAnnualReturn', +e.target.value)} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-2)]">%</span>
                    </div>
                  </Field>
                </div>
              </ItemCard>
            );
          }} />
        )}

        {tab === 'advanced' && (
          <div className="flex flex-col gap-4">
            {/* Inflation & Tax */}
            <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-3.5 flex flex-col gap-3">
              <p className="text-xs font-semibold text-[var(--text-2)]">Macro Assumptions</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Inflation rate % p.a." hint="Applied to expenses">
                  <div className="relative">
                    <input className={`${inp} pr-7`} type="number" step={0.5} min={0} max={30}
                      value={form.inflationRate ?? 0}
                      onChange={(e) => { setTouched(true); up('inflationRate', +e.target.value); }} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-2)]">%</span>
                  </div>
                </Field>
                <Field label="Effective tax rate %" hint="Applied to income">
                  <div className="relative">
                    <input className={`${inp} pr-7`} type="number" step={1} min={0} max={60}
                      value={form.taxRate ?? 0}
                      onChange={(e) => { setTouched(true); up('taxRate', +e.target.value); }} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-2)]">%</span>
                  </div>
                </Field>
              </div>
              {(form.inflationRate ?? 0) === 0 && (form.taxRate ?? 0) === 0 && (
                <p className="text-[11px] text-[var(--muted)]">
                  Set to 0 for simple forecasting. Enable for more realistic long-term projections.
                </p>
              )}
            </div>

            {/* One-time events */}
            <div>
              <p className="text-xs font-semibold text-[var(--text-2)] mb-2">One-Time Events</p>
              <p className="text-[11px] text-[var(--muted)] mb-2">Bonuses, home purchases, inheritances, large purchases, etc.</p>
              <ListSection items={form.oneTimeEvents ?? []} onAdd={addEvent} addLabel="+ Add event" renderItem={(ev) => (
                <ItemCard key={ev.id} title={ev.label || 'Event'} amount={`${ev.amount >= 0 ? '+' : ''}${kFmt(ev.amount)}`} amountColor={ev.amount >= 0 ? 'var(--positive)' : 'var(--negative)'} onRemove={() => rmEvent(ev.id)}>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Description">
                      <input className={inp} value={ev.label} placeholder="e.g. Year-end bonus"
                        onChange={(e) => upEvent(ev.id, 'label', e.target.value)} />
                    </Field>
                    <Field label={`Amount (${form.currency})`} hint="Negative = outflow">
                      <input className={inp} type="number" value={ev.amount}
                        onChange={(e) => upEvent(ev.id, 'amount', +e.target.value)} />
                    </Field>
                    <Field label="Month (0 = start)" className="col-span-2">
                      <input className={inp} type="number" min={0} max={form.months - 1} value={ev.month}
                        onChange={(e) => upEvent(ev.id, 'month', +e.target.value)} />
                    </Field>
                  </div>
                </ItemCard>
              )} />
            </div>

            {/* Financial goals */}
            <div>
              <p className="text-xs font-semibold text-[var(--text-2)] mb-2">Financial Goals</p>
              <p className="text-[11px] text-[var(--muted)] mb-2">Set savings, net worth, or investment targets and track if you&apos;re on track.</p>
              <ListSection items={form.goals ?? []} onAdd={addGoal} addLabel="+ Add goal" renderItem={(goal) => (
                <ItemCard key={goal.id} title={goal.label || 'Goal'} amount={`${form.currency} ${kFmt(goal.targetAmount)}`} amountColor="var(--accent)" onRemove={() => rmGoal(goal.id)}>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Goal name">
                      <input className={inp} value={goal.label} placeholder="e.g. House deposit"
                        onChange={(e) => upGoal(goal.id, 'label', e.target.value)} />
                    </Field>
                    <Field label={`Target (${form.currency})`}>
                      <input className={inp} type="number" value={goal.targetAmount}
                        onChange={(e) => upGoal(goal.id, 'targetAmount', +e.target.value)} />
                    </Field>
                    <Field label="Target month">
                      <input className={inp} type="number" min={1} max={form.months} value={goal.targetMonth}
                        onChange={(e) => upGoal(goal.id, 'targetMonth', +e.target.value)} />
                    </Field>
                    <Field label="Metric">
                      <select className={inp} value={goal.type}
                        onChange={(e) => upGoal(goal.id, 'type', e.target.value)}>
                        <option value="savings">💵 Cash savings</option>
                        <option value="net_worth">📈 Net worth</option>
                        <option value="investment">📊 Investments</option>
                      </select>
                    </Field>
                  </div>
                </ItemCard>
              )} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SnapCell({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[9px] font-semibold text-[var(--muted-2)] uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold leading-none" style={{ color }}>{value}</p>
      <p className="text-[9px] text-[var(--muted-2)]">{sub}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}

function Field({ label, hint, error, children, className = '' }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-baseline justify-between gap-1">
        <label className="text-xs font-medium text-[var(--text-2)]">{label}</label>
        {hint && !error && <span className="text-[10px] text-[var(--muted-2)]">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-[10px] text-red-500 font-medium mt-0.5">{error}</p>}
    </div>
  );
}

function ListSection<T extends { id: string }>({
  items, onAdd, addLabel, renderItem,
}: { items: T[]; onAdd: () => void; addLabel: string; renderItem: (item: T) => React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 border-2 border-dashed border-[var(--border)] rounded-xl text-[var(--muted-2)] text-sm">
          <span className="text-2xl opacity-50">➕</span>
          <p>Nothing added yet — click below to add</p>
        </div>
      )}
      {items.map((item) => renderItem(item))}
      <button type="button" onClick={onAdd}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-[var(--accent)]/30 text-[var(--accent)] text-xs font-semibold hover:bg-[var(--accent-light)] hover:border-[var(--accent)] transition-all">
        {addLabel}
      </button>
    </div>
  );
}

function ItemCard({ title, amount, amountColor, children, onRemove }: {
  title: string; amount: string; amountColor: string; children: React.ReactNode; onRemove: () => void;
}) {
  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--surface-2)] border-b border-[var(--border)]">
        <span className="text-xs font-semibold text-[var(--text-2)] truncate">{title}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold" style={{ color: amountColor }}>{amount}</span>
          <button type="button" onClick={onRemove}
            className="text-xs text-[var(--muted-2)] hover:text-[var(--negative)] hover:bg-[var(--negative-light)] w-5 h-5 rounded flex items-center justify-center transition-colors">
            ✕
          </button>
        </div>
      </div>
      <div className="p-3 bg-[var(--surface)]">{children}</div>
    </div>
  );
}
