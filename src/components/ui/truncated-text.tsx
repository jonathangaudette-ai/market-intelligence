"use client"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip"

interface TruncatedTextProps {
  text: string
  maxLength?: number
  className?: string
  showTooltip?: boolean
}

export function TruncatedText({
  text,
  maxLength,
  className,
  showTooltip = true,
}: TruncatedTextProps) {
  const shouldTruncate = maxLength && text.length > maxLength
  const displayText = shouldTruncate ? `${text.slice(0, maxLength)}...` : text
  const isTruncated = shouldTruncate || false

  if (!showTooltip || !isTruncated) {
    return (
      <span className={cn("truncate", className)} title={isTruncated ? text : undefined}>
        {displayText}
      </span>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className={cn("truncate cursor-help", className)}>
            {displayText}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Alternative: TruncatedText with CSS truncation only
export function TruncatedTextCSS({
  text,
  className,
  showTooltip = true,
}: Omit<TruncatedTextProps, "maxLength">) {
  if (!showTooltip) {
    return <span className={cn("truncate block", className)}>{text}</span>
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className={cn("truncate block cursor-help", className)}>
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs break-words">
          <p className="text-xs">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
