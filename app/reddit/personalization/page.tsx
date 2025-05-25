"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import PersonalizationClient from "./_components/personalization-client"
import PersonalizationSkeleton from "./_components/personalization-skeleton"

export default async function PersonalizationPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Personalization</h1>
          <p className="mt-2 text-gray-600">
            Customize your writing style and knowledge base to create more authentic and effective Reddit comments.
          </p>
        </div>

        <Suspense fallback={<PersonalizationSkeleton />}>
          <PersonalizationDataFetcher userId={userId} />
        </Suspense>
      </div>
    </div>
  )
}

async function PersonalizationDataFetcher({ userId }: { userId: string }) {
  // Import actions here to avoid client-side imports
  const { getKnowledgeBaseByUserIdAction } = await import("@/actions/db/personalization-actions")
  const { getVoiceSettingsByUserIdAction } = await import("@/actions/db/personalization-actions")
  const { getProfileByUserIdAction } = await import("@/actions/db/profiles-actions")

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