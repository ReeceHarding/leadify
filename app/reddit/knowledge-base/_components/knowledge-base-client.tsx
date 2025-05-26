"use client"

import { useState } from "react"
import {
  SerializedKnowledgeBaseDocument,
  SerializedProfileDocument
} from "@/types"
import KnowledgeBaseDisplay from "./knowledge-base-display"
import AddToKnowledgeBase from "./add-to-knowledge-base"

interface KnowledgeBaseClientProps {
  userId: string
  organizationId: string
  initialKnowledgeBase: SerializedKnowledgeBaseDocument | null
  userProfile: SerializedProfileDocument | null
}

export default function KnowledgeBaseClient({
  userId,
  organizationId,
  initialKnowledgeBase,
  userProfile
}: KnowledgeBaseClientProps) {
  const [knowledgeBase, setKnowledgeBase] =
    useState<SerializedKnowledgeBaseDocument | null>(initialKnowledgeBase)

  return (
    <div className="flex size-full flex-col">
      {/* Header Section */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Knowledge Base
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Build your organization's knowledge base with website content,
            scraped data, and additional information to create more informed
            Reddit comments.
          </p>
        </div>
      </div>

      {/* Knowledge Base Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: What We Know */}
        <KnowledgeBaseDisplay
          knowledgeBase={knowledgeBase}
          userProfile={userProfile}
        />

        {/* Right Column: Add to Knowledge Base */}
        <AddToKnowledgeBase
          userId={userId}
          organizationId={organizationId}
          knowledgeBase={knowledgeBase}
          setKnowledgeBase={setKnowledgeBase}
          userProfile={userProfile}
        />
      </div>
    </div>
  )
}
