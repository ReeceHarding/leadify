/*
<ai_context>
This client component provides organization context for the entire app.
Manages the current active organization and provides helper functions.
</ai_context>
*/

"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from "react"
import { useUser } from "@clerk/nextjs"
import { getOrganizationsByUserIdAction } from "@/actions/db/organizations-actions"
import { SerializedOrganizationDocument } from "@/db/firestore/organizations-collections"
import { toast } from "sonner"

interface OrganizationContextType {
  organizations: SerializedOrganizationDocument[]
  currentOrganization: SerializedOrganizationDocument | null
  setCurrentOrganization: (org: SerializedOrganizationDocument) => void
  isLoading: boolean
  error: string | null
  refreshOrganizations: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser()
  const [organizations, setOrganizations] = useState<
    SerializedOrganizationDocument[]
  >([])
  const [currentOrganization, setCurrentOrganization] =
    useState<SerializedOrganizationDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrganizations = async () => {
    if (!user?.id) {
      console.log("🏢 [ORG-PROVIDER] No user ID, skipping organization load")
      setIsLoading(false)
      return
    }

    try {
      console.log("🏢 [ORG-PROVIDER] Loading organizations for user:", user.id)
      setIsLoading(true)
      setError(null)

      const result = await getOrganizationsByUserIdAction(user.id)

      if (result.isSuccess && result.data.length > 0) {
        console.log(
          "🏢 [ORG-PROVIDER] Loaded organizations:",
          result.data.length
        )
        setOrganizations(result.data)

        // Set current organization from localStorage or use first one
        const savedOrgId = localStorage.getItem("currentOrganizationId")
        const savedOrg = savedOrgId
          ? result.data.find(org => org.id === savedOrgId)
          : null

        if (savedOrg) {
          console.log(
            "🏢 [ORG-PROVIDER] Restored saved organization:",
            savedOrg.name
          )
          setCurrentOrganization(savedOrg)
        } else if (result.data.length > 0) {
          console.log(
            "🏢 [ORG-PROVIDER] Setting first organization as current:",
            result.data[0].name
          )
          setCurrentOrganization(result.data[0])
          localStorage.setItem("currentOrganizationId", result.data[0].id)
        }
      } else {
        console.log("🏢 [ORG-PROVIDER] No organizations found")
        setOrganizations([])
        setCurrentOrganization(null)
      }
    } catch (err) {
      console.error("🏢 [ORG-PROVIDER] Error loading organizations:", err)
      setError(
        err instanceof Error ? err.message : "Failed to load organizations"
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isLoaded) {
      loadOrganizations()
    }
  }, [user?.id, isLoaded])

  const handleSetCurrentOrganization = (
    org: SerializedOrganizationDocument
  ) => {
    console.log("🏢 [ORG-PROVIDER] Setting current organization:", org.name)
    setCurrentOrganization(org)
    localStorage.setItem("currentOrganizationId", org.id)
  }

  const value: OrganizationContextType = {
    organizations,
    currentOrganization,
    setCurrentOrganization: handleSetCurrentOrganization,
    isLoading,
    error,
    refreshOrganizations: loadOrganizations
  }

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    )
  }
  return context
}
