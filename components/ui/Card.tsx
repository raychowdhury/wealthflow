import { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
      {subtitle && <p className="text-xs text-[var(--muted)] mt-0.5">{subtitle}</p>}
    </div>
  );
}
