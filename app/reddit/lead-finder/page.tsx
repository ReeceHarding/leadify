"use server"

import { Suspense } from "react"
import LeadFinderDashboard from "./_components/lead-finder-dashboard"
import { Skeleton } from "@/components/ui/skeleton"

export default async function LeadFinderPage() {
  return (
    <div className="flex size-full flex-col">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Reddit Lead Finder
          </h2>
          <p className="text-muted-foreground">
            Find and engage with high-quality leads on Reddit using AI-powered
            analysis
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4 pt-6">
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        }
      >
        <LeadFinderDashboard />
      </Suspense>
    </div>
  )
}
