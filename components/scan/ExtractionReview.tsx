'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ExtractedWineData, WineStyle, SaveTastingInput, OverallReaction, REACTION_LABELS, VIBE_TAGS } from '@/lib/types'
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

// Show the most useful vibe tags in the UI (can expand to show all)
const PRIMARY_VIBE_TAGS = [
  'bold', 'soft', 'smooth', 'dry', 'juicy', 'rich', 'light',
  'oaky', 'elegant', 'cozy', 'fun', 'forgettable', 'special',
  'complex', 'simple', 'refreshing', 'warming', 'surprising',
] as const

const REACTION_OPTIONS: { value: OverallReaction; emoji: string }[] = [
  { value: 'obsessed',    emoji: '🤩' },
  { value: 'loved_it',   emoji: '😍' },
  { value: 'liked_it',   emoji: '😊' },
  { value: 'okay',       emoji: '😐' },
  { value: 'not_for_me', emoji: '😕' },
]

const BODY_LABELS: Record<number, string> = {
  1: 'Very light',
  2: 'Light',
  3: 'Medium',
  4: 'Full',
  5: 'Very full',
}

export default function ExtractionReview({
  extracted,
  imageUrl,
  onSave,
  uploadedImageId,
}: ExtractionReviewProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAllVibes, setShowAllVibes] = useState(false)

  // Editable wine detail fields
  const [producer, setProducer] = useState(extracted.producer ?? '')
  const [wineName, setWineName] = useState(extracted.wine_name ?? '')
  const [vintage, setVintage] = useState(extracted.vintage?.toString() ?? '')
  const [region, setRegion] = useState(extracted.region ?? '')
  const [country, setCountry] = useState(extracted.country ?? '')
  const [varietal, setVarietal] = useState(extracted.varietal ?? '')
  const [style, setStyle] = useState<WineStyle | ''>(extracted.style ?? '')

  // Vibe fields
  const [reaction, setReaction] = useState<OverallReaction | null>(null)
  const [vibeTags, setVibeTags] = useState<string[]>([])
  const [memoryNote, setMemoryNote] = useState('')
  const [bodyScore, setBodyScore] = useState<number | null>(null)
  const [location, setLocation] = useState('')
  const [price, setPrice] = useState('')

  const confidenceColor =
    extracted.confidence >= 0.8 ? 'text-emerald-400' :
    extracted.confidence >= 0.5 ? 'text-gold' : 'text-orange-400'

  function toggleVibeTag(tag: string) {
    setVibeTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const displayedVibes = showAllVibes ? VIBE_TAGS : PRIMARY_VIBE_TAGS

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
        // Vibe system
        overall_reaction: reaction ?? undefined,
        vibe_tags: vibeTags.length > 0 ? vibeTags : undefined,
        memory_note: memoryNote || undefined,
        body_score: bodyScore ?? undefined,
        // Context
        location_text: location || undefined,
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

      {/* ── How did it make you feel? ── */}
      <section>
        <h2 className="label mb-3">How Was It?</h2>
        <div className="space-y-5">

          {/* Overall reaction — required */}
          <div>
            <label className="text-text-secondary text-xs mb-3 block">Overall reaction</label>
            <div className="flex gap-2">
              {REACTION_OPTIONS.map(({ value, emoji }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReaction(reaction === value ? null : value)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border text-xs font-medium transition-all duration-100 active:scale-95',
                    reaction === value
                      ? 'bg-wine border-wine text-white'
                      : 'bg-bg-elevated border-border text-text-secondary'
                  )}
                >
                  <span className="text-xl leading-none">{emoji}</span>
                  <span className="leading-tight text-center" style={{ fontSize: '10px' }}>
                    {REACTION_LABELS[value]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Vibe tags — optional */}
          <div>
            <label className="text-text-secondary text-xs mb-3 block">
              Vibe tags <span className="text-text-tertiary">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {displayedVibes.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleVibeTag(tag)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-100 active:scale-95',
                    vibeTags.includes(tag)
                      ? 'bg-gold/20 border-gold text-gold'
                      : 'bg-bg-elevated border-border text-text-secondary'
                  )}
                >
                  {tag.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            {!showAllVibes && (
              <button
                type="button"
                onClick={() => setShowAllVibes(true)}
                className="mt-2 text-xs text-text-tertiary underline"
              >
                Show more tags
              </button>
            )}
          </div>

          {/* Memory note — optional */}
          <div>
            <label className="text-text-secondary text-xs mb-1 block">
              Memory note <span className="text-text-tertiary">(optional)</span>
            </label>
            <textarea
              className="input min-h-[80px] resize-none"
              value={memoryNote}
              onChange={(e) => setMemoryNote(e.target.value)}
              placeholder="How did it feel? What do you remember about it?"
              rows={3}
            />
          </div>

          {/* Body slider — optional */}
          <div>
            <label className="text-text-secondary text-xs mb-2 block">
              Body <span className="text-text-tertiary">(optional)</span>
            </label>
            <div className="flex items-center gap-3">
              <span className="text-text-tertiary text-xs w-16 text-right">Light</span>
              <div className="flex gap-2 flex-1 justify-between">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setBodyScore(bodyScore === n ? null : n)}
                    className={cn(
                      'w-9 h-9 rounded-full border text-xs font-medium transition-all duration-100 active:scale-95',
                      bodyScore === n
                        ? 'bg-wine border-wine text-white'
                        : 'bg-bg-elevated border-border text-text-secondary'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="text-text-tertiary text-xs w-16">Full</span>
            </div>
            {bodyScore && (
              <p className="text-center text-text-tertiary text-xs mt-1.5">
                {BODY_LABELS[bodyScore]}
              </p>
            )}
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
