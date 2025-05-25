/*
<ai_context>
Defines Firestore collections for Reddit account warm-up feature.
This feature helps users build karma and authority in target subreddits.
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
  redditUsername: string
  targetSubreddits: string[] // List of subreddits to post in
  postingMode: "auto" | "manual" // Auto-post or manual verification
  isActive: boolean
  warmupStartDate: Timestamp
  warmupEndDate: Timestamp // 7 days after start
  dailyPostLimit: number // 2-5 posts per day
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Generated posts for warm-up
export interface WarmupPostDocument {
  id: string
  userId: string
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

// Comments for warm-up posts
export interface WarmupCommentDocument {
  id: string
  userId: string
  warmupPostId: string
  parentCommentId?: string // For replies to comments
  content: string
  status: "draft" | "queued" | "posted" | "failed"
  scheduledFor?: Timestamp
  postedAt?: Timestamp
  redditCommentId?: string
  error?: string
  createdAt: Timestamp
  updatedAt: Timestamp
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

// Rate limiting for warm-up posts
export interface WarmupRateLimitDocument {
  id: string // userId_subreddit
  userId: string
  subreddit: string
  lastPostTime: Timestamp
  postsInLast3Days: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Create types
export interface CreateWarmupAccountData {
  userId: string
  redditUsername: string
  targetSubreddits: string[]
  postingMode?: "auto" | "manual"
  dailyPostLimit?: number
}

export interface CreateWarmupPostData {
  userId: string
  warmupAccountId: string
  subreddit: string
  title: string
  content: string
  scheduledFor?: Timestamp
}

export interface CreateWarmupCommentData {
  userId: string
  warmupPostId: string
  parentCommentId?: string
  content: string
  scheduledFor?: Timestamp
}

// Update types
export interface UpdateWarmupAccountData {
  targetSubreddits?: string[]
  postingMode?: "auto" | "manual"
  isActive?: boolean
  dailyPostLimit?: number
  updatedAt?: Timestamp
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