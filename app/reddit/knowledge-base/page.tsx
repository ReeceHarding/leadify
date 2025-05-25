"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getKnowledgeBaseByUserIdAction } from "@/actions/db/personalization-actions"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import KnowledgeBaseClient from "./_components/knowledge-base-client"
import KnowledgeBaseSkeleton from "./_components/knowledge-base-skeleton"

export default async function KnowledgeBasePage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect("/login")
  }

  return (
    <div className="flex size-full flex-col">
      <Suspense fallback={<KnowledgeBaseSkeleton />}>
        <KnowledgeBaseFetcher userId={userId} />
      </Suspense>
    </div>
  )
}

async function KnowledgeBaseFetcher({ userId }: { userId: string }) {
  const [knowledgeBaseResult, profileResult] = await Promise.all([
    getKnowledgeBaseByUserIdAction(userId),
    getProfileByUserIdAction(userId)
  ])

  return (
    <KnowledgeBaseClient
      userId={userId}
      initialKnowledgeBase={knowledgeBaseResult.data || null}
      userProfile={profileResult.data || null}
    />
  )
} 