"use server"

import { Suspense } from "react"
import AnalyticsDashboard from "./_components/analytics-dashboard"
import AnalyticsLoadingSkeleton from "./_components/analytics-loading-skeleton"

export default async function AnalyticsPage() {
  console.log(`\n📊 [ANALYTICS-PAGE] ====== ANALYTICS PAGE RENDER ======`)

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
            <p className="text-muted-foreground">
              Track your Reddit lead generation performance and engagement metrics
            </p>
          </div>
        </div>

        <Suspense fallback={<AnalyticsLoadingSkeleton />}>
          <AnalyticsDashboard />
        </Suspense>
      </div>
    </div>
  )
} 