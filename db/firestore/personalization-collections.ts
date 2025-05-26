/*
<ai_context>
Defines Firestore collections for personalization features including knowledge base and voice settings.
Updated to include organizationId for organization-specific personalization.
</ai_context>
*/

import { Timestamp } from "firebase/firestore"

// Collection names
export const PERSONALIZATION_COLLECTIONS = {
  KNOWLEDGE_BASE: "knowledgeBase",
  VOICE_SETTINGS: "voiceSettings",
  SCRAPED_CONTENT: "scrapedContent",
  TWITTER_ANALYSIS: "twitterAnalysis"
} as const

// Knowledge Base Document Interface
export interface KnowledgeBaseDocument {
  id: string
  userId: string
  organizationId: string
  websiteUrl?: string
  customInformation?: string
  scrapedPages?: string[]
  summary?: string
  keyFacts?: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreateKnowledgeBaseData {
  userId: string
  organizationId: string
  websiteUrl?: string
  customInformation?: string
  scrapedPages?: string[]
  summary?: string
  keyFacts?: string[]
}

export interface UpdateKnowledgeBaseData {
  websiteUrl?: string
  customInformation?: string
  scrapedPages?: string[]
  summary?: string
  keyFacts?: string[]
  updatedAt?: Timestamp
}

// Voice Settings Document Interface
export type PersonaType = "ceo" | "user" | "subtle" | "custom"
export type WritingStyle =
  | "casual"
  | "professional"
  | "friendly"
  | "technical"
  | "custom"

export interface VoiceSettingsDocument {
  id: string
  userId: string
  organizationId: string

  // Writing style preferences
  writingStyle: WritingStyle
  customWritingStyle?: string
  manualWritingStyleDescription?: string
  twitterHandle?: string
  twitterAnalyzed?: boolean

  // Persona preferences
  personaType: PersonaType
  customPersona?: string

  // Style preferences
  useAllLowercase?: boolean
  useEmojis?: boolean
  useCasualTone?: boolean
  useFirstPerson?: boolean

  // Generated prompt
  generatedPrompt?: string

  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreateVoiceSettingsData {
  userId: string
  organizationId: string
  writingStyle: WritingStyle
  customWritingStyle?: string
  manualWritingStyleDescription?: string
  twitterHandle?: string
  twitterAnalyzed?: boolean
  personaType: PersonaType
  customPersona?: string
  useAllLowercase?: boolean
  useEmojis?: boolean
  useCasualTone?: boolean
  useFirstPerson?: boolean
  generatedPrompt?: string
}

export interface UpdateVoiceSettingsData {
  writingStyle?: WritingStyle
  customWritingStyle?: string
  manualWritingStyleDescription?: string
  twitterHandle?: string
  twitterAnalyzed?: boolean
  personaType?: PersonaType
  customPersona?: string
  useAllLowercase?: boolean
  useEmojis?: boolean
  useCasualTone?: boolean
  useFirstPerson?: boolean
  generatedPrompt?: string
  updatedAt?: Timestamp
}

// Scraped Content Document Interface
export interface ScrapedContentDocument {
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
  scrapedAt: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreateScrapedContentData {
  userId: string
  organizationId: string
  url: string
  title?: string
  content: string
  contentType: "webpage" | "pdf" | "document"
  wordCount?: number
  summary?: string
  keyPoints?: string[]
  scrapedAt?: Timestamp
}

export interface UpdateScrapedContentData {
  title?: string
  content?: string
  contentType?: "webpage" | "pdf" | "document"
  wordCount?: number
  summary?: string
  keyPoints?: string[]
  updatedAt?: Timestamp
}

// Twitter Analysis Document Interface
export interface TwitterAnalysisDocument {
  id: string
  userId: string
  organizationId: string
  twitterHandle: string
  tweets: TwitterTweet[]
  writingStyleAnalysis: string
  commonPhrases: string[]
  toneAnalysis: string
  vocabularyLevel: "casual" | "professional" | "mixed"
  averageTweetLength: number
  emojiUsage: boolean
  hashtagUsage: boolean
  analyzedAt: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface TwitterTweet {
  id: string
  text: string
  createdAt: string
  likes: number
  retweets: number
  replies: number
}

export interface CreateTwitterAnalysisData {
  userId: string
  organizationId: string
  twitterHandle: string
  tweets: TwitterTweet[]
  writingStyleAnalysis: string
  commonPhrases: string[]
  toneAnalysis: string
  vocabularyLevel: "casual" | "professional" | "mixed"
  averageTweetLength: number
  emojiUsage: boolean
  hashtagUsage: boolean
  analyzedAt?: Timestamp
}

export interface UpdateTwitterAnalysisData {
  tweets?: TwitterTweet[]
  writingStyleAnalysis?: string
  commonPhrases?: string[]
  toneAnalysis?: string
  vocabularyLevel?: "casual" | "professional" | "mixed"
  averageTweetLength?: number
  emojiUsage?: boolean
  hashtagUsage?: boolean
  analyzedAt?: Timestamp
  updatedAt?: Timestamp
}
