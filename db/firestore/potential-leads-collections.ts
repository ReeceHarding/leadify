/*
<ai_context>
Defines Firestore collections for real-time lead monitoring workflow.
This handles the lightweight scanning and potential lead discovery process.
</ai_context>
*/

import { Timestamp } from "firebase/firestore"

// Collection names
export const POTENTIAL_LEADS_COLLECTIONS = {
  POTENTIAL_LEADS_FEED: "potential_leads_feed"
} as const

// Potential lead status
export type PotentialLeadStatus =
  | "new"
  | "qualifying"
  | "qualified_lead"
  | "ignored"

// Potential lead document interface
export interface PotentialLeadDocument {
  id: string // Reddit Post ID (t3_xxxxxx)
  organizationId: string
  campaignId: string
  matchedKeywords: string[]
  subreddit: string
  title: string
  author: string
  created_utc: number // Reddit creation timestamp
  permalink: string
  content_snippet: string // First ~200 chars of selftext
  status: PotentialLeadStatus // Default "new"
  initial_score?: number // Optional quick heuristic score during scan
  discovered_at: Timestamp

  // Full post data (populated during qualification)
  full_content?: string
  score?: number // Reddit post score/upvotes
  num_comments?: number

  // Qualification results (populated after qualification)
  relevance_score?: number // 1-100 score from AI
  reasoning?: string
  generated_comment?: string
  dm_content?: {
    message: string
    subject: string
    followUp?: string
  }

  // Processing metadata
  qualified_at?: Timestamp
  qualification_error?: string

  // Metadata
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Serialized version for frontend
export interface SerializedPotentialLeadDocument
  extends Omit<
    PotentialLeadDocument,
    "discovered_at" | "qualified_at" | "createdAt" | "updatedAt"
  > {
  discovered_at: string
  qualified_at?: string
  createdAt: string
  updatedAt: string
}

// Create potential lead data
export interface CreatePotentialLeadData {
  id: string // Reddit Post ID
  organizationId: string
  campaignId: string
  matchedKeywords: string[]
  subreddit: string
  title: string
  author: string
  created_utc: number
  permalink: string
  content_snippet: string
  initial_score?: number
  status?: PotentialLeadStatus
}

// Update potential lead data
export interface UpdatePotentialLeadData {
  status?: PotentialLeadStatus
  full_content?: string
  score?: number
  num_comments?: number
  relevance_score?: number
  reasoning?: string
  generated_comment?: string
  dm_content?: {
    message: string
    subject: string
    followUp?: string
  }
  qualified_at?: Timestamp
  qualification_error?: string
  updatedAt?: Timestamp
}

// Helper function to convert Reddit post ID to our format
export const formatRedditPostId = (redditId: string): string => {
  // Handle both t3_xxxxxx and xxxxxx formats
  if (redditId.startsWith("t3_")) {
    return redditId
  }
  return `t3_${redditId}`
}

// Helper function to extract base ID from Reddit format
export const extractBaseRedditId = (redditId: string): string => {
  if (redditId.startsWith("t3_")) {
    return redditId.substring(3)
  }
  return redditId
}

// Helper function to create keyword-subreddit combo key
export const createKeywordSubredditKey = (
  keyword: string,
  subreddit: string
): string => {
  return `${keyword.toLowerCase()}_${subreddit.toLowerCase()}`
}
