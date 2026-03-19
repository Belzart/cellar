import Link from 'next/link'
import { PlusCircle, ChevronRight, Footprints } from 'lucide-react'
import { getDaySummary } from '@/lib/actions/nutrition'
import { groupEntriesByMeal } from '@/lib/nutrition-utils'
import { MEAL_TYPES } from '@/lib/types/nutrition'
import MacroRing from '@/components/bite/MacroRing'
import MacroBar from '@/components/bite/MacroBar'
import MealSection from '@/components/bite/MealSection'
import WaterTracker from '@/components/bite/WaterTracker'

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default async function BiteTodayPage() {
  const summary = await getDaySummary()

  const goals = summary?.goals
  const totals = summary?.totals ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, water_ml: 0, steps: 0 }
  const entries = summary?.entries ?? []
  const byMeal = groupEntriesByMeal(entries)

  const caloriesGoal = goals?.calories_goal ?? 2000
  const proteinGoal  = goals?.protein_g_goal ?? 150
  const carbsGoal    = goals?.carbs_g_goal ?? 200
  const fatGoal      = goals?.fat_g_goal ?? 65
  const waterGoal    = goals?.water_ml_goal ?? 2500
  const stepsGoal    = goals?.steps_goal ?? 10000

  const stepsProgress = stepsGoal > 0 ? Math.min(totals.steps / stepsGoal, 1) : 0

  return (
    <div
      className="min-h-screen pb-[calc(64px+env(safe-area-inset-bottom)+16px)]"
      style={{ background: '#F7F6F3' }}
    >
      {/* ── Header ── */}
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-2 flex items-center justify-between">
        <div>
          <p className="text-ink-tertiary text-xs font-medium uppercase tracking-wider">
            {formatDate()}
          </p>
          <h1 className="text-2xl font-bold text-ink mt-0.5">Today</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/bite/goals"
            className="w-9 h-9 rounded-full bg-surface-card border border-surface-border flex items-center justify-center active:scale-95 transition-transform shadow-bite-card"
          >
            <span className="text-base">🎯</span>
          </Link>
          <Link
            href="/bite/log"
            className="flex items-center gap-1.5 bg-bite text-white text-sm font-semibold px-4 py-2 rounded-2xl active:scale-95 transition-transform"
          >
            <PlusCircle className="w-4 h-4" />
            Log
          </Link>
        </div>
      </header>

      <div className="px-4 space-y-4 mt-4">

        {/* ── Calories ring + macros ── */}
        <div className="bg-surface-card rounded-3xl p-5 shadow-bite-card">
          <div className="flex items-center gap-4">
            {/* Ring */}
            <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
              <MacroRing
                consumed={totals.calories}
                goal={caloriesGoal}
                size={120}
              />
            </div>

            {/* Macro bars */}
            <div className="flex-1 min-w-0 space-y-3">
              <MacroBar
                label="Protein"
                consumed={totals.protein_g}
                goal={proteinGoal}
                color="#10B981"
              />
              <MacroBar
                label="Carbs"
                consumed={totals.carbs_g}
                goal={carbsGoal}
                color="#3B82F6"
              />
              <MacroBar
                label="Fat"
                consumed={totals.fat_g}
                goal={fatGoal}
                color="#F59E0B"
              />
            </div>
          </div>

          {/* Quick stats row */}
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

        {/* ── Water tracker ── */}
        <WaterTracker consumed_ml={totals.water_ml} goal_ml={waterGoal} />

        {/* ── Steps ── */}
        <div className="bg-surface-card rounded-2xl p-4 shadow-bite-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Footprints className="w-4 h-4 text-ink-secondary" />
              <span className="text-sm font-semibold text-ink">Steps</span>
            </div>
            <Link href="/bite/goals" className="text-xs text-bite font-medium">
              {totals.steps.toLocaleString()} / {stepsGoal.toLocaleString()}
            </Link>
          </div>
          <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#8B5CF6] transition-all duration-500"
              style={{ width: `${stepsProgress * 100}%` }}
            />
          </div>
        </div>

        {/* ── Meal sections ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Meals</h2>
            <Link
              href="/bite/log"
              className="text-bite text-xs font-semibold flex items-center gap-0.5"
            >
              Add food <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {MEAL_TYPES.map((type) => (
              <MealSection
                key={type}
                mealType={type}
                entries={byMeal[type] ?? []}
              />
            ))}
          </div>
        </div>

        {/* ── Setup goals prompt if no goals set ── */}
        {!goals?.id && (
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
