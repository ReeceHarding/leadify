"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function KnowledgeBaseSkeleton() {
  return (
    <div className="flex size-full flex-col">
      {/* Header Section Skeleton */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </div>
      </div>

      {/* Content Skeleton - Single Column */}
      <div className="space-y-6">
        {/* Knowledge Base Display Skeleton */}
        <Card className="bg-white shadow-sm dark:bg-gray-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-7 w-40" />
            </div>
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
                <Skeleton className="mt-2 h-4 w-4/5" />
              </div>
            </div>

            {/* Additional Info Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-5 w-48" />
              </div>
              <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/30">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-11/12" />
                <Skeleton className="mt-2 h-4 w-5/6" />
                <Skeleton className="mt-2 h-4 w-3/4" />
              </div>
            </div>

            <div className="border-t pt-4 dark:border-gray-700">
              <Skeleton className="h-3 w-40" />
            </div>
          </CardContent>
        </Card>

        {/* Add to Knowledge Base Skeleton */}
        <Card className="bg-white shadow-sm dark:bg-gray-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-7 w-48" />
            </div>
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Website Scraping */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 grow" />
                <Skeleton className="h-10 w-32" />
              </div>
              <Skeleton className="h-4 w-64" />
            </div>

            {/* Edit Existing */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-32 w-full rounded-md" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-32" />
              </div>
              <Skeleton className="h-4 w-80" />
            </div>

            {/* Add New */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-32 w-full rounded-md" />
              <Skeleton className="h-4 w-96" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-36" />
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-blue-50 p-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-5/6" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
