'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadImage } from '@/lib/actions/upload'
import { saveTasting } from '@/lib/actions/tastings'
import ImageUploader from '@/components/scan/ImageUploader'
import ScanProgress from '@/components/scan/ScanProgress'
import ExtractionReview from '@/components/scan/ExtractionReview'
import { ExtractedWineData, SaveTastingInput } from '@/lib/types'

type ScanStage =
  | 'select'      // waiting for image selection
  | 'uploading'   // uploading to storage
  | 'extracting'  // calling AI
  | 'matching'    // matching against DB
  | 'review'      // user reviews + edits
  | 'done'        // saving done
  | 'error'

export default function ScanPage() {
  const router = useRouter()
  const [stage, setStage] = useState<ScanStage>('select')
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedWineData | null>(null)

  async function handleImageSelected(file: File, preview: string) {
    setPreviewUrl(preview)
    setError(null)

    try {
      // 1. Upload image
      setStage('uploading')
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'label')

      const { imageId } = await uploadImage(formData)
      setUploadedImageId(imageId)

      // 2. Run AI extraction
      setStage('extracting')
      const res = await fetch('/api/extract-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_id: imageId }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error ?? 'Extraction failed')
      }

      // 3. Match against DB (brief pause for UX)
      setStage('matching')
      await new Promise((r) => setTimeout(r, 600))

      // 4. Show review screen
      setExtracted(data.extracted as ExtractedWineData)
      setStage('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStage('error')
    }
  }

  async function handleSave(input: SaveTastingInput) {
    const { wineId } = await saveTasting(input)
    router.push(`/wine/${wineId}`)
  }

  function handleRetry() {
    setStage('select')
    setError(null)
    setPreviewUrl(null)
    setUploadedImageId(null)
    setExtracted(null)
  }

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Header */}
      {(stage === 'select' || stage === 'error') && (
        <header className="px-5 pt-6 pb-4">
          <h1 className="font-display text-3xl font-medium text-cream tracking-tight">Scan Label</h1>
          <p className="text-text-secondary text-sm mt-1">
            Photograph a wine label to add it to your cellar
          </p>
        </header>
      )}

      {/* Stage: select */}
      {stage === 'select' && (
        <div className="px-4">
          <ImageUploader
            onImageSelected={handleImageSelected}
            label="Point your camera at a wine label"
          />

          <p className="text-text-tertiary text-xs text-center mt-6 px-4 leading-relaxed">
            Works best in good lighting. Hold steady and make sure the label is fully visible.
          </p>
        </div>
      )}

      {/* Stage: processing */}
      {(stage === 'uploading' || stage === 'extracting' || stage === 'matching') && (
        <ScanProgress stage={stage} />
      )}

      {/* Stage: error */}
      {stage === 'error' && (
        <div className="px-4">
          <ScanProgress stage="error" error={error} />
          <div className="mt-6 space-y-3">
            <button onClick={handleRetry} className="btn-primary w-full py-4">
              Try again
            </button>

            {/* Manual entry fallback */}
            {uploadedImageId && (
              <button
                onClick={() => {
                  setExtracted({ confidence: 0.1, confidence_notes: 'Manually entered' })
                  setStage('review')
                }}
                className="btn-secondary w-full py-4"
              >
                Enter wine details manually
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stage: review */}
      {stage === 'review' && extracted && (
        <>
          <header className="px-5 pt-6 pb-2">
            <h1 className="font-display text-2xl font-medium text-cream">Review &amp; Save</h1>
            <p className="text-text-secondary text-xs mt-1">
              Check the details, add your notes, then save.
            </p>
          </header>
          <ExtractionReview
            extracted={extracted}
            imageUrl={previewUrl ?? undefined}
            uploadedImageId={uploadedImageId ?? undefined}
            onSave={handleSave}
          />
        </>
      )}
    </div>
  )
}
