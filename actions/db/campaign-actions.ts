/*
<ai_context>
Contains server actions related to lead generation campaigns in Firestore.
Updated to return serialized data for client components.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import {
  LEAD_COLLECTIONS,
  CampaignDocument,
  CreateCampaignData,
  UpdateCampaignData,
  CampaignSummary
} from "@/db/schema"
import { ActionState } from "@/types"
import { removeUndefinedValues } from "@/lib/firebase-utils"
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  collection,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  Timestamp
} from "firebase/firestore"

// Serialized version for client components
export interface SerializedCampaignDocument {
  id: string
  userId: string
  name: string
  website: string
  websiteContent?: string
  keywords: string[]
  status: "draft" | "running" | "completed" | "paused" | "error"
  totalSearchResults: number
  totalThreadsAnalyzed: number
  totalCommentsGenerated: number
  createdAt: string // ISO string instead of Timestamp
  updatedAt: string // ISO string instead of Timestamp
}

// Serialization helper function
function serializeCampaignDocument(campaign: CampaignDocument): SerializedCampaignDocument {
  return {
    ...campaign,
    createdAt: campaign.createdAt instanceof Timestamp 
      ? campaign.createdAt.toDate().toISOString()
      : new Date().toISOString(),
    updatedAt: campaign.updatedAt instanceof Timestamp 
      ? campaign.updatedAt.toDate().toISOString() 
      : new Date().toISOString()
  }
}

export async function createCampaignAction(
  data: CreateCampaignData
): Promise<ActionState<SerializedCampaignDocument>> {
  try {
    const campaignRef = doc(collection(db, LEAD_COLLECTIONS.CAMPAIGNS))
    
    const campaignData = removeUndefinedValues({
      id: campaignRef.id,
      userId: data.userId,
      name: data.name,
      website: data.website,
      keywords: data.keywords,
      status: "draft" as const,
      totalSearchResults: 0,
      totalThreadsAnalyzed: 0,
      totalCommentsGenerated: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    await setDoc(campaignRef, campaignData)
    
    const createdDoc = await getDoc(campaignRef)
    const rawCampaign = createdDoc.data() as CampaignDocument
    const serializedCampaign = serializeCampaignDocument(rawCampaign)
    
    return {
      isSuccess: true,
      message: "Campaign created successfully",
      data: serializedCampaign
    }
  } catch (error) {
    console.error("Error creating campaign:", error)
    return { isSuccess: false, message: "Failed to create campaign" }
  }
}

export async function getCampaignsByUserIdAction(
  userId: string
): Promise<ActionState<SerializedCampaignDocument[]>> {
  try {
    const campaignsRef = collection(db, LEAD_COLLECTIONS.CAMPAIGNS)
    const q = query(
      campaignsRef, 
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    )
    const querySnapshot = await getDocs(q)
    
    const campaigns = querySnapshot.docs.map(doc => {
      const rawCampaign = doc.data() as CampaignDocument
      return serializeCampaignDocument(rawCampaign)
    })
    
    return {
      isSuccess: true,
      message: "Campaigns retrieved successfully",
      data: campaigns
    }
  } catch (error) {
    console.error("Error getting campaigns:", error)
    return { isSuccess: false, message: "Failed to get campaigns" }
  }
}

export async function getCampaignByIdAction(
  campaignId: string
): Promise<ActionState<SerializedCampaignDocument>> {
  try {
    const campaignRef = doc(db, LEAD_COLLECTIONS.CAMPAIGNS, campaignId)
    const campaignDoc = await getDoc(campaignRef)
    
    if (!campaignDoc.exists()) {
      return { isSuccess: false, message: "Campaign not found" }
    }
    
    const rawCampaign = campaignDoc.data() as CampaignDocument
    const serializedCampaign = serializeCampaignDocument(rawCampaign)
    
    return {
      isSuccess: true,
      message: "Campaign retrieved successfully",
      data: serializedCampaign
    }
  } catch (error) {
    console.error("Error getting campaign:", error)
    return { isSuccess: false, message: "Failed to get campaign" }
  }
}

export async function updateCampaignAction(
  campaignId: string,
  data: UpdateCampaignData
): Promise<ActionState<SerializedCampaignDocument>> {
  try {
    const campaignRef = doc(db, LEAD_COLLECTIONS.CAMPAIGNS, campaignId)
    
    const campaignDoc = await getDoc(campaignRef)
    if (!campaignDoc.exists()) {
      return { isSuccess: false, message: "Campaign not found to update" }
    }

    const updateData = removeUndefinedValues({
      ...data,
      updatedAt: serverTimestamp()
    })

    await updateDoc(campaignRef, updateData)
    
    const updatedDoc = await getDoc(campaignRef)
    const rawCampaign = updatedDoc.data() as CampaignDocument
    const serializedCampaign = serializeCampaignDocument(rawCampaign)
    
    return {
      isSuccess: true,
      message: "Campaign updated successfully",
      data: serializedCampaign
    }
  } catch (error) {
    console.error("Error updating campaign:", error)
    return { isSuccess: false, message: "Failed to update campaign" }
  }
}

export async function deleteCampaignAction(
  campaignId: string
): Promise<ActionState<void>> {
  try {
    // TODO: In production, also delete related search results, threads, and comments
    await deleteDoc(doc(db, LEAD_COLLECTIONS.CAMPAIGNS, campaignId))
    return {
      isSuccess: true,
      message: "Campaign deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting campaign:", error)
    return { isSuccess: false, message: "Failed to delete campaign" }
  }
}

export async function getCampaignSummaryAction(
  campaignId: string
): Promise<ActionState<CampaignSummary>> {
  try {
    // Get campaign details
    const campaignResult = await getCampaignByIdAction(campaignId)
    if (!campaignResult.isSuccess) {
      return { isSuccess: false, message: "Campaign not found" }
    }
    
    const campaign = campaignResult.data
    
    // Get generated comments for this campaign
    const commentsRef = collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS)
    const commentsQuery = query(commentsRef, where("campaignId", "==", campaignId))
    const commentsSnapshot = await getDocs(commentsQuery)
    
    const comments = commentsSnapshot.docs.map(doc => doc.data())
    
    // Calculate summary statistics
    const totalComments = comments.length
    const averageRelevanceScore = totalComments > 0 
      ? comments.reduce((sum, comment) => sum + comment.relevanceScore, 0) / totalComments
      : 0
    const highQualityComments = comments.filter(comment => comment.relevanceScore > 70).length
    const approvedComments = comments.filter(comment => comment.approved).length
    const usedComments = comments.filter(comment => comment.used).length
    
    const summary: CampaignSummary = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      totalSearchResults: campaign.totalSearchResults,
      totalThreadsAnalyzed: campaign.totalThreadsAnalyzed,
      averageRelevanceScore: Math.round(averageRelevanceScore * 100) / 100,
      highQualityComments,
      approvedComments,
      usedComments
    }
    
    return {
      isSuccess: true,
      message: "Campaign summary retrieved successfully",
      data: summary
    }
  } catch (error) {
    console.error("Error getting campaign summary:", error)
    return { isSuccess: false, message: "Failed to get campaign summary" }
  }
} 