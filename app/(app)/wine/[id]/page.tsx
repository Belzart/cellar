import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getWineDetail } from '@/lib/actions/wines'
import { getSignedUrl } from '@/lib/actions/upload'
import TastingCard from '@/components/wine/TastingCard'
import RatingStars, { RatingBadge } from '@/components/wine/RatingStars'
import { createClient } from '@/lib/supabase/server'
import { STYLE_COLORS, STYLE_LABELS, cn, formatDate } from '@/lib/utils'
import { ChevronLeft, Heart, Grape, MapPin, Calendar } from 'lucide-react'

interface WineDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function WineDetailPage({ params }: WineDetailPageProps) {
  const { id } = await params
  const wine = await getWineDetail(id)

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

  return (
    <div className="min-h-screen animate-fade-in">
      {/* ── Hero Image ── */}
      <div className="relative w-full h-80 bg-bg-elevated">
        {labelImageUrl ? (
          <Image
            src={labelImageUrl}
            alt={wine.canonical_name}
            fill
            className="object-contain"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-8xl">🍷</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />

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
      </div>

      {/* ── Content ── */}
      <div className="px-5 pb-8 -mt-4 relative z-10 space-y-6">
        {/* Title block */}
        <div>
          {wine.style && (
            <span className={cn(
              'text-xs px-2.5 py-1 rounded-full border font-medium',
              STYLE_COLORS[wine.style] ?? STYLE_COLORS.other
            )}>
              {STYLE_LABELS[wine.style]}
            </span>
          )}
          <h1 className="font-display text-2xl font-medium text-cream mt-2 leading-tight">
            {wine.producer ?? wine.canonical_name}
          </h1>
          {wine.wine_name && (
            <p className="text-text-secondary text-base mt-0.5">{wine.wine_name}</p>
          )}

          {/* Rating summary */}
          <div className="flex items-center gap-4 mt-3">
            {wine.avg_rating && (
              <>
                <RatingBadge rating={wine.avg_rating} />
                <span className="text-text-tertiary text-sm">
                  {wine.tasting_count} tasting{wine.tasting_count !== 1 ? 's' : ''}
                </span>
              </>
            )}
            {!wine.avg_rating && (
              <span className="text-text-tertiary text-sm">No rating yet</span>
            )}
          </div>
        </div>

        {/* ── Wine Metadata ── */}
        <div className="card p-4 space-y-3">
          <h2 className="label">Wine Details</h2>
          <div className="grid grid-cols-2 gap-3">
            {wine.vintage && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-text-secondary flex-shrink-0" />
                <div>
                  <p className="text-text-tertiary text-xs">Vintage</p>
                  <p className="text-cream text-sm font-medium">{wine.vintage}</p>
                </div>
              </div>
            )}
            {wine.varietal && (
              <div className="flex items-center gap-2">
                <Grape className="w-4 h-4 text-text-secondary flex-shrink-0" />
                <div>
                  <p className="text-text-tertiary text-xs">Varietal</p>
                  <p className="text-cream text-sm font-medium">{wine.varietal}</p>
                </div>
              </div>
            )}
            {(wine.region || wine.country) && (
              <div className="flex items-center gap-2 col-span-2">
                <MapPin className="w-4 h-4 text-text-secondary flex-shrink-0" />
                <div>
                  <p className="text-text-tertiary text-xs">Origin</p>
                  <p className="text-cream text-sm font-medium">
                    {[wine.appellation, wine.region, wine.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {wine.blend_components?.length > 0 && (
            <div>
              <p className="text-text-tertiary text-xs mb-2">Blend</p>
              <div className="flex flex-wrap gap-1.5">
                {wine.blend_components.map((c, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-bg-elevated rounded-full border border-border text-text-secondary">
                    {c.varietal}{c.percentage ? ` ${c.percentage}%` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Tasting History ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-medium text-cream">
              My Tastings
            </h2>
            <Link href="/scan" className="text-wine-light text-sm">
              + Add tasting
            </Link>
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
