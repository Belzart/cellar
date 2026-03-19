interface MacroBarProps {
  label: string
  consumed: number
  goal: number
  unit?: string
  color: string
}

export default function MacroBar({ label, consumed, goal, unit = 'g', color }: MacroBarProps) {
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const over = consumed > goal

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wide">{label}</span>
        <span className="text-[11px] text-ink-tertiary">
          {Math.round(consumed)}<span className="text-ink-tertiary/60">/{goal}{unit}</span>
        </span>
      </div>
      <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress * 100}%`,
            background: over ? '#F59E0B' : color,
          }}
        />
      </div>
    </div>
  )
}
