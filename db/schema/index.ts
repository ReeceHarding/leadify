/*
<ai_context>
Exports all database schema types and interfaces.
</ai_context>
*/

// Export Firestore types
export * from "@/db/firestore/collections"
export * from "@/db/firestore/lead-generation-collections"
export * from "@/db/firestore/posting-queue-collections"
export * from "@/db/firestore/personalization-collections"
export * from "@/db/firestore/warmup-collections"
export * from "@/db/firestore/organizations-collections"
export * from "@/db/firestore/keyword-performance-collections"
export * from "@/db/firestore/dm-collections"
export * from "@/db/firestore/dm-progress-collections"

// Export Reddit threads collections separately to avoid naming conflicts
export {
  REDDIT_COLLECTIONS,
  type ThreadInteractionDocument,
  type UpdateRedditThreadData as UpdateSharedRedditThreadData
} from "@/db/firestore/reddit-threads-collections"

// Re-export with aliases to avoid conflicts
export type { RedditThreadDocument as SharedRedditThreadDocument } from "@/db/firestore/reddit-threads-collections"
export type { CreateRedditThreadData as CreateSharedRedditThreadData } from "@/db/firestore/reddit-threads-collections"
