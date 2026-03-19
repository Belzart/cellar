'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Tasting, OverallReaction, REACTION_LABELS, VIBE_TAGS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { updateTasting } from '@/lib/actions/tastings'

interface EditTastingSheetProps {
  tasting: Tasting
  onClose: () => void
}

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

export default function EditTastingSheet({ tasting, onClose }: EditTastingSheetProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showAllVibes, setShowAllVibes] = useState(false)

  const [reaction, setReaction] = useState<OverallReaction | null>(
    (tasting.overall_reaction as OverallReaction) ?? null
  )
  const [vibeTags, setVibeTags] = useState<string[]>(tasting.vibe_tags ?? [])
  const [memoryNote, setMemoryNote] = useState(tasting.memory_note ?? tasting.notes ?? '')
  const [bodyScore, setBodyScore] = useState<number | null>(tasting.body_score ?? null)
  const [location, setLocation] = useState(tasting.location_text ?? '')
  const [price, setPrice] = useState(
    tasting.price_paid_cents ? (tasting.price_paid_cents / 100).toFixed(0) : ''
  )

  function toggleVibeTag(tag: string) {
    setVibeTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const displayedVibes = showAllVibes ? VIBE_TAGS : PRIMARY_VIBE_TAGS

  function handleSave() {
    setError(null)
    startTransition(async () => {
      try {
        await updateTasting(tasting.id, {
          overall_reaction: reaction ?? undefined,
          vibe_tags: vibeTags,
          memory_note: memoryNote || undefined,
          body_score: bodyScore ?? undefined,
          location_text: location || undefined,
          price_paid_cents: price ? Math.round(parseFloat(price) * 100) : undefined,
        })
        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card border-t border-border rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="font-display text-lg font-medium text-cream">Edit Tasting</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-bg-elevated border border-border flex items-center justify-center"
          >
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>

        <div className="px-5 pb-10 space-y-6">

          {/* Overall reaction */}
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

          {/* Vibe tags */}
          <div>
            <label className="text-text-secondary text-xs mb-3 block">Vibe tags</label>
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

          {/* Memory note */}
          <div>
            <label className="text-text-secondary text-xs mb-1 block">Memory note</label>
            <textarea
              className="input min-h-[80px] resize-none"
              value={memoryNote}
              onChange={(e) => setMemoryNote(e.target.value)}
              placeholder="How did it feel? What do you remember about it?"
              rows={3}
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-text-secondary text-xs mb-2 block">Body</label>
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

          {error && (
            <div className="bg-red-950/40 border border-red-800/30 rounded-xl p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isPending}
            className="btn-primary w-full py-4 text-base"
          >
            {isPending ? 'Saving…' : 'Save Notes'}
          </button>
        </div>
      </div>
    </>
  )
}
