import * as React from "react"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-2 text-sm", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <React.Fragment key={index}>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-gray-600 hover:text-teal-600 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast
                    ? "font-medium text-gray-900"
                    : "text-gray-600"
                )}
              >
                {item.label}
              </span>
            )}

            {!isLast && (
              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
