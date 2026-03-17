'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ExtractedWineData, WineStyle, SaveTastingInput } from '@/lib/types'
import RatingStars from '@/components/wine/RatingStars'
import { cn, STYLE_LABELS } from '@/lib/utils'
import { buildCanonicalName } from '@/lib/wine/canonicalize'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface ExtractionReviewProps {
  extracted: ExtractedWineData
  imageUrl?: string
  onSave: (input: SaveTastingInput) => Promise<void>
  uploadedImageId?: string
}

const WINE_STYLES: WineStyle[] = ['red', 'white', 'rosé', 'sparkling', 'dessert', 'fortified', 'orange', 'other']

export default function ExtractionReview({
  extracted,
  imageUrl,
  onSave,
  uploadedImageId,
}: ExtractionReviewProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editable fields — initialized from extracted data
  const [producer, setProducer] = useState(extracted.producer ?? '')
  const [wineName, setWineName] = useState(extracted.wine_name ?? '')
  const [vintage, setVintage] = useState(extracted.vintage?.toString() ?? '')
  const [region, setRegion] = useState(extracted.region ?? '')
  const [country, setCountry] = useState(extracted.country ?? '')
  const [varietal, setVarietal] = useState(extracted.varietal ?? '')
  const [style, setStyle] = useState<WineStyle | ''>(extracted.style ?? '')

  // Tasting fields
  const [rating, setRating] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [location, setLocation] = useState('')
  const [wouldDrinkAgain, setWouldDrinkAgain] = useState<boolean | null>(null)
  const [price, setPrice] = useState('')

  const confidenceColor =
    extracted.confidence >= 0.8 ? 'text-emerald-400' :
    extracted.confidence >= 0.5 ? 'text-gold' : 'text-orange-400'

  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      const vintageNum = vintage ? parseInt(vintage) : undefined
      const canonical_name = buildCanonicalName({
        ...extracted,
        producer: producer || extracted.producer,
        wine_name: wineName || extracted.wine_name,
        vintage: vintageNum,
      })

      await onSave({
        extracted,
        uploaded_image_id: uploadedImageId,
        canonical_name,
        producer: producer || undefined,
        wine_name: wineName || undefined,
        vintage: vintageNum,
        region: region || undefined,
        country: country || undefined,
        varietal: varietal || undefined,
        style: (style as WineStyle) || undefined,
        rating: rating ?? undefined,
        notes: notes || undefined,
        location_text: location || undefined,
        would_drink_again: wouldDrinkAgain ?? undefined,
        price_paid_cents: price ? Math.round(parseFloat(price) * 100) : undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div className="animate-slide-up space-y-6 px-4 pb-8">
      {/* Label image + confidence */}
      {imageUrl && (
        <div className="relative">
          <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-border">
            <Image
              src={imageUrl}
              alt="Wine label"
              fill
              className="object-contain bg-bg-elevated"
            />
          </div>

          {/* Confidence badge */}
          <div className={cn(
            'absolute top-3 right-3 flex items-center gap-1.5 glass rounded-full px-3 py-1.5 border border-border'
          )}>
            {extracted.confidence >= 0.7
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              : <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
            }
            <span className={cn('text-xs font-medium', confidenceColor)}>
              {Math.round(extracted.confidence * 100)}% confidence
            </span>
          </div>
        </div>
      )}

      {extracted.confidence_notes && extracted.confidence < 0.7 && (
        <div className="bg-orange-950/30 border border-orange-800/30 rounded-xl p-3 flex gap-2">
          <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="text-orange-300 text-xs leading-relaxed">{extracted.confidence_notes}</p>
        </div>
      )}

      {/* ── Wine Info ── */}
      <section>
        <h2 className="label mb-3">Wine Details</h2>
        <div className="space-y-3">
          <div>
            <label className="text-text-secondary text-xs mb-1 block">Producer / Winery</label>
            <input
              className="input"
              value={producer}
              onChange={(e) => setProducer(e.target.value)}
              placeholder="e.g., Ridge Vineyards"
            />
          </div>

          <div>
            <label className="text-text-secondary text-xs mb-1 block">Wine Name</label>
            <input
              className="input"
              value={wineName}
              onChange={(e) => setWineName(e.target.value)}
              placeholder="e.g., Monte Bello"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-text-secondary text-xs mb-1 block">Vintage</label>
              <input
                className="input"
                value={vintage}
                onChange={(e) => setVintage(e.target.value)}
                placeholder="e.g., 2019"
                inputMode="numeric"
                maxLength={4}
              />
            </div>
            <div>
              <label className="text-text-secondary text-xs mb-1 block">Varietal</label>
              <input
                className="input"
                value={varietal}
                onChange={(e) => setVarietal(e.target.value)}
                placeholder="e.g., Pinot Noir"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-text-secondary text-xs mb-1 block">Region</label>
              <input
                className="input"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g., Napa Valley"
              />
            </div>
            <div>
              <label className="text-text-secondary text-xs mb-1 block">Country</label>
              <input
                className="input"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g., USA"
              />
            </div>
          </div>

          {/* Style selector */}
          <div>
            <label className="text-text-secondary text-xs mb-2 block">Style</label>
            <div className="flex flex-wrap gap-2">
              {WINE_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(style === s ? '' : s)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-100',
                    style === s
                      ? 'bg-wine border-wine text-white'
                      : 'bg-bg-elevated border-border text-text-secondary active:scale-95'
                  )}
                >
                  {STYLE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── My Tasting Notes ── */}
      <section>
        <h2 className="label mb-3">My Tasting Notes</h2>
        <div className="space-y-3">
          {/* Rating */}
          <div>
            <label className="text-text-secondary text-xs mb-2 block">Rating</label>
            <RatingStars value={rating} onChange={setRating} size="lg" showEmpty />
          </div>

          {/* Notes */}
          <div>
            <label className="text-text-secondary text-xs mb-1 block">Notes</label>
            <textarea
              className="input min-h-[80px] resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dark cherry, hint of oak, long finish…"
              rows={3}
            />
          </div>

          {/* Would drink again */}
          <div>
            <label className="text-text-secondary text-xs mb-2 block">Would you drink this again?</label>
            <div className="flex gap-2">
              {[
                { value: true,  label: 'Yes' },
                { value: false, label: 'No'  },
                { value: null,  label: 'Not sure' },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setWouldDrinkAgain(opt.value)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all duration-100 active:scale-95',
                    wouldDrinkAgain === opt.value
                      ? 'bg-wine border-wine text-white'
                      : 'bg-bg-elevated border-border text-text-secondary'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location + price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-text-secondary text-xs mb-1 block">Where</label>
              <input
                className="input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Rosso NYC"
              />
            </div>
            <div>
              <label className="text-text-secondary text-xs mb-1 block">Price ($)</label>
              <input
                className="input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g., 45"
                inputMode="decimal"
              />
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="bg-red-950/40 border border-red-800/30 rounded-xl p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full py-4 text-base"
      >
        {saving ? 'Saving to Cellar…' : 'Save to My Cellar'}
      </button>
    </div>
  )
}
