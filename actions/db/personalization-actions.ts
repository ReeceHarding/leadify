/*
<ai_context>
Contains server actions related to personalization features in Firestore.
Updated to include organizationId for organization-specific personalization.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import {
  PERSONALIZATION_COLLECTIONS,
  KnowledgeBaseDocument,
  CreateKnowledgeBaseData,
  UpdateKnowledgeBaseData,
  VoiceSettingsDocument,
  CreateVoiceSettingsData,
  UpdateVoiceSettingsData,
  ScrapedContentDocument,
  CreateScrapedContentData,
  TwitterAnalysisDocument,
  CreateTwitterAnalysisData,
  TwitterTweet
} from "@/db/firestore/personalization-collections"
import {
  ActionState,
  SerializedKnowledgeBaseDocument,
  SerializedVoiceSettingsDocument,
  SerializedScrapedContentDocument,
  SerializedTwitterAnalysisDocument
} from "@/types"
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from "firebase/firestore"

// Helper function to serialize Firestore Timestamps to ISO strings
function serializeTimestamp(timestamp: Timestamp | any): string {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString()
  }
  return new Date().toISOString()
}

// Serialization functions to convert Firestore Timestamps to ISO strings
function serializeKnowledgeBase(
  kb: KnowledgeBaseDocument
): SerializedKnowledgeBaseDocument {
  console.log("🔥 [KB-SERIALIZE] Starting serialization")
  return {
    ...kb,
    createdAt: serializeTimestamp(kb.createdAt),
    updatedAt: serializeTimestamp(kb.updatedAt)
  }
}

function serializeVoiceSettings(
  vs: VoiceSettingsDocument
): SerializedVoiceSettingsDocument {
  console.log("🔥 [VS-SERIALIZE] Starting serialization")
  return {
    ...vs,
    createdAt: serializeTimestamp(vs.createdAt),
    updatedAt: serializeTimestamp(vs.updatedAt)
  }
}

function serializeScrapedContent(
  sc: ScrapedContentDocument
): SerializedScrapedContentDocument {
  console.log("🔥 [SC-SERIALIZE] Starting serialization")
  return {
    ...sc,
    scrapedAt: serializeTimestamp(sc.scrapedAt),
    createdAt: serializeTimestamp(sc.createdAt),
    updatedAt: serializeTimestamp(sc.updatedAt)
  }
}

function serializeTwitterAnalysis(
  ta: TwitterAnalysisDocument
): SerializedTwitterAnalysisDocument {
  console.log("🔥 [TA-SERIALIZE] Starting serialization")
  return {
    ...ta,
    analyzedAt: serializeTimestamp(ta.analyzedAt),
    createdAt: serializeTimestamp(ta.createdAt),
    updatedAt: serializeTimestamp(ta.updatedAt)
  }
}

// Knowledge Base Actions
export async function createKnowledgeBaseAction(
  data: CreateKnowledgeBaseData
): Promise<ActionState<SerializedKnowledgeBaseDocument>> {
  console.log("🔥 [KNOWLEDGE-BASE] Starting createKnowledgeBaseAction")
  console.log("🔥 [KNOWLEDGE-BASE] User ID:", data.userId)
  console.log("🔥 [KNOWLEDGE-BASE] Organization ID:", data.organizationId)

  try {
    const knowledgeBaseRef = doc(
      collection(db, PERSONALIZATION_COLLECTIONS.KNOWLEDGE_BASE)
    )

    const knowledgeBaseData = {
      id: knowledgeBaseRef.id,
      userId: data.userId,
      organizationId: data.organizationId,
      websiteUrl: data.websiteUrl || "",
      customInformation: data.customInformation || "",
      scrapedPages: data.scrapedPages || [],
      summary: data.summary || "",
      keyFacts: data.keyFacts || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(knowledgeBaseData).filter(
        ([_, value]) => value !== undefined
      )
    )

    await setDoc(knowledgeBaseRef, cleanData)

    const createdDoc = await getDoc(knowledgeBaseRef)
    const serializedData = serializeKnowledgeBase(
      createdDoc.data() as KnowledgeBaseDocument
    )
    console.log("🔥 [KNOWLEDGE-BASE] Knowledge base created successfully")

    return {
      isSuccess: true,
      message: "Knowledge base created successfully",
      data: serializedData
    }
  } catch (error) {
    console.error("🔥 [KNOWLEDGE-BASE] Error creating knowledge base:", error)
    return {
      isSuccess: false,
      message: `Failed to create knowledge base: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function getKnowledgeBaseByOrganizationIdAction(
  organizationId: string
): Promise<ActionState<SerializedKnowledgeBaseDocument | null>> {
  console.log("🔥 [KNOWLEDGE-BASE] Starting getKnowledgeBaseByOrganizationIdAction")
  console.log("🔥 [KNOWLEDGE-BASE] Organization ID:", organizationId)

  try {
    const knowledgeBaseRef = collection(
      db,
      PERSONALIZATION_COLLECTIONS.KNOWLEDGE_BASE
    )
    const q = query(knowledgeBaseRef, where("organizationId", "==", organizationId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.log("🔥 [KNOWLEDGE-BASE] No knowledge base found for organization")
      return {
        isSuccess: true,
        message: "No knowledge base found",
        data: null
      }
    }

    const doc = querySnapshot.docs[0]
    const knowledgeBase = serializeKnowledgeBase(
      doc.data() as KnowledgeBaseDocument
    )

    console.log("🔥 [KNOWLEDGE-BASE] Knowledge base retrieved successfully")
    return {
      isSuccess: true,
      message: "Knowledge base retrieved successfully",
      data: knowledgeBase
    }
  } catch (error) {
    console.error("🔥 [KNOWLEDGE-BASE] Error getting knowledge base:", error)
    return {
      isSuccess: false,
      message: `Failed to get knowledge base: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

// Keep legacy function for backward compatibility
export async function getKnowledgeBaseByUserIdAction(
  userId: string
): Promise<ActionState<SerializedKnowledgeBaseDocument | null>> {
  console.log("🔥 [KNOWLEDGE-BASE] Starting getKnowledgeBaseByUserIdAction (LEGACY)")
  console.log("🔥 [KNOWLEDGE-BASE] User ID:", userId)

  try {
    const knowledgeBaseRef = collection(
      db,
      PERSONALIZATION_COLLECTIONS.KNOWLEDGE_BASE
    )
    const q = query(knowledgeBaseRef, where("userId", "==", userId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.log("🔥 [KNOWLEDGE-BASE] No knowledge base found for user")
      return {
        isSuccess: true,
        message: "No knowledge base found",
        data: null
      }
    }

    const doc = querySnapshot.docs[0]
    const knowledgeBase = serializeKnowledgeBase(
      doc.data() as KnowledgeBaseDocument
    )

    console.log("🔥 [KNOWLEDGE-BASE] Knowledge base retrieved successfully")
    return {
      isSuccess: true,
      message: "Knowledge base retrieved successfully",
      data: knowledgeBase
    }
  } catch (error) {
    console.error("🔥 [KNOWLEDGE-BASE] Error getting knowledge base:", error)
    return {
      isSuccess: false,
      message: `Failed to get knowledge base: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function updateKnowledgeBaseAction(
  id: string,
  data: UpdateKnowledgeBaseData
): Promise<ActionState<SerializedKnowledgeBaseDocument>> {
  console.log("🔥 [KNOWLEDGE-BASE] Starting updateKnowledgeBaseAction")
  console.log("🔥 [KNOWLEDGE-BASE] ID:", id)

  try {
    const knowledgeBaseRef = doc(
      db,
      PERSONALIZATION_COLLECTIONS.KNOWLEDGE_BASE,
      id
    )

    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }

    await updateDoc(knowledgeBaseRef, updateData)

    const updatedDoc = await getDoc(knowledgeBaseRef)
    const serializedData = serializeKnowledgeBase(
      updatedDoc.data() as KnowledgeBaseDocument
    )
    console.log("🔥 [KNOWLEDGE-BASE] Knowledge base updated successfully")

    return {
      isSuccess: true,
      message: "Knowledge base updated successfully",
      data: serializedData
    }
  } catch (error) {
    console.error("🔥 [KNOWLEDGE-BASE] Error updating knowledge base:", error)
    return {
      isSuccess: false,
      message: `Failed to update knowledge base: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

// Voice Settings Actions
export async function createVoiceSettingsAction(
  data: CreateVoiceSettingsData
): Promise<ActionState<SerializedVoiceSettingsDocument>> {
  console.log("🔥 [VOICE-SETTINGS] Starting createVoiceSettingsAction")
  console.log("🔥 [VOICE-SETTINGS] User ID:", data.userId)
  console.log("🔥 [VOICE-SETTINGS] Organization ID:", data.organizationId)

  try {
    const voiceSettingsRef = doc(
      collection(db, PERSONALIZATION_COLLECTIONS.VOICE_SETTINGS)
    )

    const voiceSettingsData = {
      id: voiceSettingsRef.id,
      userId: data.userId,
      organizationId: data.organizationId,
      writingStyle: data.writingStyle,
      customWritingStyle: data.customWritingStyle,
      manualWritingStyleDescription: data.manualWritingStyleDescription,
      twitterHandle: data.twitterHandle,
      twitterAnalyzed: data.twitterAnalyzed || false,
      redditWritingStyleAnalysis: data.redditWritingStyleAnalysis,
      redditPostSource: data.redditPostSource,
      personaType: data.personaType,
      customPersona: data.customPersona,
      useAllLowercase: data.useAllLowercase || false,
      useEmojis: data.useEmojis || false,
      useCasualTone: data.useCasualTone || false,
      useFirstPerson: data.useFirstPerson || false,
      generatedPrompt: data.generatedPrompt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await setDoc(voiceSettingsRef, voiceSettingsData)

    const createdDoc = await getDoc(voiceSettingsRef)
    const serializedData = serializeVoiceSettings(
      createdDoc.data() as VoiceSettingsDocument
    )
    console.log("🔥 [VOICE-SETTINGS] Voice settings created successfully")

    return {
      isSuccess: true,
      message: "Voice settings created successfully",
      data: serializedData
    }
  } catch (error) {
    console.error("🔥 [VOICE-SETTINGS] Error creating voice settings:", error)
    return {
      isSuccess: false,
      message: `Failed to create voice settings: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function getVoiceSettingsByOrganizationIdAction(
  organizationId: string
): Promise<ActionState<SerializedVoiceSettingsDocument | null>> {
  console.log("🔥 [VOICE-SETTINGS] Starting getVoiceSettingsByOrganizationIdAction")
  console.log("🔥 [VOICE-SETTINGS] Organization ID:", organizationId)

  try {
    const voiceSettingsRef = collection(
      db,
      PERSONALIZATION_COLLECTIONS.VOICE_SETTINGS
    )
    const q = query(voiceSettingsRef, where("organizationId", "==", organizationId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.log("🔥 [VOICE-SETTINGS] No voice settings found for organization")
      return {
        isSuccess: true,
        message: "No voice settings found",
        data: null
      }
    }

    const doc = querySnapshot.docs[0]
    const voiceSettings = serializeVoiceSettings(
      doc.data() as VoiceSettingsDocument
    )

    console.log("🔥 [VOICE-SETTINGS] Voice settings retrieved successfully")
    return {
      isSuccess: true,
      message: "Voice settings retrieved successfully",
      data: voiceSettings
    }
  } catch (error) {
    console.error("🔥 [VOICE-SETTINGS] Error getting voice settings:", error)
    return {
      isSuccess: false,
      message: `Failed to get voice settings: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

// Keep legacy function for backward compatibility
export async function getVoiceSettingsByUserIdAction(
  userId: string
): Promise<ActionState<SerializedVoiceSettingsDocument | null>> {
  console.log("🔥 [VOICE-SETTINGS] Starting getVoiceSettingsByUserIdAction (LEGACY)")
  console.log("🔥 [VOICE-SETTINGS] User ID:", userId)

  try {
    const voiceSettingsRef = collection(
      db,
      PERSONALIZATION_COLLECTIONS.VOICE_SETTINGS
    )
    const q = query(voiceSettingsRef, where("userId", "==", userId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.log("🔥 [VOICE-SETTINGS] No voice settings found for user")
      return {
        isSuccess: true,
        message: "No voice settings found",
        data: null
      }
    }

    const doc = querySnapshot.docs[0]
    const voiceSettings = serializeVoiceSettings(
      doc.data() as VoiceSettingsDocument
    )

    console.log("🔥 [VOICE-SETTINGS] Voice settings retrieved successfully")
    return {
      isSuccess: true,
      message: "Voice settings retrieved successfully",
      data: voiceSettings
    }
  } catch (error) {
    console.error("🔥 [VOICE-SETTINGS] Error getting voice settings:", error)
    return {
      isSuccess: false,
      message: `Failed to get voice settings: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function updateVoiceSettingsAction(
  id: string,
  data: UpdateVoiceSettingsData
): Promise<ActionState<SerializedVoiceSettingsDocument>> {
  console.log("🔥 [VOICE-SETTINGS] Starting updateVoiceSettingsAction")
  console.log("🔥 [VOICE-SETTINGS] ID:", id)

  try {
    const voiceSettingsRef = doc(
      db,
      PERSONALIZATION_COLLECTIONS.VOICE_SETTINGS,
      id
    )

    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }

    await updateDoc(voiceSettingsRef, updateData)

    const updatedDoc = await getDoc(voiceSettingsRef)
    const serializedData = serializeVoiceSettings(
      updatedDoc.data() as VoiceSettingsDocument
    )
    console.log("🔥 [VOICE-SETTINGS] Voice settings updated successfully")

    return {
      isSuccess: true,
      message: "Voice settings updated successfully",
      data: serializedData
    }
  } catch (error) {
    console.error("🔥 [VOICE-SETTINGS] Error updating voice settings:", error)
    return {
      isSuccess: false,
      message: `Failed to update voice settings: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

// Scraped Content Actions
export async function createScrapedContentAction(
  data: CreateScrapedContentData
): Promise<ActionState<SerializedScrapedContentDocument>> {
  console.log("🔥 [SCRAPED-CONTENT] Starting createScrapedContentAction")
  console.log("🔥 [SCRAPED-CONTENT] User ID:", data.userId)
  console.log("🔥 [SCRAPED-CONTENT] Organization ID:", data.organizationId)
  console.log("🔥 [SCRAPED-CONTENT] URL:", data.url)

  try {
    const scrapedContentRef = doc(
      collection(db, PERSONALIZATION_COLLECTIONS.SCRAPED_CONTENT)
    )

    const scrapedContentData = {
      id: scrapedContentRef.id,
      userId: data.userId,
      organizationId: data.organizationId,
      url: data.url,
      title: data.title || "",
      content: data.content,
      contentType: data.contentType,
      wordCount: data.wordCount || data.content.split(" ").length,
      summary: data.summary || "",
      keyPoints: data.keyPoints || [],
      scrapedAt: data.scrapedAt || serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(scrapedContentData).filter(
        ([_, value]) => value !== undefined
      )
    )

    await setDoc(scrapedContentRef, cleanData)

    const createdDoc = await getDoc(scrapedContentRef)
    const serializedData = serializeScrapedContent(
      createdDoc.data() as ScrapedContentDocument
    )
    console.log("🔥 [SCRAPED-CONTENT] Scraped content created successfully")

    return {
      isSuccess: true,
      message: "Scraped content created successfully",
      data: serializedData
    }
  } catch (error) {
    console.error("🔥 [SCRAPED-CONTENT] Error creating scraped content:", error)
    return {
      isSuccess: false,
      message: `Failed to create scraped content: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function getScrapedContentByOrganizationIdAction(
  organizationId: string
): Promise<ActionState<SerializedScrapedContentDocument[]>> {
  console.log("🔥 [SCRAPED-CONTENT] Starting getScrapedContentByOrganizationIdAction")
  console.log("🔥 [SCRAPED-CONTENT] Organization ID:", organizationId)

  try {
    const scrapedContentRef = collection(
      db,
      PERSONALIZATION_COLLECTIONS.SCRAPED_CONTENT
    )
    const q = query(scrapedContentRef, where("organizationId", "==", organizationId))
    const querySnapshot = await getDocs(q)

    const scrapedContent = querySnapshot.docs.map(doc =>
      serializeScrapedContent(doc.data() as ScrapedContentDocument)
    )

    console.log(
      `🔥 [SCRAPED-CONTENT] Retrieved ${scrapedContent.length} scraped content items`
    )
    return {
      isSuccess: true,
      message: "Scraped content retrieved successfully",
      data: scrapedContent
    }
  } catch (error) {
    console.error("🔥 [SCRAPED-CONTENT] Error getting scraped content:", error)
    return {
      isSuccess: false,
      message: `Failed to get scraped content: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

// Twitter Analysis Actions
export async function createTwitterAnalysisAction(
  data: CreateTwitterAnalysisData
): Promise<ActionState<SerializedTwitterAnalysisDocument>> {
  console.log("🔥 [TWITTER-ANALYSIS] Starting createTwitterAnalysisAction")
  console.log("🔥 [TWITTER-ANALYSIS] User ID:", data.userId)
  console.log("🔥 [TWITTER-ANALYSIS] Organization ID:", data.organizationId)
  console.log("🔥 [TWITTER-ANALYSIS] Twitter handle:", data.twitterHandle)

  try {
    const twitterAnalysisRef = doc(
      collection(db, PERSONALIZATION_COLLECTIONS.TWITTER_ANALYSIS)
    )

    const twitterAnalysisData = {
      id: twitterAnalysisRef.id,
      userId: data.userId,
      organizationId: data.organizationId,
      twitterHandle: data.twitterHandle,
      tweets: data.tweets,
      writingStyleAnalysis: data.writingStyleAnalysis,
      commonPhrases: data.commonPhrases,
      toneAnalysis: data.toneAnalysis,
      vocabularyLevel: data.vocabularyLevel,
      averageTweetLength: data.averageTweetLength,
      emojiUsage: data.emojiUsage,
      hashtagUsage: data.hashtagUsage,
      analyzedAt: data.analyzedAt || serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await setDoc(twitterAnalysisRef, twitterAnalysisData)

    const createdDoc = await getDoc(twitterAnalysisRef)
    const serializedData = serializeTwitterAnalysis(
      createdDoc.data() as TwitterAnalysisDocument
    )
    console.log("🔥 [TWITTER-ANALYSIS] Twitter analysis created successfully")

    return {
      isSuccess: true,
      message: "Twitter analysis created successfully",
      data: serializedData
    }
  } catch (error) {
    console.error(
      "🔥 [TWITTER-ANALYSIS] Error creating twitter analysis:",
      error
    )
    return {
      isSuccess: false,
      message: `Failed to create twitter analysis: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function getTwitterAnalysisByOrganizationIdAction(
  organizationId: string,
  twitterHandle?: string
): Promise<ActionState<SerializedTwitterAnalysisDocument | null>> {
  console.log("🔥 [TWITTER-ANALYSIS] Starting getTwitterAnalysisByOrganizationIdAction")
  console.log("🔥 [TWITTER-ANALYSIS] Organization ID:", organizationId)
  console.log("🔥 [TWITTER-ANALYSIS] Twitter handle:", twitterHandle)

  try {
    const twitterAnalysisRef = collection(
      db,
      PERSONALIZATION_COLLECTIONS.TWITTER_ANALYSIS
    )

    let q = query(twitterAnalysisRef, where("organizationId", "==", organizationId))
    if (twitterHandle) {
      q = query(
        twitterAnalysisRef,
        where("organizationId", "==", organizationId),
        where("twitterHandle", "==", twitterHandle)
      )
    }

    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.log("🔥 [TWITTER-ANALYSIS] No twitter analysis found")
      return {
        isSuccess: true,
        message: "No twitter analysis found",
        data: null
      }
    }

    const doc = querySnapshot.docs[0]
    const twitterAnalysis = serializeTwitterAnalysis(
      doc.data() as TwitterAnalysisDocument
    )

    console.log("🔥 [TWITTER-ANALYSIS] Twitter analysis retrieved successfully")
    return {
      isSuccess: true,
      message: "Twitter analysis retrieved successfully",
      data: twitterAnalysis
    }
  } catch (error) {
    console.error("🔥 [TWITTER-ANALYSIS] Error getting twitter analysis:", error)
    return {
      isSuccess: false,
      message: `Failed to get twitter analysis: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}
