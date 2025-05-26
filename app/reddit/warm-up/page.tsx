"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import WarmupWrapper from "./_components/warmup-wrapper"
import WarmupDashboardSkeleton from "./_components/warmup-dashboard-skeleton"

export default async function WarmupPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Reddit Account Warm-up</h1>
        <p className="text-muted-foreground">
          Build karma and authority in your organization's target subreddits
          before launching your lead generation campaigns.
        </p>
      </div>

      <Suspense fallback={<WarmupDashboardSkeleton />}>
        <WarmupWrapper userId={userId} />
      </Suspense>
    </div>
  )
}
