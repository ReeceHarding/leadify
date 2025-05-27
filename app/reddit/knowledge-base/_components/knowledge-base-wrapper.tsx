"use client"

import { useEffect, useState } from "react"
import { useOrganization } from "@/components/utilities/organization-provider"
import { getKnowledgeBaseByOrganizationIdAction } from "@/actions/db/personalization-actions"

import KnowledgeBaseClient from "./knowledge-base-client"
import KnowledgeBaseSkeleton from "./knowledge-base-skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { SerializedKnowledgeBaseDocument } from "@/types"

interface KnowledgeBaseWrapperProps {
  userId: string
}

export default function KnowledgeBaseWrapper({
  userId
}: KnowledgeBaseWrapperProps) {
  const { currentOrganization, isLoading: orgLoading } = useOrganization()
  const [knowledgeBase, setKnowledgeBase] =
    useState<SerializedKnowledgeBaseDocument | null>(null)

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (currentOrganization && !orgLoading) {
      loadData()
    }
  }, [currentOrganization, orgLoading])

  const loadData = async () => {
    if (!currentOrganization) return

    try {
      setIsLoading(true)
      const knowledgeBaseResult = await getKnowledgeBaseByOrganizationIdAction(
        currentOrganization.id
      )
      setKnowledgeBase(knowledgeBaseResult.data || null)
    } catch (error) {
      console.error("Error loading knowledge base:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (orgLoading || isLoading) {
    return <KnowledgeBaseSkeleton />
  }

  if (!currentOrganization) {
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>
          No organization selected. Please select an organization from the
          sidebar.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <KnowledgeBaseClient
      userId={userId}
      organizationId={currentOrganization.id}
      initialKnowledgeBase={knowledgeBase}
      userProfile={null}
    />
  )
}
