/*
<ai_context>
Contains server actions for lead generation database operations with three-tier comment system.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import {
  LEAD_COLLECTIONS,
  CampaignDocument,
  CreateCampaignData,
  UpdateCampaignData,
  SearchResultDocument,
  CreateSearchResultData,
  RedditThreadDocument,
  CreateRedditThreadData,
  GeneratedCommentDocument,
  CreateGeneratedCommentData
} from "@/db/firestore/lead-generation-collections"
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
  serverTimestamp,
  writeBatch
} from "firebase/firestore"

// Utility function to remove undefined values for Firestore
function removeUndefinedValues(obj: any): any {
  const cleaned: any = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value
    }
  }
  return cleaned
}

// CAMPAIGN ACTIONS

export async function createCampaignAction(
  data: CreateCampaignData
): Promise<ActionState<CampaignDocument>> {
  try {
    const campaignRef = doc(collection(db, LEAD_COLLECTIONS.CAMPAIGNS))
    
    const campaignData = {
      id: campaignRef.id,
      userId: data.userId,
      name: data.name,
      website: data.website,
      keywords: data.keywords,
      status: 'pending',
      totalSearchResults: 0,
      totalThreadsAnalyzed: 0,
      totalCommentsGenerated: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await setDoc(campaignRef, removeUndefinedValues(campaignData))
    
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

export async function getCampaignByIdAction(
  id: string
): Promise<ActionState<CampaignDocument>> {
  try {
    const campaignRef = doc(db, LEAD_COLLECTIONS.CAMPAIGNS, id)
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
  id: string,
  data: UpdateCampaignData
): Promise<ActionState<CampaignDocument>> {
  try {
    const campaignRef = doc(db, LEAD_COLLECTIONS.CAMPAIGNS, id)
    
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }

    await updateDoc(campaignRef, removeUndefinedValues(updateData))
    
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

// SEARCH RESULT ACTIONS

export async function createSearchResultAction(
  data: CreateSearchResultData
): Promise<ActionState<SearchResultDocument>> {
  try {
    const searchResultRef = doc(collection(db, LEAD_COLLECTIONS.SEARCH_RESULTS))
    
    const searchResultData = {
      id: searchResultRef.id,
      campaignId: data.campaignId,
      keyword: data.keyword,
      redditUrl: data.redditUrl,
      threadId: data.threadId,
      title: data.title,
      snippet: data.snippet,
      position: data.position,
      processed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await setDoc(searchResultRef, removeUndefinedValues(searchResultData))
    
    const createdDoc = await getDoc(searchResultRef)
    return {
      isSuccess: true,
      message: "Search result created successfully",
      data: createdDoc.data() as SearchResultDocument
    }
  } catch (error) {
    console.error("Error creating search result:", error)
    return { isSuccess: false, message: "Failed to create search result" }
  }
}

// REDDIT THREAD ACTIONS

export async function createRedditThreadAction(
  data: CreateRedditThreadData
): Promise<ActionState<RedditThreadDocument>> {
  try {
    const threadRef = doc(collection(db, LEAD_COLLECTIONS.REDDIT_THREADS))
    
    const threadData = {
      id: threadRef.id,
      campaignId: data.campaignId,
      searchResultId: data.searchResultId,
      threadId: data.threadId,
      subreddit: data.subreddit,
      title: data.title,
      content: data.content,
      url: data.url,
      score: data.score,
      numComments: data.numComments,
      author: data.author,
      processed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await setDoc(threadRef, removeUndefinedValues(threadData))
    
    const createdDoc = await getDoc(threadRef)
    return {
      isSuccess: true,
      message: "Reddit thread created successfully",
      data: createdDoc.data() as RedditThreadDocument
    }
  } catch (error) {
    console.error("Error creating Reddit thread:", error)
    return { isSuccess: false, message: "Failed to create Reddit thread" }
  }
}

// GENERATED COMMENT ACTIONS (THREE-TIER SYSTEM)

export async function createGeneratedCommentAction(
  data: CreateGeneratedCommentData
): Promise<ActionState<GeneratedCommentDocument>> {
  try {
    const commentRef = doc(collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS))
    
    const commentData = {
      id: commentRef.id,
      campaignId: data.campaignId,
      redditThreadId: data.redditThreadId,
      threadId: data.threadId,
      relevanceScore: data.relevanceScore,
      reasoning: data.reasoning,
      microComment: data.microComment,
      mediumComment: data.mediumComment,
      verboseComment: data.verboseComment,
      approved: false,
      used: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await setDoc(commentRef, removeUndefinedValues(commentData))
    
    const createdDoc = await getDoc(commentRef)
    return {
      isSuccess: true,
      message: "Generated comment created successfully",
      data: createdDoc.data() as GeneratedCommentDocument
    }
  } catch (error) {
    console.error("Error creating generated comment:", error)
    return { isSuccess: false, message: "Failed to create generated comment" }
  }
}

export async function getGeneratedCommentsByCampaignAction(
  campaignId: string
): Promise<ActionState<GeneratedCommentDocument[]>> {
  try {
    const commentsRef = collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS)
    const q = query(commentsRef, where("campaignId", "==", campaignId))
    const querySnapshot = await getDocs(q)
    
    const comments = querySnapshot.docs.map(doc => doc.data() as GeneratedCommentDocument)
    
    return {
      isSuccess: true,
      message: "Generated comments retrieved successfully",
      data: comments
    }
  } catch (error) {
    console.error("Error getting generated comments:", error)
    return { isSuccess: false, message: "Failed to get generated comments" }
  }
}

export async function updateGeneratedCommentLengthAction(
  id: string,
  selectedLength: 'micro' | 'medium' | 'verbose'
): Promise<ActionState<GeneratedCommentDocument>> {
  try {
    const commentRef = doc(db, LEAD_COLLECTIONS.GENERATED_COMMENTS, id)
    
    const updateData = {
      selectedLength,
      updatedAt: serverTimestamp()
    }

    await updateDoc(commentRef, removeUndefinedValues(updateData))
    
    const updatedDoc = await getDoc(commentRef)
    return {
      isSuccess: true,
      message: "Comment length updated successfully",
      data: updatedDoc.data() as GeneratedCommentDocument
    }
  } catch (error) {
    console.error("Error updating comment length:", error)
    return { isSuccess: false, message: "Failed to update comment length" }
  }
}

// BATCH OPERATIONS

export async function createBatchRedditThreadsAction(
  threads: CreateRedditThreadData[]
): Promise<ActionState<RedditThreadDocument[]>> {
  try {
    const batch = writeBatch(db)
    const threadRefs: any[] = []
    
    threads.forEach(threadData => {
      const threadRef = doc(collection(db, LEAD_COLLECTIONS.REDDIT_THREADS))
      const data = {
        id: threadRef.id,
        ...threadData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      batch.set(threadRef, removeUndefinedValues(data))
      threadRefs.push({ ref: threadRef, data })
    })
    
    await batch.commit()
    
    // Fetch the created documents
    const createdDocs = await Promise.all(
      threadRefs.map(async ({ ref }) => {
        const doc = await getDoc(ref)
        return doc.data() as RedditThreadDocument
      })
    )
    
    return {
      isSuccess: true,
      message: `Created ${createdDocs.length} Reddit threads successfully`,
      data: createdDocs
    }
  } catch (error) {
    console.error("Error creating batch Reddit threads:", error)
    return { isSuccess: false, message: "Failed to create Reddit threads" }
  }
}

export async function createBatchGeneratedCommentsAction(
  comments: CreateGeneratedCommentData[]
): Promise<ActionState<GeneratedCommentDocument[]>> {
  try {
    const batch = writeBatch(db)
    const commentRefs: any[] = []
    
    comments.forEach(commentData => {
      const commentRef = doc(collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS))
      const data = {
        id: commentRef.id,
        ...commentData,
        approved: false,
        used: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      batch.set(commentRef, removeUndefinedValues(data))
      commentRefs.push({ ref: commentRef, data })
    })
    
    await batch.commit()
    
    // Fetch the created documents
    const createdDocs = await Promise.all(
      commentRefs.map(async ({ ref }) => {
        const doc = await getDoc(ref)
        return doc.data() as GeneratedCommentDocument
      })
    )
    
    return {
      isSuccess: true,
      message: `Created ${createdDocs.length} generated comments successfully`,
      data: createdDocs
    }
  } catch (error) {
    console.error("Error creating batch generated comments:", error)
    return { isSuccess: false, message: "Failed to create generated comments" }
  }
} 