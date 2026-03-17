import { Tasting } from '@/lib/types'
import { formatDate, formatPrice } from '@/lib/utils'
import RatingStars from './RatingStars'
import { MapPin, DollarSign } from 'lucide-react'

interface TastingCardProps {
  tasting: Tasting
  showDate?: boolean
}

export default function TastingCard({ tasting, showDate = true }: TastingCardProps) {
  return (
    <div className="card p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          {showDate && (
            <p className="text-text-tertiary text-xs mb-1">{formatDate(tasting.tasted_at)}</p>
          )}
          {tasting.rating && (
            <RatingStars value={tasting.rating} readonly size="sm" />
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          {tasting.would_drink_again === true && (
            <span className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded-full">
              Would drink again
            </span>
          )}
          {tasting.would_drink_again === false && (
            <span className="text-xs text-text-tertiary">Wouldn't repeat</span>
          )}
        </div>
      </div>

      {/* Notes */}
      {tasting.notes && (
        <p className="text-text text-sm leading-relaxed italic">&ldquo;{tasting.notes}&rdquo;</p>
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
  )
}
