'use client';

import type { GoalProgress } from '@/lib/types';

function kFmt(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

interface Props {
  goals: GoalProgress[];
  currency: string;
}

export function GoalsPanel({ goals, currency }: Props) {
  if (goals.length === 0) return null;

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🎯</span>
        <h3 className="text-sm font-semibold text-[var(--text)]">Financial Goals</h3>
        <span className="text-[11px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] px-1.5 py-0.5 rounded-full font-medium ml-auto">
          {goals.filter((g) => g.onTrack).length}/{goals.length} on track
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {goals.map((goal) => {
          const progress = Math.min(100, (goal.endValue / goal.targetAmount) * 100);
          const isOnTrack = goal.onTrack;
          const achieved = goal.achievedMonth !== null;

          return (
            <div key={goal.goalId} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm shrink-0">{isOnTrack ? '✅' : achieved ? '✅' : '⏳'}</span>
                  <span className="text-xs font-semibold text-[var(--text)] truncate">{goal.label}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-bold ${isOnTrack ? 'text-[var(--positive)]' : 'text-[var(--warn)]'}`}>
                    {currency} {kFmt(goal.endValue)}
                  </span>
                  <span className="text-[10px] text-[var(--muted)] ml-1">/ {kFmt(goal.targetAmount)}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: isOnTrack ? 'var(--positive)' : progress >= 75 ? 'var(--warn)' : 'var(--negative)',
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
                <span>
                  {achieved
                    ? `Achieved month ${(goal.achievedMonth ?? 0) + 1}`
                    : `Target: month ${goal.targetMonth + 1}`}
                </span>
                <span className={`font-medium ${isOnTrack ? 'text-[var(--positive)]' : 'text-[var(--warn)]'}`}>
                  {progress.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
