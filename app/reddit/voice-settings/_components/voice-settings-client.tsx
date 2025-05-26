"use client"

import { useState } from "react"
import { SerializedVoiceSettingsDocument } from "@/types"
import VoiceSettingsDisplay from "./voice-settings-display"
import EditVoiceSettings from "./edit-voice-settings"

interface VoiceSettingsClientProps {
  userId: string
  organizationId: string
  initialVoiceSettings: SerializedVoiceSettingsDocument | null
}

export default function VoiceSettingsClient({
  userId,
  organizationId,
  initialVoiceSettings
}: VoiceSettingsClientProps) {
  const [voiceSettings, setVoiceSettings] =
    useState<SerializedVoiceSettingsDocument | null>(initialVoiceSettings)

  return (
    <div className="flex size-full flex-col">
      {/* Header Section */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Voice Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Customize your organization's writing style and tone to create more
            authentic Reddit comments that match your voice.
          </p>
        </div>
      </div>

      {/* Voice Settings Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: What We Know */}
        <VoiceSettingsDisplay voiceSettings={voiceSettings} />

        {/* Right Column: Edit Voice Settings */}
        <EditVoiceSettings
          userId={userId}
          organizationId={organizationId}
          voiceSettings={voiceSettings}
          setVoiceSettings={setVoiceSettings}
        />
      </div>
    </div>
  )
}
