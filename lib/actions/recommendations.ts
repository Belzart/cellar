'use server'

import { createClient } from '@/lib/supabase/server'
import { RecommendationSessionWithCandidates, TasteProfileSnapshot } from '@/lib/types'

// ── Get latest taste profile ──────────────────────────────
export async function getLatestProfile(): Promise<TasteProfileSnapshot | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('taste_profile_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as TasteProfileSnapshot) ?? null
}

// ── Get a recommendation session with candidates ──────────
export async function getRecommendationSession(
  sessionId: string
): Promise<RecommendationSessionWithCandidates | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: session } = await supabase
    .from('recommendation_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return null

  const { data: candidates } = await supabase
    .from('recommendation_candidates')
    .select('*')
    .eq('session_id', sessionId)
    .order('rank_position', { ascending: true })

  // Get signed URL for the shelf image
  let shelf_image_url: string | undefined
  if (session.uploaded_image_id) {
    const { data: imgRecord } = await supabase
      .from('uploaded_images')
      .select('storage_path')
      .eq('id', session.uploaded_image_id)
      .single()

    if (imgRecord) {
      const { data: signed } = await supabase.storage
        .from('cellar-images')
        .createSignedUrl(imgRecord.storage_path, 3600)
      shelf_image_url = signed?.signedUrl
    }
  }

  return {
    ...session,
    candidates: candidates ?? [],
    shelf_image_url,
  } as RecommendationSessionWithCandidates
}

// ── List recent recommendation sessions ──────────────────
export async function getRecentSessions(limit = 5) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('recommendation_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data ?? []
}
