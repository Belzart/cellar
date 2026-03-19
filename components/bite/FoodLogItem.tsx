'use client'

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, ChevronDown } from 'lucide-react'
import { MealEntry, MealAnalysisItem } from '@/lib/types/nutrition'
import { deleteMealEntry } from '@/lib/actions/nutrition'

interface FoodLogItemProps {
  entry: MealEntry
}

function parseBreakdown(notes: string | null): MealAnalysisItem[] | null {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes)
    if (parsed._type === 'breakdown' && Array.isArray(parsed.items)) return parsed.items
  } catch {}
  return null
}

export default function FoodLogItem({ entry }: FoodLogItemProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const breakdown = parseBreakdown(entry.notes)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteMealEntry(entry.id)
      router.refresh()
    } catch {
      setDeleting(false)
    }
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
            {breakdown ? `${breakdown.length} items` : (entry.serving_description ?? `${entry.quantity}×`)}
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
          {/* Total macros */}
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

          {/* Ingredient breakdown */}
          {breakdown && (
            <div className="pt-2 border-t border-surface-border space-y-1.5">
              <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">Breakdown</p>
              {breakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink truncate">{item.name}</p>
                    <p className="text-[10px] text-ink-tertiary">{item.serving_description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-ink-tertiary flex-shrink-0">
                    <span className="font-medium text-ink">{Math.round(item.calories)}</span>
                    <span>kcal</span>
                    <span>·</span>
                    <span>{Math.round(Number(item.protein_g))}p</span>
                    <span>{Math.round(Number(item.carbs_g))}c</span>
                    <span>{Math.round(Number(item.fat_g))}f</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-red-500 text-xs font-medium active:scale-95 transition-transform disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? 'Removing…' : 'Remove'}
          </button>
        </div>
      )}
    </div>
  )
}
