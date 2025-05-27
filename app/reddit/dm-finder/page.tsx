"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getOrganizationsByUserIdAction } from "@/actions/db/organizations-actions"
import DMFinderWrapper from "./_components/dm-finder-wrapper"
import { Skeleton } from "@/components/ui/skeleton"

export default async function DMFinderPage() {
  console.log("📨 [DM-FINDER-PAGE] Loading DM finder page...")
  
  const { userId } = await auth()
  
  if (!userId) {
    console.log("📨 [DM-FINDER-PAGE] No user ID, redirecting to login")
    redirect("/login")
  }
  
  console.log("📨 [DM-FINDER-PAGE] User ID:", userId)
  
  // Check if user has any organizations
  const orgsResult = await getOrganizationsByUserIdAction(userId)
  if (!orgsResult.isSuccess || !orgsResult.data || orgsResult.data.length === 0) {
    console.log("📨 [DM-FINDER-PAGE] No organizations found, redirecting to onboarding")
    redirect("/onboarding")
  }
  
  console.log("📨 [DM-FINDER-PAGE] User has organizations, rendering page")
  
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">DM Finder</h1>
        <p className="text-muted-foreground">
          Find and send personalized DMs to potential leads on Reddit
        </p>
      </div>
      
      <Suspense fallback={<DMFinderSkeleton />}>
        <DMFinderWrapper userId={userId} />
      </Suspense>
    </div>
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