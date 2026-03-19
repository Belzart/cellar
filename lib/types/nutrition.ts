// ============================================================
// Bite — Nutrition Types
// ============================================================

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type MealSource = 'manual' | 'ai_text' | 'ai_photo' | 'barcode' | 'saved_food' | 'saved_meal'

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export const MEAL_TYPE_EMOJI: Record<MealType, string> = {
  breakfast: '☀️',
  lunch: '🌤️',
  dinner: '🌙',
  snack: '🫐',
}

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

// ── Database Row Types ────────────────────────────────────────

export interface NutritionGoals {
  id: string
  user_id: string
  calories_goal: number
  protein_g_goal: number
  carbs_g_goal: number
  fat_g_goal: number
  water_ml_goal: number
  steps_goal: number
  created_at: string
  updated_at: string
}

export interface MealEntry {
  id: string
  user_id: string
  logged_at: string
  meal_type: MealType
  source: MealSource
  raw_input: string | null
  analysis_job_id: string | null
  name: string
  serving_description: string | null
  quantity: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number | null
  sugar_g: number | null
  sodium_mg: number | null
  notes: string | null
  uploaded_image_id: string | null
  saved_food_id: string | null
  created_at: string
  updated_at: string
}

export interface MealAnalysisJob {
  id: string
  user_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  source: 'text' | 'photo'
  raw_input: string | null
  uploaded_image_id: string | null
  raw_ai_output: unknown
  parsed_result: MealAnalysisResult | null
  confidence: number | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface SavedFood {
  id: string
  user_id: string
  name: string
  serving_description: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number | null
  sugar_g: number | null
  sodium_mg: number | null
  is_favorite: boolean
  use_count: number
  last_used_at: string | null
  created_at: string
}

export interface WaterEntry {
  id: string
  user_id: string
  amount_ml: number
  logged_at: string
  created_at: string
}

export interface StepEntry {
  id: string
  user_id: string
  steps: number
  date: string
  source: 'manual' | 'health_sync'
  created_at: string
}

// ── AI Analysis ───────────────────────────────────────────────

export interface MealAnalysisItem {
  name: string
  serving_description: string
  quantity: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number | null
  sugar_g?: number | null
}

export interface MealAnalysisResult {
  meal_name?: string
  items: MealAnalysisItem[]
  confidence: number
  confidence_notes?: string
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
}

// ── Aggregated Data ───────────────────────────────────────────

export interface DayTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  water_ml: number
  steps: number
}

export interface DaySummary {
  date: string
  totals: DayTotals
  goals: NutritionGoals
  entries: MealEntry[]
  waterEntries: WaterEntry[]
  stepEntry: StepEntry | null
}

// ── Input Types ───────────────────────────────────────────────

export interface SaveMealEntryInput {
  meal_type: MealType
  source: MealSource
  raw_input?: string
  analysis_job_id?: string
  name: string
  serving_description?: string
  quantity?: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  sugar_g?: number
  sodium_mg?: number
  notes?: string
  uploaded_image_id?: string
  saved_food_id?: string
  logged_at?: string
}

export interface UpdateGoalsInput {
  calories_goal?: number
  protein_g_goal?: number
  carbs_g_goal?: number
  fat_g_goal?: number
  water_ml_goal?: number
  steps_goal?: number
}
