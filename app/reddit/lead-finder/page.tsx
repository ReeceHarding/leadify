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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[300px]" />
        <Skeleton className="h-10 w-[150px]" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-[200px]" />
        <Skeleton className="h-9 w-[240px]" />
        <Skeleton className="h-9 w-[160px]" />
        <Skeleton className="h-9 w-[180px]" />
      </div>
      <Skeleton className="h-[600px] w-full" />
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
