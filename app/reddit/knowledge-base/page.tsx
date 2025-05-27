"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getOrganizationsByUserIdAction } from "@/actions/db/organizations-actions"
import KnowledgeBaseWrapper from "./_components/knowledge-base-wrapper"
import KnowledgeBaseSkeleton from "./_components/knowledge-base-skeleton"

export default async function KnowledgeBasePage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/login")
  }

  // Check if user has any organizations
  const orgsResult = await getOrganizationsByUserIdAction(userId)
  if (!orgsResult.isSuccess || !orgsResult.data || orgsResult.data.length === 0) {
    console.log("🔍 [KNOWLEDGE-BASE] No organizations found, redirecting to onboarding")
    redirect("/onboarding")
  }

  return (
    <div className="flex size-full flex-col">
      <Suspense fallback={<KnowledgeBaseSkeleton />}>
        <KnowledgeBaseWrapper userId={userId} />
      </Suspense>
    </div>
  )
}
