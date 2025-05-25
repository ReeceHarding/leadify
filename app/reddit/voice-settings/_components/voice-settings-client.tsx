"use client"

import { useState } from "react"
import { SerializedVoiceSettingsDocument } from "@/actions/db/personalization-actions"
import VoiceSettingsSection from "../../personalization/_components/voice-settings-section"

interface VoiceSettingsClientProps {
  userId: string
  initialVoiceSettings: SerializedVoiceSettingsDocument | null
}

export default function VoiceSettingsClient({
  userId,
  initialVoiceSettings
}: VoiceSettingsClientProps) {
  const [voiceSettings, setVoiceSettings] = useState<SerializedVoiceSettingsDocument | null>(initialVoiceSettings)

  return (
    <div className="flex size-full flex-col">
      {/* Header Section */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Voice Settings</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Customize your writing style and tone to create more authentic Reddit comments that match your voice.
          </p>
        </div>
      </div>

      {/* Voice Settings Content */}
      <div className="space-y-6">
        <VoiceSettingsSection
          userId={userId}
          voiceSettings={voiceSettings}
          setVoiceSettings={setVoiceSettings}
        />
      </div>
    </div>
  )
} 