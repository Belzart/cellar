'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Check, Plus, X } from 'lucide-react'
import { logWater, removeLastWater } from '@/lib/actions/nutrition'

interface WaterTrackerProps {
  consumed_ml: number
  goal_ml: number
}

const BOTTLE_PRESETS = [
  { label: '8 oz', ml: 237 },
  { label: '16 oz', ml: 473 },
  { label: '20 oz', ml: 591 },
  { label: '24 oz', ml: 710 },
  { label: '32 oz', ml: 946 },
]

const STORAGE_KEY = 'bite_custom_bottle_ml'

function loadCustomBottle(): number | null {
  if (typeof window === 'undefined') return null
  const val = localStorage.getItem(STORAGE_KEY)
  const parsed = val ? parseInt(val, 10) : NaN
  return isNaN(parsed) || parsed <= 0 ? null : parsed
}

export default function WaterTracker({ consumed_ml, goal_ml }: WaterTrackerProps) {
  const router = useRouter()
  const [optimisticMl, setOptimisticMl] = useState(consumed_ml)
  const [busy, setBusy] = useState(false)
  const [justAdded, setJustAdded] = useState<number | null>(null)

  // Custom bottle state
  const [customBottleMl, setCustomBottleMl] = useState<number | null>(null)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customInputOz, setCustomInputOz] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Load saved custom bottle from localStorage on mount
  useEffect(() => {
    setCustomBottleMl(loadCustomBottle())
  }, [])

  // Focus input when it appears
  useEffect(() => {
    if (showCustomInput) inputRef.current?.focus()
  }, [showCustomInput])

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

  function saveCustomBottle() {
    const oz = parseFloat(customInputOz)
    if (isNaN(oz) || oz <= 0) return
    const ml = Math.round(oz * 29.5735)
    localStorage.setItem(STORAGE_KEY, String(ml))
    setCustomBottleMl(ml)
    setShowCustomInput(false)
    setCustomInputOz('')
    // immediately log it
    addWater(ml)
  }

  function handleCustomKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') saveCustomBottle()
    if (e.key === 'Escape') {
      setShowCustomInput(false)
      setCustomInputOz('')
    }
  }

  const customOzLabel = customBottleMl ? `${Math.round(customBottleMl / 29.5735)} oz` : null

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

      {/* Preset buttons */}
      <div className="flex gap-1.5 mb-2">
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

      {/* Custom bottle row */}
      {showCustomInput ? (
        <div className="flex items-center gap-2 mt-1">
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            placeholder="oz (e.g. 40)"
            value={customInputOz}
            onChange={(e) => setCustomInputOz(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            className="flex-1 bg-surface-elevated rounded-xl px-3 py-2 text-sm text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/40"
          />
          <button
            onClick={saveCustomBottle}
            disabled={!customInputOz || parseFloat(customInputOz) <= 0}
            className="px-3 py-2 rounded-xl bg-[#3B82F6] text-white text-xs font-semibold active:scale-95 transition-all disabled:opacity-40"
          >
            Save &amp; Add
          </button>
          <button
            onClick={() => { setShowCustomInput(false); setCustomInputOz('') }}
            className="w-8 h-8 rounded-xl bg-surface-elevated flex items-center justify-center text-ink-tertiary active:scale-90 transition-transform"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5 mt-1">
          {/* Saved custom bottle — quick-add */}
          {customOzLabel && (
            <button
              onClick={() => addWater(customBottleMl!)}
              disabled={busy}
              className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#ECFDF5] text-[#059669] border border-[#059669]/20 active:scale-95 transition-all disabled:opacity-40"
            >
              ⭐ {customOzLabel}
            </button>
          )}
          {/* Set / change custom bottle */}
          <button
            onClick={() => setShowCustomInput(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-ink-tertiary bg-surface-elevated active:scale-95 transition-all"
          >
            <Plus className="w-3 h-3" />
            {customOzLabel ? 'Change' : 'Custom'}
          </button>
        </div>
      )}
    </div>
  )
}
