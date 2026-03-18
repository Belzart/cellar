'use server'

import { createClient } from '@/lib/supabase/server'
import { Wine, WineWithTastings } from '@/lib/types'
import { buildCanonicalName } from '@/lib/wine/canonicalize'

// ── Get all wines for the authenticated user ──────────────
// "My wines" = wines linked to at least one of my tastings
export async function getMyWines(params?: {
  search?: string
  style?: string
  varietal?: string
  region?: string
  country?: string
  sort?: 'recent' | 'rating' | 'name' | 'vintage'
  favorites?: boolean
  limit?: number
  offset?: number
}): Promise<WineWithTastings[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Build a query that joins wines with my tastings
  let query = supabase
    .from('tastings')
    .select(`
      wine_id,
      rating,
      overall_reaction,
      vibe_tags,
      memory_note,
      body_score,
      is_favorite,
      tasted_at,
      wines (
        id, canonical_name, producer, wine_name, vintage,
        region, country, appellation, varietal, blend_components,
        style, primary_label_image_url, created_at, updated_at
      )
    `)
    .eq('user_id', user.id)

  if (params?.favorites) query = query.eq('is_favorite', true)

  const { data: tastingRows } = await query

  if (!tastingRows) return []

  // Aggregate tastings by wine_id
  // Track: {wine, tasting_count, ratings[], latest_row, is_favorite, last_tasted_at}
  type Acc = {
    wine: Wine
    tasting_count: number
    ratings: number[]
    is_favorite: boolean
    last_tasted_at: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    latest_row: any | null
  }
  const accMap = new Map<string, Acc>()

  for (const row of tastingRows) {
    const wine = row.wines as unknown as Wine
    if (!wine) continue

    if (!accMap.has(wine.id)) {
      accMap.set(wine.id, {
        wine,
        tasting_count: 0,
        ratings: [],
        is_favorite: false,
        last_tasted_at: null,
        latest_row: null,
      })
    }

    const acc = accMap.get(wine.id)!
    acc.tasting_count++
    if (row.is_favorite) acc.is_favorite = true
    if (row.rating) acc.ratings.push(row.rating)

    if (!acc.last_tasted_at || row.tasted_at > acc.last_tasted_at) {
      acc.last_tasted_at = row.tasted_at
      acc.latest_row = row
    }
  }

  const wineMap = new Map<string, WineWithTastings>()
  for (const [wineId, acc] of accMap) {
    wineMap.set(wineId, {
      ...acc.wine,
      // Provide the most recent tasting so components can read overall_reaction etc.
      tastings: acc.latest_row ? [acc.latest_row] : [],
      tasting_count: acc.tasting_count,
      avg_rating: acc.ratings.length
        ? acc.ratings.reduce((a, b) => a + b, 0) / acc.ratings.length
        : null,
      last_tasted_at: acc.last_tasted_at,
      is_favorite: acc.is_favorite,
    })
  }

  let wines = Array.from(wineMap.values())

  // Client-side filtering
  if (params?.search) {
    const q = params.search.toLowerCase()
    wines = wines.filter(
      (w) =>
        w.canonical_name?.toLowerCase().includes(q) ||
        w.producer?.toLowerCase().includes(q) ||
        w.wine_name?.toLowerCase().includes(q) ||
        w.varietal?.toLowerCase().includes(q) ||
        w.region?.toLowerCase().includes(q)
    )
  }
  if (params?.style) wines = wines.filter((w) => w.style === params.style)
  if (params?.varietal) wines = wines.filter((w) => w.varietal?.toLowerCase().includes(params.varietal!.toLowerCase()))
  if (params?.region) wines = wines.filter((w) => w.region?.toLowerCase().includes(params.region!.toLowerCase()))
  if (params?.country) wines = wines.filter((w) => w.country?.toLowerCase() === params.country!.toLowerCase())

  // Sort
  const sort = params?.sort ?? 'recent'
  if (sort === 'recent') wines.sort((a, b) => (b.last_tasted_at ?? '').localeCompare(a.last_tasted_at ?? ''))
  if (sort === 'rating') wines.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))
  if (sort === 'name') wines.sort((a, b) => a.canonical_name.localeCompare(b.canonical_name))
  if (sort === 'vintage') wines.sort((a, b) => (b.vintage ?? 0) - (a.vintage ?? 0))

  // Pagination
  const offset = params?.offset ?? 0
  const limit = params?.limit ?? 50
  return wines.slice(offset, offset + limit)
}

// ── Get a single wine with all my tastings ────────────────
export async function getWineDetail(wineId: string): Promise<WineWithTastings | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: wine } = await supabase
    .from('wines')
    .select('*')
    .eq('id', wineId)
    .single()

  if (!wine) return null

  const { data: tastings } = await supabase
    .from('tastings')
    .select('*')
    .eq('wine_id', wineId)
    .eq('user_id', user.id)
    .order('tasted_at', { ascending: false })

  const myTastings = tastings ?? []
  const ratings = myTastings.map((t) => t.rating).filter(Boolean) as number[]

  return {
    ...(wine as Wine),
    tastings: myTastings,
    tasting_count: myTastings.length,
    avg_rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    last_tasted_at: myTastings[0]?.tasted_at ?? null,
    is_favorite: myTastings.some((t) => t.is_favorite),
  }
}

// ── Create or find a wine record ──────────────────────────
// Used by the save-tasting flow after user confirms extraction.
export async function createOrFindWine(params: {
  canonical_name: string
  producer?: string
  wine_name?: string
  vintage?: number
  region?: string
  country?: string
  appellation?: string
  varietal?: string
  blend_components?: { varietal: string; percentage?: number }[]
  style?: string
  label_image_url?: string
}): Promise<Wine> {
  const supabase = await createClient()

  // Try exact canonical_name match first
  const { data: existing } = await supabase
    .from('wines')
    .select('*')
    .eq('canonical_name', params.canonical_name)
    .maybeSingle()

  if (existing) return existing as Wine

  // Create new wine
  const { data: created, error } = await supabase
    .from('wines')
    .insert({
      canonical_name: params.canonical_name,
      producer: params.producer,
      wine_name: params.wine_name,
      vintage: params.vintage,
      region: params.region,
      country: params.country,
      appellation: params.appellation,
      varietal: params.varietal,
      blend_components: params.blend_components ?? [],
      style: params.style,
      primary_label_image_url: params.label_image_url,
    })
    .select()
    .single()

  if (error || !created) throw new Error(`Failed to create wine: ${error?.message}`)
  return created as Wine
}

// ── Toggle favorite on a tasting ─────────────────────────
export async function toggleFavorite(
  tastingId: string,
  isFavorite: boolean
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('tastings')
    .update({ is_favorite: isFavorite })
    .eq('id', tastingId)
}
