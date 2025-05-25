"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getVoiceSettingsByUserIdAction } from "@/actions/db/personalization-actions"
import VoiceSettingsClient from "./_components/voice-settings-client"
import VoiceSettingsSkeleton from "./_components/voice-settings-skeleton"

export default async function VoiceSettingsPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect("/login")
  }

  return (
    <div className="flex size-full flex-col">
      <Suspense fallback={<VoiceSettingsSkeleton />}>
        <VoiceSettingsFetcher userId={userId} />
      </Suspense>
    </div>
  )
}

async function VoiceSettingsFetcher({ userId }: { userId: string }) {
  const voiceSettingsResult = await getVoiceSettingsByUserIdAction(userId)

  return (
    <VoiceSettingsClient
      userId={userId}
      initialVoiceSettings={voiceSettingsResult.data || null}
    />
  )
} 