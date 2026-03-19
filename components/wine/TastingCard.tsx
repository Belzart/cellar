'use client'

import { useState } from 'react'
import { Tasting, REACTION_LABELS, OverallReaction } from '@/lib/types'
import { formatDate, formatPrice, cn } from '@/lib/utils'
import { MapPin, DollarSign, Pencil } from 'lucide-react'
import EditTastingSheet from './EditTastingSheet'

interface TastingCardProps {
  tasting: Tasting
  showDate?: boolean
}

const REACTION_COLORS: Record<OverallReaction, string> = {
  obsessed:    'bg-wine/20 border-wine/40 text-wine-light',
  loved_it:    'bg-rose-950/40 border-rose-800/40 text-rose-300',
  liked_it:    'bg-emerald-950/40 border-emerald-800/40 text-emerald-400',
  okay:        'bg-bg-elevated border-border text-text-secondary',
  not_for_me:  'bg-bg-elevated border-border text-text-tertiary',
}

const REACTION_EMOJI: Record<OverallReaction, string> = {
  obsessed:    '🤩',
  loved_it:    '😍',
  liked_it:    '😊',
  okay:        '😐',
  not_for_me:  '😕',
}

const BODY_LABELS: Record<number, string> = {
  1: 'Very light',
  2: 'Light',
  3: 'Medium body',
  4: 'Full body',
  5: 'Very full',
}

export default function TastingCard({ tasting, showDate = true }: TastingCardProps) {
  const [editing, setEditing] = useState(false)
  const reaction = tasting.overall_reaction as OverallReaction | null
  const hasTags = tasting.vibe_tags && tasting.vibe_tags.length > 0

  return (
    <>
      <div className="card p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {showDate && (
              <p className="text-text-tertiary text-xs mb-1.5">{formatDate(tasting.tasted_at)}</p>
            )}
            {reaction ? (
              <span className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
                REACTION_COLORS[reaction]
              )}>
                <span>{REACTION_EMOJI[reaction]}</span>
                {REACTION_LABELS[reaction]}
              </span>
            ) : (
              <span className="text-text-tertiary text-xs italic">No rating yet</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {tasting.body_score && (
              <span className="text-xs text-text-tertiary bg-bg-elevated border border-border px-2 py-0.5 rounded-full">
                {BODY_LABELS[tasting.body_score]}
              </span>
            )}
            {tasting.would_drink_again === true && !reaction && (
              <span className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded-full">
                Would drink again
              </span>
            )}
            <button
              onClick={() => setEditing(true)}
              className="w-7 h-7 rounded-full bg-bg-elevated border border-border flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Edit tasting"
            >
              <Pencil className="w-3.5 h-3.5 text-text-tertiary" />
            </button>
          </div>
        </div>

        {/* Vibe tags */}
        {hasTags && (
          <div className="flex flex-wrap gap-1.5">
            {tasting.vibe_tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-gold/10 border border-gold/25 text-gold/80"
              >
                {tag.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Memory note (falls back to legacy notes) */}
        {(tasting.memory_note || tasting.notes) && (
          <p className="text-text text-sm leading-relaxed italic">
            &ldquo;{tasting.memory_note || tasting.notes}&rdquo;
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 text-text-secondary text-xs">
          {tasting.location_text && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{tasting.location_text}</span>
            </div>
          )}
          {tasting.price_paid_cents && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>{formatPrice(tasting.price_paid_cents, tasting.price_currency)}</span>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditTastingSheet
          tasting={tasting}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}
