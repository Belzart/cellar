'use server'

import { createClient } from '@/lib/supabase/server'
import { CellarInventoryWithWine, Wine } from '@/lib/types'

// ── Get all bottles in My Cellar ──────────────────────────
export async function getMyBottles(): Promise<CellarInventoryWithWine[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('cellar_inventory')
    .select(`
      *,
      wines (
        id, canonical_name, producer, wine_name, vintage,
        region, country, appellation, varietal, blend_components,
        style, primary_label_image_url, created_at, updated_at
      )
    `)
    .eq('user_id', user.id)
    .gt('quantity', 0)
    .order('added_at', { ascending: false })

  if (!data) return []

  // Sign image URLs
  const results: CellarInventoryWithWine[] = []
  for (const row of data) {
    const wine = row.wines as unknown as Wine
    if (!wine) continue
    let signedUrl: string | undefined
    if (wine.primary_label_image_url && !wine.primary_label_image_url.startsWith('http')) {
      const { data: signed } = await supabase.storage
        .from('cellar-images')
        .createSignedUrl(wine.primary_label_image_url, 3600)
      signedUrl = signed?.signedUrl
    }
    results.push({
      id: row.id,
      user_id: row.user_id,
      wine_id: row.wine_id,
      quantity: row.quantity,
      purchase_date: row.purchase_date,
      purchase_price_cents: row.purchase_price_cents,
      purchase_currency: row.purchase_currency,
      storage_note: row.storage_note,
      added_at: row.added_at,
      updated_at: row.updated_at,
      wine,
      signed_image_url: signedUrl,
    })
  }
  return results
}

// ── Add a wine to My Cellar ───────────────────────────────
export async function addToBottles(input: {
  wine_id: string
  quantity?: number
  purchase_date?: string
  purchase_price_cents?: number
  purchase_currency?: string
  storage_note?: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Upsert — if already exists, increment quantity
  const { data: existing } = await supabase
    .from('cellar_inventory')
    .select('id, quantity')
    .eq('user_id', user.id)
    .eq('wine_id', input.wine_id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('cellar_inventory')
      .update({ quantity: existing.quantity + (input.quantity ?? 1) })
      .eq('id', existing.id)
    return error ? { error: error.message } : {}
  }

  const { error } = await supabase
    .from('cellar_inventory')
    .insert({
      user_id: user.id,
      wine_id: input.wine_id,
      quantity: input.quantity ?? 1,
      purchase_date: input.purchase_date ?? null,
      purchase_price_cents: input.purchase_price_cents ?? null,
      purchase_currency: input.purchase_currency ?? 'USD',
      storage_note: input.storage_note ?? null,
    })

  return error ? { error: error.message } : {}
}

// ── Decrement quantity (drunk a bottle) ───────────────────
export async function drinkBottle(inventoryId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data } = await supabase
    .from('cellar_inventory')
    .select('quantity')
    .eq('id', inventoryId)
    .eq('user_id', user.id)
    .single()

  if (!data) return { error: 'Not found' }

  const newQty = data.quantity - 1
  const { error } = await supabase
    .from('cellar_inventory')
    .update({ quantity: newQty })
    .eq('id', inventoryId)

  return error ? { error: error.message } : {}
}

// ── Remove entirely from cellar ───────────────────────────
export async function removeFromBottles(inventoryId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('cellar_inventory')
    .delete()
    .eq('id', inventoryId)
    .eq('user_id', user.id)

  return error ? { error: error.message } : {}
}

// ── Update quantity directly ──────────────────────────────
export async function updateBottleQuantity(
  inventoryId: string,
  quantity: number
): Promise<{ error?: string }> {
  if (quantity < 0) return { error: 'Invalid quantity' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('cellar_inventory')
    .update({ quantity })
    .eq('id', inventoryId)
    .eq('user_id', user.id)

  return error ? { error: error.message } : {}
}

// ── Check if a wine is in cellar ─────────────────────────
export async function getBottleForWine(wineId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('cellar_inventory')
    .select('*')
    .eq('user_id', user.id)
    .eq('wine_id', wineId)
    .maybeSingle()

  return data ?? null
}
