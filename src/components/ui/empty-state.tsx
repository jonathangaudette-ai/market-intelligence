import { LucideIcon } from "lucide-react"
import { Button } from "./button"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      {Icon && (
        <div className="mb-4 rounded-full bg-teal-50 p-3">
          <Icon className="h-10 w-10 text-teal-600" />
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>

      <p className="text-sm text-gray-600 max-w-md mb-6">
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {action && (
            action.href ? (
              <Button asChild className="bg-teal-600 hover:bg-teal-700">
                <Link href={action.href}>
                  {action.label}
                </Link>
              </Button>
            ) : (
              <Button
                onClick={action.onClick}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {action.label}
              </Button>
            )
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <Button asChild variant="outline">
                <Link href={secondaryAction.href}>
                  {secondaryAction.label}
                </Link>
              </Button>
            ) : (
              <Button
                onClick={secondaryAction.onClick}
                variant="outline"
              >
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  )
}
