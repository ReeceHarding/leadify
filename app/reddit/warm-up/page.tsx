"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import WarmupDashboard from "./_components/warmup-dashboard"
import WarmupDashboardSkeleton from "./_components/warmup-dashboard-skeleton"

export default async function WarmupPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Reddit Account Warm-up</h1>
        <p className="text-muted-foreground">
          Build karma and authority in your target subreddits before launching your lead generation campaigns.
        </p>
      </div>

      <Suspense fallback={<WarmupDashboardSkeleton />}>
        <WarmupDashboardFetcher userId={userId} />
      </Suspense>
    </div>
  )
}

async function WarmupDashboardFetcher({ userId }: { userId: string }) {
  return <WarmupDashboard userId={userId} />
} 