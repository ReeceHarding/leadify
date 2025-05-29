import { Timestamp } from "firebase/firestore"

export const MONITORING_COLLECTIONS = {
  CAMPAIGN_MONITORS: "campaign_monitors",
  MONITORING_LOGS: "monitoring_logs"
} as const

export interface CampaignMonitorDocument {
  id: string
  campaignId: string
  organizationId: string
  userId: string

  // Monitoring settings
  enabled: boolean
  frequency:
    | "15min"
    | "30min"
    | "1hour"
    | "2hours"
    | "4hours"
    | "6hours"
    | "12hours"
    | "24hours"
  priority: "high" | "medium" | "low"

  // Tracking
  lastCheckAt: Timestamp | null
  nextCheckAt: Timestamp | null
  lastPostFoundAt: Timestamp | null
  consecutiveEmptyChecks: number
  totalChecks: number
  totalPostsFound: number

  // API usage
  apiCallsToday: number
  apiCallsMonth: number
  lastApiReset: Timestamp

  // Metadata
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreateCampaignMonitorData {
  campaignId: string
  organizationId: string
  userId: string
  frequency?: CampaignMonitorDocument["frequency"]
  priority?: CampaignMonitorDocument["priority"]
  enabled?: boolean
}

export interface UpdateCampaignMonitorData {
  enabled?: boolean
  frequency?: CampaignMonitorDocument["frequency"]
  priority?: CampaignMonitorDocument["priority"]
  lastCheckAt?: Timestamp
  nextCheckAt?: Timestamp
  lastPostFoundAt?: Timestamp
  consecutiveEmptyChecks?: number
  totalChecks?: number
  totalPostsFound?: number
  apiCallsToday?: number
  apiCallsMonth?: number
  lastApiReset?: Timestamp
}

export interface MonitoringLogDocument {
  id: string
  monitorId: string
  campaignId: string
  organizationId: string

  // Check details
  checkStartedAt: Timestamp
  checkCompletedAt: Timestamp | null
  status: "running" | "success" | "failed" | "skipped"

  // Results
  postsFound: number
  newPostsAdded: number
  apiCallsUsed: number

  // Error tracking
  error?: string
  errorDetails?: any

  // Metadata
  createdAt: Timestamp
}

export interface CreateMonitoringLogData {
  monitorId: string
  campaignId: string
  organizationId: string
  status?: MonitoringLogDocument["status"]
}

// Helper to convert frequency to milliseconds
export const frequencyToMs = (
  frequency: CampaignMonitorDocument["frequency"]
): number => {
  const map: Record<CampaignMonitorDocument["frequency"], number> = {
    "15min": 15 * 60 * 1000,
    "30min": 30 * 60 * 1000,
    "1hour": 60 * 60 * 1000,
    "2hours": 2 * 60 * 60 * 1000,
    "4hours": 4 * 60 * 60 * 1000,
    "6hours": 6 * 60 * 60 * 1000,
    "12hours": 12 * 60 * 60 * 1000,
    "24hours": 24 * 60 * 60 * 1000
  }
  return map[frequency]
}
