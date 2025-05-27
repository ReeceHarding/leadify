import { Timestamp } from "firebase/firestore"

export const KEYWORD_PERFORMANCE_COLLECTIONS = {
  KEYWORD_PERFORMANCE: "keyword_performance"
} as const

export interface KeywordPerformanceDocument {
  id: string // generation id (uuid)
  campaignId?: string
  keywords: string[]
  createdAt: Timestamp
  // TBD metrics – allow partial until populated
  reach?: number[]
  signal?: number[]
  score?: number[]
} 