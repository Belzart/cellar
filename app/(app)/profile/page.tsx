import { getLatestProfile } from '@/lib/actions/recommendations'
import InsightCard from '@/components/profile/InsightCard'
import EmptyState from '@/components/shared/EmptyState'
import Link from 'next/link'
import { STYLE_LABELS } from '@/lib/utils'

export default async function ProfilePage() {
  const profile = await getLatestProfile()

  return (
    <div className="min-h-screen animate-fade-in pb-8">
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-display text-3xl font-medium text-cream tracking-tight">My Palate</h1>
        <p className="text-text-secondary text-sm mt-1">Your taste profile and settings</p>
      </header>

      {/* ── Insights ── */}
      {(!profile || profile.tasting_count < 3) ? (
        <EmptyState
          icon="🍇"
          title="Your palate is still forming"
          description="Rate at least 3 wines to see personalized insights about your taste preferences."
          action={
            <Link href="/scan" className="btn-primary px-6 py-3">
              Scan & rate a wine
            </Link>
          }
        />
      ) : (
        <>
          <div className="px-4 mb-1">
            <p className="text-text-tertiary text-xs">
              Based on {profile.tasting_count} rated tasting{profile.tasting_count !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Key Insights */}
          {profile.insights.length > 0 && (
            <section className="px-4 mb-8 mt-4">
              <h2 className="label mb-3">Key Insights</h2>
              <div className="space-y-2">
                {profile.insights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} />
                ))}
              </div>
            </section>
          )}

          {/* Favorite Varietals */}
          {profile.preferred_varietals.length > 0 && (
            <section className="px-4 mb-8">
              <h2 className="label mb-3">Favorite Varietals</h2>
              <div className="card p-4 space-y-4">
                {(() => {
                  const top = profile.preferred_varietals.slice(0, 5)
                  const maxW = Math.max(...top.map((v) => v.weight), 0.001)
                  return top.map((v) => (
                    <div key={v.varietal}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-cream text-sm font-medium">{v.varietal}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gold text-sm font-medium">{v.avg_rating.toFixed(1)}</span>
                          <span className="text-text-tertiary text-xs">({v.count}×)</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(v.weight / maxW) * 100}%`,
                            background: 'linear-gradient(90deg, #6B1414, #A52020)',
                          }}
                        />
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </section>
          )}

          {/* Favorite Regions */}
          {profile.preferred_regions.length > 0 && (
            <section className="px-4 mb-8">
              <h2 className="label mb-3">Favorite Regions</h2>
              <div className="card p-1 overflow-hidden">
                {profile.preferred_regions.slice(0, 5).map((r, i) => (
                  <div
                    key={r.region}
                    className="flex items-center justify-between px-3 py-3 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-cream text-sm font-medium">{r.region}</p>
                      {r.country && <p className="text-text-tertiary text-xs">{r.country}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-text-secondary text-xs">{r.count}×</span>
                      <span className="text-gold text-sm font-medium">{r.avg_rating.toFixed(1)}</span>
                      <span className="text-text-tertiary text-xs w-5 text-right">#{i + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Style Breakdown */}
          {profile.preferred_styles.length > 0 && (
            <section className="px-4 mb-8">
              <h2 className="label mb-3">Style Breakdown</h2>
              <div className="grid grid-cols-2 gap-3">
                {profile.preferred_styles.slice(0, 4).map((s) => (
                  <div key={s.style} className="card p-4">
                    <p className="text-text-secondary text-xs">{STYLE_LABELS[s.style]}</p>
                    <p className="font-display text-2xl font-medium text-cream mt-1">{s.percentage}%</p>
                    <p className="text-text-tertiary text-xs mt-1">
                      avg {s.avg_rating.toFixed(1)} · {s.count}×
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Disliked patterns */}
          {profile.disliked_patterns.length > 0 && (
            <section className="px-4 mb-8">
              <h2 className="label mb-3">Less Your Style</h2>
              <div className="card p-1">
                {profile.disliked_patterns.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-3 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-text-secondary text-sm">{d.value}</p>
                      <p className="text-text-tertiary text-xs capitalize">{d.type}</p>
                    </div>
                    <span className="text-text-secondary text-sm">{d.avg_rating.toFixed(1)} avg</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

    </div>
  )
}
