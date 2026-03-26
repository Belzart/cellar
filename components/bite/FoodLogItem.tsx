'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, ChevronDown, RotateCcw, ArrowLeftRight, Check } from 'lucide-react'
import { MealEntry, MealAnalysisItem } from '@/lib/types/nutrition'
import { deleteMealEntry, moveMealEntry } from '@/lib/actions/nutrition'

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

// Local date string — matches BiteClient's toDateStr to avoid UTC rollover
function localDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

export default function FoodLogItem({ entry }: FoodLogItemProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [moving, setMoving] = useState(false)
  const [moveSuccess, setMoveSuccess] = useState(false)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const breakdown = parseBreakdown(entry.notes)
  const today = localDateStr(new Date())
  const yesterday = localDateStr(new Date(Date.now() - 86400000))

  function startDelete() {
    setPendingDelete(true)
    undoTimerRef.current = setTimeout(() => confirmDelete(), 3000)
  }

  function undoDelete() {
    setPendingDelete(false)
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null }
  }

  async function confirmDelete() {
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null }
    setDeleting(true)
    try {
      await deleteMealEntry(entry.id)
      router.refresh()
    } catch {
      setDeleting(false)
      setPendingDelete(false)
    }
  }

  async function handleMove(toDate: string) {
    setMoving(true)
    const result = await moveMealEntry(entry.id, toDate, new Date().getTimezoneOffset())
    if (!result.error) {
      setMoveSuccess(true)
      setTimeout(() => router.refresh(), 700)
    }
    setMoving(false)
  }

  if (pendingDelete) {
    return (
      <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-red-50 border border-red-100 mx-1 my-0.5">
        <span className="text-sm text-red-600 font-medium">
          {deleting ? 'Removing…' : 'Removed'}
        </span>
        {!deleting && (
          <button onClick={undoDelete} className="flex items-center gap-1 text-xs font-semibold text-red-600 active:scale-95 transition-transform">
            <RotateCcw className="w-3 h-3" />
            Undo
          </button>
        )}
      </div>
    )
  }

  if (moveSuccess) {
    return (
      <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-green-50 border border-green-100 mx-1 my-0.5">
        <Check className="w-3.5 h-3.5 text-green-600" />
        <span className="text-sm text-green-700 font-medium">Moved</span>
      </div>
    )
  }

  return (
    <div className="group">
      <div className="flex items-center">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center justify-between py-2.5 px-3 rounded-xl active:bg-surface-elevated transition-colors text-left min-w-0"
        >
          <div className="flex-1 min-w-0">
            <p className="text-ink text-sm font-medium truncate">{entry.name}</p>
            <p className="text-ink-tertiary text-xs mt-0.5">
              {breakdown ? `${breakdown.length} items` : (entry.serving_description ?? `${entry.quantity}×`)}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <span className="text-ink text-sm font-semibold">{entry.calories}</span>
            <span className="text-ink-tertiary text-[10px]">kcal</span>
            <ChevronDown className={`w-3.5 h-3.5 text-ink-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        <button
          onClick={startDelete}
          className="w-8 h-8 flex items-center justify-center rounded-full text-ink-tertiary hover:text-red-400 active:scale-90 transition-all flex-shrink-0 mr-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="mx-3 mb-2 bg-surface-elevated rounded-xl p-3 space-y-3">
          {/* Macros row */}
          <div className="flex gap-4 text-xs">
            {[
              { label: 'Protein', val: entry.protein_g },
              { label: 'Carbs', val: entry.carbs_g },
              { label: 'Fat', val: entry.fat_g },
              ...(entry.fiber_g != null ? [{ label: 'Fiber', val: entry.fiber_g }] : []),
            ].map(({ label, val }) => (
              <div key={label} className="text-center">
                <p className="font-semibold text-ink">{Math.round(Number(val))}g</p>
                <p className="text-ink-tertiary">{label}</p>
              </div>
            ))}
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

          {/* Move to another day */}
          <div className="pt-2 border-t border-surface-border">
            <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider mb-2 flex items-center gap-1">
              <ArrowLeftRight className="w-3 h-3" />
              Move to day
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleMove(yesterday)}
                disabled={moving}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-surface-card border border-surface-border text-ink-secondary active:scale-95 transition-all disabled:opacity-40"
              >
                {moving ? '…' : 'Yesterday'}
              </button>
              <button
                onClick={() => handleMove(today)}
                disabled={moving}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-surface-card border border-surface-border text-ink-secondary active:scale-95 transition-all disabled:opacity-40"
              >
                {moving ? '…' : 'Today'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
