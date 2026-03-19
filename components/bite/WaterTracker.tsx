'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { logWater, removeLastWater } from '@/lib/actions/nutrition'

interface WaterTrackerProps {
  consumed_ml: number
  goal_ml: number
}

const GLASS_ML = 250
const MAX_GLASSES = 8

export default function WaterTracker({ consumed_ml, goal_ml }: WaterTrackerProps) {
  const router = useRouter()
  const [optimisticMl, setOptimisticMl] = useState(consumed_ml)
  const [busy, setBusy] = useState(false)

  const glassesConsumed = Math.min(Math.round(optimisticMl / GLASS_ML), MAX_GLASSES)
  const goalGlasses = Math.round(goal_ml / GLASS_ML)

  async function addGlass() {
    if (busy) return
    setBusy(true)
    setOptimisticMl((prev) => prev + GLASS_ML)
    try {
      await logWater(GLASS_ML)
      router.refresh()
    } catch {
      setOptimisticMl((prev) => prev - GLASS_ML)
    } finally {
      setBusy(false)
    }
  }

  async function removeGlass() {
    if (busy || optimisticMl <= 0) return
    setBusy(true)
    setOptimisticMl((prev) => Math.max(0, prev - GLASS_ML))
    try {
      await removeLastWater()
      router.refresh()
    } catch {
      setOptimisticMl((prev) => prev + GLASS_ML)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-surface-card rounded-2xl p-4 shadow-bite-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">💧</span>
          <span className="text-sm font-semibold text-ink">Water</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={removeGlass}
            disabled={optimisticMl <= 0}
            className="w-7 h-7 rounded-full bg-surface-elevated text-ink-tertiary text-lg font-medium flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
          >
            −
          </button>
          <span className="text-xs text-ink-secondary w-20 text-center">
            {(optimisticMl / 1000).toFixed(1)}L / {(goal_ml / 1000).toFixed(1)}L
          </span>
          <button
            onClick={addGlass}
            className="w-7 h-7 rounded-full bg-[#EFF6FF] text-[#3B82F6] text-lg font-medium flex items-center justify-center active:scale-90 transition-transform"
          >
            +
          </button>
        </div>
      </div>

      {/* Glass icons */}
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: Math.max(MAX_GLASSES, goalGlasses) }).map((_, i) => (
          <div
            key={i}
            className={`w-7 h-8 rounded-lg flex items-end justify-center pb-0.5 text-[10px] transition-all ${
              i < glassesConsumed
                ? 'bg-[#DBEAFE] text-[#3B82F6]'
                : 'bg-surface-elevated text-ink-tertiary'
            }`}
          >
            {i < glassesConsumed ? '💧' : '·'}
          </div>
        ))}
      </div>
    </div>
  )
}
