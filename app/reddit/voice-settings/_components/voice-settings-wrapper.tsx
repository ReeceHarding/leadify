"use client"

import { useEffect, useState } from "react"
import { useOrganization } from "@/components/utilities/organization-provider"
import { getVoiceSettingsByOrganizationIdAction } from "@/actions/db/personalization-actions"
import VoiceSettingsClient from "./voice-settings-client"
import VoiceSettingsSkeleton from "./voice-settings-skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { SerializedVoiceSettingsDocument } from "@/types"

interface VoiceSettingsWrapperProps {
  userId: string
}

export default function VoiceSettingsWrapper({
  userId
}: VoiceSettingsWrapperProps) {
  const { currentOrganization, isLoading: orgLoading } = useOrganization()
  const [voiceSettings, setVoiceSettings] =
    useState<SerializedVoiceSettingsDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (currentOrganization && !orgLoading) {
      loadData()
    }
  }, [currentOrganization, orgLoading])

  const loadData = async () => {
    if (!currentOrganization) return

    try {
      setIsLoading(true)
      const voiceSettingsResult = await getVoiceSettingsByOrganizationIdAction(
        currentOrganization.id
      )
      setVoiceSettings(voiceSettingsResult.data || null)
    } catch (error) {
      console.error("Error loading voice settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (orgLoading || isLoading) {
    return <VoiceSettingsSkeleton />
  }

  if (!currentOrganization) {
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
    <VoiceSettingsClient
      userId={userId}
      organizationId={currentOrganization.id}
      initialVoiceSettings={voiceSettings}
    />
  )
}
