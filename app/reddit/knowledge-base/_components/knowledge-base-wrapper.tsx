"use client"

import { useEffect, useState } from "react"
import { useOrganization } from "@/components/utilities/organization-provider"
import { getKnowledgeBaseByOrganizationIdAction } from "@/actions/db/personalization-actions"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import KnowledgeBaseClient from "./knowledge-base-client"
import KnowledgeBaseSkeleton from "./knowledge-base-skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { SerializedKnowledgeBaseDocument } from "@/types"
import { SerializedProfileDocument } from "@/types"

interface KnowledgeBaseWrapperProps {
  userId: string
}

export default function KnowledgeBaseWrapper({ userId }: KnowledgeBaseWrapperProps) {
  const { activeOrganization, isLoading: orgLoading } = useOrganization()
  const [knowledgeBase, setKnowledgeBase] = useState<SerializedKnowledgeBaseDocument | null>(null)
  const [userProfile, setUserProfile] = useState<SerializedProfileDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (activeOrganization && !orgLoading) {
      loadData()
    }
  }, [activeOrganization, orgLoading])

  const loadData = async () => {
    if (!activeOrganization) return

    try {
      setIsLoading(true)
      const [knowledgeBaseResult, profileResult] = await Promise.all([
        getKnowledgeBaseByOrganizationIdAction(activeOrganization.id),
        getProfileByUserIdAction(userId)
      ])

      setKnowledgeBase(knowledgeBaseResult.data || null)
      setUserProfile(profileResult.data || null)
    } catch (error) {
      console.error("Error loading knowledge base:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (orgLoading || isLoading) {
    return <KnowledgeBaseSkeleton />
  }

  if (!activeOrganization) {
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>
          No organization selected. Please select an organization from the sidebar.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <KnowledgeBaseClient
      userId={userId}
      organizationId={activeOrganization.id}
      initialKnowledgeBase={knowledgeBase}
      userProfile={userProfile}
    />
  )
} 