// DM Finder Dashboard Types

export interface DMPost {
  id: string
  threadId: string
  title: string
  author: string
  subreddit: string
  url: string
  created_utc: number
  selftext: string
  score: number
  num_comments: number
  timeAgo?: string
  relevanceScore?: number
  reasoning?: string
  hasComment?: boolean
  hasDM?: boolean
  keywords?: string[]
  dmStatus?: "draft" | "queued" | "sent" | "failed"
  dmContent?: string
  dmSentAt?: string
  selectedLength?: "micro" | "medium" | "verbose"
}

export interface DMAutomation {
  id: string
  name: string
  organizationId: string
  status: "draft" | "running" | "completed" | "paused" | "error"
  totalDMsSent: number
  createdAt: string
  keywords?: string[]
  targetSubreddits?: string[]
}

export interface DMTemplate {
  id: string
  name: string
  content: string
  variables: string[]
}

export interface DashboardState {
  // Core state
  automationId: string | null
  automationName: string | null
  automations: DMAutomation[]
  posts: DMPost[]
  isLoading: boolean
  error: string | null

  // UI state
  selectedLength: "micro" | "medium" | "verbose"
  currentPage: number
  sortBy: "relevance" | "upvotes" | "time" | "fetched" | "posted"
  filterKeyword: string
  filterScore: number
  activeTab: "all" | "queue" | "sent"

  // Operation state
  selectedPost: DMPost | null
  editingDMId: string | null
  toneInstruction: string
  regeneratingId: string | null
  sendingDMId: string | null
  queuingDMId: string | null
  removingDMId: string | null
  isBatchSending: boolean
  showRedditAuthDialog: boolean
  showMassDMDialog: boolean

  // Metadata
  lastPolledAt: Date | null
  pollingEnabled: boolean
  workflowRunning: boolean

  // Debug mode
  debugMode: boolean
  debugLogs: string[]

  // Filter states
  searchQuery: string
  selectedKeyword: string | null
  dateFilter: "all" | "today" | "week" | "month" | "3months"
}

export interface WorkflowProgress {
  currentStage: string
  stages: {
    name: string
    status: "pending" | "in_progress" | "completed" | "error"
    message?: string
    progress?: number
  }[]
  totalProgress: number
  isComplete: boolean
  error?: string
}
