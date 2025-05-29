/*
<ai_context>
Defines Firestore collections for keyword performance tracking.
Updated to include organizationId for organization-specific keyword tracking.
Enhanced with comprehensive analytics metrics for the analytics dashboard.
</ai_context>
*/

import { Timestamp } from "firebase/firestore"

export const KEYWORD_PERFORMANCE_COLLECTIONS = {
  KEYWORD_PERFORMANCE: "keyword_performance",
  DAILY_ANALYTICS_SNAPSHOTS: "daily_analytics_snapshots"
} as const

export interface KeywordPerformanceDocument {
  id: string // generation id (uuid)
  keyword: string // The actual keyword being tracked
  userId: string
  organizationId: string
  campaignId?: string

  // Analytics metrics
  totalLeadsGenerated: number // Total leads found for this keyword
  totalHighQualityLeads: number // Leads with score >= 70
  sumRelevanceScore: number // Sum of all relevance scores (for avg calculation)
  totalEngagementUpvotes: number // Total upvotes across all posted comments
  totalEngagementReplies: number // Total replies across all posted comments
  totalPostedCommentsUsingKeyword: number // Total comments posted using this keyword

  // Performance tracking
  lastCalculatedAt: Timestamp // When analytics were last calculated
  createdAt: Timestamp
  updatedAt: Timestamp

  // Legacy fields (maintained for backward compatibility)
  keywords?: string[] // Old format - deprecated
  reach?: number[]
  signal?: number[]
  score?: number[]
}

export interface CreateKeywordPerformanceData {
  keyword: string
  userId: string
  organizationId: string
  campaignId?: string
  totalLeadsGenerated?: number
  totalHighQualityLeads?: number
  sumRelevanceScore?: number
  totalEngagementUpvotes?: number
  totalEngagementReplies?: number
  totalPostedCommentsUsingKeyword?: number

  // Legacy fields
  keywords?: string[]
  reach?: number[]
  signal?: number[]
  score?: number[]
}

export interface UpdateKeywordPerformanceData {
  keyword?: string
  totalLeadsGenerated?: number
  totalHighQualityLeads?: number
  sumRelevanceScore?: number
  totalEngagementUpvotes?: number
  totalEngagementReplies?: number
  totalPostedCommentsUsingKeyword?: number
  lastCalculatedAt?: Timestamp
  updatedAt?: Timestamp

  // Legacy fields
  keywords?: string[]
  reach?: number[]
  signal?: number[]
  score?: number[]
}

// Daily analytics snapshots for performance optimization
export interface DailyAnalyticsSnapshotDocument {
  id: string // Format: `{organizationId}_{campaignId}_{date}` or `{organizationId}_{date}` for org-wide
  organizationId: string
  campaignId?: string // null for organization-wide snapshots
  date: Timestamp // Start of the day (midnight)

  // Aggregated metrics for the day
  metrics: {
    leadsGenerated: number
    highQualityLeads: number // score >= 70
    avgRelevanceScore: number
    totalEngagementUpvotes: number
    totalEngagementReplies: number
    commentsPosted: number
    uniqueKeywords: number
    topKeyword?: string // Most performing keyword that day
    topKeywordLeads?: number
  }

  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreateDailyAnalyticsSnapshotData {
  organizationId: string
  campaignId?: string
  date: Timestamp
  metrics: {
    leadsGenerated: number
    highQualityLeads: number
    avgRelevanceScore: number
    totalEngagementUpvotes: number
    totalEngagementReplies: number
    commentsPosted: number
    uniqueKeywords: number
    topKeyword?: string
    topKeywordLeads?: number
  }
}

export interface UpdateDailyAnalyticsSnapshotData {
  metrics?: {
    leadsGenerated?: number
    highQualityLeads?: number
    avgRelevanceScore?: number
    totalEngagementUpvotes?: number
    totalEngagementReplies?: number
    commentsPosted?: number
    uniqueKeywords?: number
    topKeyword?: string
    topKeywordLeads?: number
  }
  updatedAt?: Timestamp
}
