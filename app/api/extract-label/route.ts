import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { extractWineLabel } from '@/lib/ai/extract-label'

// ── POST /api/extract-label ───────────────────────────────
// Body: { image_id: string }
// Creates an extraction job, calls Claude Vision, updates job, returns result.
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Debug: check env loading
    const envKeys = Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('ANTHROPIC') || k.includes('APP_URL'))
    console.log('[extract-label] env keys found:', envKeys)

    const { image_id } = await request.json()
    if (!image_id) {
      return NextResponse.json({ error: 'image_id required' }, { status: 400 })
    }

    // Verify image belongs to user
    const { data: image } = await supabase
      .from('uploaded_images')
      .select('id, storage_path, mime_type')
      .eq('id', image_id)
      .eq('user_id', user.id)
      .single()

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const serviceClient = createServiceClient()

    // Create extraction job
    const { data: job, error: jobError } = await serviceClient
      .from('extraction_jobs')
      .insert({
        user_id: user.id,
        uploaded_image_id: image_id,
        job_type: 'label',
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (jobError || !job) {
      console.error('[extract-label] job create error:', jobError)
      return NextResponse.json({ error: `Failed to create job: ${jobError?.message}` }, { status: 500 })
    }

    // Download image from storage to base64
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('cellar-images')
      .download(image.storage_path)

    if (downloadError || !fileData) {
      console.error('[extract-label] download error:', downloadError)
      await serviceClient
        .from('extraction_jobs')
        .update({ status: 'failed', error_message: 'Failed to download image', completed_at: new Date().toISOString() })
        .eq('id', job.id)
      return NextResponse.json({ error: `Failed to download image: ${downloadError?.message}` }, { status: 500 })
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = (image.mime_type?.includes('png') ? 'image/png'
      : image.mime_type?.includes('webp') ? 'image/webp'
      : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'

    // Call Claude Vision
    let raw: unknown
    let parsed
    try {
      const result = await extractWineLabel(base64, mimeType)
      raw = result.raw
      parsed = result.parsed
    } catch (aiError) {
      const aiMsg = aiError instanceof Error ? aiError.message : 'AI extraction failed'
      console.error('[extract-label] AI error:', aiMsg)
      await serviceClient
        .from('extraction_jobs')
        .update({
          status: 'failed',
          error_message: aiMsg,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id)
      return NextResponse.json({ error: `Extraction failed: ${aiMsg}`, jobId: job.id }, { status: 500 })
    }

    // Save results
    await serviceClient
      .from('extraction_jobs')
      .update({
        status: 'completed',
        raw_model_output: raw,
        parsed_output: parsed,
        confidence: parsed.confidence,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    return NextResponse.json({
      jobId: job.id,
      status: 'completed',
      extracted: parsed,
    })
  } catch (err) {
    console.error('[extract-label]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
