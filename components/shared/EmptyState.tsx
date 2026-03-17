import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center px-6 py-16',
      className
    )}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-bg-elevated border border-border flex items-center justify-center mb-5 text-2xl">
          {icon}
        </div>
      )}
      <h3 className="font-display text-xl font-medium text-cream mb-2">{title}</h3>
      {description && (
        <p className="text-text-secondary text-sm leading-relaxed max-w-xs">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
