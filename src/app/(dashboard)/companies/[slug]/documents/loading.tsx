import { DocumentListSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function DocumentsLoading() {
  return (
    <div className="p-8 space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>

      {/* Stats Bar Skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>

      {/* Document List Skeleton */}
      <DocumentListSkeleton count={5} />
    </div>
  )
}
