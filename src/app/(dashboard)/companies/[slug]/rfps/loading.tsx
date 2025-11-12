import { RfpListSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function RfpsLoading() {
  return (
    <div className="p-8 space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <Skeleton className="h-4 w-28 mb-2" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* RFP List Skeleton */}
      <RfpListSkeleton count={4} />
    </div>
  )
}
