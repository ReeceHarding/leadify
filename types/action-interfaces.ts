/*
<ai_context>
Contains interfaces that were previously exported from server action files.
Server action files can only export async functions, so interfaces must be defined elsewhere.
</ai_context>
*/

import { Timestamp } from "firebase/firestore"

// From lead-generation-progress-actions.ts
export interface LeadGenerationProgress {
  campaignId: string
  status: "pending" | "in_progress" | "completed" | "error"
  currentStage: string
  stages: {
    name: string
    status: "pending" | "in_progress" | "completed" | "error"
    startedAt?: Timestamp
    completedAt?: Timestamp
    message?: string
    progress?: number // 0-100
  }[]
  totalProgress: number // 0-100
  startedAt: Timestamp
  completedAt?: Timestamp
  error?: string
  results?: {
    totalThreadsFound: number
    totalThreadsAnalyzed: number
    totalCommentsGenerated: number
    averageRelevanceScore: number
  }
}

// From personalization-actions.ts
export interface SerializedKnowledgeBaseDocument {
  id: string
  userId: string
  organizationId: string
  websiteUrl?: string
  customInformation?: string
  brandNameOverride?: string
  scrapedPages?: string[]
  summary?: string
  keyFacts?: string[]
  createdAt: string
  updatedAt: string
}

export interface SerializedVoiceSettingsDocument {
  id: string
  userId: string
  organizationId: string
  writingStyle: "casual" | "professional" | "friendly" | "technical" | "custom"
  customWritingStyle?: string
  manualWritingStyleDescription?: string
  twitterHandle?: string
  twitterAnalyzed?: boolean
  redditWritingStyleAnalysis?: string
  redditPostSource?: {
    subreddit: string
    postId: string
    postTitle: string
    author: string
    score: number
  }
  personaType: "ceo" | "user" | "subtle" | "custom"
  customPersona?: string
  useAllLowercase?: boolean
  useEmojis?: boolean
  useCasualTone?: boolean
  useFirstPerson?: boolean
  generatedPrompt?: string
  createdAt: string
  updatedAt: string
}

export interface SerializedScrapedContentDocument {
  id: string
  userId: string
  organizationId: string
  url: string
  title?: string
  content: string
  contentType: "webpage" | "pdf" | "document"
  wordCount?: number
  summary?: string
  keyPoints?: string[]
  scrapedAt: string
  createdAt: string
  updatedAt: string
}

export interface TwitterTweet {
  id: string
  text: string
  createdAt: string
  likes: number
  retweets: number
  replies: number
}

export interface SerializedTwitterAnalysisDocument {
  id: string
  userId: string
  twitterHandle: string
  tweets: TwitterTweet[]
  writingStyleAnalysis: string
  commonPhrases: string[]
  toneAnalysis: string
  vocabularyLevel: "casual" | "professional" | "mixed"
  averageTweetLength: number
  emojiUsage: boolean
  hashtagUsage: boolean
  analyzedAt: string
  createdAt: string
  updatedAt: string
}

// From lead-generation-actions.ts
export interface SerializedSearchResultDocument {
  id: string
  campaignId: string
  keyword: string
  redditUrl: string
  threadId?: string
  title: string
  snippet: string
  position: number
  processed: boolean
  createdAt: string
  updatedAt: string
}

export interface SerializedRedditThreadDocument {
  id: string
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
  processed: boolean
  relevanceScore?: number
  relevanceReasoning?: string
  createdAt: string
  updatedAt: string
  redditThreadId?: string
  createdUtc?: number
  analyzed?: boolean
}

export interface SerializedGeneratedCommentDocument {
  id: string
  campaignId: string
  organizationId: string
  redditThreadId: string
  threadId: string
  postUrl: string
  postTitle: string
  postAuthor: string
  postContentSnippet: string
  postContent?: string
  relevanceScore: number
  reasoning: string
  microComment: string
  mediumComment: string
  verboseComment: string

  // DM fields
  dmMessage?: string
  dmSubject?: string
  dmFollowUp?: string
  dmStatus?: "draft" | "sent" | "failed" | "replied"
  dmSentAt?: string
  dmError?: string

  // Analytics & Engagement fields
  engagementUpvotes?: number
  engagementRepliesCount?: number
  lastEngagementCheckAt?: string
  engagementCheckCount?: number

  // NEW: Reply Management fields
  reddit_comment_id?: string
  last_reply_fetch_at?: string
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
  last_reply_timestamp?: string

  status:
    | "new"
    | "viewed"
    | "approved"
    | "rejected"
    | "used"
    | "queued"
    | "posted"
  selectedLength?: "micro" | "medium" | "verbose"
  createdAt: string
  updatedAt: string
  postScore?: number
  keyword?: string
  postedCommentUrl?: string
  postCreatedAt?: string
}

// From campaign-actions.ts
export interface SerializedCampaignDocument {
  id: string
  userId: string
  organizationId: string
  name: string
  website?: string
  businessDescription?: string
  websiteContent?: string
  keywords: string[]
  status: "draft" | "running" | "completed" | "paused" | "error"
  totalSearchResults: number
  totalThreadsAnalyzed: number
  totalCommentsGenerated: number
  createdAt: string
  updatedAt: string
}

// From workflow-actions.ts
export interface WorkflowStepResult {
  step: string
  success: boolean
  message: string
  data?: any
}

export interface WorkflowProgress {
  currentStep: string
  totalSteps: number
  completedSteps: number
  results: WorkflowStepResult[]
  isComplete?: boolean
  error?: string
}

// From reddit-oauth-actions.ts and reddit-oauth-user-actions.ts
export interface RedditOAuthTokens {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  refresh_token?: string
}

// From reddit-search-actions.ts
export interface SearchOptions {
  limit?: number
  sort?: "relevance" | "hot" | "top" | "new" | "comments"
  time?: "all" | "year" | "month" | "week" | "day" | "hour"
  after?: string
  subreddit?: string
}

export interface RedditPost {
  id: string
  title: string
  selftext: string
  author: string
  subreddit: string
  score: number
  num_comments: number
  created_utc: number
  url: string
  permalink: string
  link_flair_text?: string
  over_18: boolean
  spoiler: boolean
  locked: boolean
  stickied: boolean
  is_self: boolean
  domain?: string
  thumbnail?: string
  preview?: {
    images?: Array<{
      source?: {
        url?: string
        width?: number
        height?: number
      }
    }>
  }
}

// From openai-actions.ts
export interface ThreeTierCommentResult {
  score: number // 1-100
  reasoning: string
  microComment: string
  mediumComment: string
  verboseComment: string
}

export interface ReplyGenerationResult {
  reply: string
}

export interface InformationCombiningResult {
  combinedInformation: string
}

// From reddit-actions.ts
export interface RedditThreadData {
  id: string
  title: string
  content: string
  author: string
  subreddit: string
  score: number
  numComments: number
  url: string
  created: number
  createdUtc?: number
  selfText?: string
  isVideo?: boolean
  isImage?: boolean
  domain?: string
  comments?: RedditComment[]
}

export interface RedditComment {
  id: string
  author: string
  body: string
  score: number
  created_utc: number
  createdUtc?: number
  is_submitter?: boolean
  replies?: RedditComment[]
  depth?: number
  awards?: number
  distinguished?: string
  stickied?: boolean
}

// From google-search-actions.ts
export interface GoogleSearchResult {
  title: string
  link: string
  snippet: string
  position: number
  threadId?: string // Extracted Reddit thread ID
}

// From firecrawl-actions.ts
export interface ScrapeResult {
  url: string
  content: string
  title?: string
  description?: string
}

// From firebase-export-actions.ts
export interface FirebaseExportData {
  id: string
  campaignId: string
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
  exportedAt: Date
}

// From reddit-threads-actions.ts
export type {
  SerializedRedditThreadDocument as SerializedSharedRedditThreadDocument,
  SerializedThreadInteractionDocument
} from "@/db/firestore/reddit-threads-collections"

// NEW: Serialized Inbox Item Document
export interface SerializedInboxItemDocument {
  id: string
  organizationId: string
  parent_leadify_comment_id: string
  parent_reddit_comment_id: string
  reddit_thread_id: string
  author: string
  body: string
  created_utc: number
  permalink: string
  sentiment?: "positive" | "negative" | "neutral"
  status: "unread" | "read" | "action_needed" | "archived" | "replied"
  notes?: string
  fetched_at: string
  score?: number
  depth?: number
  our_response_id?: string
  responded_at?: string
  createdAt: string
  updatedAt: string
}
