/*
<ai_context>
Unified queue collections for managing Reddit posting across multiple organizations.
Consolidates posts by Reddit account rather than organization for efficient queue management.
</ai_context>
*/

import { Timestamp } from "firebase/firestore"

export const UNIFIED_QUEUE_COLLECTIONS = {
  REDDIT_ACCOUNTS: "redditAccounts", // Master list of Reddit accounts
  UNIFIED_POST_QUEUE: "unifiedPostQueue", // Unified queue by Reddit account
  QUEUE_SETTINGS: "queueSettings", // Settings per Reddit account
  POSTING_SCHEDULES: "postingSchedules" // Advanced scheduling settings
} as const

// Master Reddit account tracking across organizations
export interface RedditAccountDocument {
  id: string // Reddit username as ID
  redditUsername: string
  organizationIds: string[] // All organizations using this account
  isActive: boolean
  currentQueueLength: number
  lastPostAt?: Timestamp
  nextScheduledPost?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Unified post queue item
export interface UnifiedPostQueueDocument {
  id: string
  redditAccount: string // Reddit username
  organizationId: string
  campaignId?: string // For lead generation posts
  warmupAccountId?: string // For warmup posts

  // Post details
  type: "warmup" | "lead_generation" | "comment"
  subreddit: string
  title?: string // For posts
  content: string
  parentId?: string // For comments

  // Queue management
  queuePosition: number
  priority: "low" | "normal" | "high"
  scheduledFor: Timestamp
  status: "queued" | "posted" | "failed" | "cancelled"

  // Metadata
  campaignName?: string
  organizationName?: string
  relevanceScore?: number
  postUrl?: string
  redditPostId?: string
  error?: string

  createdAt: Timestamp
  updatedAt: Timestamp
  postedAt?: Timestamp
}

// Queue settings per Reddit account
export interface QueueSettingsDocument {
  id: string // Reddit username as ID
  redditAccount: string

  // Posting timing
  postingMode: "aggressive" | "safe" | "custom"
  minIntervalMinutes: number // Minimum time between posts
  maxIntervalMinutes: number // Maximum time between posts

  // Daily limits
  dailyPostLimit: number
  dailyCommentLimit: number

  // Subreddit-specific settings
  subredditSettings: {
    [subreddit: string]: {
      minDaysBetweenPosts: number
      minDaysBetweenComments: number
      maxPostsPerWeek: number
    }
  }

  // Ratios and balancing
  warmupToLeadRatio: number // 0.5 = 1 warmup per 2 lead posts

  // Active hours (24-hour format)
  activeHours: {
    start: number // 9 = 9 AM
    end: number // 17 = 5 PM
  }

  // Days of week (0 = Sunday, 6 = Saturday)
  activeDays: number[]

  createdAt: Timestamp
  updatedAt: Timestamp
}

// Advanced posting schedule templates
export interface PostingScheduleDocument {
  id: string
  redditAccount: string
  name: string

  // Schedule type
  type: "aggressive" | "safe" | "natural" | "custom"

  // Timing patterns
  intervals: {
    posts: {
      min: number // minutes
      max: number
      average: number
    }
    comments: {
      min: number
      max: number
      average: number
    }
  }

  // Jitter and randomization
  jitterPercent: number // 0-100, adds randomness to avoid patterns

  createdAt: Timestamp
  updatedAt: Timestamp
}

// Serialized versions for frontend
export interface SerializedRedditAccountDocument {
  id: string
  redditUsername: string
  organizationIds: string[]
  isActive: boolean
  currentQueueLength: number
  lastPostAt?: string
  nextScheduledPost?: string
  createdAt: string
  updatedAt: string
}

export interface SerializedUnifiedPostQueueDocument {
  id: string
  redditAccount: string
  organizationId: string
  campaignId?: string
  warmupAccountId?: string
  type: "warmup" | "lead_generation" | "comment"
  subreddit: string
  title?: string
  content: string
  parentId?: string
  queuePosition: number
  priority: "low" | "normal" | "high"
  scheduledFor: string
  status: "queued" | "posted" | "failed" | "cancelled"
  campaignName?: string
  organizationName?: string
  relevanceScore?: number
  postUrl?: string
  redditPostId?: string
  error?: string
  createdAt: string
  updatedAt: string
  postedAt?: string
}

export interface SerializedQueueSettingsDocument {
  id: string
  redditAccount: string
  postingMode: "aggressive" | "safe" | "custom"
  minIntervalMinutes: number
  maxIntervalMinutes: number
  dailyPostLimit: number
  dailyCommentLimit: number
  subredditSettings: {
    [subreddit: string]: {
      minDaysBetweenPosts: number
      minDaysBetweenComments: number
      maxPostsPerWeek: number
    }
  }
  warmupToLeadRatio: number
  activeHours: {
    start: number
    end: number
  }
  activeDays: number[]
  createdAt: string
  updatedAt: string
}

export interface SerializedPostingScheduleDocument {
  id: string
  redditAccount: string
  name: string
  type: "aggressive" | "safe" | "natural" | "custom"
  intervals: {
    posts: {
      min: number
      max: number
      average: number
    }
    comments: {
      min: number
      max: number
      average: number
    }
  }
  jitterPercent: number
  createdAt: string
  updatedAt: string
}

// Create/Update interfaces
export interface CreateRedditAccountData {
  redditUsername: string
  organizationIds: string[]
  isActive?: boolean
}

export interface UpdateRedditAccountData {
  organizationIds?: string[]
  isActive?: boolean
  currentQueueLength?: number
  lastPostAt?: Timestamp
  nextScheduledPost?: Timestamp
}

export interface CreateUnifiedPostQueueData {
  redditAccount: string
  organizationId: string
  campaignId?: string
  warmupAccountId?: string
  type: "warmup" | "lead_generation" | "comment"
  subreddit: string
  title?: string
  content: string
  parentId?: string
  priority?: "low" | "normal" | "high"
  scheduledFor?: Timestamp
  campaignName?: string
  organizationName?: string
  relevanceScore?: number
}

export interface UpdateUnifiedPostQueueData {
  queuePosition?: number
  priority?: "low" | "normal" | "high"
  scheduledFor?: Timestamp
  status?: "queued" | "posted" | "failed" | "cancelled"
  postUrl?: string
  redditPostId?: string
  error?: string
  postedAt?: Timestamp
}

export interface CreateQueueSettingsData {
  redditAccount: string
  postingMode?: "aggressive" | "safe" | "custom"
  minIntervalMinutes?: number
  maxIntervalMinutes?: number
  dailyPostLimit?: number
  dailyCommentLimit?: number
  warmupToLeadRatio?: number
}

export interface UpdateQueueSettingsData {
  postingMode?: "aggressive" | "safe" | "custom"
  minIntervalMinutes?: number
  maxIntervalMinutes?: number
  dailyPostLimit?: number
  dailyCommentLimit?: number
  subredditSettings?: {
    [subreddit: string]: {
      minDaysBetweenPosts: number
      minDaysBetweenComments: number
      maxPostsPerWeek: number
    }
  }
  warmupToLeadRatio?: number
  activeHours?: {
    start: number
    end: number
  }
  activeDays?: number[]
}
