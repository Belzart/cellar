// Editorial wine profile — combines structured metadata with tasting-derived character
// Only shows data that actually exists. No fake precision.

import { Wine, Tasting } from '@/lib/types'
import { MapPin, Grape, Globe } from 'lucide-react'

interface Props {
  wine: Wine
  latestTasting?: Tasting
}

// Infer a plain-language style summary from vibe tags + body_score
function buildStyleSummary(tasting?: Tasting): string | null {
  if (!tasting) return null
  const tags = tasting.vibe_tags ?? []
  const body = tasting.body_score

  const parts: string[] = []

  // Body descriptor
  if (body !== null && body !== undefined) {
    if (body <= 1) parts.push('very light')
    else if (body === 2) parts.push('light')
    else if (body === 3) parts.push('medium-bodied')
    else if (body === 4) parts.push('full-bodied')
    else if (body >= 5) parts.push('very full-bodied')
  }

  // Structure descriptors from tags
  if (tags.includes('smooth')) parts.push('smooth')
  if (tags.includes('sharp')) parts.push('high acidity')
  if (tags.includes('structured')) parts.push('structured')
  if (tags.includes('elegant')) parts.push('elegant')
  if (tags.includes('rich')) parts.push('rich')
  if (tags.includes('oaky')) parts.push('oak-influenced')
  if (tags.includes('dry')) parts.push('dry')
  if (tags.includes('juicy')) parts.push('fruit-forward')
  if (tags.includes('delicate')) parts.push('delicate')
  if (tags.includes('complex')) parts.push('complex')
  if (tags.includes('refreshing')) parts.push('refreshing')

  if (parts.length === 0) return null

  // Compose to sentence — max 4 descriptors
  const chosen = parts.slice(0, 4)
  if (chosen.length === 1) return chosen[0].charAt(0).toUpperCase() + chosen[0].slice(1)
  const last = chosen.pop()!
  return chosen.join(', ') + ' and ' + last
}

// Visual body meter — 5 dots
function BodyMeter({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-1.5 flex-1 rounded-full transition-all"
          style={{
            background: i <= score
              ? 'linear-gradient(90deg, #6B1414, #A52020)'
              : '#2A2A2A',
          }}
        />
      ))}
    </div>
  )
}

// Negative vibes label chips
const NEGATIVE_VIBES = ['too_soft', 'too_heavy', 'too_dry', 'too_sharp', 'too_watery', 'flat', 'forgettable']
const POSITIVE_VIBES = ['smooth', 'elegant', 'rich', 'complex', 'special', 'delicate', 'refreshing', 'warming', 'cozy']

export default function WineProfileSection({ wine, latestTasting }: Props) {
  const hasOrigin = wine.region || wine.country || wine.appellation
  const hasVarietal = wine.varietal || (wine.blend_components?.length ?? 0) > 0
  const hasVintage = !!wine.vintage
  const hasBodyScore = latestTasting?.body_score != null
  const tags = latestTasting?.vibe_tags ?? []

  const positiveVibes = tags.filter((t) => POSITIVE_VIBES.includes(t))
  const negativeVibes = tags.filter((t) => NEGATIVE_VIBES.includes(t))
  const styleSummary = buildStyleSummary(latestTasting)

  // If there's nothing interesting to show, skip the section
  const hasContent = hasOrigin || hasVarietal || hasVintage || hasBodyScore || styleSummary

  if (!hasContent) return null

  return (
    <div className="space-y-3">
      {/* Style summary — only when derivable */}
      {styleSummary && (
        <div className="card px-4 py-3">
          <p className="text-text-tertiary text-xs uppercase tracking-widest mb-1">Character</p>
          <p className="text-cream text-base font-display font-medium leading-snug">
            {styleSummary}
          </p>
          {positiveVibes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {positiveVibes.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-wine/10 border border-wine/20 text-wine-light">
                  {tag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Structured metadata card */}
      {(hasOrigin || hasVarietal || hasVintage || hasBodyScore) && (
        <div className="card p-4 space-y-4">
          <p className="text-text-tertiary text-xs uppercase tracking-widest">Wine Profile</p>

          <div className="grid grid-cols-2 gap-4">
            {hasVintage && (
              <div>
                <p className="text-text-tertiary text-xs mb-0.5">Vintage</p>
                <p className="text-cream text-sm font-medium">{wine.vintage}</p>
              </div>
            )}
            {wine.style && (
              <div>
                <p className="text-text-tertiary text-xs mb-0.5">Style</p>
                <p className="text-cream text-sm font-medium capitalize">{wine.style.replace('é', 'e')}</p>
              </div>
            )}
          </div>

          {hasVarietal && (
            <div className="flex items-start gap-2.5">
              <Grape className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-text-tertiary text-xs mb-1">Grape</p>
                {wine.varietal ? (
                  <p className="text-cream text-sm font-medium">{wine.varietal}</p>
                ) : null}
                {(wine.blend_components?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {wine.blend_components.map((c, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-bg-elevated rounded-full border border-border text-text-secondary">
                        {c.varietal}{c.percentage ? ` ${c.percentage}%` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {hasOrigin && (
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-text-tertiary text-xs mb-0.5">Origin</p>
                <p className="text-cream text-sm font-medium">
                  {[wine.appellation, wine.region].filter(Boolean).join(', ')}
                </p>
                {wine.country && (
                  <p className="text-text-secondary text-xs mt-0.5 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {wine.country}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Body meter */}
          {hasBodyScore && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-text-tertiary text-xs">Body</p>
                <p className="text-text-secondary text-xs">
                  {latestTasting!.body_score === 1 ? 'Very light' :
                   latestTasting!.body_score === 2 ? 'Light' :
                   latestTasting!.body_score === 3 ? 'Medium' :
                   latestTasting!.body_score === 4 ? 'Full' : 'Very full'}
                </p>
              </div>
              <BodyMeter score={latestTasting!.body_score!} />
              <div className="flex justify-between mt-1">
                <span className="text-text-tertiary text-[10px]">Lighter</span>
                <span className="text-text-tertiary text-[10px]">Bolder</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Negatives — honest "not my style" signals */}
      {negativeVibes.length > 0 && (
        <div className="px-1">
          <p className="text-text-tertiary text-xs mb-2">Noted concerns</p>
          <div className="flex flex-wrap gap-1.5">
            {negativeVibes.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-bg-elevated border border-border text-text-secondary">
                {tag.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
