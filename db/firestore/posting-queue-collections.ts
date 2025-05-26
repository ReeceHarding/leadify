/*
<ai_context>
Defines Firestore collections for Reddit posting queue management.
Updated to include organizationId for organization-specific posting.
</ai_context>
*/

import { Timestamp } from "firebase/firestore"

export const POSTING_QUEUE_COLLECTIONS = {
  POSTING_QUEUE: "postingQueue",
  REDDIT_RATE_LIMITS: "redditRateLimits"
} as const

export interface PostingQueueDocument {
  id: string
  leadId: string
  threadId: string
  userId: string
  organizationId: string
  comment: string
  priority: number
  scheduledFor: Timestamp
  retryCount: number
  status: "pending" | "processing" | "completed" | "failed"
  createdAt: Timestamp
  updatedAt: Timestamp
  processingStartedAt?: Timestamp
  completedAt?: Timestamp
  lastError?: string
  lastErrorAt?: Timestamp
  resultLink?: string
}

export interface RedditRateLimitDocument {
  id: string
  userId: string
  organizationId: string
  lastPostTime: Timestamp
  postsInLastHour: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreatePostingQueueData {
  leadId: string
  threadId: string
  userId: string
  organizationId: string
  comment: string
  priority?: number
  scheduledFor?: Timestamp
}

export interface UpdatePostingQueueData {
  status?: "pending" | "processing" | "completed" | "failed"
  retryCount?: number
  processingStartedAt?: Timestamp
  completedAt?: Timestamp
  lastError?: string
  lastErrorAt?: Timestamp
  resultLink?: string
  updatedAt?: Timestamp
}
