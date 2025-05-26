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
import { ActionState, SerializedCampaignDocument } from "@/types"
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

// Serialization helper function
function serializeCampaignDocument(
  campaign: CampaignDocument
): SerializedCampaignDocument {
  return {
    ...campaign,
    createdAt:
      campaign.createdAt instanceof Timestamp
        ? campaign.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    updatedAt:
      campaign.updatedAt instanceof Timestamp
        ? campaign.updatedAt.toDate().toISOString()
        : new Date().toISOString()
  }
}

export async function createCampaignAction(
  data: CreateCampaignData
): Promise<ActionState<SerializedCampaignDocument>> {
  console.log("📋📋📋 [CREATE-CAMPAIGN] ========== ACTION START ==========")
  console.log("📋📋📋 [CREATE-CAMPAIGN] Timestamp:", new Date().toISOString())
  console.log("📋📋📋 [CREATE-CAMPAIGN] Input data:", {
    userId: data.userId,
    organizationId: data.organizationId,
    name: data.name,
    website: data.website,
    keywordCount: data.keywords?.length || 0,
    keywords: data.keywords,
    businessDescription: data.businessDescription?.substring(0, 100) + "..."
  })

  try {
    console.log("📋📋📋 [CREATE-CAMPAIGN] Creating new campaign document...")
    const campaignRef = doc(collection(db, LEAD_COLLECTIONS.CAMPAIGNS))
    console.log(
      "📋📋📋 [CREATE-CAMPAIGN] Generated campaign ID:",
      campaignRef.id
    )

    const campaignData = {
      id: campaignRef.id,
      userId: data.userId,
      organizationId: data.organizationId,
      name: data.name,
      keywords: data.keywords || [],
      website: data.website || "",
      businessDescription: data.businessDescription || "",
      websiteContent: "", // Will be populated later by scraping
      status: "active" as const,
      totalSearchResults: 0,
      totalThreadsAnalyzed: 0,
      totalCommentsGenerated: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    console.log("📋📋📋 [CREATE-CAMPAIGN] Campaign data prepared:", {
      id: campaignData.id,
      userId: campaignData.userId,
      name: campaignData.name,
      keywordCount: campaignData.keywords.length,
      hasWebsite: !!campaignData.website,
      hasBusinessDescription: !!campaignData.businessDescription,
      status: campaignData.status
    })

    console.log("📋📋📋 [CREATE-CAMPAIGN] Writing to Firestore...")
    await setDoc(campaignRef, removeUndefinedValues(campaignData))
    console.log(
      "📋📋📋 [CREATE-CAMPAIGN] ✅ Campaign written to Firestore successfully"
    )

    console.log("📋📋📋 [CREATE-CAMPAIGN] Fetching created document...")
    const createdDoc = await getDoc(campaignRef)
    console.log(
      "📋📋📋 [CREATE-CAMPAIGN] Document exists:",
      createdDoc.exists()
    )

    const createdData = createdDoc.data() as CampaignDocument
    console.log("📋📋📋 [CREATE-CAMPAIGN] Created campaign data:", {
      id: createdData.id,
      name: createdData.name,
      keywordCount: createdData.keywords?.length || 0,
      status: createdData.status
    })

    console.log("📋📋📋 [CREATE-CAMPAIGN] ✅ Campaign created successfully")
    console.log(
      "📋📋📋 [CREATE-CAMPAIGN] ========== ACTION END (SUCCESS) =========="
    )

    const serializedCampaign = serializeCampaignDocument(createdData)
    return {
      isSuccess: true,
      message: "Campaign created successfully",
      data: serializedCampaign
    }
  } catch (error) {
    console.log("📋📋📋 [CREATE-CAMPAIGN] ❌ Error creating campaign")
    console.log("📋📋📋 [CREATE-CAMPAIGN] Error type:", typeof error)
    console.log("📋📋📋 [CREATE-CAMPAIGN] Error:", error)
    console.log(
      "📋📋📋 [CREATE-CAMPAIGN] Error message:",
      error instanceof Error ? error.message : "Unknown error"
    )
    console.log(
      "📋📋📋 [CREATE-CAMPAIGN] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    )
    console.log(
      "📋📋📋 [CREATE-CAMPAIGN] ========== ACTION END (ERROR) =========="
    )

    return { isSuccess: false, message: "Failed to create campaign" }
  }
}

export async function getCampaignsByUserIdAction(
  userId: string
): Promise<ActionState<SerializedCampaignDocument[]>> {
  console.log(
    "📋📋📋 [GET-CAMPAIGNS-BY-USER] ========== ACTION START =========="
  )
  console.log(
    "📋📋📋 [GET-CAMPAIGNS-BY-USER] Timestamp:",
    new Date().toISOString()
  )
  console.log("📋📋📋 [GET-CAMPAIGNS-BY-USER] User ID:", userId)

  try {
    console.log("📋📋📋 [GET-CAMPAIGNS-BY-USER] Creating query...")
    const campaignsRef = collection(db, LEAD_COLLECTIONS.CAMPAIGNS)
    const q = query(campaignsRef, where("userId", "==", userId))

    console.log("📋📋📋 [GET-CAMPAIGNS-BY-USER] Executing query...")
    const querySnapshot = await getDocs(q)
    console.log(
      "📋📋📋 [GET-CAMPAIGNS-BY-USER] Query returned documents:",
      querySnapshot.size
    )
    console.log(
      "📋📋📋 [GET-CAMPAIGNS-BY-USER] Query empty:",
      querySnapshot.empty
    )

    const campaigns = querySnapshot.docs.map((doc, index) => {
      const data = doc.data() as CampaignDocument
      console.log(`📋📋📋 [GET-CAMPAIGNS-BY-USER] Campaign ${index + 1}:`, {
        id: data.id,
        name: data.name,
        keywordCount: data.keywords?.length || 0,
        status: data.status,
        totalCommentsGenerated: data.totalCommentsGenerated
      })
      return serializeCampaignDocument(data)
    })

    console.log(
      "📋📋📋 [GET-CAMPAIGNS-BY-USER] Total campaigns found:",
      campaigns.length
    )
    console.log(
      "📋📋📋 [GET-CAMPAIGNS-BY-USER] Campaign IDs:",
      campaigns.map(c => c.id)
    )
    console.log(
      "📋📋📋 [GET-CAMPAIGNS-BY-USER] ✅ Campaigns retrieved successfully"
    )
    console.log(
      "📋📋📋 [GET-CAMPAIGNS-BY-USER] ========== ACTION END (SUCCESS) =========="
    )

    return {
      isSuccess: true,
      message: "Campaigns retrieved successfully",
      data: campaigns
    }
  } catch (error) {
    console.log("📋📋📋 [GET-CAMPAIGNS-BY-USER] ❌ Error getting campaigns")
    console.log("📋📋📋 [GET-CAMPAIGNS-BY-USER] Error type:", typeof error)
    console.log("📋📋📋 [GET-CAMPAIGNS-BY-USER] Error:", error)
    console.log(
      "📋📋📋 [GET-CAMPAIGNS-BY-USER] Error message:",
      error instanceof Error ? error.message : "Unknown error"
    )
    console.log(
      "📋📋📋 [GET-CAMPAIGNS-BY-USER] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    )
    console.log(
      "📋📋📋 [GET-CAMPAIGNS-BY-USER] ========== ACTION END (ERROR) =========="
    )

    return { isSuccess: false, message: "Failed to get campaigns" }
  }
}

export async function getCampaignByIdAction(
  campaignId: string
): Promise<ActionState<SerializedCampaignDocument>> {
  console.log("📋📋📋 [GET-CAMPAIGN-BY-ID] ========== ACTION START ==========")
  console.log(
    "📋📋📋 [GET-CAMPAIGN-BY-ID] Timestamp:",
    new Date().toISOString()
  )
  console.log("📋📋📋 [GET-CAMPAIGN-BY-ID] Campaign ID:", campaignId)

  try {
    console.log("📋📋📋 [GET-CAMPAIGN-BY-ID] Creating document reference...")
    const campaignRef = doc(db, LEAD_COLLECTIONS.CAMPAIGNS, campaignId)
    console.log(
      "📋📋📋 [GET-CAMPAIGN-BY-ID] Fetching document from Firestore..."
    )

    const campaignDoc = await getDoc(campaignRef)
    console.log(
      "📋📋📋 [GET-CAMPAIGN-BY-ID] Document exists:",
      campaignDoc.exists()
    )

    if (!campaignDoc.exists()) {
      console.log("📋📋📋 [GET-CAMPAIGN-BY-ID] ⚠️ Campaign not found")
      console.log(
        "📋📋📋 [GET-CAMPAIGN-BY-ID] ========== ACTION END (NOT FOUND) =========="
      )
      return { isSuccess: false, message: "Campaign not found" }
    }

    const campaignData = campaignDoc.data() as CampaignDocument
    console.log("📋📋📋 [GET-CAMPAIGN-BY-ID] Campaign data retrieved:", {
      id: campaignData.id,
      name: campaignData.name,
      userId: campaignData.userId,
      keywordCount: campaignData.keywords?.length || 0,
      keywords: campaignData.keywords,
      status: campaignData.status,
      totalSearchResults: campaignData.totalSearchResults,
      totalThreadsAnalyzed: campaignData.totalThreadsAnalyzed,
      totalCommentsGenerated: campaignData.totalCommentsGenerated,
      hasWebsite: !!campaignData.website,
      hasWebsiteContent: !!campaignData.websiteContent,
      websiteContentLength: campaignData.websiteContent?.length || 0
    })

    console.log(
      "📋📋📋 [GET-CAMPAIGN-BY-ID] ✅ Campaign retrieved successfully"
    )
    console.log(
      "📋📋📋 [GET-CAMPAIGN-BY-ID] ========== ACTION END (SUCCESS) =========="
    )

    const serializedCampaign = serializeCampaignDocument(campaignData)
    return {
      isSuccess: true,
      message: "Campaign retrieved successfully",
      data: serializedCampaign
    }
  } catch (error) {
    console.log("📋📋📋 [GET-CAMPAIGN-BY-ID] ❌ Error getting campaign")
    console.log("📋📋📋 [GET-CAMPAIGN-BY-ID] Error type:", typeof error)
    console.log("📋📋📋 [GET-CAMPAIGN-BY-ID] Error:", error)
    console.log(
      "📋📋📋 [GET-CAMPAIGN-BY-ID] Error message:",
      error instanceof Error ? error.message : "Unknown error"
    )
    console.log(
      "📋📋📋 [GET-CAMPAIGN-BY-ID] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    )
    console.log(
      "📋📋📋 [GET-CAMPAIGN-BY-ID] ========== ACTION END (ERROR) =========="
    )

    return { isSuccess: false, message: "Failed to get campaign" }
  }
}

export async function updateCampaignAction(
  campaignId: string,
  data: UpdateCampaignData
): Promise<ActionState<SerializedCampaignDocument>> {
  console.log("📋📋📋 [UPDATE-CAMPAIGN] ========== ACTION START ==========")
  console.log("📋📋📋 [UPDATE-CAMPAIGN] Timestamp:", new Date().toISOString())
  console.log("📋📋📋 [UPDATE-CAMPAIGN] Campaign ID:", campaignId)
  console.log("📋📋📋 [UPDATE-CAMPAIGN] Update data:", {
    hasName: !!data.name,
    hasKeywords: !!data.keywords,
    keywordCount: data.keywords?.length,
    hasWebsite: !!data.website,
    hasBusinessDescription: !!data.businessDescription,
    hasWebsiteContent: !!data.websiteContent,
    websiteContentLength: data.websiteContent?.length,
    status: data.status,
    totalSearchResults: data.totalSearchResults,
    totalThreadsAnalyzed: data.totalThreadsAnalyzed,
    totalCommentsGenerated: data.totalCommentsGenerated
  })

  try {
    console.log("📋📋📋 [UPDATE-CAMPAIGN] Creating document reference...")
    const campaignRef = doc(db, LEAD_COLLECTIONS.CAMPAIGNS, campaignId)

    console.log("📋📋📋 [UPDATE-CAMPAIGN] Preparing update data...")
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }

    console.log(
      "📋📋📋 [UPDATE-CAMPAIGN] Cleaned update data keys:",
      Object.keys(removeUndefinedValues(updateData))
    )
    console.log("📋📋📋 [UPDATE-CAMPAIGN] Updating document in Firestore...")

    await updateDoc(campaignRef, removeUndefinedValues(updateData))
    console.log("📋📋📋 [UPDATE-CAMPAIGN] ✅ Document updated successfully")

    console.log("📋📋📋 [UPDATE-CAMPAIGN] Fetching updated document...")
    const updatedDoc = await getDoc(campaignRef)
    console.log(
      "📋📋📋 [UPDATE-CAMPAIGN] Updated document exists:",
      updatedDoc.exists()
    )

    const updatedData = updatedDoc.data() as CampaignDocument
    console.log("📋📋📋 [UPDATE-CAMPAIGN] Updated campaign data:", {
      id: updatedData.id,
      name: updatedData.name,
      keywordCount: updatedData.keywords?.length || 0,
      status: updatedData.status,
      totalSearchResults: updatedData.totalSearchResults,
      totalThreadsAnalyzed: updatedData.totalThreadsAnalyzed,
      totalCommentsGenerated: updatedData.totalCommentsGenerated
    })

    console.log("📋📋📋 [UPDATE-CAMPAIGN] ✅ Campaign updated successfully")
    console.log(
      "📋📋📋 [UPDATE-CAMPAIGN] ========== ACTION END (SUCCESS) =========="
    )

    const serializedCampaign = serializeCampaignDocument(updatedData)
    return {
      isSuccess: true,
      message: "Campaign updated successfully",
      data: serializedCampaign
    }
  } catch (error) {
    console.log("📋📋📋 [UPDATE-CAMPAIGN] ❌ Error updating campaign")
    console.log("📋📋📋 [UPDATE-CAMPAIGN] Error type:", typeof error)
    console.log("📋📋📋 [UPDATE-CAMPAIGN] Error:", error)
    console.log(
      "📋📋📋 [UPDATE-CAMPAIGN] Error message:",
      error instanceof Error ? error.message : "Unknown error"
    )
    console.log(
      "📋📋📋 [UPDATE-CAMPAIGN] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    )
    console.log(
      "📋📋📋 [UPDATE-CAMPAIGN] ========== ACTION END (ERROR) =========="
    )

    return { isSuccess: false, message: "Failed to update campaign" }
  }
}

export async function deleteCampaignAction(
  campaignId: string
): Promise<ActionState<void>> {
  console.log("📋📋📋 [DELETE-CAMPAIGN] ========== ACTION START ==========")
  console.log("📋📋📋 [DELETE-CAMPAIGN] Timestamp:", new Date().toISOString())
  console.log("📋📋📋 [DELETE-CAMPAIGN] Campaign ID:", campaignId)

  try {
    console.log("📋📋📋 [DELETE-CAMPAIGN] Creating document reference...")
    const campaignRef = doc(db, LEAD_COLLECTIONS.CAMPAIGNS, campaignId)

    console.log("📋📋📋 [DELETE-CAMPAIGN] Deleting document from Firestore...")
    await deleteDoc(campaignRef)

    console.log("📋📋📋 [DELETE-CAMPAIGN] ✅ Campaign deleted successfully")
    console.log(
      "📋📋📋 [DELETE-CAMPAIGN] ========== ACTION END (SUCCESS) =========="
    )

    return {
      isSuccess: true,
      message: "Campaign deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.log("📋📋📋 [DELETE-CAMPAIGN] ❌ Error deleting campaign")
    console.log("📋📋📋 [DELETE-CAMPAIGN] Error type:", typeof error)
    console.log("📋📋📋 [DELETE-CAMPAIGN] Error:", error)
    console.log(
      "📋📋📋 [DELETE-CAMPAIGN] Error message:",
      error instanceof Error ? error.message : "Unknown error"
    )
    console.log(
      "📋📋📋 [DELETE-CAMPAIGN] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    )
    console.log(
      "📋📋📋 [DELETE-CAMPAIGN] ========== ACTION END (ERROR) =========="
    )

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
    const commentsQuery = query(
      commentsRef,
      where("campaignId", "==", campaignId)
    )
    const commentsSnapshot = await getDocs(commentsQuery)

    const comments = commentsSnapshot.docs.map(doc => doc.data())

    // Calculate summary statistics
    const totalComments = comments.length
    const averageRelevanceScore =
      totalComments > 0
        ? comments.reduce((sum, comment) => sum + comment.relevanceScore, 0) /
          totalComments
        : 0
    const highQualityComments = comments.filter(
      comment => comment.relevanceScore > 70
    ).length
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
