'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { NutritionGoals } from '@/lib/types/nutrition'
import { upsertGoals } from '@/lib/actions/nutrition'
import { cn } from '@/lib/utils'

interface GoalsClientProps {
  initialGoals: NutritionGoals | null
}

interface GoalField {
  key: keyof NutritionGoals
  label: string
  unit: string
  emoji: string
  min: number
  max: number
  step: number
  color: string
}

const GOAL_FIELDS: GoalField[] = [
  { key: 'calories_goal',  label: 'Calories',  unit: 'kcal', emoji: '🔥', min: 1000, max: 5000, step: 50,  color: '#10B981' },
  { key: 'protein_g_goal', label: 'Protein',   unit: 'g',    emoji: '💪', min: 30,   max: 400,  step: 5,   color: '#10B981' },
  { key: 'carbs_g_goal',   label: 'Carbs',     unit: 'g',    emoji: '🍞', min: 50,   max: 600,  step: 5,   color: '#3B82F6' },
  { key: 'fat_g_goal',     label: 'Fat',       unit: 'g',    emoji: '🥑', min: 20,   max: 200,  step: 5,   color: '#F59E0B' },
  { key: 'water_ml_goal',  label: 'Water',     unit: 'L',    emoji: '💧', min: 500,  max: 5000, step: 250, color: '#3B82F6' },
  { key: 'steps_goal',     label: 'Steps',     unit: 'k',    emoji: '👟', min: 1000, max: 30000,step: 500, color: '#8B5CF6' },
]

export default function GoalsClient({ initialGoals }: GoalsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [values, setValues] = useState({
    calories_goal:  initialGoals?.calories_goal  ?? 2000,
    protein_g_goal: initialGoals?.protein_g_goal ?? 150,
    carbs_g_goal:   initialGoals?.carbs_g_goal   ?? 200,
    fat_g_goal:     initialGoals?.fat_g_goal      ?? 65,
    water_ml_goal:  initialGoals?.water_ml_goal  ?? 2500,
    steps_goal:     initialGoals?.steps_goal     ?? 10000,
  })

  function formatDisplay(field: GoalField, val: number): string {
    if (field.unit === 'L') return `${(val / 1000).toFixed(1)}L`
    if (field.unit === 'k') return `${(val / 1000).toFixed(1)}k`
    return `${val}${field.unit}`
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      try {
        await upsertGoals(values)
        setSaved(true)
        setTimeout(() => {
          setSaved(false)
          router.push('/bite')
        }, 1200)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Macros info card */}
      <div className="bg-bite/10 border border-bite/20 rounded-2xl p-4">
        <p className="text-bite-dark text-sm font-medium">
          💡 A common starting point: 2000 kcal, 150g protein, 200g carbs, 65g fat.
          Adjust based on your specific goals.
        </p>
      </div>

      {/* Goal sliders */}
      <div className="space-y-4">
        {GOAL_FIELDS.map((field) => {
          const val = values[field.key as keyof typeof values] as number
          const progress = (val - field.min) / (field.max - field.min)

          return (
            <div key={field.key} className="bg-surface-card rounded-2xl p-4 shadow-bite-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{field.emoji}</span>
                  <span className="text-sm font-semibold text-ink">{field.label}</span>
                </div>
                <span className="text-base font-bold text-ink">
                  {formatDisplay(field, val)}
                </span>
              </div>

              <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={val}
                onChange={(e) => setValues((prev) => ({
                  ...prev,
                  [field.key]: Number(e.target.value),
                }))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${field.color} ${progress * 100}%, #E8E5DE ${progress * 100}%)`,
                }}
              />

              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-ink-tertiary">{formatDisplay(field, field.min)}</span>
                <span className="text-[10px] text-ink-tertiary">{formatDisplay(field, field.max)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={isPending || saved}
        className={cn(
          'w-full py-4 rounded-2xl text-base font-semibold transition-all active:scale-95',
          saved
            ? 'bg-bite/20 text-bite'
            : isPending
            ? 'bg-surface-elevated text-ink-tertiary'
            : 'bg-bite text-white'
        )}
      >
        {saved ? (
          <span className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Saved!
          </span>
        ) : isPending ? 'Saving…' : 'Save Goals'}
      </button>
    </div>
  )
}
