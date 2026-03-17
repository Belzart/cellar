import { ExtractedWineData, Wine } from '@/lib/types'
import { normalizeText } from '@/lib/utils'

// ── Build a canonical name from extracted data ────────────
export function buildCanonicalName(data: ExtractedWineData): string {
  if (data.canonical_name_suggestion) {
    return data.canonical_name_suggestion.trim()
  }

  const parts: string[] = []
  if (data.producer) parts.push(data.producer.trim())
  if (data.wine_name) parts.push(data.wine_name.trim())
  if (data.vintage) parts.push(String(data.vintage))

  return parts.join(' ') || 'Unknown Wine'
}

// ── Build a normalized search string from any wine-like object ──
export function buildNormalizedSearchText(params: {
  canonical_name?: string | null
  producer?: string | null
  wine_name?: string | null
  region?: string | null
  country?: string | null
  appellation?: string | null
  varietal?: string | null
  vintage?: number | null
}): string {
  return normalizeText(
    [
      params.canonical_name,
      params.producer,
      params.wine_name,
      params.region,
      params.country,
      params.appellation,
      params.varietal,
      params.vintage?.toString(),
    ]
      .filter(Boolean)
      .join(' ')
  )
}

// ── Compute similarity score between extracted data and a wine record ──
// Returns 0-1. Used for fuzzy matching when pg_trgm isn't available client-side.
export function computeSimilarity(
  extracted: ExtractedWineData,
  wine: Wine
): number {
  let score = 0
  let weight = 0

  // Producer match is strongest signal
  if (extracted.producer && wine.producer) {
    const sim = stringSimilarity(
      normalizeText(extracted.producer),
      normalizeText(wine.producer)
    )
    score += sim * 0.35
    weight += 0.35
  }

  // Wine name
  if (extracted.wine_name && wine.wine_name) {
    const sim = stringSimilarity(
      normalizeText(extracted.wine_name),
      normalizeText(wine.wine_name)
    )
    score += sim * 0.25
    weight += 0.25
  }

  // Vintage — exact match only
  if (extracted.vintage && wine.vintage) {
    score += (extracted.vintage === wine.vintage ? 1 : 0) * 0.2
    weight += 0.2
  }

  // Region
  if (extracted.region && wine.region) {
    const sim = stringSimilarity(
      normalizeText(extracted.region),
      normalizeText(wine.region)
    )
    score += sim * 0.1
    weight += 0.1
  }

  // Varietal
  if (extracted.varietal && wine.varietal) {
    const sim = stringSimilarity(
      normalizeText(extracted.varietal),
      normalizeText(wine.varietal)
    )
    score += sim * 0.1
    weight += 0.1
  }

  return weight > 0 ? score / weight : 0
}

// ── Simple string similarity (Sørensen–Dice on bigrams) ──
// Good enough for wine name matching without a Postgres connection.
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0

  const aGrams = new Set(bigrams(a))
  const bGrams = new Set(bigrams(b))
  let intersection = 0
  for (const g of aGrams) {
    if (bGrams.has(g)) intersection++
  }

  return (2 * intersection) / (aGrams.size + bGrams.size)
}

function bigrams(str: string): string[] {
  const grams: string[] = []
  for (let i = 0; i < str.length - 1; i++) {
    grams.push(str.slice(i, i + 2))
  }
  return grams
}
