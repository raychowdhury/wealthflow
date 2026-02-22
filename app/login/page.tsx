'use client';

import { Suspense, useState, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get('callbackUrl') ?? '/dashboard';

  const [email, setEmail]       = useState('demo@wealthflow.app');
  const [password, setPassword] = useState('demo');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    try {
      const theme = localStorage.getItem('wealthflow-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = theme === 'dark' || (!theme && prefersDark);
      setDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    } catch { /* ignore */ }

    // Redirect if already logged in
    getSession().then((session) => {
      if (session) router.replace(callbackUrl);
    });
  }, [callbackUrl, router]);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn('credentials', {
      email, password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (result?.error) {
      setError('Invalid email or password. Try demo@wealthflow.app / demo');
    } else {
      router.push(callbackUrl);
    }
  };

  const handleGoogle = () => {
    signIn('google', { callbackUrl });
  };

  const inp = 'w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text)] bg-[var(--surface)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all';

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white font-bold text-2xl shadow-md mx-auto mb-4">
            W
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">WealthFlow</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Sign in to your financial dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-lg p-6 flex flex-col gap-4">

          {/* Google SSO (only shown if configured) */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm font-medium hover:bg-[var(--surface-2)] transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--muted)]">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Credentials form */}
          <form onSubmit={handleCredentials} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--text-2)]">Email</label>
              <input
                className={inp}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@wealthflow.app"
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--text-2)]">Password</label>
              <input
                className={inp}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex gap-2 items-start p-3 bg-[var(--negative-light)] border border-[var(--negative)]/30 rounded-xl text-xs text-[var(--negative)]">
                <span className="shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Demo hint */}
          <div className="bg-[var(--accent-light)] border border-[var(--accent)]/20 rounded-xl p-3 text-center">
            <p className="text-xs text-[var(--accent)] font-medium">Demo account pre-filled</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">email: demo@wealthflow.app · password: demo</p>
          </div>
        </div>

        {/* Dark mode toggle */}
        <div className="text-center mt-4">
          <button
            onClick={() => {
              const next = !darkMode;
              setDarkMode(next);
              document.documentElement.classList.toggle('dark', next);
              try { localStorage.setItem('wealthflow-theme', next ? 'dark' : 'light'); } catch { /* ignore */ }
            }}
            className="text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
          >
            {darkMode ? '☀ Light mode' : '🌙 Dark mode'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg)] flex items-center justify-center"><span className="text-[var(--muted)] text-sm">Loading…</span></div>}>
      <LoginContent />
    </Suspense>
  );
}
