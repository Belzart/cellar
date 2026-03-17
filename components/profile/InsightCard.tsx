import { TasteInsight, InsightType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Heart, ThumbsUp, ThumbsDown, TrendingUp } from 'lucide-react'

const INSIGHT_CONFIG: Record<InsightType, {
  icon: React.ElementType
  bgClass: string
  borderClass: string
  iconClass: string
}> = {
  love: {
    icon: Heart,
    bgClass: 'bg-wine-muted',
    borderClass: 'border-wine/30',
    iconClass: 'text-wine-light',
  },
  like: {
    icon: ThumbsUp,
    bgClass: 'bg-emerald-950/30',
    borderClass: 'border-emerald-800/30',
    iconClass: 'text-emerald-400',
  },
  dislike: {
    icon: ThumbsDown,
    bgClass: 'bg-stone/10',
    borderClass: 'border-stone/20',
    iconClass: 'text-text-secondary',
  },
  trending: {
    icon: TrendingUp,
    bgClass: 'bg-gold/10',
    borderClass: 'border-gold/20',
    iconClass: 'text-gold',
  },
}

interface InsightCardProps {
  insight: TasteInsight
}

export default function InsightCard({ insight }: InsightCardProps) {
  const config = INSIGHT_CONFIG[insight.type]
  const Icon = config.icon

  return (
    <div className={cn(
      'rounded-2xl border p-4 flex items-start gap-3',
      config.bgClass,
      config.borderClass
    )}>
      <div className={cn('w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center flex-shrink-0')}>
        <Icon className={cn('w-4 h-4', config.iconClass)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-cream text-sm font-medium leading-snug">{insight.text}</p>
        <p className="text-text-tertiary text-xs mt-1">
          Based on {insight.supporting_count} tasting{insight.supporting_count !== 1 ? 's' : ''} · {insight.confidence} confidence
        </p>
      </div>
    </div>
  )
}
