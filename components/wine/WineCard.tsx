import Link from 'next/link'
import Image from 'next/image'
import { Heart } from 'lucide-react'
import { WineWithTastings, OverallReaction, REACTION_LABELS } from '@/lib/types'
import { STYLE_COLORS, STYLE_LABELS, cn } from '@/lib/utils'

const REACTION_EMOJI: Record<OverallReaction, string> = {
  obsessed:    '🤩',
  loved_it:    '😍',
  liked_it:    '😊',
  okay:        '😐',
  not_for_me:  '😕',
}

function ReactionBadge({ tastings }: { tastings: WineWithTastings['tastings'] }) {
  const reaction = tastings[0]?.overall_reaction as OverallReaction | null
  if (!reaction) return null
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm leading-none">{REACTION_EMOJI[reaction]}</span>
    </div>
  )
}

interface WineCardProps {
  wine: WineWithTastings
  variant?: 'grid' | 'list' | 'hero'
}

export default function WineCard({ wine, variant = 'grid' }: WineCardProps) {
  // Use pre-signed URL when available, fall back to direct URL (for public or already-signed URLs)
  const imageUrl = wine.signed_image_url ?? (wine.primary_label_image_url?.startsWith('http') ? wine.primary_label_image_url : null)

  if (variant === 'list') {
    return (
      <Link href={`/wine/${wine.id}`} className="block active:opacity-75 transition-opacity">
        <div className="flex items-center gap-4 py-4 px-4 border-b border-border last:border-0">
          {/* Thumbnail */}
          <div className="w-16 h-20 rounded-xl overflow-hidden bg-bg-elevated flex-shrink-0 flex items-center justify-center border border-border">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={wine.canonical_name}
                width={64}
                height={80}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-2xl">🍷</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base font-medium text-cream truncate">
              {wine.producer ?? wine.canonical_name}
            </h3>
            {wine.wine_name && (
              <p className="text-text-secondary text-sm truncate">{wine.wine_name}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {wine.vintage && (
                <span className="text-text-tertiary text-xs">{wine.vintage}</span>
              )}
              {wine.style && (
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full border font-medium',
                  STYLE_COLORS[wine.style] ?? STYLE_COLORS.other
                )}>
                  {STYLE_LABELS[wine.style]}
                </span>
              )}
              {wine.region && (
                <span className="text-text-tertiary text-xs truncate">{wine.region}</span>
              )}
            </div>
          </div>

          {/* Rating + favorite */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <ReactionBadge tastings={wine.tastings} />
            {wine.is_favorite && (
              <Heart className="w-4 h-4 fill-wine text-wine" />
            )}
            <span className="text-text-tertiary text-xs">
              {wine.tasting_count}×
            </span>
          </div>
        </div>
      </Link>
    )
  }

  if (variant === 'hero') {
    return (
      <Link href={`/wine/${wine.id}`} className="block">
        <div className="relative rounded-3xl overflow-hidden aspect-[3/4] bg-bg-card border border-border active:scale-95 transition-transform duration-150">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={wine.canonical_name}
              fill
              className="object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-bg-elevated to-bg-card">
              <span className="text-6xl">🍷</span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {wine.is_favorite && (
              <Heart className="w-4 h-4 fill-wine text-wine mb-2" />
            )}
            <h3 className="font-display text-lg font-medium text-cream leading-tight">
              {wine.producer}
            </h3>
            {wine.wine_name && (
              <p className="text-cream/70 text-sm">{wine.wine_name}</p>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="text-cream/50 text-xs">{wine.vintage}</span>
              <ReactionBadge tastings={wine.tastings} />
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Default: grid card
  return (
    <Link href={`/wine/${wine.id}`} className="block">
      <div className="card active:scale-95 transition-transform duration-150 overflow-hidden">
        {/* Image */}
        <div className="relative w-full aspect-[4/5] bg-bg-elevated flex items-center justify-center">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={wine.canonical_name}
              fill
              className="object-contain p-1"
            />
          ) : (
            <span className="text-4xl">🍷</span>
          )}
          {wine.is_favorite && (
            <div className="absolute top-2 right-2">
              <Heart className="w-4 h-4 fill-wine text-wine drop-shadow-sm" />
            </div>
          )}
          {wine.style && (
            <div className="absolute bottom-2 left-2">
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full border font-medium',
                STYLE_COLORS[wine.style] ?? STYLE_COLORS.other
              )}>
                {STYLE_LABELS[wine.style]}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-display text-sm font-medium text-cream leading-tight line-clamp-1">
            {wine.producer ?? wine.canonical_name}
          </h3>
          {wine.wine_name && (
            <p className="text-text-secondary text-xs mt-0.5 line-clamp-1">{wine.wine_name}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-text-tertiary text-xs">{wine.vintage ?? '—'}</span>
            <ReactionBadge tastings={wine.tastings} />
          </div>
        </div>
      </div>
    </Link>
  )
}
