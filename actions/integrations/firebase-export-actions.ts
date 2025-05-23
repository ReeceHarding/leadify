/*
<ai_context>
Contains server actions for exporting lead generation data to Firebase instead of Google Sheets.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import { ActionState } from "@/types"
import {
  LEAD_COLLECTIONS,
  GoogleSheetsExportData,
  CampaignDocument
} from "@/db/schema"
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore"
import { removeUndefinedValues } from "@/lib/firebase-utils"

export interface FirebaseExportData {
  id: string
  campaignId: string
  campaignName: string
  keyword: string
  redditUrl: string
  threadTitle: string
  subreddit: string
  threadAuthor: string
  threadScore: number
  relevanceScore: number
  generatedComment: string
  reasoning: string
  approved: boolean
  used: boolean
  exportedAt: Date
}

export async function exportCampaignToFirebaseAction(
  campaignId: string
): Promise<ActionState<{ exportId: string; totalRecords: number }>> {
  try {
    console.log(`🔥 Exporting campaign ${campaignId} data to Firebase...`)

    // Get campaign details
    const campaignDoc = await getDocs(
      query(collection(db, LEAD_COLLECTIONS.CAMPAIGNS), where("id", "==", campaignId))
    )
    
    if (campaignDoc.empty) {
      return { isSuccess: false, message: "Campaign not found" }
    }

    const campaign = campaignDoc.docs[0].data() as CampaignDocument

    // Get all search results for this campaign
    const searchResultsQuery = query(
      collection(db, LEAD_COLLECTIONS.SEARCH_RESULTS),
      where("campaignId", "==", campaignId)
    )
    const searchResults = await getDocs(searchResultsQuery)

    // Get all Reddit threads for this campaign
    const threadsQuery = query(
      collection(db, LEAD_COLLECTIONS.REDDIT_THREADS),
      where("campaignId", "==", campaignId)
    )
    const threads = await getDocs(threadsQuery)

    // Get all generated comments for this campaign
    const commentsQuery = query(
      collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS),
      where("campaignId", "==", campaignId)
    )
    const comments = await getDocs(commentsQuery)

    // Create export collection
    const exportCollectionName = `campaign_exports_${campaignId}`
    const exportRef = doc(collection(db, exportCollectionName))
    const exportId = exportRef.id

    // Combine all data for export
    const exportData: FirebaseExportData[] = []

    comments.docs.forEach((commentDoc) => {
      const comment = commentDoc.data()
      const thread = threads.docs.find(t => t.data().threadId === comment.threadId)
      const searchResult = searchResults.docs.find(sr => sr.data().threadId === comment.threadId)

      if (thread && searchResult) {
        const threadData = thread.data()
        const searchData = searchResult.data()

        exportData.push({
          id: commentDoc.id,
          campaignId: campaign.id,
          campaignName: campaign.name,
          keyword: searchData.keyword,
          redditUrl: searchData.redditUrl,
          threadTitle: threadData.title,
          subreddit: threadData.subreddit,
          threadAuthor: threadData.author,
          threadScore: threadData.score,
          relevanceScore: comment.relevanceScore,
          generatedComment: comment.generatedComment,
          reasoning: comment.reasoning,
          approved: comment.approved || false,
          used: comment.used || false,
          exportedAt: new Date()
        })
      }
    })

    // Save each export record to Firebase
    for (let i = 0; i < exportData.length; i++) {
      const recordRef = doc(collection(db, exportCollectionName))
      const recordData = removeUndefinedValues({
        ...exportData[i],
        id: recordRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      await setDoc(recordRef, recordData)
    }

    // Create export summary
    const summaryRef = doc(collection(db, `campaign_export_summaries`), exportId)
    const summary = removeUndefinedValues({
      id: exportId,
      campaignId: campaign.id,
      campaignName: campaign.name,
      totalRecords: exportData.length,
      exportCollectionName,
      exportedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    await setDoc(summaryRef, summary)

    console.log(`✅ Exported ${exportData.length} records to Firebase collection: ${exportCollectionName}`)

    return {
      isSuccess: true,
      message: `Successfully exported ${exportData.length} records to Firebase`,
      data: {
        exportId,
        totalRecords: exportData.length
      }
    }
  } catch (error) {
    console.error("Error exporting to Firebase:", error)
    return {
      isSuccess: false,
      message: `Failed to export to Firebase: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

export async function getAllCampaignExportsAction(): Promise<ActionState<any[]>> {
  try {
    const exportsQuery = query(
      collection(db, "campaign_export_summaries"),
      orderBy("exportedAt", "desc")
    )
    const exportsSnapshot = await getDocs(exportsQuery)
    
    const exports = exportsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return {
      isSuccess: true,
      message: `Retrieved ${exports.length} campaign exports`,
      data: exports
    }
  } catch (error) {
    console.error("Error getting campaign exports:", error)
    return {
      isSuccess: false,
      message: `Failed to get campaign exports: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

export async function getCampaignExportDataAction(
  exportId: string
): Promise<ActionState<FirebaseExportData[]>> {
  try {
    // Get export summary to find collection name
    const summaryDoc = await getDocs(
      query(collection(db, "campaign_export_summaries"), where("id", "==", exportId))
    )

    if (summaryDoc.empty) {
      return { isSuccess: false, message: "Export not found" }
    }

    const summary = summaryDoc.docs[0].data()
    const collectionName = summary.exportCollectionName

    // Get all export data
    const exportDataQuery = query(
      collection(db, collectionName),
      orderBy("relevanceScore", "desc")
    )
    const exportDataSnapshot = await getDocs(exportDataQuery)

    const exportData = exportDataSnapshot.docs.map(doc => doc.data() as FirebaseExportData)

    return {
      isSuccess: true,
      message: `Retrieved ${exportData.length} export records`,
      data: exportData
    }
  } catch (error) {
    console.error("Error getting export data:", error)
    return {
      isSuccess: false,
      message: `Failed to get export data: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
} 