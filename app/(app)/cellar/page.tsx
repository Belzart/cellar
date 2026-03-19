import Link from 'next/link'
import { Camera, ChevronRight, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getRecentTastings } from '@/lib/actions/tastings'
import { getLatestProfile } from '@/lib/actions/recommendations'
import { getMyProfile } from '@/lib/actions/profile'
import WineCard from '@/components/wine/WineCard'
import InsightCard from '@/components/profile/InsightCard'
import EmptyState from '@/components/shared/EmptyState'
import { WineWithTastings } from '@/lib/types'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function CellarHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [recentTastings, profile, myProfile] = await Promise.all([
    getRecentTastings(6),
    getLatestProfile(),
    getMyProfile(),
  ])

  const recentWines: WineWithTastings[] = recentTastings
    .filter((t) => t.wine)
    .map((t) => ({
      ...t.wine,
      tastings: [t],
      tasting_count: 1,
      avg_rating: t.rating,
      last_tasted_at: t.tasted_at,
      is_favorite: t.is_favorite,
      signed_image_url: (t.wine as WineWithTastings & { signed_image_url?: string }).signed_image_url,
    }))

  const topInsights = profile?.insights.slice(0, 2) ?? []

  const displayName = myProfile?.display_name
    ?? user?.email?.split('@')[0]
    ?? 'there'

  const cellarName = myProfile?.cellar_name ?? 'My Cellar'

  return (
    <div className="min-h-screen animate-fade-in pb-tab-bar">
      {/* ── Header ── */}
      <header className="px-5 pt-6 pb-4 flex items-start justify-between">
        <div>
          <p className="text-text-secondary text-sm">{getGreeting()}, {displayName}</p>
          <h1 className="font-display text-3xl font-medium text-cream mt-0.5 tracking-tight">
            {cellarName}
          </h1>
          {profile && (
            <p className="text-text-tertiary text-xs mt-1">
              {profile.tasting_count} wine{profile.tasting_count !== 1 ? 's' : ''} in memory
            </p>
          )}
        </div>
        <Link
          href="/settings"
          className="w-9 h-9 rounded-full bg-bg-elevated border border-border flex items-center justify-center mt-1"
        >
          <Settings className="w-4 h-4 text-text-tertiary" />
        </Link>
      </header>

      {/* ── Quick Scan CTA ── */}
      <div className="px-4 mb-8">
        <Link href="/scan">
          <div className="relative rounded-3xl gradient-wine p-5 overflow-hidden shadow-wine active:scale-95 transition-transform duration-150">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-10 translate-x-10" />
            <div className="absolute bottom-0 right-8 w-24 h-24 rounded-full bg-white/5 translate-y-8" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-3">
                  <Camera className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <h2 className="font-display text-xl font-medium text-white">Scan a label</h2>
                <p className="text-white/70 text-sm mt-0.5">Add a wine to your memory</p>
              </div>
              <ChevronRight className="w-6 h-6 text-white/60 flex-shrink-0" />
            </div>
          </div>
        </Link>
      </div>

      {/* ── Palate Insights Preview ── */}
      {topInsights.length > 0 && (
        <section className="px-4 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-medium text-cream">Your Palate</h2>
            <Link href="/profile" className="text-text-secondary text-sm flex items-center gap-0.5">
              More <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-2">
            {topInsights.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>
        </section>
      )}

      {/* ── Recent Wines ── */}
      <section className="px-4 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-medium text-cream">Recently Tasted</h2>
          {recentWines.length > 0 && (
            <Link href="/collection" className="text-text-secondary text-sm flex items-center gap-0.5">
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {recentWines.length === 0 ? (
          <EmptyState
            icon="🍷"
            title="Your cellar is empty"
            description="Scan your first wine label to start building your personal wine memory."
            action={
              <Link href="/scan" className="btn-primary px-6 py-3">
                Scan a label
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recentWines.map((wine, i) => (
              <WineCard key={`${wine.id}-${i}`} wine={wine} variant="grid" />
            ))}
          </div>
        )}
      </section>

      {/* ── Find prompt (after enough wines) ── */}
      {recentWines.length >= 3 && (
        <div className="px-4 mb-8">
          <Link href="/shelf">
            <div className="card p-4 flex items-center gap-4 active:scale-95 transition-transform duration-150">
              <div className="w-12 h-12 rounded-2xl bg-gold/15 border border-gold/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🧭</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-base font-medium text-cream">
                  Find your next bottle
                </h3>
                <p className="text-text-secondary text-xs mt-0.5">
                  Photograph a shelf or menu for personalized picks
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0" />
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
