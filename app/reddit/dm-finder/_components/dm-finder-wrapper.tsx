"use client"

import { useEffect, useState } from "react"
import { useOrganization } from "@/components/utilities/organization-provider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import DMFinderDashboard from "./dm-finder-dashboard"
import { Skeleton } from "@/components/ui/skeleton"

interface DMFinderWrapperProps {
  userId: string
}

export default function DMFinderWrapper({ userId }: DMFinderWrapperProps) {
  const { currentOrganization, isLoading: orgLoading } = useOrganization()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    console.log("📨 [DM-FINDER-WRAPPER] Organization loading state:", orgLoading)
    console.log("📨 [DM-FINDER-WRAPPER] Current organization:", currentOrganization?.id)
    
    if (!orgLoading) {
      setIsReady(true)
    }
  }, [currentOrganization, orgLoading])

  if (orgLoading || !isReady) {
    console.log("📨 [DM-FINDER-WRAPPER] Still loading organization...")
    return <DMFinderSkeleton />
  }

  if (!currentOrganization) {
    console.log("📨 [DM-FINDER-WRAPPER] No organization selected")
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>
          No organization selected. Please select an organization from the
          sidebar or create one in the onboarding process.
        </AlertDescription>
      </Alert>
    )
  }

  console.log("📨 [DM-FINDER-WRAPPER] Rendering DM finder with organization:", currentOrganization.id)
  
  return <DMFinderDashboard />
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