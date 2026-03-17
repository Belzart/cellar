import {
  TastingWithWine,
  TasteProfileSnapshot,
  VarietalPreference,
  RegionPreference,
  StylePreference,
  DislikedPattern,
  TasteInsight,
  WineStyle,
  RecommendationCandidate,
} from '@/lib/types'

// ── Thresholds ────────────────────────────────────────────
const MIN_TASTINGS_FOR_ANY_INSIGHT = 3
const MIN_VARIETAL_TASTINGS = 2
const MIN_REGION_TASTINGS = 2
const RECENCY_MONTHS = 6        // tastings within this window get 1.5x weight
const RECENCY_MULTIPLIER = 1.5
const LOVE_THRESHOLD = 4.0      // avg rating ≥ this = "love"
const LIKE_THRESHOLD = 3.5      // avg rating ≥ this = "like"
const DISLIKE_THRESHOLD = 2.5   // avg rating ≤ this = "dislike"
const HIGH_CONFIDENCE_COUNT = 5 // need this many tastings for "high" confidence

// ── Main computation ──────────────────────────────────────
export function computeTasteProfile(
  tastings: TastingWithWine[],
  userId: string
): TasteProfileSnapshot {
  const now = new Date()

  const empty: TasteProfileSnapshot = {
    id: '',
    user_id: userId,
    computed_at: now.toISOString(),
    tasting_count: tastings.length,
    preferred_varietals: [],
    preferred_regions: [],
    preferred_styles: [],
    disliked_patterns: [],
    insights: [],
    raw_stats: null,
  }

  if (tastings.length < MIN_TASTINGS_FOR_ANY_INSIGHT) return empty

  // Only use tastings with ratings
  const rated = tastings.filter((t) => t.rating != null)
  if (rated.length < MIN_TASTINGS_FOR_ANY_INSIGHT) return empty

  // Apply recency weighting
  const weighted = rated.map((t) => {
    const monthsAgo = monthsBetween(new Date(t.tasted_at), now)
    const recencyWeight = monthsAgo <= RECENCY_MONTHS ? RECENCY_MULTIPLIER : 1.0
    return { ...t, w: recencyWeight }
  })

  const preferred_varietals = computeVarietalPrefs(weighted)
  const preferred_regions = computeRegionPrefs(weighted)
  const preferred_styles = computeStylePrefs(weighted)
  const disliked_patterns = computeDisliked(preferred_varietals, preferred_regions, preferred_styles)
  const insights = generateInsights(preferred_varietals, preferred_regions, preferred_styles, weighted.length)

  return {
    ...empty,
    preferred_varietals,
    preferred_regions,
    preferred_styles,
    disliked_patterns,
    insights,
    raw_stats: {
      total_rated: rated.length,
      avg_rating_overall: avg(rated.map((t) => t.rating!)),
    },
  }
}

// ── Varietal preferences ──────────────────────────────────
function computeVarietalPrefs(
  tastings: Array<TastingWithWine & { w: number }>
): VarietalPreference[] {
  const map = new Map<string, { ratings: number[]; weights: number[] }>()

  for (const t of tastings) {
    const v = t.wine?.varietal
    if (!v || !t.rating) continue
    if (!map.has(v)) map.set(v, { ratings: [], weights: [] })
    map.get(v)!.ratings.push(t.rating)
    map.get(v)!.weights.push(t.w)
  }

  const prefs: VarietalPreference[] = []
  for (const [varietal, data] of map) {
    if (data.ratings.length < MIN_VARIETAL_TASTINGS) continue
    const avg_rating = weightedAvg(data.ratings, data.weights)
    // weight = avg_rating × log(count + 1) — balances quality vs quantity
    const weight = avg_rating * Math.log(data.ratings.length + 1)
    prefs.push({ varietal, avg_rating: round1(avg_rating), count: data.ratings.length, weight })
  }

  return prefs.sort((a, b) => b.weight - a.weight)
}

// ── Region preferences ────────────────────────────────────
function computeRegionPrefs(
  tastings: Array<TastingWithWine & { w: number }>
): RegionPreference[] {
  const map = new Map<string, { ratings: number[]; weights: number[]; country?: string }>()

  for (const t of tastings) {
    const r = t.wine?.region
    if (!r || !t.rating) continue
    if (!map.has(r)) map.set(r, { ratings: [], weights: [], country: t.wine?.country ?? undefined })
    map.get(r)!.ratings.push(t.rating)
    map.get(r)!.weights.push(t.w)
  }

  const prefs: RegionPreference[] = []
  for (const [region, data] of map) {
    if (data.ratings.length < MIN_REGION_TASTINGS) continue
    const avg_rating = weightedAvg(data.ratings, data.weights)
    const weight = avg_rating * Math.log(data.ratings.length + 1)
    prefs.push({
      region,
      country: data.country,
      avg_rating: round1(avg_rating),
      count: data.ratings.length,
      weight,
    })
  }

  return prefs.sort((a, b) => b.weight - a.weight)
}

// ── Style preferences ─────────────────────────────────────
function computeStylePrefs(
  tastings: Array<TastingWithWine & { w: number }>
): StylePreference[] {
  const map = new Map<WineStyle, { ratings: number[] }>()

  for (const t of tastings) {
    const s = t.wine?.style as WineStyle | undefined
    if (!s || !t.rating) continue
    if (!map.has(s)) map.set(s, { ratings: [] })
    map.get(s)!.ratings.push(t.rating)
  }

  const total = tastings.filter((t) => t.wine?.style && t.rating).length
  const prefs: StylePreference[] = []
  for (const [style, data] of map) {
    const avg_rating = avg(data.ratings)
    prefs.push({
      style,
      avg_rating: round1(avg_rating),
      count: data.ratings.length,
      percentage: total > 0 ? Math.round((data.ratings.length / total) * 100) : 0,
    })
  }

  return prefs.sort((a, b) => b.count - a.count)
}

// ── Disliked patterns ─────────────────────────────────────
function computeDisliked(
  varietals: VarietalPreference[],
  regions: RegionPreference[],
  styles: StylePreference[]
): DislikedPattern[] {
  const patterns: DislikedPattern[] = []

  for (const v of varietals) {
    if (v.avg_rating <= DISLIKE_THRESHOLD && v.count >= MIN_VARIETAL_TASTINGS) {
      patterns.push({ type: 'varietal', value: v.varietal, avg_rating: v.avg_rating, count: v.count })
    }
  }
  for (const r of regions) {
    if (r.avg_rating <= DISLIKE_THRESHOLD && r.count >= MIN_REGION_TASTINGS) {
      patterns.push({ type: 'region', value: r.region, avg_rating: r.avg_rating, count: r.count })
    }
  }
  for (const s of styles) {
    if (s.avg_rating <= DISLIKE_THRESHOLD && s.count >= MIN_VARIETAL_TASTINGS) {
      patterns.push({ type: 'style', value: s.style, avg_rating: s.avg_rating, count: s.count })
    }
  }

  return patterns
}

// ── Generate human-readable insights ─────────────────────
function generateInsights(
  varietals: VarietalPreference[],
  regions: RegionPreference[],
  styles: StylePreference[],
  totalRated: number
): TasteInsight[] {
  const insights: TasteInsight[] = []

  // Top varietal love
  const topVarietal = varietals.find((v) => v.avg_rating >= LOVE_THRESHOLD)
  if (topVarietal) {
    insights.push({
      type: 'love',
      text: `You consistently love ${topVarietal.varietal}`,
      confidence: topVarietal.count >= HIGH_CONFIDENCE_COUNT ? 'high' : 'medium',
      supporting_count: topVarietal.count,
    })
  }

  // Top region love
  const topRegion = regions.find((r) => r.avg_rating >= LOVE_THRESHOLD)
  if (topRegion) {
    const loc = topRegion.country ? `${topRegion.region}, ${topRegion.country}` : topRegion.region
    insights.push({
      type: 'love',
      text: `You tend to rate ${loc} wines very highly`,
      confidence: topRegion.count >= HIGH_CONFIDENCE_COUNT ? 'high' : 'medium',
      supporting_count: topRegion.count,
    })
  }

  // Dominant style
  const topStyle = styles[0]
  if (topStyle && topStyle.percentage >= 40) {
    insights.push({
      type: 'like',
      text: `Most of your wines are ${topStyle.style} — you clearly know what you like`,
      confidence: totalRated >= HIGH_CONFIDENCE_COUNT ? 'high' : 'medium',
      supporting_count: topStyle.count,
    })
  }

  // Second varietal like
  const likeVarietal = varietals.find(
    (v) => v.avg_rating >= LIKE_THRESHOLD && v.avg_rating < LOVE_THRESHOLD && v.count >= MIN_VARIETAL_TASTINGS
  )
  if (likeVarietal) {
    insights.push({
      type: 'like',
      text: `${likeVarietal.varietal} is a reliable go-to for you`,
      confidence: 'medium',
      supporting_count: likeVarietal.count,
    })
  }

  // Dislike
  const dislikedVarietal = varietals.find(
    (v) => v.avg_rating <= DISLIKE_THRESHOLD && v.count >= MIN_VARIETAL_TASTINGS
  )
  if (dislikedVarietal) {
    insights.push({
      type: 'dislike',
      text: `You tend to dislike ${dislikedVarietal.varietal}`,
      confidence: 'medium',
      supporting_count: dislikedVarietal.count,
    })
  }

  return insights
}

// ── Score a shelf candidate against a taste profile ───────
// Returns 0-1 palate score.
export function scoreCandidate(
  candidate: Pick<RecommendationCandidate,
    'candidate_varietal_raw' | 'candidate_region_raw'>,
  profile: TasteProfileSnapshot
): number {
  let score = 0.5  // neutral baseline
  let adjustments = 0

  if (candidate.candidate_varietal_raw) {
    const varPref = profile.preferred_varietals.find(
      (v) => v.varietal.toLowerCase() === candidate.candidate_varietal_raw!.toLowerCase()
    )
    if (varPref) {
      // Scale avg_rating (1-5) to adjustment (-0.3 to +0.3)
      const adjustment = ((varPref.avg_rating - 3) / 2) * 0.3
      score += adjustment
      adjustments++
    }
  }

  if (candidate.candidate_region_raw) {
    const regPref = profile.preferred_regions.find(
      (r) => r.region.toLowerCase().includes(candidate.candidate_region_raw!.toLowerCase())
        || candidate.candidate_region_raw!.toLowerCase().includes(r.region.toLowerCase())
    )
    if (regPref) {
      const adjustment = ((regPref.avg_rating - 3) / 2) * 0.2
      score += adjustment
      adjustments++
    }
  }

  return Math.max(0, Math.min(1, score))
}

// ── Utilities ─────────────────────────────────────────────
function avg(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function weightedAvg(values: number[], weights: number[]): number {
  if (!values.length) return 0
  const weightSum = weights.reduce((a, b) => a + b, 0)
  if (weightSum === 0) return avg(values)
  return values.reduce((sum, v, i) => sum + v * weights[i], 0) / weightSum
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function monthsBetween(a: Date, b: Date): number {
  return (
    (b.getFullYear() - a.getFullYear()) * 12 +
    (b.getMonth() - a.getMonth())
  )
}
