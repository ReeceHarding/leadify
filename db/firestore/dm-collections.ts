import { Timestamp } from "firebase/firestore"

export const DM_COLLECTIONS = {
  DMS: "dms",
  DM_TEMPLATES: "dmTemplates",
  DM_AUTOMATIONS: "dmAutomations",
  DM_HISTORY: "dmHistory"
} as const

// DM document for tracking DMs to send
export interface DMDocument {
  id: string
  organizationId: string
  userId: string
  postId: string
  postTitle: string
  postUrl: string
  postAuthor: string
  postCreatedAt: Timestamp
  subreddit: string
  messageContent: string
  followUpContent?: string
  status: "pending" | "sent" | "failed" | "skipped"
  sentAt?: Timestamp
  error?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// DM Template for storing reusable templates
export interface DMTemplateDocument {
  id: string
  organizationId: string
  userId: string
  name: string
  description?: string
  messageTemplate: string
  followUpTemplate?: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

// DM Automation for auto-sending DMs
export interface DMAutomationDocument {
  id: string
  organizationId: string
  userId: string
  name: string
  keywords: string[]
  subreddits: string[]
  templateId: string
  isActive: boolean
  maxDailyDMs: number
  dmsSentToday: number
  lastResetAt: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

// DM History for tracking all sent DMs
export interface DMHistoryDocument {
  id: string
  organizationId: string
  userId: string
  dmId: string
  postId: string
  postAuthor: string
  messageContent: string
  followUpContent?: string
  sentAt: Timestamp
  automationId?: string
  templateId?: string
  createdAt: Timestamp
}

// Create types
export interface CreateDMData {
  organizationId: string
  userId: string
  postId: string
  postTitle: string
  postUrl: string
  postAuthor: string
  postCreatedAt: Timestamp
  subreddit: string
  messageContent: string
  followUpContent?: string
}

export interface CreateDMTemplateData {
  organizationId: string
  userId: string
  name: string
  description?: string
  messageTemplate: string
  followUpTemplate?: string
}

export interface CreateDMAutomationData {
  organizationId: string
  userId: string
  name: string
  keywords: string[]
  subreddits: string[]
  templateId: string
  maxDailyDMs: number
}

// Update types
export interface UpdateDMData {
  messageContent?: string
  followUpContent?: string
  status?: "pending" | "sent" | "failed" | "skipped"
  sentAt?: Timestamp
  error?: string
  updatedAt?: Timestamp
}

export interface UpdateDMTemplateData {
  name?: string
  description?: string
  messageTemplate?: string
  followUpTemplate?: string
  isActive?: boolean
  updatedAt?: Timestamp
}

export interface UpdateDMAutomationData {
  name?: string
  keywords?: string[]
  subreddits?: string[]
  templateId?: string
  isActive?: boolean
  maxDailyDMs?: number
  dmsSentToday?: number
  lastResetAt?: Timestamp
  updatedAt?: Timestamp
}
