import { Timestamp } from "firebase/firestore"

export const DM_PROGRESS_COLLECTIONS = {
  DM_PROGRESS: "dm_progress"
} as const

// DM Progress stages
export const DM_PROGRESS_STAGES = [
  "Initializing",
  "Searching Users",
  "Analyzing Profiles",
  "Generating Messages",
  "Sending DMs",
  "Finalizing Results"
] as const

export type DMProgressStage = (typeof DM_PROGRESS_STAGES)[number]

// Stage status for tracking progress
export interface StageStatus {
  name: DMProgressStage
  status: "pending" | "in_progress" | "completed" | "error"
  message?: string
  progress?: number // 0-100 percentage for the stage
  startedAt?: Timestamp
  completedAt?: Timestamp
}

// DM Progress document for real-time tracking
export interface DMProgressDocument {
  id: string // Same as automation ID
  automationId: string
  organizationId: string
  userId: string
  status: "pending" | "in_progress" | "completed" | "error"
  currentStage: DMProgressStage
  stages: StageStatus[]
  totalProgress: number // 0-100 overall progress
  results?: {
    totalUsersFound: number
    totalUsersAnalyzed: number
    totalDMsSent: number
    totalDMsFailed: number
    averageRelevanceScore?: number
  }
  error?: string
  startedAt: Timestamp
  updatedAt: Timestamp
  completedAt?: Timestamp
}

export interface CreateDMProgressData {
  automationId: string
  organizationId: string
  userId: string
}

export interface UpdateDMProgressData {
  status?: "pending" | "in_progress" | "completed" | "error"
  currentStage?: DMProgressStage
  stageUpdate?: {
    stageName: DMProgressStage
    status: "pending" | "in_progress" | "completed" | "error"
    message?: string
    progress?: number
  }
  totalProgress?: number
  results?: {
    totalUsersFound: number
    totalUsersAnalyzed: number
    totalDMsSent: number
    totalDMsFailed: number
    averageRelevanceScore?: number
  }
  error?: string
}
