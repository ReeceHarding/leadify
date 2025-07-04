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
  GENERATED_COMMENTS: "generated_comments",
  INBOX_ITEMS: "inbox_items"
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
  organizationId: string
  name: string
  website: string
  businessDescription?: string // Custom business description when no website
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
  organizationId: string
  name: string
  website?: string
  businessDescription?: string
  keywords: string[]
}

// Update campaign data
export interface UpdateCampaignData {
  name?: string
  website?: string
  businessDescription?: string
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
  organizationId: string
  redditThreadId: string // ID of the document in REDDIT_THREADS collection
  threadId: string // Actual Reddit thread ID (e.g., "t3_xxxxxx")
  postUrl: string // Direct URL to the specific Reddit post or comment
  postTitle: string
  postAuthor: string
  postContentSnippet: string // Short snippet of the original post for context
  postContent?: string // Full post content (added to avoid API calls when viewing)
  relevanceScore: number // 1-100 score (critical scoring)
  reasoning: string // AI reasoning for the score

  // Three-tier LENGTH-BASED comment system
  microComment: string // Ultra-brief helpful advice (5-15 words)
  mediumComment: string // Balanced response with good detail (30-80 words)
  verboseComment: string // Comprehensive, valuable advice (100-200 words)

  // DM content fields
  dmMessage?: string // The personalized DM message
  dmSubject?: string // Subject line for the DM
  dmFollowUp?: string // Optional follow-up message
  dmStatus?: "draft" | "sent" | "failed" | "replied" // DM sending status
  dmSentAt?: Timestamp // When the DM was sent
  dmError?: string // Error message if DM sending failed

  // Analytics & Engagement tracking fields
  engagementUpvotes?: number // Number of upvotes received (default 0)
  engagementRepliesCount?: number // Number of replies received (default 0)
  lastEngagementCheckAt?: Timestamp // Last time we checked engagement metrics
  engagementCheckCount?: number // How many times we've checked engagement (for rate limiting)

  // NEW: Reply Management & Inbox fields
  reddit_comment_id?: string // The ID of *your* comment on Reddit (e.g., "t1_xxxxxx")
  last_reply_fetch_at?: Timestamp // Last time we fetched replies for this comment
  unread_reply_count?: number // Number of unread replies (default 0)
  lead_interaction_status?:
    | "new"
    | "pending_reply"
    | "awaiting_customer"
    | "followed_up"
    | "closed_won"
    | "closed_lost"
    | "archived" // Default "new"
  last_reply_author?: string // Author of the most recent reply
  last_reply_snippet?: string // Snippet of the most recent reply
  last_reply_timestamp?: Timestamp // Timestamp of the most recent reply

  // Metadata
  status:
    | "new"
    | "viewed"
    | "approved"
    | "rejected"
    | "used"
    | "queued"
    | "posted" // Lead status
  selectedLength?: "micro" | "medium" | "verbose" // Which length the user selected
  createdAt: Timestamp
  updatedAt: Timestamp

  // Optional tracking fields
  keyword?: string
  postScore?: number // Reddit post score/upvotes
  postCreatedAt?: Timestamp // When the Reddit post was created
  postedCommentUrl?: string // URL to the posted Reddit comment (after posting)
}

// NEW: Inbox Items Collection for Reply Management
export interface InboxItemDocument {
  id: string // Reddit reply ID (e.g., "t1_yyyyyy")
  organizationId: string
  parent_leadify_comment_id: string // FK to generated_comments.id
  parent_reddit_comment_id: string // Reddit ID of *our* comment
  reddit_thread_id: string // Reddit ID of the original post
  author: string // Author of the reply
  body: string // Content of the reply
  created_utc: number // Unix timestamp from Reddit
  permalink: string // Permalink to this specific reply
  sentiment?: "positive" | "negative" | "neutral" // AI-analyzed sentiment
  status: "unread" | "read" | "action_needed" | "archived" | "replied" // Default "unread"
  notes?: string // User notes about this reply
  fetched_at: Timestamp // When this reply was fetched from Reddit
  score?: number // Reddit score/upvotes for this reply
  depth?: number // Reply depth (0 = direct reply to our comment)

  // Response tracking
  our_response_id?: string // ID of our response comment (if we replied)
  responded_at?: Timestamp // When we responded

  // Metadata
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Create inbox item data
export interface CreateInboxItemData {
  organizationId: string
  parent_leadify_comment_id: string
  parent_reddit_comment_id: string
  reddit_thread_id: string
  author: string
  body: string
  created_utc: number
  permalink: string
  sentiment?: "positive" | "negative" | "neutral"
  score?: number
  depth?: number
}

// Update inbox item data
export interface UpdateInboxItemData {
  status?: "unread" | "read" | "action_needed" | "archived" | "replied"
  notes?: string
  sentiment?: "positive" | "negative" | "neutral"
  our_response_id?: string
  responded_at?: Timestamp
  updatedAt?: Timestamp
}

// Create generated comment data
export interface CreateGeneratedCommentData {
  campaignId: string
  organizationId: string
  redditThreadId: string
  threadId: string
  postUrl: string
  postTitle: string
  postAuthor: string
  postContentSnippet: string
  postContent?: string // Full post content
  relevanceScore: number
  reasoning: string
  microComment: string
  mediumComment: string
  verboseComment: string

  // DM content fields
  dmMessage?: string
  dmSubject?: string
  dmFollowUp?: string

  status?:
    | "new"
    | "viewed"
    | "approved"
    | "rejected"
    | "used"
    | "queued"
    | "posted" // Default to 'new'
  keyword?: string // Optional: which keyword led to this post
  postScore?: number // Optional: Reddit post score
  postCreatedAt?: Timestamp // Optional: Reddit post creation time
}

// Update generated comment data
export interface UpdateGeneratedCommentData {
  status?:
    | "new"
    | "viewed"
    | "approved"
    | "rejected"
    | "used"
    | "queued"
    | "posted"
  selectedLength?: "micro" | "medium" | "verbose"
  postedCommentUrl?: string

  // DM update fields
  dmMessage?: string
  dmSubject?: string
  dmFollowUp?: string
  dmStatus?: "draft" | "sent" | "failed" | "replied"
  dmSentAt?: Timestamp
  dmError?: string

  // Analytics & Engagement update fields
  engagementUpvotes?: number
  engagementRepliesCount?: number
  lastEngagementCheckAt?: Timestamp
  engagementCheckCount?: number

  // NEW: Reply Management update fields
  reddit_comment_id?: string
  last_reply_fetch_at?: Timestamp
  unread_reply_count?: number
  lead_interaction_status?:
    | "new"
    | "pending_reply"
    | "awaiting_customer"
    | "followed_up"
    | "closed_won"
    | "closed_lost"
    | "archived"
  last_reply_author?: string
  last_reply_snippet?: string
  last_reply_timestamp?: Timestamp

  // Allow updating individual comment lengths
  microComment?: string
  mediumComment?: string
  verboseComment?: string

  // Allow updating relevance score and reasoning
  relevanceScore?: number
  reasoning?: string
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
  status: string
  createdAt: string
}
