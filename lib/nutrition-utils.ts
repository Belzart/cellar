import { MealEntry, MealType, MEAL_TYPES } from '@/lib/types/nutrition'

export function groupEntriesByMeal(entries: MealEntry[]): Record<MealType, MealEntry[]> {
  return MEAL_TYPES.reduce((acc, type) => {
    acc[type] = entries.filter((e) => e.meal_type === type)
    return acc
  }, {} as Record<MealType, MealEntry[]>)
}
