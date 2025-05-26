/*
<ai_context>
Defines Firestore collections for organizations/teams management.
Each organization can have its own Reddit account and campaigns.
</ai_context>
*/

import { Timestamp } from "firebase/firestore"

// Collection names
export const ORGANIZATION_COLLECTIONS = {
  ORGANIZATIONS: "organizations",
  ORGANIZATION_MEMBERS: "organizationMembers"
} as const

// Organization document interface
export interface OrganizationDocument {
  id: string
  name: string
  ownerId: string // User who created the organization

  // Business information
  website?: string
  businessDescription?: string

  // Reddit OAuth fields (unique per organization)
  redditAccessToken?: string
  redditRefreshToken?: string
  redditTokenExpiresAt?: Timestamp
  redditUsername?: string

  // Organization settings
  plan: "free" | "pro" | "enterprise"
  isActive: boolean

  createdAt: Timestamp
  updatedAt: Timestamp
}

// Organization member document interface
export interface OrganizationMemberDocument {
  id: string
  organizationId: string
  userId: string
  role: "owner" | "admin" | "member"
  joinedAt: Timestamp
  updatedAt: Timestamp
}

// Create organization data
export interface CreateOrganizationData {
  name: string
  ownerId: string
  website?: string
  businessDescription?: string
  plan?: "free" | "pro" | "enterprise"
}

// Update organization data
export interface UpdateOrganizationData {
  name?: string
  website?: string
  businessDescription?: string
  plan?: "free" | "pro" | "enterprise"
  isActive?: boolean

  // Reddit OAuth fields
  redditAccessToken?: string
  redditRefreshToken?: string
  redditTokenExpiresAt?: Timestamp
  redditUsername?: string

  updatedAt?: Timestamp
}

// Serialized version for client components
export interface SerializedOrganizationDocument
  extends Omit<
    OrganizationDocument,
    "createdAt" | "updatedAt" | "redditTokenExpiresAt"
  > {
  createdAt: string
  updatedAt: string
  redditTokenExpiresAt?: string
}

export interface SerializedOrganizationMemberDocument
  extends Omit<OrganizationMemberDocument, "joinedAt" | "updatedAt"> {
  joinedAt: string
  updatedAt: string
}
