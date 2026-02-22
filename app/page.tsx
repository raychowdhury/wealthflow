'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TEMPLATES } from '@/lib/demo-data';
import type { ScenarioTemplate } from '@/lib/demo-data';

const LS_THEME_KEY = 'wealthflow-theme';

const FEATURES = [
  { icon: '📈', title: 'Net Worth Forecasting', desc: 'See exactly where you\'ll be in 1, 3, or 5 years — month by month.' },
  { icon: '💸', title: 'Cash Flow Analysis',    desc: 'Understand how income, expenses, and debt interact over time.' },
  { icon: '💳', title: 'Debt Paydown Tracker',  desc: 'Model avalanche, snowball, or instant-payoff strategies side by side.' },
  { icon: '📊', title: 'Investment Growth',      desc: 'Compound return modeling across all your accounts and portfolios.' },
  { icon: '🎯', title: 'Goal Tracking',          desc: 'Set savings, net worth, or investment targets and track your trajectory.' },
  { icon: '✨', title: 'AI Advisor',             desc: 'GPT-powered personalized insights and actionable suggestions in seconds.' },
] as const;

const STATS = [
  { number: '7',    label: 'Chart types & views'   },
  { number: '<30s', label: 'AI insight generation'  },
  { number: '360',  label: 'Month forecast horizon' },
  { number: '100%', label: 'Free to try — no card'  },
] as const;

export default function LandingPage() {
  const [darkMode, setDarkMode]   = useState(false);
  const [mounted, setMounted]     = useState(false);
  const [mobileMenu, setMobile]   = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const theme = localStorage.getItem(LS_THEME_KEY);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = theme === 'dark' || (!theme && prefersDark);
      setDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    } catch { /* ignore */ }
  }, []);

  const toggleDark = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      try { localStorage.setItem(LS_THEME_KEY, next ? 'dark' : 'light'); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]" style={{ scrollBehavior: 'smooth' }}>
      <LandingNav darkMode={darkMode} mounted={mounted} onToggleDark={toggleDark} mobileMenu={mobileMenu} setMobile={setMobile} />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionIntro />
        <HowItWorksSection />
        <TemplatesSection />
        <FeatureGridSection />
        <StatsBarSection />
        <FinalCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}

// ── Nav ────────────────────────────────────────────────────────────────────────

function LandingNav({
  darkMode, mounted, onToggleDark, mobileMenu, setMobile,
}: {
  darkMode: boolean;
  mounted: boolean;
  onToggleDark: () => void;
  mobileMenu: boolean;
  setMobile: (v: boolean) => void;
}) {
  return (
    <nav className="sticky top-0 z-50 bg-[var(--surface)]/95 backdrop-blur-sm border-b border-[var(--border)] shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo — stays on landing */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm shadow-sm select-none">
            W
          </div>
          <span className="font-semibold text-[var(--text)] tracking-tight">WealthFlow</span>
        </Link>

        {/* Center links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-6">
          {[
            { href: '#how-it-works', label: 'How it Works' },
            { href: '#templates',    label: 'Templates'    },
            { href: '#features',     label: 'Features'     },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <button
            onClick={onToggleDark}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all text-sm"
          >
            {mounted ? (darkMode ? '☀' : '🌙') : '🌙'}
          </button>

          <Link
            href="/login"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] text-sm font-medium hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
          >
            Sign in
          </Link>

          {/* CTA */}
          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md"
          >
            Try Free →
          </Link>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobile(!mobileMenu)}
            className="md:hidden flex flex-col gap-1.5 justify-center items-center w-8 h-8"
            aria-label="Menu"
          >
            <span className={`block w-5 h-0.5 bg-[var(--muted)] transition-all ${mobileMenu ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-[var(--muted)] transition-all ${mobileMenu ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-[var(--muted)] transition-all ${mobileMenu ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenu && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 flex flex-col gap-2">
          {[
            { href: '#how-it-works', label: 'How it Works' },
            { href: '#templates',    label: 'Templates'    },
            { href: '#features',     label: 'Features'     },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobile(false)}
              className="py-2 text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setMobile(false)}
            className="py-2.5 text-center rounded-lg border border-[var(--border)] text-[var(--muted)] text-sm font-medium"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setMobile(false)}
            className="py-2.5 text-center rounded-lg bg-[var(--accent)] text-white text-sm font-semibold"
          >
            Try Free →
          </Link>
        </div>
      )}
    </nav>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section
      id="hero"
      className="pt-16 pb-20 md:pt-24 md:pb-28 px-4"
      style={{ scrollMarginTop: '56px' }}
    >
      <div className="max-w-4xl mx-auto text-center">

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] bg-[var(--accent-light)] border border-[var(--accent)]/20 rounded-full px-4 py-1.5 mb-7">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
          AI-Powered Wealth Forecasting
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl font-bold text-[var(--text)] leading-tight tracking-tight mb-6">
          Stop guessing.{' '}
          <span className="text-[var(--accent)]">Start knowing.</span>
        </h1>

        {/* Subhead */}
        <p className="text-lg md:text-xl text-[var(--muted)] max-w-2xl mx-auto leading-relaxed mb-10">
          Enter your income, expenses, debts, and investments. See exactly where your finances are heading — months or years from now — and get AI advice on how to improve them.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-8 py-3.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-semibold text-base shadow-sm transition-all hover:shadow-md"
          >
            Start forecasting free →
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] font-medium text-base hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
          >
            Sign in
          </Link>
        </div>

        {/* Stats strip */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center mt-8 text-sm text-[var(--muted)]">
          {['60-second setup', '5-year horizons', 'AI-powered insights', 'No credit card'].map((stat, i) => (
            <span key={stat} className="flex items-center gap-2">
              {i > 0 && <span className="hidden sm:inline opacity-30">·</span>}
              <span className="text-[var(--positive)] text-xs">✓</span>
              {stat}
            </span>
          ))}
        </div>

        {/* Dashboard mockup */}
        <div className="mt-16 mx-auto max-w-3xl">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-[var(--surface-2)] border-b border-[var(--border)]">
              <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
              <div className="flex-1 mx-4 h-6 rounded-md bg-[var(--border)] flex items-center px-3">
                <span className="text-[10px] text-[var(--muted-2)]">wealthflow.app/dashboard</span>
              </div>
            </div>

            {/* Mock content */}
            <div className="p-5 flex flex-col gap-4">
              {/* Stat pills row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'End Net Worth', value: '$247k', color: 'var(--positive)' },
                  { label: 'Monthly Cash', value: '+$1,240', color: 'var(--positive)' },
                  { label: 'Debt-free', value: 'Month 38', color: 'var(--accent)' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-[var(--surface-2)] rounded-xl p-3 text-left border border-[var(--border)]">
                    <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Chart mock */}
              <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-2)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[var(--text-2)]">Net Worth Projection</span>
                  <span className="text-[10px] bg-[var(--accent-light)] text-[var(--accent)] px-2 py-0.5 rounded-full">5 yr horizon</span>
                </div>
                {/* Bar chart */}
                <div className="flex items-end gap-1 h-24">
                  {[8, 14, 18, 22, 28, 33, 38, 44, 51, 58, 66, 75, 83, 90, 96, 100].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm transition-all"
                      style={{
                        height: `${h}%`,
                        background: i < 4
                          ? 'var(--border)'
                          : `color-mix(in srgb, var(--accent) ${40 + i * 4}%, var(--accent-light))`,
                        opacity: 0.85,
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-[var(--muted-2)]">
                  <span>Today</span>
                  <span>Year 1</span>
                  <span>Year 3</span>
                  <span>Year 5</span>
                </div>
              </div>

              {/* AI insight hint */}
              <div className="flex items-start gap-2.5 p-3 bg-[var(--accent-light)] border border-[var(--accent)]/20 rounded-xl">
                <span className="text-base shrink-0">✨</span>
                <div>
                  <p className="text-xs font-semibold text-[var(--accent)]">AI Advisor suggests</p>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5">Switch to aggressive debt repayment → save $4,200 in interest and become debt-free 14 months sooner.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Problem ────────────────────────────────────────────────────────────────────

function ProblemSection() {
  const problems = [
    {
      icon: '📋',
      bgIcon: 'var(--warn-light)',
      title: 'Spreadsheets don\'t think ahead.',
      body: 'They can\'t model compound interest, debt payoff timelines, or the ripple effects of one decision across 5 years.',
      counter: 'WealthFlow runs the math for you — automatically.',
    },
    {
      icon: '📅',
      bgIcon: 'var(--negative-light)',
      title: 'Budgeting apps show last month.',
      body: 'Looking at what you spent is useful. Knowing what your net worth will be in 3 years is life-changing.',
      counter: 'WealthFlow forecasts forward, not backward.',
    },
    {
      icon: '🤷',
      bgIcon: 'var(--warn-light)',
      title: 'Generic advice doesn\'t fit your life.',
      body: '"Save 20% of income" ignores your rent, your loans, your kids, and your actual salary.',
      counter: 'WealthFlow\'s AI advisor knows your specific numbers.',
    },
  ];

  return (
    <section
      id="problem"
      className="py-16 md:py-24 bg-[var(--surface-2)] px-4"
      style={{ scrollMarginTop: '56px' }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-3">The problem</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)]">
            You&apos;re probably flying blind.
          </h2>
          <p className="text-[var(--muted)] mt-4 max-w-xl mx-auto">
            Most people have no idea whether they&apos;re on track — because the tools they use weren&apos;t built to answer that question.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {problems.map((p) => (
            <div key={p.title} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                style={{ background: p.bgIcon }}
              >
                {p.icon}
              </div>
              <h3 className="font-semibold text-[var(--text)] mb-2">{p.title}</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{p.body}</p>
              <p className="text-xs text-[var(--accent)] mt-4 font-semibold">{p.counter}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Solution intro ─────────────────────────────────────────────────────────────

function SolutionIntro() {
  return (
    <section className="py-16 md:py-20 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[var(--border)]" />
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xl shadow-md">
            W
          </div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[var(--border)]" />
        </div>

        <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-5">
          Meet WealthFlow Forecast
        </h2>
        <p className="text-lg text-[var(--muted)] leading-relaxed">
          A personal financial modeling tool that takes your real numbers — income, expenses, debts, investments — and shows you exactly where you&apos;re heading. Then helps you change course.
        </p>
        <div className="mt-8 inline-flex items-center gap-2 text-sm text-[var(--accent)] font-semibold">
          <span>Here&apos;s how it works</span>
          <span>↓</span>
        </div>
      </div>
    </section>
  );
}

// ── How It Works ───────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const steps = [
    {
      id: 1,
      label: 'Build your snapshot',
      heading: 'Start with what you have today.',
      copy: 'Add your salary, side income, rent, subscriptions, car loan, and investments. WealthFlow handles the compound interest, debt payoff timelines, and investment growth — all in one place.',
      visual: <MockForm />,
    },
    {
      id: 2,
      label: 'See your financial future',
      heading: 'In 60 seconds, see your net worth in 5 years.',
      copy: 'Instantly get a month-by-month projection of your cash position, net worth, debt balance, and investment portfolio. No spreadsheets. No formulas. Just answers.',
      visual: <MockChart />,
    },
    {
      id: 3,
      label: 'Get AI-powered advice',
      heading: 'Specific suggestions, not generic tips.',
      copy: 'The AI advisor reads your actual scenario — your debt rates, your cash flow, your goals — and tells you exactly what to change. Like switching to aggressive debt repayment to save thousands in interest.',
      visual: <MockAdvisor />,
    },
    {
      id: 4,
      label: 'Play out the "what ifs"',
      heading: 'What happens if you get a raise?',
      copy: 'Drag a slider to instantly see how a 20% income bump, a 15% expense cut, or doubling your investment contributions changes your 5-year trajectory. No recalculation needed.',
      visual: <MockSliders />,
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-16 md:py-24 px-4"
      style={{ scrollMarginTop: '56px' }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)]">
            Your financial journey, modeled.
          </h2>
        </div>

        <div className="flex flex-col gap-20 md:gap-28">
          {steps.map((step, i) => (
            <StoryStep key={step.id} step={step} flip={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface StepData {
  id: number;
  label: string;
  heading: string;
  copy: string;
  visual: React.ReactNode;
}

function StoryStep({ step, flip }: { step: StepData; flip: boolean }) {
  return (
    <div className={`flex flex-col ${flip ? 'md:flex-row-reverse' : 'md:flex-row'} gap-10 md:gap-16 items-center`}>
      {/* Copy */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white text-sm font-bold flex items-center justify-center shrink-0">
            {step.id}
          </div>
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">{step.label}</p>
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-[var(--text)] mb-4 leading-tight">
          {step.heading}
        </h3>
        <p className="text-[var(--muted)] leading-relaxed">{step.copy}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-[var(--accent)] hover:underline"
        >
          Try it now →
        </Link>
      </div>

      {/* Visual */}
      <div className="w-full md:flex-1 max-w-md md:max-w-none">
        {step.visual}
      </div>
    </div>
  );
}

// ── Step visuals (CSS-only mocks) ──────────────────────────────────────────────

function MockForm() {
  const fields = [
    { label: 'Monthly salary',        value: '$5,000',   color: 'var(--positive)' },
    { label: 'Rent',                  value: '$1,400/mo', color: 'var(--muted)'   },
    { label: 'Student loan balance',  value: '$18,000 @ 5.5%', color: 'var(--warn)' },
    { label: 'Index fund monthly',    value: '+$300/mo',  color: 'var(--accent)'  },
  ];
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
        <span className="text-sm font-semibold text-[var(--text)]">Your financial snapshot</span>
        <span className="ml-auto text-[10px] text-[var(--positive)] bg-[var(--positive-light)] px-2 py-0.5 rounded-full font-medium">✓ Autosaved</span>
      </div>
      <div className="flex flex-col gap-3">
        {fields.map((f) => (
          <div key={f.label} className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-[var(--muted-2)] uppercase tracking-widest">{f.label}</span>
            <div className="flex items-center justify-between px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
              <span className="text-sm" style={{ color: f.color }}>{f.value}</span>
              <span className="text-[10px] text-[var(--muted-2)]">✎</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--positive)]" />
        Forecast live — changes apply instantly
      </div>
    </div>
  );
}

function MockChart() {
  const bars = [5, 10, 15, 20, 26, 32, 38, 46, 54, 63, 72, 82, 90, 95, 100];
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-[var(--text)]">Net Worth Projection</span>
        <span className="text-[10px] bg-[var(--accent-light)] text-[var(--accent)] px-2 py-0.5 rounded-full font-medium">60 months</span>
      </div>
      <div className="flex items-end gap-0.5 h-28 mb-3">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{
              height: `${h}%`,
              background: i < 3 ? 'var(--border)' : 'var(--accent)',
              opacity: 0.5 + i * 0.035,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-[var(--muted-2)] mb-4">
        <span>Today</span><span>Yr 1</span><span>Yr 3</span><span>Yr 5</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'End net worth', value: '+$147k', color: 'var(--positive)' },
          { label: 'Debt-free',     value: 'Month 28', color: 'var(--accent)' },
          { label: 'Investments',   value: '$89k', color: 'var(--warn)' },
        ].map((s) => (
          <div key={s.label} className="text-center p-2 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
            <p className="text-[9px] text-[var(--muted)] mb-0.5">{s.label}</p>
            <p className="text-xs font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockAdvisor() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span>✨</span>
          <span className="text-sm font-semibold text-[var(--text)]">AI Advisor</span>
        </div>
        <span className="text-[10px] bg-[var(--accent-light)] text-[var(--accent)] px-2 py-0.5 rounded-full font-medium border border-[var(--accent)]/20">gpt-4o-mini</span>
      </div>

      {/* Insight */}
      <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-3.5 mb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-xs font-semibold text-[var(--text)] leading-snug">Switch to aggressive debt repayment</p>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-[var(--positive-light)] text-[var(--positive)] border border-[var(--positive-light)] shrink-0">high</span>
        </div>
        <p className="text-[11px] text-[var(--muted)]">Paying an extra $300/mo toward your student loan clears it 19 months sooner and saves $2,340 in interest.</p>
        <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--positive)] bg-[var(--positive-light)] px-2 py-1 rounded-lg">
          ↑ $2,340 saved
        </div>
      </div>

      {/* Alert */}
      <div className="flex gap-2.5 items-start rounded-xl p-3 border-l-4 border border-[var(--border)] bg-[var(--warn-light)] border-l-[var(--warn)] mb-3">
        <span className="text-base leading-none shrink-0 mt-0.5">⚠️</span>
        <div>
          <span className="text-xs font-semibold text-[var(--warn)]">Cash risk</span>
          <p className="text-[11px] text-[var(--muted)] mt-0.5">Emergency fund covers only 1.2 months. Target: 3 months of expenses.</p>
        </div>
      </div>

      {/* Action */}
      <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border)] p-3">
        <p className="text-xs font-semibold text-[var(--text)] mb-2">Reduce discretionary spending 15%</p>
        <div className="flex gap-3 text-[11px] mb-2">
          <span className="text-[var(--positive)]">📈 Net worth: +$8,100</span>
          <span className="text-[var(--positive)]">💵 Min cash: +$180</span>
        </div>
        <button className="text-xs py-1.5 px-4 rounded-lg font-semibold bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent)]/20">
          Apply this action
        </button>
      </div>
    </div>
  );
}

function MockSliders() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
        <span className="text-sm font-semibold text-[var(--text)]">What-if scenarios</span>
        <span className="ml-auto text-[10px] text-[var(--muted)] bg-[var(--surface-2)] border border-[var(--border)] px-2 py-0.5 rounded-full">Instant recalculation</span>
      </div>

      {[
        { label: 'Income',   pct: '+20%', color: 'var(--positive)' },
        { label: 'Expenses', pct: '−10%', color: 'var(--warn)'     },
        { label: 'Invest',   pct: '+50%', color: 'var(--accent)'   },
      ].map((s) => (
        <div key={s.label} className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-[var(--text-2)]">{s.label}</span>
            <span className="text-xs font-bold" style={{ color: s.color }}>{s.pct}</span>
          </div>
          <input
            type="range"
            min={-50}
            max={100}
            defaultValue={s.label === 'Income' ? 20 : s.label === 'Expenses' ? -10 : 50}
            onChange={() => {}}
            className="w-full h-1.5 rounded-full appearance-none cursor-default"
            style={{ accentColor: 'var(--accent)' }}
          />
        </div>
      ))}

      {/* Before / After */}
      <div className="mt-4 flex gap-3">
        <div className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3 text-center">
          <p className="text-[9px] text-[var(--muted)] uppercase tracking-widest mb-1">Without changes</p>
          <p className="text-base font-bold text-[var(--text-2)]">$142k</p>
          <p className="text-[10px] text-[var(--muted)]">end net worth</p>
        </div>
        <div className="flex items-center text-[var(--accent)] font-bold text-lg">→</div>
        <div className="flex-1 bg-[var(--accent-light)] border border-[var(--accent)]/20 rounded-xl p-3 text-center">
          <p className="text-[9px] text-[var(--accent)] uppercase tracking-widest mb-1">With changes</p>
          <p className="text-base font-bold text-[var(--accent)]">$247k</p>
          <p className="text-[10px] text-[var(--muted)]">end net worth</p>
        </div>
      </div>
    </div>
  );
}

// ── Templates ──────────────────────────────────────────────────────────────────

function TemplatesSection() {
  return (
    <section
      id="templates"
      className="py-16 md:py-24 bg-[var(--surface-2)] px-4"
      style={{ scrollMarginTop: '56px' }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-3">Quick-start templates</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)]">
            See yourself in the numbers.
          </h2>
          <p className="text-[var(--muted)] mt-4 max-w-xl mx-auto">
            Pick a scenario that matches your life and instantly see a full 5-year forecast. Tweak any number to make it yours.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {TEMPLATES.map((tpl) => (
            <TemplateCard key={tpl.name} tpl={tpl} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TemplateCard({ tpl }: { tpl: ScenarioTemplate }) {
  const income  = tpl.scenario.incomes.reduce((s, i) => s + i.amount, 0);
  const expense = tpl.scenario.expenses.reduce((s, e) => s + e.amount, 0);
  const debt    = tpl.scenario.debts.reduce((s, d) => s + d.balance, 0);

  return (
    <Link
      href="/dashboard"
      className="group text-left bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-transparent transition-all block"
    >
      {/* Icon + name */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: tpl.color + '18' }}
        >
          {tpl.emoji}
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--text)] leading-tight">{tpl.name}</p>
          <p className="text-[11px] text-[var(--muted)] leading-tight mt-0.5">{tpl.tagline}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Income',   value: `$${(income / 1000).toFixed(0)}k`,  color: tpl.color },
          { label: 'Expenses', value: `$${(expense / 1000).toFixed(0)}k`, color: 'var(--muted)' },
          { label: 'Debt',     value: debt > 0 ? `$${(debt / 1000).toFixed(0)}k` : 'None', color: debt > 0 ? 'var(--warn)' : 'var(--positive)' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: tpl.color + '10' }}>
            <p className="text-[9px] text-[var(--muted)] mb-0.5">{s.label}</p>
            <p className="text-xs font-bold" style={{ color: s.color }}>{s.value}/mo</p>
          </div>
        ))}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {tpl.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: tpl.color + '15', color: tpl.color }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTA */}
      <p
        className="text-[11px] font-semibold group-hover:opacity-100 opacity-0 transition-opacity flex items-center gap-1"
        style={{ color: tpl.color }}
      >
        Load this scenario →
      </p>
    </Link>
  );
}

// ── Feature Grid ───────────────────────────────────────────────────────────────

function FeatureGridSection() {
  return (
    <section
      id="features"
      className="py-16 md:py-24 px-4"
      style={{ scrollMarginTop: '56px' }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest mb-3">Everything you need</p>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)]">
            Built for real financial decisions.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:border-[var(--accent)] hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-xl mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold text-[var(--text)] mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────────────────────

function StatsBarSection() {
  return (
    <section className="py-12 md:py-16 bg-[var(--accent)] px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-4xl md:text-5xl font-bold text-white">{s.number}</p>
              <p className="text-sm text-white/70 mt-1.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ──────────────────────────────────────────────────────────────────

function FinalCTASection() {
  return (
    <section className="py-20 md:py-28 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--positive)] bg-[var(--positive-light)] border border-[var(--positive-light)] rounded-full px-4 py-1.5 mb-7">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--positive)] shrink-0" />
          Free to use — no account required
        </div>

        <h2 className="text-3xl md:text-5xl font-bold text-[var(--text)] leading-tight mb-5">
          Your financial future is{' '}
          <span className="text-[var(--accent)]">one forecast away.</span>
        </h2>

        <p className="text-lg text-[var(--muted)] mb-10">
          No account needed. No credit card. Just enter your numbers and see where you stand.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-8 py-3.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-semibold text-base shadow-sm transition-all hover:shadow-md"
          >
            Try Free — Open Dashboard
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] font-medium text-base hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all flex items-center justify-center gap-2.5"
          >
            {/* Google icon */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </Link>
        </div>

        <p className="text-xs text-[var(--muted)] mt-6">
          Already have a scenario? It auto-saves in your browser — no login needed.
        </p>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer className="py-10 border-t border-[var(--border)] bg-[var(--surface)] px-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xs shadow-sm select-none">
            W
          </div>
          <span className="font-semibold text-[var(--text)] text-sm">WealthFlow Forecast</span>
          <span className="text-[var(--border)] text-sm">·</span>
          <span className="text-xs text-[var(--muted)]">© 2025</span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-5 text-sm text-[var(--muted)]">
          <Link href="/dashboard" className="hover:text-[var(--accent)] transition-colors">Open App</Link>
          <Link href="/login" className="hover:text-[var(--accent)] transition-colors">Sign in</Link>
          <a href="#how-it-works" className="hover:text-[var(--accent)] transition-colors">How it Works</a>
          <a href="#features" className="hover:text-[var(--accent)] transition-colors">Features</a>
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-[var(--muted-2)] text-center sm:text-right max-w-xs">
          For informational purposes only. Not financial advice.
        </p>
      </div>
    </footer>
  );
}
