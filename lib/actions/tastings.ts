'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { SaveTastingInput, TastingWithWine } from '@/lib/types'
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
    label_image_url: input.uploaded_image_id
      ? undefined // will be updated after signed URL fetch
      : undefined,
  })

  // Create the tasting record
  const { data: tasting, error } = await supabase
    .from('tastings')
    .insert({
      user_id: user.id,
      wine_id: wine.id,
      uploaded_image_id: input.uploaded_image_id ?? null,
      tasted_at: input.tasted_at ?? new Date().toISOString(),
      location_text: input.location_text ?? null,
      rating: input.rating ?? null,
      notes: input.notes ?? null,
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

  return (data as TastingWithWine[]) ?? []
}

// ── Recompute and save taste profile ─────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recomputeProfile(userId: string, supabase: any): Promise<void> {
  // Fetch all rated tastings with wine data
  const { data } = await supabase
    .from('tastings')
    .select(`*, wines(*)`)
    .eq('user_id', userId)
    .not('rating', 'is', null)
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
