"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getKnowledgeBaseByUserIdAction, getVoiceSettingsByUserIdAction } from "@/actions/db/personalization-actions"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import PersonalizationClient from "./_components/personalization-client"
import PersonalizationSkeleton from "./_components/personalization-skeleton"

export default async function PersonalizationPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect("/login")
  }

  return (
    <div className="flex size-full flex-col">
      <Suspense fallback={<PersonalizationSkeleton />}>
        <PersonalizationFetcher userId={userId} />
      </Suspense>
    </div>
  )
}

async function PersonalizationFetcher({ userId }: { userId: string }) {
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