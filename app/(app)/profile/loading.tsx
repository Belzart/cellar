import { InsightSkeleton, Skeleton } from '@/components/shared/LoadingSkeleton'

export default function ProfileLoading() {
  return (
    <div className="min-h-screen px-4 pt-6 space-y-6">
      <div className="space-y-1 mb-6">
        <Skeleton className="w-32 h-8" />
        <Skeleton className="w-48 h-3" />
      </div>
      <InsightSkeleton />
      <InsightSkeleton />
      <InsightSkeleton />
    </div>
  )
}
