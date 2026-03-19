import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getMyGoals } from '@/lib/actions/nutrition'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const goals = await getMyGoals()

  // Fetch last 7 days of entries for a trend view
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const startDate = sevenDaysAgo.toISOString().split('T')[0]

  const { data: entries } = await supabase
    .from('meal_entries')
    .select('logged_at, calories, protein_g')
    .eq('user_id', user?.id ?? '')
    .gte('logged_at', `${startDate}T00:00:00.000Z`)
    .order('logged_at', { ascending: true })

  // Group by date
  const byDate: Record<string, { calories: number; protein: number }> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().split('T')[0]
    byDate[key] = { calories: 0, protein: 0 }
  }

  for (const e of (entries ?? [])) {
    const key = e.logged_at.split('T')[0]
    if (byDate[key]) {
      byDate[key].calories += e.calories ?? 0
      byDate[key].protein += Number(e.protein_g ?? 0)
    }
  }

  const days = Object.entries(byDate).map(([date, totals]) => ({
    date,
    label: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    ...totals,
  }))

  const calGoal = goals?.calories_goal ?? 2000
  const maxCals = Math.max(...days.map((d) => d.calories), calGoal)

  const totalLogged = days.filter((d) => d.calories > 0).length
  const avgCals = totalLogged > 0
    ? Math.round(days.reduce((s, d) => s + d.calories, 0) / totalLogged)
    : 0

  return (
    <div
      className="min-h-screen pb-[calc(64px+env(safe-area-inset-bottom)+16px)]"
      style={{ background: '#F7F6F3' }}
    >
      <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-4">
        <Link
          href="/bite"
          className="w-9 h-9 rounded-full bg-surface-card border border-surface-border flex items-center justify-center active:scale-95 shadow-bite-card"
        >
          <ChevronLeft className="w-4 h-4 text-ink" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-ink">Progress</h1>
          <p className="text-ink-tertiary text-xs mt-0.5">Last 7 days</p>
        </div>
      </header>

      <div className="px-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-card rounded-2xl p-4 shadow-bite-card">
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">Days logged</p>
            <p className="text-3xl font-bold text-ink mt-1">{totalLogged}<span className="text-base text-ink-tertiary">/7</span></p>
          </div>
          <div className="bg-surface-card rounded-2xl p-4 shadow-bite-card">
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">Avg calories</p>
            <p className="text-3xl font-bold text-ink mt-1">{avgCals}</p>
          </div>
        </div>

        {/* 7-day calorie bars */}
        <div className="bg-surface-card rounded-2xl p-4 shadow-bite-card">
          <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-4">Calories / day</p>
          <div className="flex items-end justify-between gap-1.5 h-28">
            {days.map((day) => {
              const height = maxCals > 0 ? (day.calories / maxCals) * 100 : 0
              const onGoal = day.calories > 0 && Math.abs(day.calories - calGoal) / calGoal < 0.1
              const over = day.calories > calGoal * 1.1
              const color = over ? '#F59E0B' : onGoal ? '#10B981' : day.calories > 0 ? '#10B981' : '#E8E5DE'
              const isToday = day.date === new Date().toISOString().split('T')[0]

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  {day.calories > 0 && (
                    <span className="text-[10px] text-ink-tertiary">{day.calories}</span>
                  )}
                  <div className="w-full rounded-t-lg transition-all duration-500" style={{
                    height: `${Math.max(height, day.calories > 0 ? 8 : 3)}%`,
                    background: color,
                    opacity: isToday ? 1 : 0.7,
                  }} />
                  <span className={`text-[11px] font-medium ${isToday ? 'text-bite' : 'text-ink-tertiary'}`}>
                    {day.label}
                  </span>
                </div>
              )
            })}
          </div>
          {/* Goal line label */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-border">
            <div className="w-3 h-0.5 bg-bite" />
            <span className="text-xs text-ink-tertiary">Goal: {calGoal} kcal</span>
          </div>
        </div>

        {/* Coming soon note */}
        <div className="bg-surface-card rounded-2xl p-4 shadow-bite-card">
          <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-1">Upcoming</p>
          <p className="text-ink-secondary text-sm">
            Weekly macro trends, protein streaks, water consistency, and Apple Health sync are on the roadmap.
          </p>
        </div>
      </div>
    </div>
  )
}
