/*
<ai_context>
Contains types related to profiles, including the serialized version for client components.
</ai_context>
*/

// Create a serialized version of ProfileDocument that can be passed to client components
export interface SerializedProfileDocument {
  userId: string
  membership: "free" | "basic" | "pro"
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  name?: string
  profilePictureUrl?: string
  website?: string
  keywords?: string[] // Keywords for lead generation
  onboardingCompleted?: boolean

  // Reddit OAuth fields
  redditAccessToken?: string
  redditRefreshToken?: string
  redditTokenExpiresAt?: string // ISO string instead of Timestamp
  redditUsername?: string

  createdAt: string // ISO string instead of Timestamp
  updatedAt: string // ISO string instead of Timestamp
}
