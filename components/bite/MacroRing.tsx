'use client'

interface MacroRingProps {
  consumed: number
  goal: number
  size?: number
}

export default function MacroRing({ consumed, goal, size = 160 }: MacroRingProps) {
  const radius = (size / 2) - 10
  const circumference = 2 * Math.PI * radius
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const remaining = Math.max(goal - consumed, 0)
  const over = consumed > goal

  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="flex flex-col items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E8E5DE"
          strokeWidth={7}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={over ? '#F59E0B' : '#10B981'}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-semibold text-ink leading-none tracking-tight">
          {over ? consumed : remaining}
        </span>
        <span className="text-[10px] text-ink-tertiary mt-0.5 font-medium tracking-wide">
          {over ? 'over' : 'left'}
        </span>
      </div>
    </div>
  )
}
