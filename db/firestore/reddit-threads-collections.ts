import { Timestamp } from "firebase/firestore"

export const REDDIT_COLLECTIONS = {
  THREADS: "reddit_threads",
  THREAD_INTERACTIONS: "reddit_thread_interactions"
} as const

// Reddit thread document - shared between Lead Finder and DM Finder
export interface RedditThreadDocument {
  id: string // Reddit thread ID
  organizationId: string
  title: string
  author: string
  subreddit: string
  url: string
  permalink: string
  content: string
  contentSnippet: string
  score: number
  numComments: number
  createdUtc: number // Reddit creation timestamp
  relevanceScore: number // AI-calculated relevance score
  reasoning: string // AI reasoning for the score
  keywords: string[] // Keywords that matched this thread

  // Tracking fields
  hasComment: boolean // Whether we've posted a comment
  hasDM: boolean // Whether we've sent a DM to the author
  lastCommentAt?: Timestamp
  lastDMAt?: Timestamp
  commentId?: string // Reference to generated_comments document
  dmHistoryId?: string // Reference to dm_history document

  // Metadata
  fetchedAt: Timestamp
  updatedAt: Timestamp
}

// Thread interaction tracking (who did what)
export interface ThreadInteractionDocument {
  id: string
  organizationId: string
  threadId: string
  userId: string
  type: "comment" | "dm" | "view"
  timestamp: Timestamp
  details?: {
    commentId?: string
    dmHistoryId?: string
    status?: string
  }
}

// Create/Update types
export interface CreateRedditThreadData {
  id: string
  organizationId: string
  title: string
  author: string
  subreddit: string
  url: string
  permalink: string
  content: string
  contentSnippet: string
  score: number
  numComments: number
  createdUtc: number
  relevanceScore: number
  reasoning: string
  keywords: string[]
}

export interface UpdateRedditThreadData {
  relevanceScore?: number
  reasoning?: string
  hasComment?: boolean
  hasDM?: boolean
  lastCommentAt?: Timestamp
  lastDMAt?: Timestamp
  commentId?: string
  dmHistoryId?: string
  updatedAt?: Timestamp
}

// Serialized version for client components
export interface SerializedRedditThreadDocument
  extends Omit<
    RedditThreadDocument,
    "fetchedAt" | "updatedAt" | "lastCommentAt" | "lastDMAt"
  > {
  fetchedAt: string
  updatedAt: string
  lastCommentAt?: string
  lastDMAt?: string
}

// Serialized version for thread interaction
export interface SerializedThreadInteractionDocument
  extends Omit<ThreadInteractionDocument, "timestamp"> {
  timestamp: string
}
