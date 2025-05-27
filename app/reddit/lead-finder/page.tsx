"use server"

import { Suspense } from "react"
import LeadFinderDashboard from "./_components/lead-finder-dashboard"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"

function LeadFinderSkeleton() {
  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Dashboard Header Skeleton */}
      <Card className="bg-white shadow-sm dark:bg-gray-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-5 rounded" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-12" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters Section Skeleton */}
      <div className="bg-card rounded-lg border p-4 shadow-sm dark:border-gray-700">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex grow items-center gap-2">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-9 grow" />
            </div>
            <Skeleton className="h-9 w-[200px]" />
            <Skeleton className="h-9 w-[140px]" />
            <Skeleton className="h-9 w-[160px]" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-9 w-[180px]" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>

      {/* Find More Leads Card Skeleton */}
      <Card className="bg-white shadow-sm dark:bg-gray-900">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Skeleton className="h-10 grow" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Lead Cards Skeleton */}
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="bg-white shadow-sm dark:bg-gray-900">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex items-center gap-4 text-sm">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="size-9 rounded-md" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Score Section */}
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/30">
                <div className="mb-2 flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="mt-1 h-3 w-5/6" />
              </div>

              {/* Comment Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20 rounded-md" />
                    <Skeleton className="h-8 w-24 rounded-md" />
                    <Skeleton className="h-8 w-28 rounded-md" />
                  </div>
                </div>
                <div className="space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t pt-4">
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-24 rounded-md" />
                  <Skeleton className="h-9 w-28 rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </div>
  )
}

export default async function LeadFinderPage() {
  console.log("🔥🔥🔥 [LEAD-FINDER-PAGE] Rendering LeadFinderPage")
  console.log("🔥🔥🔥 [LEAD-FINDER-PAGE] Environment:", process.env.NODE_ENV)
  console.log("🔥🔥🔥 [LEAD-FINDER-PAGE] Time:", new Date().toISOString())

  return (
    <div className="flex size-full flex-col">
      <Suspense fallback={<LeadFinderSkeleton />}>
        {(() => {
          console.log(
            "🔥🔥🔥 [LEAD-FINDER-PAGE] Rendering LeadFinderDashboard inside Suspense"
          )
          return <LeadFinderDashboard />
        })()}
      </Suspense>
    </div>
  )
}
