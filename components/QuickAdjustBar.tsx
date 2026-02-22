'use client';

// ── Helpers ──────────────────────────────────────────────────────────────────

function adjColor(value: number, goodDir: 'up' | 'down') {
  if (value === 0) return '#94a3b8';
  const good = (goodDir === 'up' && value > 0) || (goodDir === 'down' && value < 0);
  return good ? '#059669' : '#dc2626';
}

// ── Slider ───────────────────────────────────────────────────────────────────

function AdjSlider({ label, icon, value, onChange, goodDir }: {
  label: string; icon: string; value: number;
  onChange: (v: number) => void; goodDir: 'up' | 'down';
}) {
  const color   = adjColor(value, goodDir);
  const display = value === 0 ? 'No change' : `${value > 0 ? '+' : ''}${value}%`;
  // Map -50..+100 range → 0..100% for gradient
  const fillPct = ((value + 50) / 150) * 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#64748b] flex items-center gap-1.5">
          <span>{icon}</span>{label}
        </span>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>
          {display}
        </span>
      </div>

      <input
        type="range"
        min={-50} max={100} step={5}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${fillPct}%, #e2e8f0 ${fillPct}%, #e2e8f0 100%)`,
          accentColor: color,
        }}
      />

      <div className="flex justify-between text-[9px] text-[#cbd5e1] select-none">
        <span>−50%</span><span>0</span><span>+100%</span>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  incomeAdj:       number;
  expenseAdj:      number;
  investAdj:       number;
  onIncomeChange:  (v: number) => void;
  onExpenseChange: (v: number) => void;
  onInvestChange:  (v: number) => void;
  onReset:         () => void;
}

export function QuickAdjustBar({
  incomeAdj, expenseAdj, investAdj,
  onIncomeChange, onExpenseChange, onInvestChange,
  onReset,
}: Props) {
  const isAdjusted = incomeAdj !== 0 || expenseAdj !== 0 || investAdj !== 0;

  return (
    <div
      className="bg-white rounded-2xl border shadow-sm p-4 transition-all duration-200"
      style={{
        borderColor:  isAdjusted ? '#6366f1' : '#e2e8f0',
        boxShadow:    isAdjusted ? '0 0 0 3px #eef2ff' : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#0f172a]">⚡ What-If Explorer</span>
          {isAdjusted && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eef2ff] text-[#6366f1] border border-[#c7d2fe]">
              LIVE · adjusting forecast
            </span>
          )}
        </div>
        {isAdjusted ? (
          <button
            onClick={onReset}
            className="text-xs px-2.5 py-1 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:text-[#dc2626] hover:border-[#fecaca] transition-all"
          >
            Reset ×
          </button>
        ) : (
          <p className="text-[11px] text-[#94a3b8]">Drag sliders — forecast updates live</p>
        )}
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-3 gap-6">
        <AdjSlider label="Income"      icon="💰" value={incomeAdj}  onChange={onIncomeChange}  goodDir="up"   />
        <AdjSlider label="Expenses"    icon="🧾" value={expenseAdj} onChange={onExpenseChange} goodDir="down" />
        <AdjSlider label="Investments" icon="📈" value={investAdj}  onChange={onInvestChange}  goodDir="up"   />
      </div>
    </div>
  );
}
