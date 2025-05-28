import { SerializedGeneratedCommentDocument } from "@/types"

// Interface for individual lead result displayed in the UI
export interface LeadResult {
  id: string
  campaignId: string
  organizationId: string
  threadId: string // Reddit thread ID (e.g., "t3_xxxxxx")
  postUrl: string
  postTitle: string
  postAuthor: string
  postContentSnippet: string
  postContent?: string // Full post content
  subreddit: string
  relevanceScore: number
  reasoning: string
  microComment: string
  mediumComment: string
  verboseComment: string
  status:
    | "new"
    | "viewed"
    | "approved"
    | "rejected"
    | "used"
    | "queued"
    | "posted"
  selectedLength: "micro" | "medium" | "verbose"
  timeAgo: string
  originalData?: SerializedGeneratedCommentDocument // Raw data from backend
  postScore?: number
  keyword?: string
  createdAt?: string // ISO string format
  postCreatedAt?: string // ISO string format - when the Reddit post was created
  updatedAt?: string // ISO string format
  postedCommentUrl?: string // URL to the posted comment on Reddit
  hasDM?: boolean // Whether a DM has been sent to the post author
}

// Interface for tracking workflow progress of lead generation
export interface WorkflowProgress {
  currentStep: string
  completedSteps: number
  totalSteps: number
  isLoading: boolean // Global loading state for the dashboard
  error?: string
}
