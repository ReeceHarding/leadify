/*
<ai_context>
Defines Firestore collections for Reddit lead generation workflow.
</ai_context>
*/

import { Timestamp } from "firebase/firestore"

// Collection names
export const LEAD_COLLECTIONS = {
  CAMPAIGNS: "campaigns",
  SEARCH_RESULTS: "search_results",
  REDDIT_THREADS: "reddit_threads",
  GENERATED_COMMENTS: "generated_comments"
} as const

// Campaign status
export type CampaignStatus =
  | "draft"
  | "running"
  | "completed"
  | "paused"
  | "error"

// Campaign document interface
export interface CampaignDocument {
  id: string
  userId: string
  name: string
  website: string
  websiteContent?: string // Scraped content from Firecrawl
  keywords: string[] // Keywords to search for
  status: CampaignStatus
  totalSearchResults: number
  totalThreadsAnalyzed: number
  totalCommentsGenerated: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Create campaign data
export interface CreateCampaignData {
  userId: string
  name: string
  website: string
  keywords: string[]
}

// Update campaign data
export interface UpdateCampaignData {
  name?: string
  website?: string
  websiteContent?: string
  keywords?: string[]
  status?: CampaignStatus
  totalSearchResults?: number
  totalThreadsAnalyzed?: number
  totalCommentsGenerated?: number
}

// Search result document interface
export interface SearchResultDocument {
  id: string
  campaignId: string
  keyword: string
  redditUrl: string
  threadId?: string // Extracted from URL like "1i2m7ya"
  title: string
  snippet: string
  position: number
  processed: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Create search result data
export interface CreateSearchResultData {
  campaignId: string
  keyword: string
  redditUrl: string
  threadId?: string
  title: string
  snippet: string
  position: number
}

// Reddit thread document interface
export interface RedditThreadDocument {
  id: string
  campaignId: string
  searchResultId: string
  threadId: string // Reddit thread ID like "1i2m7ya"
  subreddit: string
  title: string
  content: string
  author: string
  score: number
  numComments: number
  url: string
  processed: boolean
  relevanceScore?: number // 1-100 score from OpenAI
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Create Reddit thread data
export interface CreateRedditThreadData {
  campaignId: string
  searchResultId: string
  threadId: string
  subreddit: string
  title: string
  content: string
  author: string
  score: number
  numComments: number
  url: string
}

// Generated comment document interface
export interface GeneratedCommentDocument {
  id: string
  campaignId: string
  redditThreadId: string
  threadId: string // Reddit thread ID
  relevanceScore: number // 1-100 score
  generatedComment: string
  reasoning: string // AI reasoning for the score
  approved: boolean
  used: boolean // Whether the user has used this comment
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Create generated comment data
export interface CreateGeneratedCommentData {
  campaignId: string
  redditThreadId: string
  threadId: string
  relevanceScore: number
  generatedComment: string
  reasoning: string
}

// Update generated comment data
export interface UpdateGeneratedCommentData {
  approved?: boolean
  used?: boolean
}

// Summary data for campaigns
export interface CampaignSummary {
  campaignId: string
  campaignName: string
  totalSearchResults: number
  totalThreadsAnalyzed: number
  averageRelevanceScore: number
  highQualityComments: number // Comments with score > 70
  approvedComments: number
  usedComments: number
}

// Google Sheets export data structure
export interface GoogleSheetsExportData {
  campaignName: string
  keyword: string
  redditUrl: string
  threadTitle: string
  subreddit: string
  threadAuthor: string
  threadScore: number
  relevanceScore: number
  generatedComment: string
  reasoning: string
  approved: string
  used: string
  createdAt: string
}
