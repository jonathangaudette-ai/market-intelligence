import { LucideIcon } from "lucide-react"
import { Skeleton } from "./skeleton"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: number | string
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
  loading?: boolean
  iconColor?: string
  className?: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  loading = false,
  iconColor = "bg-teal-100 text-teal-600",
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <div className={cn("bg-white rounded-lg border border-gray-200 p-4", className)}>
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          {Icon && (
            <Skeleton className="h-10 w-10 rounded-lg" />
          )}
        </div>
        {trend && (
          <Skeleton className="h-3 w-32 mt-2" />
        )}
      </div>
    )
  }

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive === false
                    ? "text-red-600"
                    : "text-green-600"
                )}
              >
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-xs text-gray-500">{trend.label}</span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  )
}

// Compact variant for sidebar
export function StatCardCompact({
  label,
  value,
  loading = false,
  className,
}: {
  label: string
  value: number | string
  loading?: boolean
  className?: string
}) {
  if (loading) {
    return (
      <div className={cn("flex justify-between items-center", className)}>
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-8" />
      </div>
    )
  }

  return (
    <div className={cn("flex justify-between items-center", className)}>
      <span className="text-xs text-teal-700">{label}</span>
      <span className="text-sm font-semibold text-teal-900">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  )
}
