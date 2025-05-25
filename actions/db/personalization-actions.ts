/*
<ai_context>
Database actions for managing personalization data including knowledge base and voice settings.
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
  UpdateScrapedContentData,
  TwitterAnalysisDocument,
  CreateTwitterAnalysisData,
  UpdateTwitterAnalysisData
} from "@/db/schema"
import { ActionState } from "@/types"
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
  serverTimestamp
} from "firebase/firestore"

// Knowledge Base Actions
export async function createKnowledgeBaseAction(
  data: CreateKnowledgeBaseData
): Promise<ActionState<KnowledgeBaseDocument>> {
  console.log("🔥 [KNOWLEDGE-BASE] Starting createKnowledgeBaseAction")
  console.log("🔥 [KNOWLEDGE-BASE] User ID:", data.userId)

  try {
    const knowledgeBaseRef = doc(collection(db, PERSONALIZATION_COLLECTIONS.KNOWLEDGE_BASE))
    
    const knowledgeBaseData = {
      id: knowledgeBaseRef.id,
      userId: data.userId,
      websiteUrl: data.websiteUrl,
      customInformation: data.customInformation,
      scrapedPages: data.scrapedPages || [],
      summary: data.summary,
      keyFacts: data.keyFacts || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await setDoc(knowledgeBaseRef, knowledgeBaseData)
    
    const createdDoc = await getDoc(knowledgeBaseRef)
    console.log("🔥 [KNOWLEDGE-BASE] Knowledge base created successfully")
    
    return {
      isSuccess: true,
      message: "Knowledge base created successfully",
      data: createdDoc.data() as KnowledgeBaseDocument
    }
  } catch (error) {
    console.error("🔥 [KNOWLEDGE-BASE] Error creating knowledge base:", error)
    return { 
      isSuccess: false, 
      message: `Failed to create knowledge base: ${error instanceof Error ? error.message : "Unknown error"}` 
    }
  }
}

export async function getKnowledgeBaseByUserIdAction(
  userId: string
): Promise<ActionState<KnowledgeBaseDocument | null>> {
  console.log("🔥 [KNOWLEDGE-BASE] Starting getKnowledgeBaseByUserIdAction")
  console.log("🔥 [KNOWLEDGE-BASE] User ID:", userId)

  try {
    const knowledgeBaseRef = collection(db, PERSONALIZATION_COLLECTIONS.KNOWLEDGE_BASE)
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
    const knowledgeBase = doc.data() as KnowledgeBaseDocument
    
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
): Promise<ActionState<KnowledgeBaseDocument>> {
  console.log("🔥 [KNOWLEDGE-BASE] Starting updateKnowledgeBaseAction")
  console.log("🔥 [KNOWLEDGE-BASE] ID:", id)

  try {
    const knowledgeBaseRef = doc(db, PERSONALIZATION_COLLECTIONS.KNOWLEDGE_BASE, id)
    
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }

    await updateDoc(knowledgeBaseRef, updateData)
    
    const updatedDoc = await getDoc(knowledgeBaseRef)
    console.log("🔥 [KNOWLEDGE-BASE] Knowledge base updated successfully")
    
    return {
      isSuccess: true,
      message: "Knowledge base updated successfully",
      data: updatedDoc.data() as KnowledgeBaseDocument
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
): Promise<ActionState<VoiceSettingsDocument>> {
  console.log("🔥 [VOICE-SETTINGS] Starting createVoiceSettingsAction")
  console.log("🔥 [VOICE-SETTINGS] User ID:", data.userId)

  try {
    const voiceSettingsRef = doc(collection(db, PERSONALIZATION_COLLECTIONS.VOICE_SETTINGS))
    
    const voiceSettingsData = {
      id: voiceSettingsRef.id,
      userId: data.userId,
      writingStyle: data.writingStyle,
      customWritingStyle: data.customWritingStyle,
      twitterHandle: data.twitterHandle,
      twitterAnalyzed: data.twitterAnalyzed || false,
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
    console.log("🔥 [VOICE-SETTINGS] Voice settings created successfully")
    
    return {
      isSuccess: true,
      message: "Voice settings created successfully",
      data: createdDoc.data() as VoiceSettingsDocument
    }
  } catch (error) {
    console.error("🔥 [VOICE-SETTINGS] Error creating voice settings:", error)
    return { 
      isSuccess: false, 
      message: `Failed to create voice settings: ${error instanceof Error ? error.message : "Unknown error"}` 
    }
  }
}

export async function getVoiceSettingsByUserIdAction(
  userId: string
): Promise<ActionState<VoiceSettingsDocument | null>> {
  console.log("🔥 [VOICE-SETTINGS] Starting getVoiceSettingsByUserIdAction")
  console.log("🔥 [VOICE-SETTINGS] User ID:", userId)

  try {
    const voiceSettingsRef = collection(db, PERSONALIZATION_COLLECTIONS.VOICE_SETTINGS)
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
    const voiceSettings = doc.data() as VoiceSettingsDocument
    
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
): Promise<ActionState<VoiceSettingsDocument>> {
  console.log("🔥 [VOICE-SETTINGS] Starting updateVoiceSettingsAction")
  console.log("🔥 [VOICE-SETTINGS] ID:", id)

  try {
    const voiceSettingsRef = doc(db, PERSONALIZATION_COLLECTIONS.VOICE_SETTINGS, id)
    
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }

    await updateDoc(voiceSettingsRef, updateData)
    
    const updatedDoc = await getDoc(voiceSettingsRef)
    console.log("🔥 [VOICE-SETTINGS] Voice settings updated successfully")
    
    return {
      isSuccess: true,
      message: "Voice settings updated successfully",
      data: updatedDoc.data() as VoiceSettingsDocument
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
): Promise<ActionState<ScrapedContentDocument>> {
  console.log("🔥 [SCRAPED-CONTENT] Starting createScrapedContentAction")
  console.log("🔥 [SCRAPED-CONTENT] User ID:", data.userId)
  console.log("🔥 [SCRAPED-CONTENT] URL:", data.url)

  try {
    const scrapedContentRef = doc(collection(db, PERSONALIZATION_COLLECTIONS.SCRAPED_CONTENT))
    
    const scrapedContentData = {
      id: scrapedContentRef.id,
      userId: data.userId,
      url: data.url,
      title: data.title,
      content: data.content,
      contentType: data.contentType,
      wordCount: data.wordCount || data.content.split(' ').length,
      summary: data.summary,
      keyPoints: data.keyPoints || [],
      scrapedAt: data.scrapedAt || serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await setDoc(scrapedContentRef, scrapedContentData)
    
    const createdDoc = await getDoc(scrapedContentRef)
    console.log("🔥 [SCRAPED-CONTENT] Scraped content created successfully")
    
    return {
      isSuccess: true,
      message: "Scraped content created successfully",
      data: createdDoc.data() as ScrapedContentDocument
    }
  } catch (error) {
    console.error("🔥 [SCRAPED-CONTENT] Error creating scraped content:", error)
    return { 
      isSuccess: false, 
      message: `Failed to create scraped content: ${error instanceof Error ? error.message : "Unknown error"}` 
    }
  }
}

export async function getScrapedContentByUserIdAction(
  userId: string
): Promise<ActionState<ScrapedContentDocument[]>> {
  console.log("🔥 [SCRAPED-CONTENT] Starting getScrapedContentByUserIdAction")
  console.log("🔥 [SCRAPED-CONTENT] User ID:", userId)

  try {
    const scrapedContentRef = collection(db, PERSONALIZATION_COLLECTIONS.SCRAPED_CONTENT)
    const q = query(scrapedContentRef, where("userId", "==", userId))
    const querySnapshot = await getDocs(q)
    
    const scrapedContent = querySnapshot.docs.map(doc => doc.data() as ScrapedContentDocument)
    
    console.log("🔥 [SCRAPED-CONTENT] Scraped content retrieved successfully:", scrapedContent.length)
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
): Promise<ActionState<TwitterAnalysisDocument>> {
  console.log("🔥 [TWITTER-ANALYSIS] Starting createTwitterAnalysisAction")
  console.log("🔥 [TWITTER-ANALYSIS] User ID:", data.userId)
  console.log("🔥 [TWITTER-ANALYSIS] Twitter handle:", data.twitterHandle)

  try {
    const twitterAnalysisRef = doc(collection(db, PERSONALIZATION_COLLECTIONS.TWITTER_ANALYSIS))
    
    const twitterAnalysisData = {
      id: twitterAnalysisRef.id,
      userId: data.userId,
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
    console.log("🔥 [TWITTER-ANALYSIS] Twitter analysis created successfully")
    
    return {
      isSuccess: true,
      message: "Twitter analysis created successfully",
      data: createdDoc.data() as TwitterAnalysisDocument
    }
  } catch (error) {
    console.error("🔥 [TWITTER-ANALYSIS] Error creating twitter analysis:", error)
    return { 
      isSuccess: false, 
      message: `Failed to create twitter analysis: ${error instanceof Error ? error.message : "Unknown error"}` 
    }
  }
}

export async function getTwitterAnalysisByUserIdAction(
  userId: string
): Promise<ActionState<TwitterAnalysisDocument | null>> {
  console.log("🔥 [TWITTER-ANALYSIS] Starting getTwitterAnalysisByUserIdAction")
  console.log("🔥 [TWITTER-ANALYSIS] User ID:", userId)

  try {
    const twitterAnalysisRef = collection(db, PERSONALIZATION_COLLECTIONS.TWITTER_ANALYSIS)
    const q = query(twitterAnalysisRef, where("userId", "==", userId))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      console.log("🔥 [TWITTER-ANALYSIS] No twitter analysis found for user")
      return {
        isSuccess: true,
        message: "No twitter analysis found",
        data: null
      }
    }

    const doc = querySnapshot.docs[0]
    const twitterAnalysis = doc.data() as TwitterAnalysisDocument
    
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