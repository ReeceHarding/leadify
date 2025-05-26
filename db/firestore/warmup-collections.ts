/*
<ai_context>
Defines Firestore collections for Reddit account warm-up feature.
This feature helps users build karma and authority in target subreddits.
Updated to include organizationId for organization-specific warmup campaigns.
</ai_context>
*/

import { Timestamp } from "firebase/firestore"

export const WARMUP_COLLECTIONS = {
  WARMUP_ACCOUNTS: "warmupAccounts",
  WARMUP_POSTS: "warmupPosts",
  WARMUP_COMMENTS: "warmupComments",
  SUBREDDIT_ANALYSIS: "subredditAnalysis",
  WARMUP_RATE_LIMITS: "warmupRateLimits"
} as const

// Warm-up account configuration
export interface WarmupAccountDocument {
  id: string
  userId: string
  organizationId: string
  redditUsername: string
  targetSubreddits: string[] // List of subreddits to post in
  postingMode: "auto" | "manual" // Auto-post or manual verification
  isActive: boolean
  warmupStartDate: Timestamp
  warmupEndDate: Timestamp // 7 days after start
  dailyPostLimit: number // 2-5 posts per day
  
  // NEW: Tracking fields for warmup progress
  currentDay?: number         // Current day of the warmup cycle (e.g., 1 to 7)
  postsToday?: number         // Number of posts made today for this account
  commentsToday?: number      // Number of comments made today for this account
  totalPostsMade?: number     // Total posts made during the warmup period
  totalCommentsMade?: number  // Total comments made during the warmup period
  status?: "active" | "paused" | "completed" | "error" // Overall status of the warmup account
  lastActivityAt?: Timestamp  // Timestamp of the last post or comment made

  createdAt: Timestamp
  updatedAt: Timestamp
}

// Serialized version for client components
export interface SerializedWarmupAccountDocument
  extends Omit<
    WarmupAccountDocument,
    "warmupStartDate" | "warmupEndDate" | "createdAt" | "updatedAt" | "lastActivityAt"
  > {
  warmupStartDate: string
  warmupEndDate: string
  createdAt: string
  updatedAt: string
  lastActivityAt?: string
}

// Generated posts for warm-up
export interface WarmupPostDocument {
  id: string
  userId: string
  organizationId: string
  warmupAccountId: string
  subreddit: string
  title: string
  content: string
  status: "draft" | "queued" | "posted" | "failed"
  scheduledFor?: Timestamp
  postedAt?: Timestamp
  redditPostId?: string
  redditPostUrl?: string
  upvotes?: number
  commentCount?: number
  error?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Serialized version for client components
export interface SerializedWarmupPostDocument
  extends Omit<
    WarmupPostDocument,
    "scheduledFor" | "postedAt" | "createdAt" | "updatedAt"
  > {
  scheduledFor?: string | null
  postedAt?: string
  createdAt: string
  updatedAt: string
}

// Comments for warm-up posts
export interface WarmupCommentDocument {
  id: string
  userId: string
  organizationId: string
  warmupPostId: string
  parentCommentId?: string // For replies to comments
  redditParentCommentId?: string // The Reddit comment ID we're replying to
  content: string
  status: "draft" | "queued" | "posted" | "failed"
  scheduledFor?: Timestamp
  postedAt?: Timestamp
  redditCommentId?: string
  error?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Serialized version for client components
export interface SerializedWarmupCommentDocument
  extends Omit<
    WarmupCommentDocument,
    "scheduledFor" | "postedAt" | "createdAt" | "updatedAt"
  > {
  scheduledFor?: string | null
  postedAt?: string
  createdAt: string
  updatedAt: string
}

// Cached subreddit analysis
export interface SubredditAnalysisDocument {
  id: string // subreddit name
  subreddit: string
  topPosts: {
    id: string
    title: string
    content: string
    upvotes: number
    createdUtc: number
  }[]
  writingStyle: string // Analysis of writing style
  commonTopics: string[] // Common topics in the subreddit
  lastAnalyzedAt: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Serialized version for client components
export interface SerializedSubredditAnalysisDocument
  extends Omit<
    SubredditAnalysisDocument,
    "lastAnalyzedAt" | "createdAt" | "updatedAt"
  > {
  lastAnalyzedAt: string
  createdAt: string
  updatedAt: string
}

// Rate limiting for warm-up posts
export interface WarmupRateLimitDocument {
  id: string // Should be organizationId_subreddit
  organizationId: string // NEW: Primary key component
  subreddit: string
  lastPostTime: Timestamp
  postsInLast3Days: number // Simple counter, could be more sophisticated
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Serialized version for client components
export interface SerializedWarmupRateLimitDocument
  extends Omit<
    WarmupRateLimitDocument,
    "lastPostTime" | "createdAt" | "updatedAt"
  > {
  lastPostTime: string
  createdAt: string
  updatedAt: string
}

// Create types
export interface CreateWarmupAccountData {
  userId: string
  organizationId: string
  redditUsername: string
  targetSubreddits: string[]
  postingMode?: "auto" | "manual"
  dailyPostLimit?: number
}

export interface CreateWarmupPostData {
  userId: string
  organizationId: string
  warmupAccountId: string
  subreddit: string
  title: string
  content: string
  scheduledFor?: Timestamp
}

export interface CreateWarmupCommentData {
  userId: string
  organizationId: string
  warmupPostId: string
  parentCommentId?: string
  redditParentCommentId?: string
  content: string
  scheduledFor?: Timestamp
}

// Update types
export interface UpdateWarmupAccountData {
  targetSubreddits?: string[]
  postingMode?: "auto" | "manual"
  isActive?: boolean
  dailyPostLimit?: number
  
  // Allow updating tracking fields if needed (e.g., by a cron job or process)
  currentDay?: number        
  postsToday?: number        
  commentsToday?: number     
  totalPostsMade?: number    
  totalCommentsMade?: number 
  status?: "active" | "paused" | "completed" | "error"
  lastActivityAt?: Timestamp 

  updatedAt?: Timestamp // This is usually set by serverTimestamp() in the action
}

export interface UpdateWarmupPostData {
  title?: string
  content?: string
  status?: "draft" | "queued" | "posted" | "failed"
  scheduledFor?: Timestamp
  postedAt?: Timestamp
  redditPostId?: string
  redditPostUrl?: string
  upvotes?: number
  commentCount?: number
  error?: string
  updatedAt?: Timestamp
}

export interface UpdateWarmupCommentData {
  content?: string
  status?: "draft" | "queued" | "posted" | "failed"
  scheduledFor?: Timestamp
  postedAt?: Timestamp
  redditCommentId?: string
  error?: string
  updatedAt?: Timestamp
}
