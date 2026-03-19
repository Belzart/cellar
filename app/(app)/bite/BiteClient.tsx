'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { PlusCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { getDaySummary } from '@/lib/actions/nutrition'
import { groupEntriesByMeal } from '@/lib/nutrition-utils'
import { MEAL_TYPES, DaySummary } from '@/lib/types/nutrition'
import MacroRing from '@/components/bite/MacroRing'
import MacroBar from '@/components/bite/MacroBar'
import MealSection from '@/components/bite/MealSection'
import WaterTracker from '@/components/bite/WaterTracker'

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatDateLabel(dateStr: string): { label: string; sub: string } {
  const today = toDateStr(new Date())
  const yesterday = toDateStr(new Date(Date.now() - 86400000))
  const tomorrow = toDateStr(new Date(Date.now() + 86400000))

  const d = new Date(dateStr + 'T12:00:00')
  const sub = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (dateStr === today) return { label: 'Today', sub }
  if (dateStr === yesterday) return { label: 'Yesterday', sub }
  if (dateStr === tomorrow) return { label: 'Tomorrow', sub }
  return { label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), sub }
}

function getDayDates(): string[] {
  const dates: string[] = []
  for (let i = 6; i >= 0; i--) {
    dates.push(toDateStr(new Date(Date.now() - i * 86400000)))
  }
  return dates
}

interface BiteClientProps {
  initialSummary: DaySummary | null
  initialDate: string
}

export default function BiteClient({ initialSummary, initialDate }: BiteClientProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [summary, setSummary] = useState(initialSummary)
  const [loading, startTransition] = useTransition()
  const today = toDateStr(new Date())
  const isToday = selectedDate === today

  const dayDates = getDayDates()
  const { label, sub } = formatDateLabel(selectedDate)

  const fetchDay = useCallback((dateStr: string) => {
    setSelectedDate(dateStr)
    startTransition(async () => {
      const data = await getDaySummary(dateStr)
      setSummary(data)
    })
  }, [])

  // Refresh data when returning to page (e.g. after logging food)
  useEffect(() => {
    const handleFocus = () => {
      startTransition(async () => {
        const data = await getDaySummary(selectedDate)
        setSummary(data)
      })
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [selectedDate])

  function goBack() {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    fetchDay(toDateStr(d))
  }

  function goForward() {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    fetchDay(toDateStr(d))
  }

  const goals = summary?.goals
  const totals = summary?.totals ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, water_ml: 0, steps: 0 }
  const entries = summary?.entries ?? []
  const byMeal = groupEntriesByMeal(entries)

  const caloriesGoal = goals?.calories_goal ?? 2000
  const proteinGoal  = goals?.protein_g_goal ?? 150
  const carbsGoal    = goals?.carbs_g_goal ?? 200
  const fatGoal      = goals?.fat_g_goal ?? 65
  const waterGoal    = goals?.water_ml_goal ?? 2500

  return (
    <div
      className="min-h-screen pb-[calc(64px+env(safe-area-inset-bottom)+16px)]"
      style={{ background: '#EFECE6' }}
    >
      {/* ── Header ── */}
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-2 flex items-center justify-between">
        <div>
          <p className="text-ink-tertiary text-xs font-medium uppercase tracking-wider">{sub}</p>
          <h1 className="text-2xl font-bold text-ink mt-0.5">{label}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/bite/goals"
            className="w-9 h-9 rounded-full bg-surface-card border border-surface-border flex items-center justify-center active:scale-95 transition-transform shadow-bite-card"
          >
            <span className="text-base">🎯</span>
          </Link>
          {isToday && (
            <Link
              href="/bite/log"
              className="flex items-center gap-1.5 bg-bite text-white text-sm font-semibold px-4 py-2 rounded-2xl active:scale-95 transition-transform"
            >
              <PlusCircle className="w-4 h-4" />
              Log
            </Link>
          )}
        </div>
      </header>

      {/* ── Day selector ── */}
      <div className="px-4 mt-2 mb-4">
        <div className="flex items-center gap-1">
          <button
            onClick={goBack}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform text-ink-tertiary"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 flex gap-1 overflow-x-auto scrollbar-hide">
            {dayDates.map((d) => {
              const dt = new Date(d + 'T12:00:00')
              const dayLabel = dt.toLocaleDateString('en-US', { weekday: 'narrow' })
              const dayNum = dt.getDate()
              const isSelected = d === selectedDate
              const isT = d === today

              return (
                <button
                  key={d}
                  onClick={() => fetchDay(d)}
                  className={`flex-1 min-w-[40px] flex flex-col items-center py-1.5 rounded-xl transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-ink text-surface-card'
                      : 'text-ink-secondary'
                  }`}
                >
                  <span className={`text-[10px] font-medium ${isSelected ? 'text-surface-card/70' : 'text-ink-tertiary'}`}>
                    {dayLabel}
                  </span>
                  <span className={`text-sm font-bold ${isSelected ? '' : isT ? 'text-bite' : ''}`}>
                    {dayNum}
                  </span>
                </button>
              )
            })}
          </div>

          <button
            onClick={goForward}
            disabled={selectedDate >= today}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform text-ink-tertiary disabled:opacity-20"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className={`px-4 space-y-4 transition-opacity duration-150 ${loading ? 'opacity-50' : ''}`}>

        {/* ── Calories ring + macros ── */}
        <div className="bg-surface-card rounded-3xl p-5 shadow-bite-card">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
              <MacroRing consumed={totals.calories} goal={caloriesGoal} size={120} />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <MacroBar label="Protein" consumed={totals.protein_g} goal={proteinGoal} color="#10B981" />
              <MacroBar label="Carbs" consumed={totals.carbs_g} goal={carbsGoal} color="#3B82F6" />
              <MacroBar label="Fat" consumed={totals.fat_g} goal={fatGoal} color="#F59E0B" />
            </div>
          </div>

          <div className="flex gap-3 mt-4 pt-4 border-t border-surface-border">
            <div className="flex-1 text-center">
              <p className="text-lg font-bold text-ink">{totals.calories}</p>
              <p className="text-[11px] text-ink-tertiary">eaten</p>
            </div>
            <div className="flex-1 text-center border-l border-surface-border">
              <p className="text-lg font-bold text-bite">{Math.max(caloriesGoal - totals.calories, 0)}</p>
              <p className="text-[11px] text-ink-tertiary">remaining</p>
            </div>
            <div className="flex-1 text-center border-l border-surface-border">
              <p className="text-lg font-bold text-ink">{Math.round(totals.protein_g)}g</p>
              <p className="text-[11px] text-ink-tertiary">protein</p>
            </div>
          </div>
        </div>

        {/* ── Water tracker (today only) ── */}
        {isToday && (
          <WaterTracker consumed_ml={totals.water_ml} goal_ml={waterGoal} />
        )}

        {/* ── Past day water summary (read-only) ── */}
        {!isToday && totals.water_ml > 0 && (
          <div className="bg-surface-card rounded-2xl p-4 shadow-bite-card">
            <div className="flex items-center gap-2">
              <span className="text-base">💧</span>
              <span className="text-sm font-semibold text-ink">Water</span>
              <span className="text-xs text-ink-tertiary ml-auto">
                {(totals.water_ml / 1000).toFixed(1)}L / {(waterGoal / 1000).toFixed(1)}L
              </span>
            </div>
          </div>
        )}

        {/* ── Meal sections ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Meals</h2>
            {isToday && (
              <Link href="/bite/log" className="text-bite text-xs font-semibold flex items-center gap-0.5">
                Add food <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
          <div className="space-y-3">
            {MEAL_TYPES.map((type) => (
              <MealSection key={type} mealType={type} entries={byMeal[type] ?? []} />
            ))}
          </div>
        </div>

        {/* ── Setup goals prompt ── */}
        {!goals?.id && isToday && (
          <Link href="/bite/goals">
            <div className="bg-bite/10 border border-bite/25 rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform">
              <span className="text-2xl">🎯</span>
              <div className="flex-1">
                <p className="text-ink text-sm font-semibold">Set your daily goals</p>
                <p className="text-ink-secondary text-xs mt-0.5">Calories, macros, water & steps</p>
              </div>
              <ChevronRight className="w-4 h-4 text-bite" />
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}
