"use server"

import { Suspense } from "react"
import CampaignSelector from "./_components/campaign-selector"
import { Skeleton } from "@/components/ui/skeleton"

export default async function LeadFinderPage() {
  console.log("🔥🔥🔥 [LEAD-FINDER-PAGE] Rendering LeadFinderPage")
  console.log("🔥🔥🔥 [LEAD-FINDER-PAGE] Environment:", process.env.NODE_ENV)
  console.log("🔥🔥🔥 [LEAD-FINDER-PAGE] Time:", new Date().toISOString())
  
  return (
    <div className="flex size-full flex-col">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reddit Leadify</h2>
          <p className="text-muted-foreground">
            Find and engage with high-quality leads on Reddit using AI-powered
            analysis
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          (() => {
            console.log("🔥🔥🔥 [LEAD-FINDER-PAGE] Showing Suspense fallback")
            return (
              <div className="space-y-4 pt-6">
                <Skeleton className="h-8 w-[200px]" />
                <Skeleton className="h-[400px] w-full" />
              </div>
            )
          })()
        }
      >
        {(() => {
          console.log("🔥🔥🔥 [LEAD-FINDER-PAGE] Rendering CampaignSelector inside Suspense")
          return <CampaignSelector />
        })()}
      </Suspense>
    </div>
  )
}
