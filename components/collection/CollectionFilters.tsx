'use client'

import { useState } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import { cn, STYLE_LABELS } from '@/lib/utils'
import { WineStyle } from '@/lib/types'

export interface CollectionFiltersState {
  search: string
  style: WineStyle | ''
  sort: 'recent' | 'rating' | 'name' | 'vintage'
  favorites: boolean
}

interface CollectionFiltersProps {
  value: CollectionFiltersState
  onChange: (filters: CollectionFiltersState) => void
}

const STYLES: { value: WineStyle; label: string }[] = [
  { value: 'red', label: 'Red' },
  { value: 'white', label: 'White' },
  { value: 'rosé', label: 'Rosé' },
  { value: 'sparkling', label: 'Sparkling' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'orange', label: 'Orange' },
]

const SORTS = [
  { value: 'recent', label: 'Recently tasted' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'name',   label: 'Name A–Z' },
  { value: 'vintage', label: 'Vintage' },
] as const

export default function CollectionFilters({ value, onChange }: CollectionFiltersProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const activeFilterCount = [
    value.style !== '',
    value.sort !== 'recent',
    value.favorites,
  ].filter(Boolean).length

  function update(partial: Partial<CollectionFiltersState>) {
    onChange({ ...value, ...partial })
  }

  function reset() {
    onChange({ search: value.search, style: '', sort: 'recent', favorites: false })
    setSheetOpen(false)
  }

  return (
    <>
      {/* Search + filter toggle row */}
      <div className="flex items-center gap-2 px-4 py-3">
        <input
          className="input flex-1 h-10 text-sm"
          placeholder="Search wines…"
          value={value.search}
          onChange={(e) => update({ search: e.target.value })}
          autoCapitalize="none"
        />
        <button
          onClick={() => setSheetOpen(true)}
          className={cn(
            'w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 relative transition-colors',
            activeFilterCount > 0
              ? 'bg-wine-muted border-wine/30 text-wine-light'
              : 'bg-bg-elevated border-border text-text-secondary'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-wine text-white text-[9px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Quick style chips */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {STYLES.map((s) => (
          <button
            key={s.value}
            onClick={() => update({ style: value.style === s.value ? '' : s.value })}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap flex-shrink-0 transition-all duration-100 active:scale-95',
              value.style === s.value
                ? 'bg-wine border-wine text-white'
                : 'bg-bg-elevated border-border text-text-secondary'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Filter sheet (bottom drawer) */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet */}
          <div className="relative bg-bg-surface rounded-t-3xl border-t border-border p-6 pb-safe space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-medium text-cream">Filter & Sort</h2>
              <button onClick={() => setSheetOpen(false)}>
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Sort */}
            <div>
              <p className="label mb-3">Sort by</p>
              <div className="grid grid-cols-2 gap-2">
                {SORTS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => update({ sort: s.value })}
                    className={cn(
                      'py-3 px-4 rounded-xl text-sm font-medium border text-left transition-all active:scale-95',
                      value.sort === s.value
                        ? 'bg-wine-muted border-wine/30 text-wine-light'
                        : 'bg-bg-elevated border-border text-text-secondary'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Favorites */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cream text-sm font-medium">Favorites only</p>
                <p className="text-text-secondary text-xs">Show only wines I've starred</p>
              </div>
              <button
                onClick={() => update({ favorites: !value.favorites })}
                className={cn(
                  'w-12 h-7 rounded-full transition-all duration-200 relative',
                  value.favorites ? 'bg-wine' : 'bg-border-strong'
                )}
              >
                <div className={cn(
                  'absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all duration-200',
                  value.favorites ? 'left-[calc(100%-1.625rem)]' : 'left-0.5'
                )} />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button onClick={reset} className="btn-secondary flex-1">
                Reset
              </button>
              <button
                onClick={() => setSheetOpen(false)}
                className="btn-primary flex-1"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
