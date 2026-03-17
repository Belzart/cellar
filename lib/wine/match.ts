import { createServiceClient } from '@/lib/supabase/server'
import { ExtractedWineData, Wine, WineMatchResult } from '@/lib/types'
import { buildNormalizedSearchText, computeSimilarity } from './canonicalize'
import { normalizeText } from '@/lib/utils'

// Confidence thresholds
const EXACT_MATCH_THRESHOLD = 0.95
const FUZZY_MATCH_THRESHOLD = 0.65
const MAX_CANDIDATES = 10

// ── Main match function ───────────────────────────────────
// Strategy:
// 1. Try exact match on normalized_search_text
// 2. Try pg_trgm fuzzy search
// 3. Rerank top candidates with client-side similarity scoring
// Returns the best match and its confidence.
export async function findWineMatch(
  extracted: ExtractedWineData
): Promise<WineMatchResult> {
  const supabase = createServiceClient()

  const searchText = buildNormalizedSearchText({
    producer: extracted.producer,
    wine_name: extracted.wine_name,
    region: extracted.region,
    country: extracted.country,
    varietal: extracted.varietal,
    vintage: extracted.vintage,
  })

  if (!searchText.trim()) {
    return { wine: null, confidence: 0, match_type: 'none' }
  }

  // Step 1: Fuzzy search via ilike on normalized_search_text
  // (pg_trgm similarity requires a custom RPC — using ilike as pragmatic fallback)
  const { data: candidates } = await supabase
    .from('wines')
    .select('*')
    .textSearch('normalized_search_text', searchText.split(' ').join(' | '), {
      type: 'plain',
    })
    .limit(MAX_CANDIDATES)

  if (!candidates || candidates.length === 0) {
    // Fallback: producer-only search
    if (extracted.producer) {
      const { data: byProducer } = await supabase
        .from('wines')
        .select('*')
        .ilike('producer', `%${extracted.producer}%`)
        .limit(MAX_CANDIDATES)

      if (!byProducer || byProducer.length === 0) {
        return { wine: null, confidence: 0, match_type: 'none' }
      }

      return rankCandidates(extracted, byProducer as Wine[])
    }

    return { wine: null, confidence: 0, match_type: 'none' }
  }

  return rankCandidates(extracted, candidates as Wine[])
}

// ── Rank candidates by similarity ────────────────────────
function rankCandidates(
  extracted: ExtractedWineData,
  candidates: Wine[]
): WineMatchResult {
  let best: Wine | null = null
  let bestScore = 0

  for (const candidate of candidates) {
    const score = computeSimilarity(extracted, candidate)
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }

  if (!best || bestScore < FUZZY_MATCH_THRESHOLD) {
    return { wine: null, confidence: bestScore, match_type: 'none' }
  }

  const matchType = bestScore >= EXACT_MATCH_THRESHOLD ? 'exact' : 'fuzzy'
  return { wine: best, confidence: bestScore, match_type: matchType, similarity_score: bestScore }
}

// ── Check alias table for a raw name match ────────────────
export async function findByAlias(rawName: string): Promise<Wine | null> {
  const supabase = createServiceClient()
  const normalized = normalizeText(rawName)

  const { data } = await supabase
    .from('wine_aliases')
    .select('wine_id, wines(*)')
    .ilike('raw_name', `%${normalized}%`)
    .order('confidence', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null
  return (data as { wines: Wine }).wines ?? null
}
