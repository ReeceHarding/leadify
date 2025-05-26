"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import KnowledgeBaseWrapper from "./_components/knowledge-base-wrapper"
import KnowledgeBaseSkeleton from "./_components/knowledge-base-skeleton"

export default async function KnowledgeBasePage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/login")
  }

  return (
    <div className="flex size-full flex-col">
      <Suspense fallback={<KnowledgeBaseSkeleton />}>
        <KnowledgeBaseWrapper userId={userId} />
      </Suspense>
    </div>
  )
}
