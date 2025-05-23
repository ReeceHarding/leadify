/*
<ai_context>
Contains server actions related to lead generation campaigns in Firestore.
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
  serverTimestamp
} from "firebase/firestore"

export async function createCampaignAction(
  data: CreateCampaignData
): Promise<ActionState<CampaignDocument>> {
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
    return {
      isSuccess: true,
      message: "Campaign created successfully",
      data: createdDoc.data() as CampaignDocument
    }
  } catch (error) {
    console.error("Error creating campaign:", error)
    return { isSuccess: false, message: "Failed to create campaign" }
  }
}

export async function getCampaignsByUserIdAction(
  userId: string
): Promise<ActionState<CampaignDocument[]>> {
  try {
    const campaignsRef = collection(db, LEAD_COLLECTIONS.CAMPAIGNS)
    const q = query(
      campaignsRef, 
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    )
    const querySnapshot = await getDocs(q)
    
    const campaigns = querySnapshot.docs.map(doc => doc.data() as CampaignDocument)
    
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
): Promise<ActionState<CampaignDocument>> {
  try {
    const campaignRef = doc(db, LEAD_COLLECTIONS.CAMPAIGNS, campaignId)
    const campaignDoc = await getDoc(campaignRef)
    
    if (!campaignDoc.exists()) {
      return { isSuccess: false, message: "Campaign not found" }
    }
    
    return {
      isSuccess: true,
      message: "Campaign retrieved successfully",
      data: campaignDoc.data() as CampaignDocument
    }
  } catch (error) {
    console.error("Error getting campaign:", error)
    return { isSuccess: false, message: "Failed to get campaign" }
  }
}

export async function updateCampaignAction(
  campaignId: string,
  data: UpdateCampaignData
): Promise<ActionState<CampaignDocument>> {
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
    return {
      isSuccess: true,
      message: "Campaign updated successfully",
      data: updatedDoc.data() as CampaignDocument
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