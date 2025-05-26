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

export default function VoiceSettingsWrapper({ userId }: VoiceSettingsWrapperProps) {
  const { activeOrganization, isLoading: orgLoading } = useOrganization()
  const [voiceSettings, setVoiceSettings] = useState<SerializedVoiceSettingsDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (activeOrganization && !orgLoading) {
      loadData()
    }
  }, [activeOrganization, orgLoading])

  const loadData = async () => {
    if (!activeOrganization) return

    try {
      setIsLoading(true)
      const voiceSettingsResult = await getVoiceSettingsByOrganizationIdAction(activeOrganization.id)
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

  if (!activeOrganization) {
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>
          No organization selected. Please select an organization from the sidebar.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <VoiceSettingsClient
      userId={userId}
      organizationId={activeOrganization.id}
      initialVoiceSettings={voiceSettings}
    />
  )
} 