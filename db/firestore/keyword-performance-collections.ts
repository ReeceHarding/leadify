/*
<ai_context>
Defines Firestore collections for keyword performance tracking.
Updated to include organizationId for organization-specific keyword tracking.
</ai_context>
*/

import { Timestamp } from "firebase/firestore"

export const KEYWORD_PERFORMANCE_COLLECTIONS = {
  KEYWORD_PERFORMANCE: "keyword_performance"
} as const

export interface KeywordPerformanceDocument {
  id: string // generation id (uuid)
  userId: string
  organizationId: string
  campaignId?: string
  keywords: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
  // TBD metrics – allow partial until populated
  reach?: number[]
  signal?: number[]
  score?: number[]
}

export interface CreateKeywordPerformanceData {
  userId: string
  organizationId: string
  campaignId?: string
  keywords: string[]
  reach?: number[]
  signal?: number[]
  score?: number[]
}

export interface UpdateKeywordPerformanceData {
  keywords?: string[]
  reach?: number[]
  signal?: number[]
  score?: number[]
  updatedAt?: Timestamp
}
