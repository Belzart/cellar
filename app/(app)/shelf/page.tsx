'use client'

import { useState } from 'react'
import Image from 'next/image'
import { uploadImage } from '@/lib/actions/upload'
import { getRecommendationSession } from '@/lib/actions/recommendations'
import ImageUploader from '@/components/scan/ImageUploader'
import RecommendationCard from '@/components/shelf/RecommendationCard'
import ScanProgress from '@/components/scan/ScanProgress'
import EmptyState from '@/components/shared/EmptyState'
import { RecommendationSessionWithCandidates } from '@/lib/types'
import { AlertCircle, Store } from 'lucide-react'

type ShelfStage = 'select' | 'uploading' | 'extracting' | 'done' | 'error'

export default function ShelfPage() {
  const [stage, setStage] = useState<ShelfStage>('select')
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [session, setSession] = useState<RecommendationSessionWithCandidates | null>(null)

  async function handleImageSelected(file: File, preview: string) {
    setPreviewUrl(preview)
    setError(null)

    try {
      // 1. Upload
      setStage('uploading')
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'shelf')
      const { imageId } = await uploadImage(formData)

      // 2. Analyze
      setStage('extracting')
      const res = await fetch('/api/analyze-shelf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_id: imageId }),
      })

      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Analysis failed')

      // 3. Fetch full session with candidates
      const fullSession = await getRecommendationSession(data.sessionId)
      setSession(fullSession)
      setStage('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStage('error')
    }
  }

  function handleRetry() {
    setStage('select')
    setError(null)
    setPreviewUrl(null)
    setSession(null)
  }

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-display text-3xl font-medium text-cream tracking-tight">
          Shelf Picks
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Photograph a wine shelf for personalized recommendations
        </p>
      </header>

      {/* Stage: select */}
      {stage === 'select' && (
        <div className="px-4 space-y-5">
          {/* Tip card */}
          <div className="bg-gold/10 border border-gold/20 rounded-2xl p-4 flex gap-3">
            <span className="text-xl flex-shrink-0">💡</span>
            <div>
              <p className="text-gold text-sm font-medium">Photo tips</p>
              <p className="text-gold/70 text-xs mt-1 leading-relaxed">
                Step back so multiple bottles are visible. Good lighting helps.
                Labels don't need to be perfect — just readable.
              </p>
            </div>
          </div>

          <ImageUploader
            onImageSelected={handleImageSelected}
            label="Photograph a wine store shelf"
          />
        </div>
      )}

      {/* Processing */}
      {(stage === 'uploading' || stage === 'extracting') && (
        <div className="px-4">
          {previewUrl && (
            <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-border mb-6">
              <Image
                src={previewUrl}
                alt="Shelf photo"
                fill
                className="object-cover"
              />
            </div>
          )}
          <ScanProgress stage={stage === 'uploading' ? 'uploading' : 'extracting'} />
          <p className="text-text-tertiary text-xs text-center mt-4">
            Identifying bottles and scoring against your palate…
          </p>
        </div>
      )}

      {/* Error */}
      {stage === 'error' && (
        <div className="px-4">
          <ScanProgress stage="error" error={error} />
          <button onClick={handleRetry} className="btn-primary w-full py-4 mt-6">
            Try again
          </button>
        </div>
      )}

      {/* Results */}
      {stage === 'done' && session && (
        <div className="px-4 space-y-6 pb-8">
          {/* Shelf image */}
          {previewUrl && (
            <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-border">
              <Image
                src={previewUrl}
                alt="Shelf photo"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg-card/60 to-transparent" />
              <div className="absolute bottom-3 left-3">
                <span className="glass rounded-full px-3 py-1.5 text-xs text-cream border border-border">
                  {session.candidates.length} bottle{session.candidates.length !== 1 ? 's' : ''} identified
                </span>
              </div>
            </div>
          )}

          {/* No profile warning */}
          {session.candidates.every((c) => c.recommendation_tier === 'wildcard' && c.palate_score === 0.5) && (
            <div className="bg-gold/10 border border-gold/20 rounded-2xl p-4 flex gap-3">
              <AlertCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
              <p className="text-gold/80 text-sm leading-relaxed">
                Rate more wines to unlock personalized recommendations.
                Showing visual matches for now.
              </p>
            </div>
          )}

          {session.candidates.length === 0 ? (
            <EmptyState
              icon={<Store className="w-8 h-8 text-text-secondary" />}
              title="No bottles identified"
              description="Try a clearer photo with better lighting and more visible labels."
              action={
                <button onClick={handleRetry} className="btn-primary px-6 py-3">
                  Try again
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {session.candidates.map((candidate, i) => (
                <RecommendationCard
                  key={candidate.id}
                  candidate={candidate}
                  rank={i}
                />
              ))}
            </div>
          )}

          {/* Scan another */}
          <button
            onClick={handleRetry}
            className="btn-secondary w-full py-4"
          >
            Scan another shelf
          </button>
        </div>
      )}
    </div>
  )
}
