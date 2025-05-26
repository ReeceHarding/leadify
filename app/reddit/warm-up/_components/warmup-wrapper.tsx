"use client"

import { useOrganization } from "@/components/utilities/organization-provider"
import WarmupDashboard from "./warmup-dashboard"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface WarmupWrapperProps {
  userId: string
}

export default function WarmupWrapper({ userId }: WarmupWrapperProps) {
  const { activeOrganization, isLoading } = useOrganization()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!activeOrganization) {
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>
          No organization selected. Please select an organization from the
          sidebar.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <WarmupDashboard userId={userId} organizationId={activeOrganization.id} />
  )
}
