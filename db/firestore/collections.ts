/*
<ai_context>
Defines Firestore collection names and document interfaces.
</ai_context>
*/

import { Timestamp } from "firebase/firestore"

// Collection names
export const COLLECTIONS = {
  PROFILES: "profiles"
} as const

// Membership enum equivalent
export type MembershipType = "free" | "pro"

// Profile document interface - simplified to only contain user identity and subscription info
export interface ProfileDocument {
  userId: string
  membership: MembershipType
  stripeCustomerId?: string
  stripeSubscriptionId?: string

  // User identity fields only
  name?: string
  profilePictureUrl?: string
  onboardingCompleted?: boolean

  createdAt: Timestamp
  updatedAt: Timestamp
}

// Types for creating profiles (without timestamps)
export interface CreateProfileData {
  userId: string
  membership?: MembershipType
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  name?: string
  profilePictureUrl?: string
  onboardingCompleted?: boolean
}

// Types for updating profiles (all optional)
export interface UpdateProfileData {
  membership?: MembershipType
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  name?: string
  profilePictureUrl?: string
  onboardingCompleted?: boolean
  updatedAt?: Timestamp
}
