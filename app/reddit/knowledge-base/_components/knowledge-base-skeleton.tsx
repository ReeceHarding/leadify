"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function KnowledgeBaseSkeleton() {
  return (
    <div className="flex size-full flex-col">
      {/* Header Section */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      {/* Knowledge Base Content - Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Knowledge Base Display */}
        <Card className="bg-white shadow-sm dark:bg-gray-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="size-5" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Website Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>

            {/* Custom Information */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/30">
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-5/6 mb-1" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>

            {/* Scraped Content */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="space-y-2">
                {[...Array(2)].map((_, index) => (
                  <div key={index} className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/30">
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata */}
            <div className="border-t pt-4">
              <Skeleton className="h-3 w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Add to Knowledge Base */}
        <Card className="bg-white shadow-sm dark:bg-gray-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="size-5" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Website Scraping */}
            <div className="space-y-4">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-24" />
              </div>
              <Skeleton className="h-4 w-64" />
            </div>

            {/* Edit Existing Information */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-24 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton className="h-4 w-56" />
            </div>

            {/* Add New Information */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-4 w-72" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-36" />
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 