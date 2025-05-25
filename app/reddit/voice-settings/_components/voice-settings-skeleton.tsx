"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function VoiceSettingsSkeleton() {
  return (
    <div className="flex size-full flex-col">
      {/* Header Skeleton */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="space-y-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-32 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    </div>
  )
} 