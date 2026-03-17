import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeShelfPhoto } from '@/lib/ai/analyze-shelf'
import { scoreCandidate } from '@/lib/wine/profile'
import { findWineMatch } from '@/lib/wine/match'
import { TasteProfileSnapshot, RecommendationTier } from '@/lib/types'

// ── POST /api/analyze-shelf ───────────────────────────────
// Body: { image_id: string }
// Creates recommendation session, analyzes shelf, scores against palate.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { image_id } = await request.json()
    if (!image_id) return NextResponse.json({ error: 'image_id required' }, { status: 400 })

    const { data: image } = await supabase
      .from('uploaded_images')
      .select('id, storage_path, mime_type')
      .eq('id', image_id)
      .eq('user_id', user.id)
      .single()

    if (!image) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

    const serviceClient = createServiceClient()

    // Create recommendation session
    const { data: session, error: sessionError } = await serviceClient
      .from('recommendation_sessions')
      .insert({
        user_id: user.id,
        uploaded_image_id: image_id,
        session_type: 'shelf',
        status: 'processing',
        model_version: 'claude-sonnet-4-6',
      })
      .select('id')
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // Fetch user's latest taste profile
    const { data: profileRow } = await serviceClient
      .from('taste_profile_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const profile = profileRow as TasteProfileSnapshot | null

    // Download and base64-encode image
    const { data: fileData } = await serviceClient.storage
      .from('cellar-images')
      .download(image.storage_path)

    if (!fileData) {
      await serviceClient
        .from('recommendation_sessions')
        .update({ status: 'failed', error_message: 'Failed to download image' })
        .eq('id', session.id)
      return NextResponse.json({ error: 'Download failed' }, { status: 500 })
    }

    const base64 = Buffer.from(await fileData.arrayBuffer()).toString('base64')
    const mimeType = (image.mime_type?.includes('png') ? 'image/png'
      : image.mime_type?.includes('webp') ? 'image/webp'
      : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'

    // Run shelf analysis
    let shelfResult
    try {
      const result = await analyzeShelfPhoto(base64, mimeType)
      shelfResult = result.parsed
    } catch (err) {
      await serviceClient
        .from('recommendation_sessions')
        .update({ status: 'failed', error_message: 'AI analysis failed' })
        .eq('id', session.id)
      return NextResponse.json({ error: 'Analysis failed', sessionId: session.id }, { status: 500 })
    }

    // Score each candidate
    const scoredCandidates = await Promise.all(
      shelfResult.candidates.map(async (c, index) => {
        // Try to match against our wine DB
        const matchResult = profile
          ? await findWineMatch({
              producer: c.candidate_producer_raw,
              wine_name: c.candidate_name_raw,
              vintage: c.candidate_vintage_raw,
              region: c.candidate_region_raw,
              varietal: c.candidate_varietal_raw,
              confidence: 0.5,
            })
          : { wine: null, confidence: 0, match_type: 'none' as const }

        // Score against taste profile
        const palate_score = profile
          ? scoreCandidate(
              {
                candidate_varietal_raw: c.candidate_varietal_raw ?? null,
                candidate_region_raw: c.candidate_region_raw ?? null,
              },
              profile
            )
          : 0.5

        const match_confidence = matchResult.confidence
        // Final score: 60% palate, 40% match confidence
        const final_score = palate_score * 0.6 + match_confidence * 0.4

        return {
          session_id: session.id,
          candidate_name_raw: c.candidate_name_raw,
          candidate_producer_raw: c.candidate_producer_raw ?? null,
          candidate_vintage_raw: c.candidate_vintage_raw ?? null,
          candidate_varietal_raw: c.candidate_varietal_raw ?? null,
          candidate_region_raw: c.candidate_region_raw ?? null,
          matched_wine_id: matchResult.wine?.id ?? null,
          match_confidence,
          palate_score,
          final_score,
          extracted_data: c,
          rank_position: index, // will update after sorting
        }
      })
    )

    // Sort by final_score and assign tiers
    scoredCandidates.sort((a, b) => b.final_score - a.final_score)

    const candidatesWithTiers = scoredCandidates.map((c, i) => {
      let tier: RecommendationTier | null = null
      let explanation = ''

      if (i === 0 && c.palate_score >= 0.65) {
        tier = 'best_match'
        const parts = []
        if (c.candidate_varietal_raw) parts.push(`${c.candidate_varietal_raw} lover`)
        if (c.candidate_region_raw) parts.push(`matches your ${c.candidate_region_raw} preference`)
        explanation = parts.length > 0
          ? `Top pick based on your palate — you're a ${parts.join(' and ')}.`
          : 'Your highest-scoring bottle based on your overall palate.'
      } else if (i === 1 && c.palate_score >= 0.55) {
        tier = 'safe_bet'
        explanation = c.candidate_varietal_raw
          ? `A solid choice — ${c.candidate_varietal_raw} is consistently good for you.`
          : 'A reliable option based on your history.'
      } else if (c.palate_score >= 0.45) {
        tier = 'safe_bet'
        explanation = 'Should be enjoyable based on your taste profile.'
      } else if (c.palate_score < 0.4 && profile) {
        tier = 'wildcard'
        explanation = 'Outside your usual preferences — could be a pleasant surprise.'
      } else {
        tier = 'wildcard'
        explanation = 'Not enough data to match this to your palate yet.'
      }

      if (!profile) {
        explanation = 'Add more tastings to get personalized recommendations. For now, this is a visual match only.'
        tier = 'wildcard'
      }

      return { ...c, rank_position: i, recommendation_tier: tier, explanation_text: explanation }
    })

    // Insert candidates
    if (candidatesWithTiers.length > 0) {
      await serviceClient.from('recommendation_candidates').insert(candidatesWithTiers)
    }

    // Mark session complete
    await serviceClient
      .from('recommendation_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    return NextResponse.json({
      sessionId: session.id,
      status: 'completed',
      candidateCount: candidatesWithTiers.length,
      image_quality: shelfResult.image_quality,
    })
  } catch (err) {
    console.error('[analyze-shelf]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
