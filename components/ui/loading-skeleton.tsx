/*
<ai_context>
Centralized loading skeleton components for consistent loading states
</ai_context>
*/

"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface LoadingSkeletonProps {
  className?: string
}

export function TableLoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={className}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Table rows */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center space-x-4 rounded-lg border p-4"
          >
            <Skeleton className="size-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardLoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="mb-2 h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ListLoadingSkeleton({
  className,
  items = 3
}: LoadingSkeletonProps & { items?: number }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {[...Array(items)].map((_, i) => (
        <div
          key={i}
          className="flex items-start space-x-3 rounded-lg border p-3"
        >
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full max-w-[200px]" />
            <Skeleton className="h-3 w-full max-w-[300px]" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function FormLoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Form fields */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}

      {/* Submit button */}
      <Skeleton className="mt-6 h-10 w-32" />
    </div>
  )
}

export function DetailLoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Content sections */}
      {[...Array(2)].map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}

      {/* Action buttons */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}
