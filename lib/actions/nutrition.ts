'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  MealEntry,
  NutritionGoals,
  SavedFood,
  WaterEntry,
  StepEntry,
  DaySummary,
  SaveMealEntryInput,
  UpdateGoalsInput,
} from '@/lib/types/nutrition'

// ── Goals ────────────────────────────────────────────────────

export async function getMyGoals(): Promise<NutritionGoals | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('nutrition_goals')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return data ?? null
}

export async function upsertGoals(input: UpdateGoalsInput): Promise<NutritionGoals> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('nutrition_goals')
    .upsert({ user_id: user.id, ...input }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to save goals')

  revalidatePath('/bite')
  revalidatePath('/bite/goals')
  return data as NutritionGoals
}

// ── Day Summary ───────────────────────────────────────────────

export async function getDaySummary(date?: string, tzOffsetMinutes = 0): Promise<DaySummary | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const targetDate = date ?? new Date().toISOString().split('T')[0]

  // Compute UTC range for the LOCAL calendar day.
  // tzOffsetMinutes = browser's getTimezoneOffset() (positive west of UTC, e.g. 480 for PST).
  // Local midnight in UTC = `${targetDate}T00:00:00Z` shifted by tzOffset.
  // Without this, PST users at 11 PM see "tomorrow" because UTC has rolled over.
  const localMidnightUTC = new Date(`${targetDate}T00:00:00.000Z`).getTime() + tzOffsetMinutes * 60000
  const start = new Date(localMidnightUTC).toISOString()
  const end   = new Date(localMidnightUTC + 86400000 - 1).toISOString()

  const [entriesRes, goalsRes, waterRes, stepsRes] = await Promise.all([
    supabase
      .from('meal_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', start)
      .lte('logged_at', end)
      .order('logged_at', { ascending: true }),
    supabase
      .from('nutrition_goals')
      .select('*')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('water_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', start)
      .lte('logged_at', end),
    supabase
      .from('step_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', targetDate)
      .single(),
  ])

  const entries = (entriesRes.data ?? []) as MealEntry[]
  const waterEntries = (waterRes.data ?? []) as WaterEntry[]
  const stepEntry = (stepsRes.data ?? null) as StepEntry | null

  const totals = {
    calories:  entries.reduce((s, e) => s + (e.calories ?? 0), 0),
    protein_g: entries.reduce((s, e) => s + Number(e.protein_g ?? 0), 0),
    carbs_g:   entries.reduce((s, e) => s + Number(e.carbs_g ?? 0), 0),
    fat_g:     entries.reduce((s, e) => s + Number(e.fat_g ?? 0), 0),
    water_ml:  waterEntries.reduce((s, w) => s + w.amount_ml, 0),
    steps:     stepEntry?.steps ?? 0,
  }

  // Default goals if user hasn't set any
  const defaultGoals: NutritionGoals = {
    id: '',
    user_id: user.id,
    calories_goal: 2000,
    protein_g_goal: 150,
    carbs_g_goal: 200,
    fat_g_goal: 65,
    water_ml_goal: 2500,
    steps_goal: 10000,
    created_at: '',
    updated_at: '',
  }

  return {
    date: targetDate,
    totals,
    goals: (goalsRes.data as NutritionGoals) ?? defaultGoals,
    entries,
    waterEntries,
    stepEntry,
  }
}

// ── Meal Entries ──────────────────────────────────────────────

// Returns a result object instead of throwing — server action errors do not
// reliably propagate across the server/client boundary in Next.js 15 production.
// Always return { data, error } so the client can inspect the outcome safely.
export async function saveMealEntry(
  input: SaveMealEntryInput
): Promise<{ data: MealEntry; error: null } | { data: null; error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated — please sign in again.' }

    const { data, error } = await supabase
      .from('meal_entries')
      .insert({
        user_id: user.id,
        logged_at: input.logged_at ?? new Date().toISOString(),
        meal_type: input.meal_type,
        source: input.source,
        raw_input: input.raw_input ?? null,
        analysis_job_id: input.analysis_job_id ?? null,
        name: input.name,
        serving_description: input.serving_description ?? null,
        quantity: input.quantity ?? 1,
        calories: input.calories,
        protein_g: input.protein_g,
        carbs_g: input.carbs_g,
        fat_g: input.fat_g,
        fiber_g: input.fiber_g ?? null,
        sugar_g: input.sugar_g ?? null,
        sodium_mg: input.sodium_mg ?? null,
        notes: input.notes ?? null,
        uploaded_image_id: input.uploaded_image_id ?? null,
        saved_food_id: input.saved_food_id ?? null,
      })
      .select()
      .single()

    if (error || !data) return { data: null, error: error?.message ?? 'Failed to save entry' }

    // Increment saved food use_count (non-critical, fire-and-forget)
    if (input.saved_food_id) {
      const foodId = input.saved_food_id
      supabase
        .from('saved_foods')
        .select('use_count')
        .eq('id', foodId)
        .single()
        .then(({ data: fd }) => {
          if (fd) {
            supabase
              .from('saved_foods')
              .update({ use_count: (fd.use_count ?? 0) + 1, last_used_at: new Date().toISOString() })
              .eq('id', foodId)
              .then(() => {})
          }
        })
    }

    revalidatePath('/bite')
    return { data: data as MealEntry, error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Unexpected error saving entry' }
  }
}

export async function updateMealEntry(
  id: string,
  updates: Partial<Pick<MealEntry, 'name' | 'serving_description' | 'quantity' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'fiber_g' | 'meal_type' | 'notes'>>
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('meal_entries')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/bite')
}

export async function deleteMealEntry(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('meal_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/bite')
}

// ── Saved Foods ───────────────────────────────────────────────

export async function getSavedFoods(): Promise<SavedFood[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('saved_foods')
    .select('*')
    .eq('user_id', user.id)
    .order('use_count', { ascending: false })

  return (data ?? []) as SavedFood[]
}

export async function saveFoodToLibrary(
  entry: Pick<MealEntry, 'name' | 'serving_description' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'fiber_g' | 'sugar_g' | 'sodium_mg'>
): Promise<SavedFood> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('saved_foods')
    .insert({
      user_id: user.id,
      name: entry.name,
      serving_description: entry.serving_description,
      calories: entry.calories,
      protein_g: entry.protein_g,
      carbs_g: entry.carbs_g,
      fat_g: entry.fat_g,
      fiber_g: entry.fiber_g,
      sugar_g: entry.sugar_g,
      sodium_mg: entry.sodium_mg,
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to save food')
  revalidatePath('/bite/library')
  return data as SavedFood
}

export async function toggleFavoriteFood(id: string, is_favorite: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('saved_foods')
    .update({ is_favorite })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/bite/library')
}

export async function deleteSavedFood(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('saved_foods')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/bite/library')
}

// ── Water ─────────────────────────────────────────────────────

export async function logWater(amount_ml: number): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('water_entries').insert({
    user_id: user.id,
    amount_ml,
    logged_at: new Date().toISOString(),
  })

  revalidatePath('/bite')
}

export async function removeLastWater(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('water_entries')
    .select('id')
    .eq('user_id', user.id)
    .gte('logged_at', `${today}T00:00:00.000Z`)
    .order('logged_at', { ascending: false })
    .limit(1)
    .single()

  if (data) {
    await supabase.from('water_entries').delete().eq('id', data.id)
    revalidatePath('/bite')
  }
}

// ── Steps ─────────────────────────────────────────────────────

export async function logSteps(steps: number, date?: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const targetDate = date ?? new Date().toISOString().split('T')[0]

  await supabase.from('step_entries').upsert({
    user_id: user.id,
    steps,
    date: targetDate,
    source: 'manual',
  }, { onConflict: 'user_id,date' })

  revalidatePath('/bite')
}

// ── Recent entries (for quick re-log) ─────────────────────────

export async function getRecentEntries(limit = 10): Promise<MealEntry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('meal_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as MealEntry[]
}

// ── Move Entry to Another Day ─────────────────────────────────

// Reassigns a meal entry to a different calendar date.
// Sets logged_at to local noon of the target date (12:00 local time) so it
// appears correctly on that day regardless of timezone.
// tzOffsetMinutes: browser's getTimezoneOffset() (e.g. 480 for PST).
export async function moveMealEntry(
  id: string,
  toDate: string,
  tzOffsetMinutes = 0
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Noon of the target LOCAL date in UTC
    const localNoonUTC = new Date(`${toDate}T12:00:00.000Z`).getTime() + tzOffsetMinutes * 60000
    const logged_at = new Date(localNoonUTC).toISOString()

    const { error } = await supabase
      .from('meal_entries')
      .update({ logged_at })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return { error: error.message }
    revalidatePath('/bite')
    return { error: null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to move entry' }
  }
}

