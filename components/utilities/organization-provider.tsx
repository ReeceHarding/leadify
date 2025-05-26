/*
<ai_context>
This client component provides organization context for the entire app.
Manages the current active organization and provides helper functions.
</ai_context>
*/

"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { SerializedOrganizationDocument } from "@/db/schema"
import { getOrganizationsByUserIdAction } from "@/actions/db/organizations-actions"
import { toast } from "sonner"

interface OrganizationContextType {
  organizations: SerializedOrganizationDocument[]
  activeOrganization: SerializedOrganizationDocument | null
  isLoading: boolean
  setActiveOrganization: (org: SerializedOrganizationDocument) => void
  refreshOrganizations: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | null>(null)

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error("useOrganization must be used within OrganizationProvider")
  }
  return context
}

export function OrganizationProvider({
  children
}: {
  children: React.ReactNode
}) {
  const { user } = useUser()
  const [organizations, setOrganizations] = useState<
    SerializedOrganizationDocument[]
  >([])
  const [activeOrganization, setActiveOrganizationState] =
    useState<SerializedOrganizationDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load organizations when user is available
  useEffect(() => {
    if (user?.id) {
      loadOrganizations()
    }
  }, [user?.id])

  // Load active organization from localStorage
  useEffect(() => {
    const storedOrgId = localStorage.getItem("activeOrgId")
    if (storedOrgId && organizations.length > 0) {
      const org = organizations.find(o => o.id === storedOrgId)
      if (org) {
        setActiveOrganizationState(org)
      } else if (organizations.length > 0) {
        // If stored org not found, use first org
        setActiveOrganizationState(organizations[0])
        localStorage.setItem("activeOrgId", organizations[0].id)
      }
    } else if (organizations.length > 0 && !activeOrganization) {
      // No stored org, use first org
      setActiveOrganizationState(organizations[0])
      localStorage.setItem("activeOrgId", organizations[0].id)
    }
  }, [organizations])

  const loadOrganizations = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      console.log("🏢 [ORG-PROVIDER] Loading organizations for user:", user.id)

      const result = await getOrganizationsByUserIdAction(user.id)

      if (result.isSuccess && result.data) {
        console.log(
          "🏢 [ORG-PROVIDER] Loaded organizations:",
          result.data.length
        )
        setOrganizations(result.data)
      } else {
        console.error(
          "🏢 [ORG-PROVIDER] Failed to load organizations:",
          result.message
        )
      }
    } catch (error) {
      console.error("🏢 [ORG-PROVIDER] Error loading organizations:", error)
      toast.error("Failed to load organizations")
    } finally {
      setIsLoading(false)
    }
  }

  const setActiveOrganization = (org: SerializedOrganizationDocument) => {
    console.log(
      "🏢 [ORG-PROVIDER] Setting active organization:",
      org.id,
      org.name
    )
    setActiveOrganizationState(org)
    localStorage.setItem("activeOrgId", org.id)
  }

  const refreshOrganizations = async () => {
    await loadOrganizations()
  }

  const value: OrganizationContextType = {
    organizations,
    activeOrganization,
    isLoading,
    setActiveOrganization,
    refreshOrganizations
  }

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}
