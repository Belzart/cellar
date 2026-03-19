'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Check } from 'lucide-react'
import { logWater, removeLastWater } from '@/lib/actions/nutrition'

interface WaterTrackerProps {
  consumed_ml: number
  goal_ml: number
}

// Preset bottle sizes in oz → ml
const BOTTLE_PRESETS = [
  { label: '8 oz', ml: 237 },
  { label: '16 oz', ml: 473 },
  { label: '20 oz', ml: 591 },
  { label: '24 oz', ml: 710 },
  { label: '32 oz', ml: 946 },
]

export default function WaterTracker({ consumed_ml, goal_ml }: WaterTrackerProps) {
  const router = useRouter()
  const [optimisticMl, setOptimisticMl] = useState(consumed_ml)
  const [busy, setBusy] = useState(false)
  const [justAdded, setJustAdded] = useState<number | null>(null)

  const progress = goal_ml > 0 ? Math.min(optimisticMl / goal_ml, 1) : 0
  const pctLabel = Math.round(progress * 100)

  async function addWater(ml: number) {
    if (busy) return
    setBusy(true)
    setOptimisticMl((prev) => prev + ml)
    setJustAdded(ml)
    setTimeout(() => setJustAdded(null), 1200)
    try {
      await logWater(ml)
      router.refresh()
    } catch {
      setOptimisticMl((prev) => prev - ml)
    } finally {
      setBusy(false)
    }
  }

  async function removeGlass() {
    if (busy || optimisticMl <= 0) return
    setBusy(true)
    const prevMl = optimisticMl
    setOptimisticMl((prev) => Math.max(0, prev - 250))
    try {
      await removeLastWater()
      router.refresh()
    } catch {
      setOptimisticMl(prevMl)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-surface-card rounded-2xl p-4 shadow-bite-card">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">💧</span>
          <span className="text-sm font-semibold text-ink">Water</span>
        </div>
        <div className="flex items-center gap-2">
          {justAdded && (
            <span className="text-xs text-[#3B82F6] font-medium animate-fade-in">
              <Check className="w-3 h-3 inline mr-0.5" />
              +{Math.round(justAdded / 29.574)}oz
            </span>
          )}
          <span className="text-xs text-ink-secondary">
            {(optimisticMl / 1000).toFixed(1)}L / {(goal_ml / 1000).toFixed(1)}L
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-surface-elevated rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pctLabel}%`,
            background: progress >= 1 ? '#10B981' : '#3B82F6',
          }}
        />
      </div>

      {/* Bottle presets */}
      <div className="flex gap-1.5">
        {BOTTLE_PRESETS.map((preset) => (
          <button
            key={preset.ml}
            onClick={() => addWater(preset.ml)}
            disabled={busy}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#EFF6FF] text-[#3B82F6] active:scale-95 transition-all disabled:opacity-40"
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={removeGlass}
          disabled={optimisticMl <= 0 || busy}
          className="w-9 rounded-xl bg-surface-elevated text-ink-tertiary flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
