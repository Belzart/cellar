import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getWineDetail } from '@/lib/actions/wines'
import { getBottleForWine } from '@/lib/actions/inventory'
import TastingCard from '@/components/wine/TastingCard'
import AddToBottlesButton from '@/components/wine/AddToBottlesButton'
import WineProfileSection from '@/components/wine/WineProfileSection'
import { createClient } from '@/lib/supabase/server'
import { STYLE_COLORS, STYLE_LABELS, cn } from '@/lib/utils'
import { REACTION_LABELS, OverallReaction } from '@/lib/types'
import { ChevronLeft, Heart } from 'lucide-react'

interface WineDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function WineDetailPage({ params }: WineDetailPageProps) {
  const { id } = await params
  const [wine, bottle] = await Promise.all([
    getWineDetail(id),
    getBottleForWine(id),
  ])

  if (!wine) notFound()

  // Get signed URL for primary label image
  let labelImageUrl: string | undefined
  if (wine.primary_label_image_url?.startsWith('http')) {
    labelImageUrl = wine.primary_label_image_url
  } else if (wine.primary_label_image_url) {
    const supabase = await createClient()
    const { data } = await supabase.storage
      .from('cellar-images')
      .createSignedUrl(wine.primary_label_image_url, 3600)
    labelImageUrl = data?.signedUrl
  }

  // Get signed URLs for tasting images
  const tastingsWithImages = await Promise.all(
    wine.tastings.map(async (t) => {
      if (!t.uploaded_image_id) return { ...t, imageUrl: undefined }
      const supabase = await createClient()
      const { data: imgRecord } = await supabase
        .from('uploaded_images')
        .select('storage_path')
        .eq('id', t.uploaded_image_id)
        .single()
      if (!imgRecord) return { ...t, imageUrl: undefined }
      const { data } = await supabase.storage
        .from('cellar-images')
        .createSignedUrl(imgRecord.storage_path, 3600)
      return { ...t, imageUrl: data?.signedUrl }
    })
  )

  const isFavorite = wine.is_favorite
  const latestTasting = wine.tastings[0]

  return (
    <div className="min-h-screen animate-fade-in pb-tab-bar">
      {/* ── Hero Image — taller, more immersive ── */}
      <div className="relative w-full h-[42vh] min-h-[280px] max-h-[380px] bg-bg-elevated">
        {labelImageUrl ? (
          <Image
            src={labelImageUrl}
            alt={wine.canonical_name}
            fill
            className="object-contain"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-bg-elevated to-bg">
            <span className="text-[100px] leading-none select-none">🍷</span>
          </div>
        )}

        {/* Gradient overlay — stronger at bottom for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />

        {/* Back button */}
        <Link
          href="/collection"
          className="absolute top-4 left-4 w-10 h-10 rounded-full glass border border-border flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-cream" />
        </Link>

        {/* Favorite indicator */}
        {isFavorite && (
          <div className="absolute top-4 right-4 w-10 h-10 rounded-full glass border border-wine/30 flex items-center justify-center">
            <Heart className="w-5 h-5 fill-wine text-wine" />
          </div>
        )}

        {/* Style badge floated into hero */}
        {wine.style && (
          <div className="absolute bottom-4 left-5">
            <span className={cn(
              'text-xs px-2.5 py-1 rounded-full border font-medium',
              STYLE_COLORS[wine.style] ?? STYLE_COLORS.other
            )}>
              {STYLE_LABELS[wine.style]}
            </span>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="px-5 pb-8 -mt-2 relative z-10 space-y-6">
        {/* Title block */}
        <div>
          <h1 className="font-display text-2xl font-medium text-cream leading-tight">
            {wine.producer ?? wine.canonical_name}
          </h1>
          {wine.wine_name && (
            <p className="text-text-secondary text-base mt-0.5">{wine.wine_name}</p>
          )}
          {wine.vintage && (
            <p className="text-text-tertiary text-sm mt-1">{wine.vintage}</p>
          )}

          {/* Tasting summary */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {wine.tasting_count > 0 && (
              <span className="text-text-tertiary text-sm">
                {wine.tasting_count} tasting{wine.tasting_count !== 1 ? 's' : ''}
              </span>
            )}
            {(() => {
              const latestReaction = latestTasting?.overall_reaction as OverallReaction | null
              if (!latestReaction) return null
              return (
                <span className="text-text-secondary text-sm">
                  · {REACTION_LABELS[latestReaction]}
                </span>
              )
            })()}
          </div>
        </div>

        {/* ── My Bottles row ── */}
        <AddToBottlesButton
          wineId={wine.id}
          wineName={wine.producer ?? wine.canonical_name}
          currentBottle={bottle}
        />

        {/* ── Editorial Wine Profile ── */}
        <WineProfileSection wine={wine} latestTasting={latestTasting} />

        {/* ── Tasting History ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-medium text-cream">My Tastings</h2>
            <Link href="/scan" className="text-wine-light text-sm">+ Add tasting</Link>
          </div>

          {tastingsWithImages.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-text-secondary text-sm">No tasting notes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tastingsWithImages.map((tasting) => (
                <TastingCard key={tasting.id} tasting={tasting} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
