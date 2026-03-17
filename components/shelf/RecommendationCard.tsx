import { RecommendationCandidate, RecommendationTier } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Star, Sparkles, Zap } from 'lucide-react'

const TIER_CONFIG: Record<NonNullable<RecommendationTier>, {
  label: string
  icon: React.ElementType
  bgClass: string
  borderClass: string
  labelClass: string
}> = {
  best_match: {
    label: 'Best Match',
    icon: Star,
    bgClass: 'bg-wine-muted',
    borderClass: 'border-wine/40',
    labelClass: 'text-wine-light',
  },
  safe_bet: {
    label: 'Safe Bet',
    icon: Sparkles,
    bgClass: 'bg-emerald-950/30',
    borderClass: 'border-emerald-800/40',
    labelClass: 'text-emerald-400',
  },
  wildcard: {
    label: 'Wildcard',
    icon: Zap,
    bgClass: 'bg-gold/10',
    borderClass: 'border-gold/30',
    labelClass: 'text-gold',
  },
  avoid: {
    label: 'Likely Miss',
    icon: Star,
    bgClass: 'bg-bg-card',
    borderClass: 'border-border',
    labelClass: 'text-text-secondary',
  },
}

interface RecommendationCardProps {
  candidate: RecommendationCandidate
  rank: number
}

export default function RecommendationCard({ candidate, rank }: RecommendationCardProps) {
  const tier = candidate.recommendation_tier
  const config = tier ? TIER_CONFIG[tier] : null
  const Icon = config?.icon

  const palatePercent = Math.round(candidate.palate_score * 100)

  return (
    <div className={cn(
      'card p-4 space-y-3',
      config?.bgClass,
      config?.borderClass
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Rank number */}
          <div className="w-7 h-7 rounded-lg bg-bg-elevated border border-border flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-text-secondary">{rank + 1}</span>
          </div>

          {/* Tier badge */}
          {config && Icon && (
            <div className={cn('flex items-center gap-1')}>
              <Icon className={cn('w-3.5 h-3.5', config.labelClass)} />
              <span className={cn('text-xs font-semibold', config.labelClass)}>
                {config.label}
              </span>
            </div>
          )}
        </div>

        {/* Palate score */}
        <div className="text-right">
          <div className="text-lg font-display font-medium text-cream">{palatePercent}%</div>
          <div className="text-text-tertiary text-[10px]">palate match</div>
        </div>
      </div>

      {/* Wine name */}
      <div>
        <h3 className="font-display text-base font-medium text-cream leading-tight">
          {candidate.candidate_producer_raw
            ? `${candidate.candidate_producer_raw} — ${candidate.candidate_name_raw}`
            : candidate.candidate_name_raw}
        </h3>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
          {candidate.candidate_varietal_raw && (
            <span className="text-text-secondary text-xs">{candidate.candidate_varietal_raw}</span>
          )}
          {candidate.candidate_region_raw && (
            <span className="text-text-tertiary text-xs">· {candidate.candidate_region_raw}</span>
          )}
          {candidate.candidate_vintage_raw && (
            <span className="text-text-tertiary text-xs">· {candidate.candidate_vintage_raw}</span>
          )}
        </div>
      </div>

      {/* Explanation */}
      {candidate.explanation_text && (
        <p className="text-text-secondary text-sm leading-relaxed">
          {candidate.explanation_text}
        </p>
      )}

      {/* Palate score bar */}
      <div>
        <div className="w-full h-1.5 bg-bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${palatePercent}%`,
              background: palatePercent >= 70
                ? 'linear-gradient(90deg, #6B1414, #A52020)'
                : palatePercent >= 50
                ? 'linear-gradient(90deg, #7A6530, #C4A24A)'
                : '#2A2A2A',
            }}
          />
        </div>
      </div>
    </div>
  )
}
