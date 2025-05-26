/*
<ai_context>
Contains types related to profiles, including the serialized version for client components.
</ai_context>
*/

// Create a serialized version of ProfileDocument that can be passed to client components
export interface SerializedProfileDocument {
  userId: string
  membership: "free" | "pro"
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  
  // User identity fields only
  name?: string
  profilePictureUrl?: string
  onboardingCompleted?: boolean

  createdAt: string // ISO string instead of Timestamp
  updatedAt: string // ISO string instead of Timestamp
}
