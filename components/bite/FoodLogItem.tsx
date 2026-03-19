'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, ChevronDown } from 'lucide-react'
import { MealEntry } from '@/lib/types/nutrition'
import { deleteMealEntry } from '@/lib/actions/nutrition'

interface FoodLogItemProps {
  entry: MealEntry
}

export default function FoodLogItem({ entry }: FoodLogItemProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteMealEntry(entry.id)
      router.refresh()
    })
  }

  return (
    <div className="group">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl active:bg-surface-elevated transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-ink text-sm font-medium truncate">{entry.name}</p>
          <p className="text-ink-tertiary text-xs mt-0.5">
            {entry.serving_description ?? `${entry.quantity}×`}
          </p>
        </div>
        <div className="flex items-center gap-3 ml-2 flex-shrink-0">
          <span className="text-ink text-sm font-semibold">{entry.calories}</span>
          <span className="text-ink-tertiary text-xs">kcal</span>
          <ChevronDown className={`w-4 h-4 text-ink-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="mx-3 mb-2 bg-surface-elevated rounded-xl p-3 space-y-2">
          {/* Macro breakdown */}
          <div className="flex gap-4 text-xs">
            <div className="text-center">
              <p className="font-semibold text-ink">{Math.round(Number(entry.protein_g))}g</p>
              <p className="text-ink-tertiary">Protein</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-ink">{Math.round(Number(entry.carbs_g))}g</p>
              <p className="text-ink-tertiary">Carbs</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-ink">{Math.round(Number(entry.fat_g))}g</p>
              <p className="text-ink-tertiary">Fat</p>
            </div>
            {entry.fiber_g != null && (
              <div className="text-center">
                <p className="font-semibold text-ink">{Math.round(Number(entry.fiber_g))}g</p>
                <p className="text-ink-tertiary">Fiber</p>
              </div>
            )}
          </div>

          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-1.5 text-red-500 text-xs font-medium active:scale-95 transition-transform disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isPending ? 'Removing…' : 'Remove'}
          </button>
        </div>
      )}
    </div>
  )
}
