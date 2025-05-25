import { SerializedGeneratedCommentDocument } from "@/actions/db/lead-generation-actions"

// Interface for individual lead result displayed in the UI
export interface LeadResult {
  id: string
  campaignId: string
  postUrl: string
  postTitle: string
  postAuthor: string
  postContentSnippet: string
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
}

// Interface for tracking workflow progress of lead generation
export interface WorkflowProgress {
  currentStep: string
  completedSteps: number
  totalSteps: number
  isLoading: boolean // Global loading state for the dashboard
  error?: string
}
