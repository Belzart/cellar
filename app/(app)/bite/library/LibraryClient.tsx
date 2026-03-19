'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { SavedFood, MealEntry } from '@/lib/types/nutrition'
import { saveMealEntry, toggleFavoriteFood, deleteSavedFood } from '@/lib/actions/nutrition'
import { cn } from '@/lib/utils'

interface LibraryClientProps {
  savedFoods: SavedFood[]
  recentEntries: MealEntry[]
}

export default function LibraryClient({ savedFoods, recentEntries }: LibraryClientProps) {
  const router = useRouter()
  const [tab, setTab] = useState<'saved' | 'recent'>('saved')
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [logging, setLogging] = useState<string | null>(null)

  const filteredSaved = savedFoods.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  const uniqueRecent = recentEntries.filter(
    (entry, idx, arr) =>
      arr.findIndex((e) => e.name.toLowerCase() === entry.name.toLowerCase()) === idx
  )

  async function relogFood(food: SavedFood) {
    setLogging(food.id)
    startTransition(async () => {
      try {
        await saveMealEntry({
          meal_type: 'snack',
          source: 'saved_food',
          name: food.name,
          serving_description: food.serving_description ?? undefined,
          calories: food.calories,
          protein_g: food.protein_g,
          carbs_g: food.carbs_g,
          fat_g: food.fat_g,
          fiber_g: food.fiber_g ?? undefined,
          sugar_g: food.sugar_g ?? undefined,
          saved_food_id: food.id,
        })
        router.push('/bite')
      } finally {
        setLogging(null)
      }
    })
  }

  async function relogEntry(entry: MealEntry) {
    setLogging(entry.id)
    startTransition(async () => {
      try {
        await saveMealEntry({
          meal_type: entry.meal_type,
          source: 'saved_food',
          name: entry.name,
          serving_description: entry.serving_description ?? undefined,
          calories: entry.calories,
          protein_g: entry.protein_g,
          carbs_g: entry.carbs_g,
          fat_g: entry.fat_g,
        })
        router.push('/bite')
      } finally {
        setLogging(null)
      }
    })
  }

  function handleToggleFav(id: string, current: boolean) {
    startTransition(async () => {
      await toggleFavoriteFood(id, !current)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteSavedFood(id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        className="w-full bg-surface-card border border-surface-border rounded-2xl px-4 py-3 text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-bite/50 focus:ring-1 focus:ring-bite/20 text-base shadow-bite-card"
        placeholder="Search foods…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Tab selector */}
      <div className="flex bg-surface-card border border-surface-border rounded-2xl p-1 shadow-bite-card">
        <button
          onClick={() => setTab('saved')}
          className={cn(
            'flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-150',
            tab === 'saved' ? 'bg-ink text-surface-card' : 'text-ink-secondary'
          )}
        >
          Saved ({savedFoods.length})
        </button>
        <button
          onClick={() => setTab('recent')}
          className={cn(
            'flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-150',
            tab === 'recent' ? 'bg-ink text-surface-card' : 'text-ink-secondary'
          )}
        >
          Recent
        </button>
      </div>

      {/* Saved foods */}
      {tab === 'saved' && (
        <div>
          {filteredSaved.length === 0 ? (
            <div className="bg-surface-card rounded-2xl p-8 text-center shadow-bite-card">
              <p className="text-ink-secondary text-sm">No saved foods yet</p>
              <p className="text-ink-tertiary text-xs mt-1">
                When you log food, tap &ldquo;Save&rdquo; to add it here
              </p>
              <Link href="/bite/log" className="inline-block mt-4 bg-bite text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-transform">
                Log something
              </Link>
            </div>
          ) : (
            <div className="bg-surface-card rounded-2xl overflow-hidden shadow-bite-card">
              {filteredSaved.map((food, i) => (
                <div
                  key={food.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3',
                    i < filteredSaved.length - 1 && 'border-b border-surface-border'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-ink text-sm font-medium truncate">{food.name}</p>
                    <p className="text-ink-tertiary text-xs mt-0.5">
                      {food.calories} kcal · {food.serving_description ?? '1 serving'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleFav(food.id, food.is_favorite)}
                      disabled={isPending}
                      className="active:scale-90 transition-transform"
                    >
                      <Star className={cn('w-4 h-4', food.is_favorite ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-ink-tertiary')} />
                    </button>
                    <button
                      onClick={() => relogFood(food)}
                      disabled={logging === food.id || isPending}
                      className="bg-bite/10 text-bite text-xs font-semibold px-3 py-1.5 rounded-xl active:scale-95 transition-transform disabled:opacity-40"
                    >
                      {logging === food.id ? '…' : '+ Add'}
                    </button>
                    <button
                      onClick={() => handleDelete(food.id)}
                      disabled={isPending}
                      className="active:scale-90 transition-transform"
                    >
                      <Trash2 className="w-4 h-4 text-ink-tertiary" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent entries */}
      {tab === 'recent' && (
        <div>
          {uniqueRecent.length === 0 ? (
            <div className="bg-surface-card rounded-2xl p-8 text-center shadow-bite-card">
              <p className="text-ink-secondary text-sm">No recent entries</p>
              <Link href="/bite/log" className="inline-block mt-4 bg-bite text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-transform">
                Log something
              </Link>
            </div>
          ) : (
            <div className="bg-surface-card rounded-2xl overflow-hidden shadow-bite-card">
              {uniqueRecent.map((entry, i) => (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3',
                    i < uniqueRecent.length - 1 && 'border-b border-surface-border'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-ink text-sm font-medium truncate">{entry.name}</p>
                    <p className="text-ink-tertiary text-xs mt-0.5">
                      {entry.calories} kcal
                    </p>
                  </div>
                  <button
                    onClick={() => relogEntry(entry)}
                    disabled={logging === entry.id || isPending}
                    className="bg-surface-elevated text-ink-secondary text-xs font-semibold px-3 py-1.5 rounded-xl active:scale-95 transition-transform disabled:opacity-40"
                  >
                    {logging === entry.id ? '…' : '+ Log again'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
