"use client"

import { useState } from "react"
import { KnowledgeBaseDocument, VoiceSettingsDocument } from "@/db/schema"
import { SerializedProfileDocument } from "@/actions/db/profiles-actions"
import KnowledgeBaseSection from "./knowledge-base-section"
import VoiceSettingsSection from "./voice-settings-section"

interface PersonalizationClientProps {
  userId: string
  initialKnowledgeBase: KnowledgeBaseDocument | null
  initialVoiceSettings: VoiceSettingsDocument | null
  userProfile: SerializedProfileDocument | null
}

export default function PersonalizationClient({
  userId,
  initialKnowledgeBase,
  initialVoiceSettings,
  userProfile
}: PersonalizationClientProps) {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseDocument | null>(initialKnowledgeBase)
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettingsDocument | null>(initialVoiceSettings)

  return (
    <div className="flex size-full flex-col">
      {/* Header Section - matching lead-finder design */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Personalization</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Customize your writing style and knowledge base to create more authentic and effective Reddit comments.
          </p>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
        <KnowledgeBaseSection
          userId={userId}
          knowledgeBase={knowledgeBase}
          setKnowledgeBase={setKnowledgeBase}
          userProfile={userProfile}
        />
        
        <VoiceSettingsSection
          userId={userId}
          voiceSettings={voiceSettings}
          setVoiceSettings={setVoiceSettings}
        />
      </div>
    </div>
  )
} 