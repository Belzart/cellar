import { Skeleton } from '@/components/shared/LoadingSkeleton'

export default function WineDetailLoading() {
  return (
    <div className="min-h-screen">
      <Skeleton className="w-full h-80 rounded-none" />
      <div className="px-5 pt-4 space-y-4">
        <Skeleton className="w-24 h-5 rounded-full" />
        <Skeleton className="w-3/4 h-7" />
        <Skeleton className="w-1/2 h-5" />
        <Skeleton className="w-full h-32 rounded-2xl" />
        <Skeleton className="w-full h-24 rounded-2xl" />
      </div>
    </div>
  )
}
