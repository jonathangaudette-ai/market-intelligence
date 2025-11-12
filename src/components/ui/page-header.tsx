import * as React from "react"
import { Breadcrumb } from "./breadcrumb"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  breadcrumbs?: BreadcrumbItem[]
  title: string
  description?: string
  badge?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  breadcrumbs,
  title,
  description,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "border-b border-gray-200 bg-white px-6 py-6",
        className
      )}
    >
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb items={breadcrumbs} className="mb-4" />
        )}

        {/* Title Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {title}
              </h1>
              {badge && <div className="flex-shrink-0">{badge}</div>}
            </div>

            {description && (
              <p className="mt-2 text-sm text-gray-600 max-w-3xl">
                {description}
              </p>
            )}
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
