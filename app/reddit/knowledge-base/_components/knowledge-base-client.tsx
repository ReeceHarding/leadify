"use client"

import { useState } from "react"
import { SerializedKnowledgeBaseDocument } from "@/actions/db/personalization-actions"
import { SerializedProfileDocument } from "@/actions/db/profiles-actions"
import KnowledgeBaseSection from "../../personalization/_components/knowledge-base-section"

interface KnowledgeBaseClientProps {
  userId: string
  initialKnowledgeBase: SerializedKnowledgeBaseDocument | null
  userProfile: SerializedProfileDocument | null
}

export default function KnowledgeBaseClient({
  userId,
  initialKnowledgeBase,
  userProfile
}: KnowledgeBaseClientProps) {
  const [knowledgeBase, setKnowledgeBase] = useState<SerializedKnowledgeBaseDocument | null>(initialKnowledgeBase)

  return (
    <div className="flex size-full flex-col">
      {/* Header Section */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Knowledge Base</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Build your knowledge base with website content, scraped data, and Twitter analysis to create more informed Reddit comments.
          </p>
        </div>
      </div>

      {/* Knowledge Base Content */}
      <div className="space-y-6">
        <KnowledgeBaseSection
          userId={userId}
          knowledgeBase={knowledgeBase}
          setKnowledgeBase={setKnowledgeBase}
          userProfile={userProfile}
        />
      </div>
    </div>
  )
} 