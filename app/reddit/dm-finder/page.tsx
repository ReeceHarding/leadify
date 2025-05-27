"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getOrganizationByIdAction } from "@/actions/db/organizations-actions"
import DMFinderDashboard from "./_components/dm-finder-dashboard"
import { Skeleton } from "@/components/ui/skeleton"

export default async function DMFinderPage() {
  console.log("📨 [DM-FINDER-PAGE] Loading DM finder page...")
  
  const { userId, orgId } = await auth()
  
  if (!userId) {
    console.log("📨 [DM-FINDER-PAGE] No user ID, redirecting to login")
    redirect("/login")
  }
  
  if (!orgId) {
    console.log("📨 [DM-FINDER-PAGE] No organization ID, redirecting to onboarding")
    redirect("/onboarding")
  }
  
  console.log("📨 [DM-FINDER-PAGE] User ID:", userId)
  console.log("📨 [DM-FINDER-PAGE] Organization ID:", orgId)
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">DM Finder</h1>
        <p className="text-muted-foreground">
          Find and send personalized DMs to potential leads on Reddit
        </p>
      </div>
      
      <Suspense fallback={<DMFinderSkeleton />}>
        <DMFinderDashboardFetcher organizationId={orgId} userId={userId} />
      </Suspense>
    </div>
  )
}

async function DMFinderDashboardFetcher({
  organizationId,
  userId
}: {
  organizationId: string
  userId: string
}) {
  console.log("📨 [DM-FINDER-FETCHER] Fetching organization data...")
  
  const orgResult = await getOrganizationByIdAction(organizationId)
  
  if (!orgResult.isSuccess) {
    console.error("📨 [DM-FINDER-FETCHER] Failed to fetch organization:", orgResult.message)
    return <div>Failed to load organization data</div>
  }
  
  console.log("📨 [DM-FINDER-FETCHER] Organization loaded successfully")
  
  return (
    <DMFinderDashboard
      organizationId={organizationId}
      userId={userId}
      organization={orgResult.data}
    />
  )
}

function DMFinderSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-96" />
    </div>
  )
} 