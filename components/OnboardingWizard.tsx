'use client';

import { useState } from 'react';
import type { ScenarioTemplate } from '@/lib/demo-data';
import { TEMPLATES } from '@/lib/demo-data';

type Step = 1 | 2 | 3;

interface Props {
  onStartBlank: () => void;
  onLoadTemplate: (tpl: ScenarioTemplate) => void;
}

const STEPS = [
  { id: 1 as Step, label: 'Choose your start',  icon: '🚀' },
  { id: 2 as Step, label: 'Pick a template',    icon: '📋' },
  { id: 3 as Step, label: 'You\'re ready',       icon: '🎯' },
];

export function OnboardingWizard({ onStartBlank, onLoadTemplate }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [selectedTpl, setSelectedTpl] = useState<ScenarioTemplate | null>(null);

  const handlePickTemplate = (tpl: ScenarioTemplate) => {
    setSelectedTpl(tpl);
    setStep(3);
  };

  const handleConfirm = () => {
    if (selectedTpl) onLoadTemplate(selectedTpl);
  };

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-56px)] bg-[var(--bg)] px-4 py-10">

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              s.id < step
                ? 'bg-[var(--positive-light)] text-[var(--positive)]'
                : s.id === step
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'bg-[var(--surface-2)] text-[var(--muted-2)]'
            }`}>
              {s.id < step ? '✓' : s.icon}
              <span className="hidden sm:block">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px transition-colors ${s.id < step ? 'bg-[var(--positive)]' : 'bg-[var(--border)]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Choose path ───────────────────────────────────────────── */}
      {step === 1 && (
        <div className="w-full max-w-2xl flex flex-col items-center gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center text-4xl mx-auto mb-5 shadow-sm">
              📊
            </div>
            <h1 className="text-3xl font-bold text-[var(--text)] mb-3">Welcome to WealthFlow</h1>
            <p className="text-[var(--muted)] text-base max-w-md mx-auto leading-relaxed">
              In 60 seconds you&apos;ll have a full financial forecast. Start with a template or enter your own numbers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <button
              onClick={() => setStep(2)}
              className="group flex flex-col gap-4 p-6 rounded-2xl bg-[var(--accent)] text-white shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <span className="text-3xl">📋</span>
              <div className="text-left">
                <p className="font-bold text-base">Use a template</p>
                <p className="text-white/75 text-sm mt-1">Pick a scenario that matches your life and get an instant 5-year forecast.</p>
              </div>
              <span className="text-sm font-semibold mt-auto opacity-80 group-hover:opacity-100">Choose template →</span>
            </button>

            <button
              onClick={onStartBlank}
              className="group flex flex-col gap-4 p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm hover:shadow-md hover:border-[var(--accent)] transition-all hover:-translate-y-0.5"
            >
              <span className="text-3xl">✏️</span>
              <div className="text-left">
                <p className="font-bold text-base text-[var(--text)]">Enter my own numbers</p>
                <p className="text-[var(--muted)] text-sm mt-1">Fill in your exact income, expenses, debts, and investments.</p>
              </div>
              <span className="text-sm font-semibold mt-auto text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity">Start from scratch →</span>
            </button>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {['60-second setup', 'Auto-saves locally', 'No account needed', 'AI insights included'].map((f) => (
              <span key={f} className="text-xs text-[var(--muted)] bg-[var(--surface-2)] border border-[var(--border)] px-3 py-1 rounded-full">
                ✓ {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Pick template ─────────────────────────────────────────── */}
      {step === 2 && (
        <div className="w-full max-w-3xl flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Pick your scenario</h2>
            <p className="text-[var(--muted)] text-sm">Pick the one closest to your situation — you can change every number after.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TEMPLATES.map((tpl) => {
              const income  = tpl.scenario.incomes.reduce((s, i) => s + i.amount, 0);
              const expense = tpl.scenario.expenses.reduce((s, e) => s + e.amount, 0);
              return (
                <button
                  key={tpl.name}
                  onClick={() => handlePickTemplate(tpl)}
                  className="group text-left bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-transparent transition-all hover:-translate-y-0.5"
                  style={{ '--hover-shadow': tpl.color } as React.CSSProperties}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{ background: tpl.color + '18' }}>
                      {tpl.emoji}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text)]">{tpl.name}</p>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">{tpl.tagline}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="rounded-xl p-2.5 text-center" style={{ background: tpl.color + '10' }}>
                      <p className="text-[9px] text-[var(--muted)] mb-0.5">Income</p>
                      <p className="text-xs font-bold" style={{ color: tpl.color }}>${(income / 1000).toFixed(0)}k/mo</p>
                    </div>
                    <div className="rounded-xl p-2.5 text-center bg-[var(--surface-2)]">
                      <p className="text-[9px] text-[var(--muted)] mb-0.5">Expenses</p>
                      <p className="text-xs font-bold text-[var(--text-2)]">${(expense / 1000).toFixed(0)}k/mo</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tpl.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: tpl.color + '15', color: tpl.color }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] font-semibold mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: tpl.color }}>
                    Use this scenario →
                  </p>
                </button>
              );
            })}
          </div>

          <button onClick={() => setStep(1)} className="text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors self-center">
            ← Back
          </button>
        </div>
      )}

      {/* ── Step 3: Confirm ───────────────────────────────────────────────── */}
      {step === 3 && selectedTpl && (
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-5 shadow-sm"
              style={{ background: selectedTpl.color + '20' }}>
              {selectedTpl.emoji}
            </div>
            <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Ready to forecast!</h2>
            <p className="text-[var(--muted)] text-sm">
              You&apos;re loading the <strong className="text-[var(--text)]">{selectedTpl.name}</strong> scenario. Every number can be changed in the sidebar.
            </p>
          </div>

          {/* Summary */}
          <div className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col gap-3">
            {[
              { label: 'Monthly income',  value: `${selectedTpl.scenario.incomes.reduce((s, i) => s + i.amount, 0).toLocaleString()} ${selectedTpl.scenario.currency}` },
              { label: 'Monthly expenses', value: `${selectedTpl.scenario.expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()} ${selectedTpl.scenario.currency}` },
              { label: 'Total debt',       value: selectedTpl.scenario.debts.reduce((s, d) => s + d.balance, 0) > 0
                ? `${selectedTpl.scenario.debts.reduce((s, d) => s + d.balance, 0).toLocaleString()} ${selectedTpl.scenario.currency}` : 'None' },
              { label: 'Forecast horizon', value: `${selectedTpl.scenario.months} months (${(selectedTpl.scenario.months / 12).toFixed(0)} years)` },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">{row.label}</span>
                <span className="font-semibold text-[var(--text)]">{row.value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-3.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-bold text-base shadow-sm transition-all hover:shadow-md"
          >
            🚀 Load scenario & see forecast
          </button>

          <button onClick={() => setStep(2)} className="text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
            ← Choose a different template
          </button>
        </div>
      )}
    </div>
  );
}
