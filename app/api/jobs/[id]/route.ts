import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── GET /api/jobs/[id] ────────────────────────────────────
// Poll endpoint for extraction and recommendation job status.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check extraction_jobs first
  const { data: extractionJob } = await supabase
    .from('extraction_jobs')
    .select('id, status, parsed_output, confidence, error_message, job_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (extractionJob) {
    return NextResponse.json({
      type: 'extraction',
      status: extractionJob.status,
      extracted: extractionJob.parsed_output,
      confidence: extractionJob.confidence,
      error: extractionJob.error_message,
    })
  }

  // Check recommendation_sessions
  const { data: session } = await supabase
    .from('recommendation_sessions')
    .select('id, status, error_message')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (session) {
    return NextResponse.json({
      type: 'recommendation',
      status: session.status,
      error: session.error_message,
    })
  }

  return NextResponse.json({ error: 'Job not found' }, { status: 404 })
}
