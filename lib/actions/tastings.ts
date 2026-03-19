'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { SaveTastingInput, TastingWithWine, REACTION_WEIGHT } from '@/lib/types'
import { createOrFindWine } from './wines'
import { buildCanonicalName } from '@/lib/wine/canonicalize'
import { computeTasteProfile } from '@/lib/wine/profile'

// ── Save a tasting (create wine if needed, create tasting, recompute profile) ──
export async function saveTasting(
  input: SaveTastingInput
): Promise<{ tastingId: string; wineId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Build canonical name from user-edited or extracted fields
  const canonical_name =
    input.canonical_name ||
    buildCanonicalName({
      ...input.extracted,
      producer: input.producer ?? input.extracted.producer,
      wine_name: input.wine_name ?? input.extracted.wine_name,
      vintage: input.vintage ?? input.extracted.vintage,
    })

  // If we have an uploaded image, fetch its storage path to store on the wine
  let labelStoragePath: string | undefined
  if (input.uploaded_image_id) {
    const { data: imgRow } = await supabase
      .from('uploaded_images')
      .select('storage_path')
      .eq('id', input.uploaded_image_id)
      .single()
    labelStoragePath = imgRow?.storage_path
  }

  // Create or find the wine record
  const wine = await createOrFindWine({
    canonical_name,
    producer: input.producer ?? input.extracted.producer,
    wine_name: input.wine_name ?? input.extracted.wine_name,
    vintage: input.vintage ?? input.extracted.vintage,
    region: input.region ?? input.extracted.region,
    country: input.country ?? input.extracted.country,
    appellation: input.extracted.appellation,
    varietal: input.varietal ?? input.extracted.varietal,
    blend_components: input.extracted.blend_components,
    style: input.style ?? input.extracted.style,
    label_image_url: labelStoragePath,
  })

  // Derive numeric rating from overall_reaction for backward compat
  const derivedRating = input.overall_reaction
    ? REACTION_WEIGHT[input.overall_reaction]
    : (input.rating ?? null)

  // Create the tasting record
  const { data: tasting, error } = await supabase
    .from('tastings')
    .insert({
      user_id: user.id,
      wine_id: wine.id,
      uploaded_image_id: input.uploaded_image_id ?? null,
      tasted_at: input.tasted_at ?? new Date().toISOString(),
      location_text: input.location_text ?? null,
      rating: derivedRating,
      notes: input.notes ?? null,
      overall_reaction: input.overall_reaction ?? null,
      vibe_tags: input.vibe_tags ?? [],
      memory_note: input.memory_note ?? null,
      body_score: input.body_score ?? null,
      would_drink_again: input.would_drink_again ?? null,
      is_favorite: input.is_favorite ?? false,
      price_paid_cents: input.price_paid_cents ?? null,
    })
    .select('id')
    .single()

  if (error || !tasting) throw new Error(`Failed to save tasting: ${error?.message}`)

  // Recompute taste profile in the background
  // Fire-and-forget — don't block the save response
  recomputeProfile(user.id, supabase).catch(console.error)

  revalidatePath('/')
  revalidatePath('/collection')
  revalidatePath(`/wine/${wine.id}`)

  return { tastingId: tasting.id, wineId: wine.id }
}

// ── Update an existing tasting ────────────────────────────
export async function updateTasting(
  tastingId: string,
  updates: Partial<{
    rating: number
    notes: string
    overall_reaction: string
    vibe_tags: string[]
    memory_note: string
    body_score: number
    location_text: string
    tasted_at: string
    would_drink_again: boolean
    is_favorite: boolean
    price_paid_cents: number
  }>
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('tastings')
    .update(updates)
    .eq('id', tastingId)
    .eq('user_id', user.id)

  if (error) throw new Error(`Update failed: ${error.message}`)

  recomputeProfile(user.id, supabase).catch(console.error)
  revalidatePath('/collection')
  revalidatePath('/')
}

// ── Delete a tasting ──────────────────────────────────────
export async function deleteTasting(tastingId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('tastings')
    .delete()
    .eq('id', tastingId)
    .eq('user_id', user.id)

  recomputeProfile(user.id, supabase).catch(console.error)
  revalidatePath('/collection')
  revalidatePath('/')
}

// ── Get my recent tastings ────────────────────────────────
export async function getRecentTastings(limit = 10): Promise<TastingWithWine[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('tastings')
    .select(`*, wines(*)`)
    .eq('user_id', user.id)
    .order('tasted_at', { ascending: false })
    .limit(limit)

  if (!data) return []

  // Sign storage-path image URLs
  const pathsToSign = data
    .map((row) => {
      const w = (row as Record<string, unknown>).wines as { primary_label_image_url?: string }
      return w?.primary_label_image_url
    })
    .filter((p): p is string => !!p && !p.startsWith('http'))

  const urlMap = new Map<string, string>()
  if (pathsToSign.length > 0) {
    const { data: signed } = await supabase.storage
      .from('cellar-images')
      .createSignedUrls(pathsToSign, 3600)
    signed?.forEach((s) => { if (s.signedUrl && s.path) urlMap.set(s.path, s.signedUrl) })
  }

  // Supabase returns the nested relation as `wines` (the table name).
  // Our TastingWithWine type expects `wine` (singular). Remap here.
  return data.map((row) => {
    const wineRaw = (row as Record<string, unknown>).wines as TastingWithWine['wine'] & {
      primary_label_image_url?: string
    }
    const signedUrl = wineRaw?.primary_label_image_url?.startsWith('http')
      ? wineRaw.primary_label_image_url
      : (wineRaw?.primary_label_image_url ? urlMap.get(wineRaw.primary_label_image_url) : undefined)
    return {
      ...row,
      wine: { ...wineRaw, signed_image_url: signedUrl },
    }
  }) as TastingWithWine[]
}

// ── Recompute and save taste profile ─────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recomputeProfile(userId: string, supabase: any): Promise<void> {
  // Fetch all tastings that have either a rating or an overall_reaction
  const { data } = await supabase
    .from('tastings')
    .select(`*, wines(*)`)
    .eq('user_id', userId)
    .or('rating.not.is.null,overall_reaction.not.is.null')
    .order('tasted_at', { ascending: false })

  if (!data || data.length === 0) return

  const profile = computeTasteProfile(data as TastingWithWine[], userId)

  await supabase.from('taste_profile_snapshots').insert({
    user_id: userId,
    computed_at: profile.computed_at,
    tasting_count: profile.tasting_count,
    preferred_varietals: profile.preferred_varietals,
    preferred_regions: profile.preferred_regions,
    preferred_styles: profile.preferred_styles,
    disliked_patterns: profile.disliked_patterns,
    insights: profile.insights,
    raw_stats: profile.raw_stats,
  })
}
