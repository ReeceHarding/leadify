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
    <div className="space-y-8">
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
  )
} 