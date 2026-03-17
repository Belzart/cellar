'use client'

import { useState, useEffect, useCallback } from 'react'
import { getMyWines } from '@/lib/actions/wines'
import WineCard from '@/components/wine/WineCard'
import CollectionFilters, { CollectionFiltersState } from '@/components/collection/CollectionFilters'
import EmptyState from '@/components/shared/EmptyState'
import { CollectionSkeleton } from '@/components/shared/LoadingSkeleton'
import { WineWithTastings } from '@/lib/types'
import Link from 'next/link'
import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CollectionPage() {
  const [wines, setWines] = useState<WineWithTastings[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const [filters, setFilters] = useState<CollectionFiltersState>({
    search: '',
    style: '',
    sort: 'recent',
    favorites: false,
  })

  const fetchWines = useCallback(async () => {
    setLoading(true)
    try {
      const results = await getMyWines({
        search: filters.search || undefined,
        style: filters.style || undefined,
        sort: filters.sort,
        favorites: filters.favorites || undefined,
      })
      setWines(results)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchWines()
  }, [fetchWines])

  const isEmpty = !loading && wines.length === 0
  const isFiltered = filters.search || filters.style || filters.favorites || filters.sort !== 'recent'

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Header */}
      <header className="px-5 pt-6 pb-2 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-medium text-cream tracking-tight">Collection</h1>
          {!loading && wines.length > 0 && (
            <p className="text-text-secondary text-xs mt-1">
              {wines.length} wine{wines.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-bg-elevated rounded-xl p-1 border border-border">
          <button
            onClick={() => setView('grid')}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              view === 'grid' ? 'bg-bg-card text-cream' : 'text-text-tertiary'
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              view === 'list' ? 'bg-bg-card text-cream' : 'text-text-tertiary'
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Filters */}
      <CollectionFilters value={filters} onChange={setFilters} />

      {/* Content */}
      {loading ? (
        <CollectionSkeleton />
      ) : isEmpty ? (
        <EmptyState
          icon="🍷"
          title={isFiltered ? 'No wines match' : 'Your cellar is empty'}
          description={
            isFiltered
              ? 'Try adjusting your filters or search terms.'
              : 'Scan wine labels to start building your personal collection.'
          }
          action={
            !isFiltered ? (
              <Link href="/scan" className="btn-primary px-6 py-3">
                Scan your first wine
              </Link>
            ) : undefined
          }
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 px-4 py-2">
          {wines.map((wine) => (
            <WineCard key={wine.id} wine={wine} variant="grid" />
          ))}
        </div>
      ) : (
        <div className="bg-bg-card rounded-2xl mx-4 my-2 border border-border overflow-hidden">
          {wines.map((wine) => (
            <WineCard key={wine.id} wine={wine} variant="list" />
          ))}
        </div>
      )}
    </div>
  )
}
