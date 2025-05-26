"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import VoiceSettingsWrapper from "./_components/voice-settings-wrapper"
import VoiceSettingsSkeleton from "./_components/voice-settings-skeleton"

export default async function VoiceSettingsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/login")
  }

  return (
    <div className="flex size-full flex-col">
      <Suspense fallback={<VoiceSettingsSkeleton />}>
        <VoiceSettingsWrapper userId={userId} />
      </Suspense>
    </div>
  )
}
