import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('shimmer rounded-xl', className)} />
  )
}

export function WineCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <Skeleton className="w-full h-40 rounded-xl" />
      <Skeleton className="w-3/4 h-4" />
      <Skeleton className="w-1/2 h-3" />
      <div className="flex gap-2">
        <Skeleton className="w-16 h-5 rounded-full" />
        <Skeleton className="w-20 h-5 rounded-full" />
      </div>
    </div>
  )
}

export function CollectionSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <WineCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function InsightSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="w-24 h-3 rounded-full" />
      <Skeleton className="w-full h-5" />
      <Skeleton className="w-2/3 h-3" />
    </div>
  )
}

export function ScanProcessingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
      <div className="w-20 h-20 rounded-3xl shimmer" />
      <Skeleton className="w-48 h-5 mx-auto" />
      <Skeleton className="w-32 h-3 mx-auto" />
    </div>
  )
}
