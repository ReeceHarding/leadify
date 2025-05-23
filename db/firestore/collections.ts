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

// Profile document interface
export interface ProfileDocument {
  userId: string
  membership: MembershipType
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Types for creating profiles (without timestamps)
export interface CreateProfileData {
  userId: string
  membership?: MembershipType
  stripeCustomerId?: string
  stripeSubscriptionId?: string
}

// Types for updating profiles (all optional except userId for identification)
export interface UpdateProfileData {
  membership?: MembershipType
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  updatedAt?: Timestamp
}
