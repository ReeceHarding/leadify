"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { getKnowledgeBaseByUserIdAction, getVoiceSettingsByUserIdAction } from "@/actions/db/personalization-actions"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import PersonalizationClient from "./_components/personalization-client"
import PersonalizationSkeleton from "./_components/personalization-skeleton"

export default async function PersonalizationPage() {
  return (
    <Suspense fallback={<PersonalizationSkeleton />}>
      <PersonalizationFetcher />
    </Suspense>
  )
}

async function PersonalizationFetcher() {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error("User not authenticated")
  }

  // Fetch all personalization data in parallel
  const [knowledgeBaseResult, voiceSettingsResult, profileResult] = await Promise.all([
    getKnowledgeBaseByUserIdAction(userId),
    getVoiceSettingsByUserIdAction(userId),
    getProfileByUserIdAction(userId)
  ])

  return (
    <PersonalizationClient
      userId={userId}
      initialKnowledgeBase={knowledgeBaseResult.data || null}
      initialVoiceSettings={voiceSettingsResult.data || null}
      userProfile={profileResult.data || null}
    />
  )
} 