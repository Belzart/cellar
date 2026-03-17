'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
  value: number | null
  onChange?: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
  showEmpty?: boolean
}

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export default function RatingStars({
  value,
  onChange,
  size = 'md',
  readonly = false,
  showEmpty = true,
}: RatingStarsProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const display = hovered ?? value ?? 0
  const iconSize = sizes[size]

  if (readonly && !value && !showEmpty) return null

  return (
    <div className="flex items-center gap-0.5" role={readonly ? 'img' : 'group'} aria-label={`Rating: ${value ?? 'unrated'}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = display >= star
        const halfFilled = display >= star - 0.5 && display < star

        return (
          <button
            key={star}
            type={readonly ? 'button' : 'button'}
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(null)}
            onTouchStart={() => !readonly && setHovered(star)}
            onTouchEnd={() => { if (!readonly) { onChange?.(star); setHovered(null) }}}
            className={cn(
              'transition-transform duration-75 focus:outline-none',
              !readonly && 'active:scale-125 cursor-pointer hover:scale-110',
              readonly && 'cursor-default'
            )}
          >
            <Star
              className={cn(
                iconSize,
                'transition-colors duration-75',
                filled
                  ? 'fill-gold text-gold'
                  : halfFilled
                  ? 'fill-gold/50 text-gold'
                  : 'fill-transparent text-border-strong'
              )}
              strokeWidth={1.5}
            />
          </button>
        )
      })}
    </div>
  )
}

// Simple display-only rating badge
export function RatingBadge({ rating }: { rating: number | null }) {
  if (!rating) return null
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 fill-gold text-gold" strokeWidth={1.5} />
      <span className="text-sm font-medium text-gold">{rating.toFixed(1)}</span>
    </div>
  )
}
