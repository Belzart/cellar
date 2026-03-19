// ============================================================
// Cellar — Core Types
// These mirror the database schema + add app-layer helpers
// ============================================================

// ── Vibe System ────────────────────────────────────────────

export type OverallReaction = 'obsessed' | 'loved_it' | 'liked_it' | 'okay' | 'not_for_me'

export const REACTION_LABELS: Record<OverallReaction, string> = {
  obsessed: 'Obsessed',
  loved_it: 'Loved it',
  liked_it: 'Liked it',
  okay: 'Okay',
  not_for_me: 'Not for me',
}

export const REACTION_WEIGHT: Record<OverallReaction, number> = {
  obsessed: 5,
  loved_it: 4,
  liked_it: 3,
  okay: 2,
  not_for_me: 1,
}

export const VIBE_TAGS = [
  'bold', 'soft', 'smooth', 'sharp', 'dry', 'juicy', 'rich', 'light',
  'flat', 'oaky', 'elegant', 'cozy', 'serious', 'fun', 'forgettable',
  'special', 'too_soft', 'too_heavy', 'too_dry', 'too_sharp', 'too_watery',
  'structured', 'delicate', 'complex', 'simple', 'powerful', 'refreshing',
  'warming', 'surprising',
] as const

export type VibeTag = typeof VIBE_TAGS[number]

// ──────────────────────────────────────────────────────────

export type WineStyle =
  | 'red'
  | 'white'
  | 'rosé'
  | 'sparkling'
  | 'dessert'
  | 'fortified'
  | 'orange'
  | 'other'

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type ImageType = 'label' | 'shelf' | 'other'
export type RecommendationTier = 'best_match' | 'safe_bet' | 'wildcard' | 'avoid'
export type InsightConfidence = 'high' | 'medium' | 'low'
export type InsightType = 'love' | 'like' | 'dislike' | 'trending'

export interface BlendComponent {
  varietal: string
  percentage?: number
}

// ─── Database Row Types ────────────────────────────────────

export interface UserProfile {
  id: string
  email: string | null
  display_name: string | null
  cellar_name: string | null   // e.g. "Ryan's Cellar", defaults to "My Cellar" in UI
  created_at: string
  updated_at: string
}

export interface CellarInventory {
  id: string
  user_id: string
  wine_id: string
  quantity: number
  purchase_date: string | null
  purchase_price_cents: number | null
  purchase_currency: string
  storage_note: string | null
  added_at: string
  updated_at: string
}

export interface CellarInventoryWithWine extends CellarInventory {
  wine: Wine
  signed_image_url?: string
}

export interface Wine {
  id: string
  canonical_name: string
  producer: string | null
  wine_name: string | null
  vintage: number | null
  region: string | null
  country: string | null
  appellation: string | null
  varietal: string | null
  blend_components: BlendComponent[]
  style: WineStyle | null
  normalized_search_text: string | null
  primary_label_image_url: string | null
  created_at: string
  updated_at: string
}

export interface WineAlias {
  id: string
  wine_id: string
  raw_name: string
  source: 'ocr' | 'manual' | 'api'
  confidence: number
  created_at: string
}

export interface UploadedImage {
  id: string
  user_id: string
  type: ImageType
  storage_path: string
  storage_bucket: string
  original_filename: string | null
  mime_type: string | null
  width: number | null
  height: number | null
  file_size_bytes: number | null
  uploaded_at: string
}

export interface ExtractionJob {
  id: string
  user_id: string
  uploaded_image_id: string
  job_type: 'label' | 'shelf'
  status: JobStatus
  raw_model_output: unknown | null
  parsed_output: ExtractedWineData | null
  confidence: number | null
  error_message: string | null
  retry_count: number
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface Tasting {
  id: string
  user_id: string
  wine_id: string
  uploaded_image_id: string | null
  tasted_at: string
  location_text: string | null
  rating: number | null
  notes: string | null
  overall_reaction: OverallReaction | null
  vibe_tags: string[]
  memory_note: string | null
  body_score: number | null
  would_drink_again: boolean | null
  is_favorite: boolean
  price_paid_cents: number | null
  price_currency: string
  created_at: string
  updated_at: string
}

export interface TastingWithWine extends Tasting {
  wine: Wine
}

export interface TasteProfileSnapshot {
  id: string
  user_id: string
  computed_at: string
  tasting_count: number
  preferred_varietals: VarietalPreference[]
  preferred_regions: RegionPreference[]
  preferred_styles: StylePreference[]
  disliked_patterns: DislikedPattern[]
  insights: TasteInsight[]
  raw_stats: unknown | null
}

export interface VarietalPreference {
  varietal: string
  avg_rating: number
  count: number
  weight: number
}

export interface RegionPreference {
  region: string
  country?: string
  avg_rating: number
  count: number
  weight: number
}

export interface StylePreference {
  style: WineStyle
  avg_rating: number
  count: number
  percentage: number
}

export interface DislikedPattern {
  type: 'varietal' | 'region' | 'style'
  value: string
  avg_rating: number
  count: number
}

export interface TasteInsight {
  type: InsightType
  text: string
  confidence: InsightConfidence
  supporting_count: number
}

export interface RecommendationSession {
  id: string
  user_id: string
  uploaded_image_id: string | null
  session_type: 'shelf' | 'manual'
  status: JobStatus
  model_version: string | null
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface RecommendationCandidate {
  id: string
  session_id: string
  candidate_name_raw: string
  candidate_producer_raw: string | null
  candidate_vintage_raw: number | null
  candidate_varietal_raw: string | null
  candidate_region_raw: string | null
  matched_wine_id: string | null
  match_confidence: number
  palate_score: number
  final_score: number
  recommendation_tier: RecommendationTier | null
  explanation_text: string | null
  extracted_data: unknown
  rank_position: number | null
  created_at: string
}

// ─── AI Extraction Types ───────────────────────────────────

export interface ExtractedWineData {
  producer?: string
  wine_name?: string
  vintage?: number
  region?: string
  country?: string
  appellation?: string
  varietal?: string
  blend_components?: BlendComponent[]
  style?: WineStyle
  confidence: number           // 0-1: overall extraction confidence
  confidence_notes?: string    // human-readable notes on confidence
  canonical_name_suggestion?: string
}

export interface ShelfCandidate {
  candidate_name_raw: string
  candidate_producer_raw?: string
  candidate_vintage_raw?: number
  candidate_varietal_raw?: string
  candidate_region_raw?: string
}

export interface ShelfExtractionResult {
  candidates: ShelfCandidate[]
  image_quality: 'good' | 'fair' | 'poor'
  confidence_notes: string
}

// ─── App-layer Composite Types ─────────────────────────────

export interface WineWithTastings extends Wine {
  tastings: Tasting[]
  tasting_count: number
  avg_rating: number | null
  last_tasted_at: string | null
  is_favorite: boolean
  signed_image_url?: string   // pre-signed for display in cards
  inventory?: CellarInventory // if in My Bottles
}

export interface RecommendationSessionWithCandidates extends RecommendationSession {
  candidates: RecommendationCandidate[]
  shelf_image_url?: string
}

// ─── Form / Action Input Types ─────────────────────────────

export interface SaveTastingInput {
  extracted: ExtractedWineData
  uploaded_image_id?: string
  // User-edited fields (override extraction)
  producer?: string
  wine_name?: string
  vintage?: number
  region?: string
  country?: string
  varietal?: string
  style?: WineStyle
  canonical_name?: string
  // Tasting details — legacy
  rating?: number
  notes?: string
  would_drink_again?: boolean
  // Vibe system
  overall_reaction?: OverallReaction
  vibe_tags?: string[]
  memory_note?: string
  body_score?: number
  // Context
  location_text?: string
  tasted_at?: string
  price_paid_cents?: number
  is_favorite?: boolean
}

export interface WineMatchResult {
  wine: Wine | null
  confidence: number          // 0-1
  match_type: 'exact' | 'fuzzy' | 'none'
  similarity_score?: number
}
