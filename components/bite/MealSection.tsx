import Link from 'next/link'
import { Plus } from 'lucide-react'
import { MealEntry, MealType, MEAL_TYPE_LABELS, MEAL_TYPE_EMOJI } from '@/lib/types/nutrition'
import FoodLogItem from './FoodLogItem'

interface MealSectionProps {
  mealType: MealType
  entries: MealEntry[]
}

export default function MealSection({ mealType, entries }: MealSectionProps) {
  const totalCals = entries.reduce((s, e) => s + e.calories, 0)
  const label = MEAL_TYPE_LABELS[mealType]
  const emoji = MEAL_TYPE_EMOJI[mealType]

  return (
    <div className="bg-surface-card rounded-2xl overflow-hidden shadow-bite-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <span className="text-base">{emoji}</span>
          <span className="text-sm font-semibold text-ink">{label}</span>
          {entries.length > 0 && (
            <span className="text-xs text-ink-tertiary ml-1">{totalCals} kcal</span>
          )}
        </div>
        <Link
          href={`/bite/log?meal=${mealType}`}
          className="w-7 h-7 rounded-full bg-bite/10 flex items-center justify-center active:scale-90 transition-transform"
        >
          <Plus className="w-4 h-4 text-bite" />
        </Link>
      </div>

      {/* Entries */}
      {entries.length > 0 ? (
        <div className="px-1 py-1">
          {entries.map((entry) => (
            <FoodLogItem key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <div className="px-4 py-4">
          <p className="text-ink-tertiary text-sm">Nothing logged yet</p>
        </div>
      )}
    </div>
  )
}
