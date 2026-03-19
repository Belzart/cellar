// My Bottles — physical inventory of wines at home
// Accessible from Collection page via a top toggle

import Link from 'next/link'
import Image from 'next/image'
import { getMyBottles } from '@/lib/actions/inventory'
import BottleActions from '@/components/wine/BottleActions'
import EmptyState from '@/components/shared/EmptyState'
import { STYLE_COLORS, STYLE_LABELS, cn } from '@/lib/utils'

export default async function MyBottlesPage() {
  const bottles = await getMyBottles()

  return (
    <div className="min-h-screen animate-fade-in pb-tab-bar">
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-display text-3xl font-medium text-cream tracking-tight">My Bottles</h1>
        <p className="text-text-secondary text-sm mt-1">
          {bottles.length > 0
            ? `${bottles.reduce((sum, b) => sum + b.quantity, 0)} bottle${bottles.reduce((s, b) => s + b.quantity, 0) !== 1 ? 's' : ''} at home`
            : 'Wines you currently have at home'}
        </p>
      </header>

      {bottles.length === 0 ? (
        <EmptyState
          icon="🍾"
          title="No bottles tracked"
          description="Open a wine's detail page and tap 'Add to My Bottles' to start tracking what you have at home."
          action={
            <Link href="/collection" className="btn-primary px-6 py-3">
              Browse collection
            </Link>
          }
        />
      ) : (
        <div className="px-4 space-y-3">
          {bottles.map((item) => {
            const imageUrl = item.signed_image_url
              ?? (item.wine.primary_label_image_url?.startsWith('http')
                ? item.wine.primary_label_image_url
                : null)

            return (
              <div key={item.id} className="card overflow-hidden">
                <div className="flex items-stretch">
                  {/* Wine image */}
                  <Link href={`/wine/${item.wine_id}`} className="relative w-20 bg-bg-elevated flex-shrink-0 flex items-center justify-center">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={item.wine.canonical_name}
                        fill
                        className="object-contain p-1"
                      />
                    ) : (
                      <span className="text-3xl">🍷</span>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0 px-4 py-3">
                    <Link href={`/wine/${item.wine_id}`}>
                      <h3 className="font-display text-base font-medium text-cream leading-tight line-clamp-1">
                        {item.wine.producer ?? item.wine.canonical_name}
                      </h3>
                      {item.wine.wine_name && (
                        <p className="text-text-secondary text-xs mt-0.5 line-clamp-1">
                          {item.wine.wine_name}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {item.wine.vintage && (
                          <span className="text-text-tertiary text-xs">{item.wine.vintage}</span>
                        )}
                        {item.wine.style && (
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full border font-medium',
                            STYLE_COLORS[item.wine.style] ?? STYLE_COLORS.other
                          )}>
                            {STYLE_LABELS[item.wine.style]}
                          </span>
                        )}
                      </div>
                      {item.storage_note && (
                        <p className="text-text-tertiary text-xs mt-1 italic">{item.storage_note}</p>
                      )}
                    </Link>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex-shrink-0 pr-3 py-3 flex flex-col items-end justify-center">
                    <BottleActions
                      inventoryId={item.id}
                      quantity={item.quantity}
                      wineId={item.wine_id}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
