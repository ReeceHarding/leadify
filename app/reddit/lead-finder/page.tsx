"use server"

import { Suspense } from "react"
import LeadFinderDashboard from "./_components/lead-finder-dashboard"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function LeadFinderSkeleton() {
  return (
    <div className="flex size-full flex-col">
      {/* Header Section */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Campaign Management */}
        <Card className="bg-white shadow-sm dark:bg-gray-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="size-5" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Campaign selector */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-28" />
            </div>
            
            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-6 w-8" />
              </div>
              <div className="rounded-lg border p-3">
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Leads Display */}
        <Card className="bg-white shadow-sm dark:bg-gray-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="size-5" />
              <Skeleton className="h-6 w-28" />
            </div>
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters and controls */}
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-20" />
            </div>
            
            {/* Lead cards */}
            <div className="space-y-3">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="rounded-lg border p-4 space-y-3">
                  {/* Post info */}
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex gap-4">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                  
                  {/* Score section */}
                  <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
                    <div className="flex justify-between items-center mb-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                  </div>
                  
                  {/* Comment section */}
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            <div className="flex justify-between items-center pt-4">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
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
          console.log("🔥🔥🔥 [LEAD-FINDER-PAGE] Rendering LeadFinderDashboard inside Suspense")
          return <LeadFinderDashboard />
        })()}
      </Suspense>
    </div>
  )
}
