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
]

const ACTIVITY_LEVELS = [
  { value: 1.2,   label: 'Sedentary',         sub: 'Desk job, little movement' },
  { value: 1.375, label: 'Lightly active',    sub: 'Walk daily, light exercise' },
  { value: 1.55,  label: 'Moderately active', sub: 'Exercise 3–5×/week' },
  { value: 1.725, label: 'Very active',       sub: 'Hard training 6–7×/week' },
]

const GOALS_LIST = [
  { value: 'lose',     label: 'Lose fat',      adj: -400,  protein: 0.38, carbs: 0.34, fat: 0.28 },
  { value: 'maintain', label: 'Maintain',      adj: 0,     protein: 0.30, carbs: 0.45, fat: 0.25 },
  { value: 'recomp',   label: 'Recomp',        adj: -150,  protein: 0.40, carbs: 0.35, fat: 0.25 },
  { value: 'build',    label: 'Build muscle',  adj: 250,   protein: 0.35, carbs: 0.44, fat: 0.21 },
]

interface RecsResult {
  calories: number
  protein_min: number
  protein_max: number
  protein_g: number   // suggested midpoint
  protein_note: string
  carbs_g: number
  fat_g: number
}

export default function GoalsClient({ initialGoals }: GoalsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'goals' | 'recs'>('goals')

  const [values, setValues] = useState({
    calories_goal:  initialGoals?.calories_goal  ?? 2000,
    protein_g_goal: initialGoals?.protein_g_goal ?? 150,
    carbs_g_goal:   initialGoals?.carbs_g_goal   ?? 200,
    fat_g_goal:     initialGoals?.fat_g_goal      ?? 65,
    water_ml_goal:  initialGoals?.water_ml_goal  ?? 2500,
    steps_goal:     initialGoals?.steps_goal     ?? 10000,
  })

  // Recs state
  const [sex, setSex] = useState<'male' | 'female'>('male')
  const [age, setAge] = useState('')
  const [weightLbs, setWeightLbs] = useState('')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')
  const [activity, setActivity] = useState(1.375) // default: lightly active (conservative)
  const [bodyGoal, setBodyGoal] = useState('maintain')
  const [recs, setRecs] = useState<RecsResult | null>(null)

  function formatDisplay(field: GoalField, val: number): string {
    if (field.unit === 'L') return `${(val / 1000).toFixed(1)}L`
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

  function calculateRecs() {
    const ageN = parseInt(age)
    const wLbs = parseFloat(weightLbs)
    const weightKg = wLbs * 0.453592
    const heightCm = (parseInt(heightFt || '0') * 12 + parseFloat(heightIn || '0')) * 2.54

    if (!ageN || !weightKg || !heightCm) return

    // Mifflin-St Jeor BMR — a reasonable starting estimate, not a precise measurement
    const bmr = sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * ageN + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * ageN - 161

    // Apply activity multiplier then a 5% conservative buffer
    const tdee = Math.floor(bmr * activity * 0.95)
    const goalObj = GOALS_LIST.find((g) => g.value === bodyGoal)!
    const targetCals = Math.round(Math.max(1400, tdee + goalObj.adj))

    // ── Protein: body-weight based ranges (more reliable than % of calories) ──
    // Science basis: 1.6–2.2 g/kg is the evidence-backed range for most goals.
    // We convert to g/lb and show a range, not a single fake-precise number.
    const proteinConfig: Record<string, { minPerLb: number; maxPerLb: number; note: string }> = {
      lose:     { minPerLb: 0.73, maxPerLb: 0.90, note: 'Higher protein helps preserve muscle in a deficit. Spread it across meals.' },
      maintain: { minPerLb: 0.55, maxPerLb: 0.75, note: 'Moderate protein is enough for most people at maintenance.' },
      build:    { minPerLb: 0.73, maxPerLb: 0.90, note: 'Consistent protein supports muscle synthesis. Timing matters less than total daily intake.' },
      recomp:   { minPerLb: 0.80, maxPerLb: 1.00, note: 'Recomp is slow. High protein and consistency matter more than hitting exact numbers.' },
    }
    const pc = proteinConfig[bodyGoal] ?? proteinConfig.maintain
    const protein_min = Math.round(wLbs * pc.minPerLb)
    const protein_max = Math.round(wLbs * pc.maxPerLb)
    const protein_g = Math.round(wLbs * ((pc.minPerLb + pc.maxPerLb) / 2))

    // ── Carbs and fat: fill remaining calories after protein ──
    const proteinCals = protein_g * 4
    const remaining = Math.max(0, targetCals - proteinCals)
    // Fat split by goal: lose/recomp slightly more fat-leaning, build/maintain more carb-leaning
    const fatFraction = bodyGoal === 'lose' || bodyGoal === 'recomp' ? 0.38 : 0.30
    const fat_g   = Math.round((remaining * fatFraction) / 9)
    const carbs_g = Math.round((remaining * (1 - fatFraction)) / 4)

    setRecs({ calories: targetCals, protein_min, protein_max, protein_g, protein_note: pc.note, carbs_g, fat_g })
  }

  function applyRecs() {
    if (!recs) return
    setValues((prev) => ({
      ...prev,
      calories_goal:  recs.calories,
      protein_g_goal: recs.protein_g,
      carbs_g_goal:   recs.carbs_g,
      fat_g_goal:     recs.fat_g,
    }))
    setTab('goals')
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-surface-elevated rounded-xl p-1">
        {(['goals', 'recs'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === t
                ? 'bg-surface-card text-ink shadow-bite-card'
                : 'text-ink-tertiary'
            )}
          >
            {t === 'goals' ? 'My Goals' : 'Recommendations'}
          </button>
        ))}
      </div>

      {/* ── Goals Tab ── */}
      {tab === 'goals' && (
        <>
          <div className="bg-bite/10 border border-bite/20 rounded-2xl p-4">
            <p className="text-bite-dark text-sm font-medium">
              💡 A common starting point: 2000 kcal, 150g protein, 200g carbs, 65g fat.
              Use Recommendations to calculate based on your body.
            </p>
          </div>

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
        </>
      )}

      {/* ── Recommendations Tab ── */}
      {tab === 'recs' && (
        <div className="space-y-4">
          <div className="bg-surface-card rounded-2xl p-4 shadow-bite-card space-y-4">
            <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">About you</p>

            {/* Sex */}
            <div>
              <p className="text-xs text-ink-tertiary mb-2">Biological sex</p>
              <div className="flex gap-2">
                {(['male', 'female'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSex(s)}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-sm font-medium border transition-all',
                      sex === s
                        ? 'bg-ink text-surface-card border-ink'
                        : 'bg-surface-elevated text-ink-secondary border-surface-border'
                    )}
                  >
                    {s === 'male' ? 'Male' : 'Female'}
                  </button>
                ))}
              </div>
            </div>

            {/* Age */}
            <div>
              <p className="text-xs text-ink-tertiary mb-1.5">Age</p>
              <input
                type="number"
                inputMode="numeric"
                placeholder="e.g. 30"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full bg-surface-elevated border border-surface-border rounded-xl px-4 py-2.5 text-ink text-sm focus:outline-none focus:border-bite/50"
              />
            </div>

            {/* Weight */}
            <div>
              <p className="text-xs text-ink-tertiary mb-1.5">Weight (lbs)</p>
              <input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 170"
                value={weightLbs}
                onChange={(e) => setWeightLbs(e.target.value)}
                className="w-full bg-surface-elevated border border-surface-border rounded-xl px-4 py-2.5 text-ink text-sm focus:outline-none focus:border-bite/50"
              />
            </div>

            {/* Height */}
            <div>
              <p className="text-xs text-ink-tertiary mb-1.5">Height</p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="5"
                    value={heightFt}
                    onChange={(e) => setHeightFt(e.target.value)}
                    className="w-full bg-surface-elevated border border-surface-border rounded-xl px-4 py-2.5 text-ink text-sm focus:outline-none focus:border-bite/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-tertiary">ft</span>
                </div>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="10"
                    value={heightIn}
                    onChange={(e) => setHeightIn(e.target.value)}
                    className="w-full bg-surface-elevated border border-surface-border rounded-xl px-4 py-2.5 text-ink text-sm focus:outline-none focus:border-bite/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-tertiary">in</span>
                </div>
              </div>
            </div>

            {/* Activity */}
            <div>
              <p className="text-xs text-ink-tertiary mb-2">Activity level</p>
              <div className="space-y-1.5">
                {ACTIVITY_LEVELS.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => setActivity(a.value)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all',
                      activity === a.value
                        ? 'bg-bite/10 border-bite/40 text-bite-dark'
                        : 'bg-surface-elevated border-surface-border text-ink-secondary'
                    )}
                  >
                    <span className="text-sm font-medium">{a.label}</span>
                    <span className="text-xs opacity-70">{a.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Goal */}
            <div>
              <p className="text-xs text-ink-tertiary mb-2">Your goal</p>
              <div className="grid grid-cols-2 gap-2">
                {GOALS_LIST.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setBodyGoal(g.value)}
                    className={cn(
                      'py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left',
                      bodyGoal === g.value
                        ? 'bg-ink text-surface-card border-ink'
                        : 'bg-surface-elevated text-ink-secondary border-surface-border'
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={calculateRecs}
              disabled={!age || !weightLbs || !heightFt}
              className={cn(
                'w-full py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95',
                !age || !weightLbs || !heightFt
                  ? 'bg-surface-elevated text-ink-tertiary'
                  : 'bg-bite text-white'
              )}
            >
              Calculate
            </button>
          </div>

          {/* Results */}
          {recs && (
            <div className="bg-surface-card rounded-2xl p-4 shadow-bite-card space-y-4 animate-fade-in">
              <div>
                <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Estimated starting point</p>
                <p className="text-xs text-ink-tertiary mt-1 leading-relaxed">
                  These are rough estimates — individual metabolism varies by 15–25%. Treat this as a starting point, not a prescription. Adjust based on how you actually feel and perform.
                </p>
              </div>

              <div className="space-y-2">
                {/* Calories */}
                <div className="bg-bite/10 rounded-xl p-3 text-center">
                  <p className="text-3xl font-bold text-bite">~{recs.calories}</p>
                  <p className="text-xs text-ink-tertiary mt-0.5">kcal / day</p>
                </div>

                {/* Protein with range */}
                <div className="bg-surface-elevated rounded-xl p-3">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs text-ink-tertiary">Protein</span>
                    <span className="text-lg font-bold text-ink">~{recs.protein_g}g</span>
                  </div>
                  <p className="text-xs text-ink-tertiary">
                    Suggested range: {recs.protein_min}–{recs.protein_max}g/day
                  </p>
                  <p className="text-xs text-ink-secondary mt-1 leading-relaxed">{recs.protein_note}</p>
                </div>

                {/* Carbs + Fat */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-surface-elevated rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-ink">~{recs.carbs_g}g</p>
                    <p className="text-xs text-ink-tertiary mt-0.5">carbs</p>
                  </div>
                  <div className="bg-surface-elevated rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-ink">~{recs.fat_g}g</p>
                    <p className="text-xs text-ink-tertiary mt-0.5">fat</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-ink-tertiary leading-relaxed border-t border-surface-border pt-3">
                Method: Mifflin-St Jeor BMR × {activity}× activity − 5% buffer
                {bodyGoal === 'lose' ? `, −400 kcal` : bodyGoal === 'build' ? `, +250 kcal` : bodyGoal === 'recomp' ? `, −150 kcal` : ''}.
                Protein based on bodyweight, not % of calories.
              </p>

              <button
                onClick={applyRecs}
                className="w-full py-3 rounded-2xl bg-ink text-surface-card text-sm font-semibold active:scale-95 transition-all"
              >
                Apply as starting goals
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
