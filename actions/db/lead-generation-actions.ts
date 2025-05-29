/*
<ai_context>
Contains server actions for lead generation database operations with three-tier comment system.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import {
  LEAD_COLLECTIONS,
  SearchResultDocument,
  CreateSearchResultData,
  RedditThreadDocument,
  CreateRedditThreadData,
  GeneratedCommentDocument,
  CreateGeneratedCommentData,
  UpdateGeneratedCommentData
} from "@/db/firestore/lead-generation-collections"
import {
  ActionState,
  SerializedSearchResultDocument,
  SerializedRedditThreadDocument,
  SerializedGeneratedCommentDocument
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
  writeBatch,
  Timestamp
} from "firebase/firestore"
import { toISOString } from "@/lib/utils/timestamp-utils"

// Serialization helper functions
function serializeTimestampToISOBoilerplate(timestamp: any): string {
  return toISOString(timestamp) || new Date(0).toISOString()
}

function serializeSearchResultDocument(
  searchResult: SearchResultDocument
): SerializedSearchResultDocument {
  return {
    ...searchResult,
    // Ensure all required fields of SerializedSearchResultDocument are present
    // and correctly typed, even if optional in SearchResultDocument
    threadId: searchResult.threadId || undefined,
    createdAt: serializeTimestampToISOBoilerplate(searchResult.createdAt),
    updatedAt: serializeTimestampToISOBoilerplate(searchResult.updatedAt)
  }
}

function serializeRedditThreadDocument(
  thread: RedditThreadDocument
): SerializedRedditThreadDocument {
  return {
    ...thread,
    // Ensure all required fields of SerializedRedditThreadDocument are present
    relevanceScore: thread.relevanceScore || undefined,
    createdAt: serializeTimestampToISOBoilerplate(thread.createdAt),
    updatedAt: serializeTimestampToISOBoilerplate(thread.updatedAt)
  }
}

function serializeGeneratedCommentDocument(
  comment: GeneratedCommentDocument
): SerializedGeneratedCommentDocument {
  // Explicitly map to ensure structure and handle undefined optionals
  return {
    id: comment.id,
    campaignId: comment.campaignId,
    organizationId: comment.organizationId,
    redditThreadId: comment.redditThreadId,
    threadId: comment.threadId,
    postUrl: comment.postUrl,
    postTitle: comment.postTitle,
    postAuthor: comment.postAuthor,
    postContentSnippet: comment.postContentSnippet,
    postContent: comment.postContent,
    relevanceScore: comment.relevanceScore,
    reasoning: comment.reasoning,
    microComment: comment.microComment,
    mediumComment: comment.mediumComment,
    verboseComment: comment.verboseComment,
    
    // DM fields
    dmMessage: comment.dmMessage,
    dmSubject: comment.dmSubject,
    dmFollowUp: comment.dmFollowUp,
    dmStatus: comment.dmStatus,
    dmSentAt: comment.dmSentAt ? serializeTimestampToISOBoilerplate(comment.dmSentAt) : undefined,
    dmError: comment.dmError,
    
    // Analytics & Engagement fields
    engagementUpvotes: comment.engagementUpvotes || 0,
    engagementRepliesCount: comment.engagementRepliesCount || 0,
    lastEngagementCheckAt: comment.lastEngagementCheckAt ? serializeTimestampToISOBoilerplate(comment.lastEngagementCheckAt) : undefined,
    engagementCheckCount: comment.engagementCheckCount || 0,
    
    status: comment.status,
    selectedLength: comment.selectedLength || undefined, // Handle optional

    createdAt: serializeTimestampToISOBoilerplate(comment.createdAt),
    updatedAt: serializeTimestampToISOBoilerplate(comment.updatedAt),
    postScore: comment.postScore || undefined, // Handle optional
    keyword: comment.keyword || undefined, // Handle optional
    postedCommentUrl: comment.postedCommentUrl || undefined, // Handle optional
    postCreatedAt: comment.postCreatedAt
      ? serializeTimestampToISOBoilerplate(comment.postCreatedAt)
      : undefined
  }
}

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

// SEARCH RESULT ACTIONS

export async function createSearchResultAction(
  data: CreateSearchResultData
): Promise<ActionState<SerializedSearchResultDocument>> {
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
    if (!createdDoc.exists()) {
      console.error(`❌ [LEAD-GEN-DB] Search result not found after creation!`)
      return {
        isSuccess: false,
        message: "Search result not found after creation"
      }
    }
    return {
      isSuccess: true,
      message: "Search result created successfully",
      data: serializeSearchResultDocument(
        createdDoc.data() as SearchResultDocument
      )
    }
  } catch (error) {
    console.error("Error creating search result:", error)
    return { isSuccess: false, message: "Failed to create search result" }
  }
}

// REDDIT THREAD ACTIONS

export async function createRedditThreadAction(
  data: CreateRedditThreadData
): Promise<ActionState<SerializedRedditThreadDocument>> {
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
    if (!createdDoc.exists()) {
      console.error(`❌ [LEAD-GEN-DB] Reddit thread not found after creation!`)
      return {
        isSuccess: false,
        message: "Reddit thread not found after creation"
      }
    }
    return {
      isSuccess: true,
      message: "Reddit thread created successfully",
      data: serializeRedditThreadDocument(
        createdDoc.data() as RedditThreadDocument
      )
    }
  } catch (error) {
    console.error("Error creating Reddit thread:", error)
    return { isSuccess: false, message: "Failed to create Reddit thread" }
  }
}

// GENERATED COMMENT ACTIONS (THREE-TIER SYSTEM)

export async function createGeneratedCommentAction(
  data: CreateGeneratedCommentData
): Promise<ActionState<SerializedGeneratedCommentDocument>> {
  try {
    console.log(`\n💾 [LEAD-GEN-DB] ====== CREATING GENERATED COMMENT ======`)
    console.log(`💾 [LEAD-GEN-DB] Campaign ID: ${data.campaignId}`)
    console.log(`💾 [LEAD-GEN-DB] Post Title: ${data.postTitle}`)
    console.log(`💾 [LEAD-GEN-DB] Relevance Score: ${data.relevanceScore}`)
    console.log(`💾 [LEAD-GEN-DB] Keyword: ${data.keyword || "Not provided"}`)
    console.log(
      `💾 [LEAD-GEN-DB] Post Score: ${data.postScore || "Not provided"}`
    )
    console.log(
      `💾 [LEAD-GEN-DB] Collection: ${LEAD_COLLECTIONS.GENERATED_COMMENTS}`
    )

    const commentRef = doc(collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS))
    console.log(`💾 [LEAD-GEN-DB] Generated doc ID: ${commentRef.id}`)

    const commentData: Omit<
      GeneratedCommentDocument,
      "createdAt" | "updatedAt" | "id"
    > & { createdAt?: any; updatedAt?: any } = {
      campaignId: data.campaignId,
      organizationId: data.organizationId,
      redditThreadId: data.redditThreadId,
      threadId: data.threadId,
      postUrl: data.postUrl,
      postTitle: data.postTitle,
      postAuthor: data.postAuthor,
      postContentSnippet: data.postContentSnippet,
      postContent: data.postContent,
      relevanceScore: data.relevanceScore,
      reasoning: data.reasoning,
      microComment: data.microComment,
      mediumComment: data.mediumComment,
      verboseComment: data.verboseComment,
      // DM fields
      dmMessage: data.dmMessage,
      dmSubject: data.dmSubject,
      dmFollowUp: data.dmFollowUp,
      status: data.status || "new", // Default to 'new'
      // Optional tracking fields
      keyword: data.keyword,
      postScore: data.postScore,
      postCreatedAt: data.postCreatedAt
      // Timestamps will be added by serverTimestamp or directly
    }

    const finalCommentData = {
      id: commentRef.id,
      ...commentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    console.log(`💾 [LEAD-GEN-DB] Writing to Firestore...`)
    await setDoc(commentRef, removeUndefinedValues(finalCommentData))
    console.log(`✅ [LEAD-GEN-DB] Successfully wrote to Firestore`)

    const createdDoc = await getDoc(commentRef)
    if (!createdDoc.exists()) {
      console.error(`❌ [LEAD-GEN-DB] Document not found after creation!`)
      return {
        isSuccess: false,
        message: "Document not found after creation"
      }
    }

    console.log(`✅ [LEAD-GEN-DB] Verified document exists in Firestore`)
    console.log(`💾 [LEAD-GEN-DB] ====== COMMENT CREATION COMPLETE ======\n`)

    return {
      isSuccess: true,
      message: "Generated comment created successfully",
      data: serializeGeneratedCommentDocument(
        createdDoc.data() as GeneratedCommentDocument
      )
    }
  } catch (error) {
    console.error("❌ [LEAD-GEN-DB] Error creating generated comment:", error)
    return { isSuccess: false, message: "Failed to create generated comment" }
  }
}

export async function updateGeneratedCommentAction(
  id: string,
  data: UpdateGeneratedCommentData
): Promise<ActionState<SerializedGeneratedCommentDocument>> {
  try {
    console.log(`📝 [LEAD-GEN] Updating generated comment ${id}`)

    const commentRef = doc(db, LEAD_COLLECTIONS.GENERATED_COMMENTS, id)

    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }

    await updateDoc(commentRef, removeUndefinedValues(updateData))

    const updatedDoc = await getDoc(commentRef)
    if (!updatedDoc.exists()) {
      return {
        isSuccess: false,
        message: "Comment not found after update"
      }
    }

    console.log(`✅ [LEAD-GEN] Successfully updated comment ${id}`)

    return {
      isSuccess: true,
      message: "Generated comment updated successfully",
      data: serializeGeneratedCommentDocument(
        updatedDoc.data() as GeneratedCommentDocument
      )
    }
  } catch (error) {
    console.error("Error updating generated comment:", error)
    return { isSuccess: false, message: "Failed to update generated comment" }
  }
}

export async function getGeneratedCommentsByCampaignAction(
  campaignId: string
): Promise<ActionState<SerializedGeneratedCommentDocument[]>> {
  try {
    console.log(`\n📖 [LEAD-GEN-GET] ====== FETCHING COMMENTS ======`)
    console.log(`📖 [LEAD-GEN-GET] Campaign ID: ${campaignId}`)
    console.log(
      `📖 [LEAD-GEN-GET] Collection: ${LEAD_COLLECTIONS.GENERATED_COMMENTS}`
    )
    console.log(`📖 [LEAD-GEN-GET] Time: ${new Date().toISOString()}`)

    // Fetch generated comments
    const commentsRef = collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS)
    const q = query(commentsRef, where("campaignId", "==", campaignId))
    console.log(`📖 [LEAD-GEN-GET] Executing Firestore query...`)
    const querySnapshot = await getDocs(q)
    console.log(
      `📖 [LEAD-GEN-GET] Query returned ${querySnapshot.docs.length} documents`
    )

    // Fetch Reddit threads for this campaign to get scores
    const threadsRef = collection(db, LEAD_COLLECTIONS.REDDIT_THREADS)
    const threadsQuery = query(
      threadsRef,
      where("campaignId", "==", campaignId)
    )
    const threadsSnapshot = await getDocs(threadsQuery)

    // Create a map of thread ID to thread data for quick lookup
    const threadMap = new Map<string, RedditThreadDocument>()
    threadsSnapshot.docs.forEach(doc => {
      const thread = doc.data() as RedditThreadDocument
      threadMap.set(doc.id, thread)
    })

    // Fetch search results to get keywords
    const searchResultsRef = collection(db, LEAD_COLLECTIONS.SEARCH_RESULTS)
    const searchQuery = query(
      searchResultsRef,
      where("campaignId", "==", campaignId)
    )
    const searchSnapshot = await getDocs(searchQuery)

    // Create a map of thread URL to keyword for lookup
    const keywordMap = new Map<string, string>()
    searchSnapshot.docs.forEach(doc => {
      const searchResult = doc.data() as SearchResultDocument
      keywordMap.set(searchResult.redditUrl, searchResult.keyword)
    })

    const comments = querySnapshot.docs.map((doc, index) => {
      const rawComment = doc.data() as GeneratedCommentDocument

      // Log first 3 comments in detail
      if (index < 3) {
        console.log(`📖 [LEAD-GEN-GET] Comment ${index + 1}:`, {
          id: rawComment.id,
          campaignId: rawComment.campaignId,
          postTitle: rawComment.postTitle?.substring(0, 50) + "...",
          relevanceScore: rawComment.relevanceScore,
          status: rawComment.status,
          createdAt: rawComment.createdAt,
          microCommentLength: rawComment.microComment?.length,
          mediumCommentLength: rawComment.mediumComment?.length,
          verboseCommentLength: rawComment.verboseComment?.length
        })
      }

      const serializedComment = serializeGeneratedCommentDocument(rawComment)

      // Add Reddit thread score if available
      const thread = threadMap.get(rawComment.redditThreadId)
      if (thread) {
        serializedComment.postScore = thread.score

        // Try to get keyword from the thread URL
        const keyword = keywordMap.get(thread.url)
        if (keyword) {
          serializedComment.keyword = keyword
        }
      }

      return serializedComment
    })

    console.log(
      `📖 [LEAD-GEN-GET] Found ${comments.length} comments with enriched data`
    )
    console.log(`📖 [LEAD-GEN-GET] ====== FETCH COMPLETE ======\n`)

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

export async function getGeneratedCommentByIdAction(
  id: string
): Promise<ActionState<SerializedGeneratedCommentDocument>> {
  try {
    console.log(`📖 [LEAD-GEN] Fetching comment by ID: ${id}`)
    
    const commentRef = doc(db, LEAD_COLLECTIONS.GENERATED_COMMENTS, id)
    const commentDoc = await getDoc(commentRef)
    
    if (!commentDoc.exists()) {
      return {
        isSuccess: false,
        message: "Comment not found"
      }
    }
    
    const comment = commentDoc.data() as GeneratedCommentDocument
    console.log(`✅ [LEAD-GEN] Found comment for campaign: ${comment.campaignId}`)
    
    return {
      isSuccess: true,
      message: "Comment retrieved successfully",
      data: serializeGeneratedCommentDocument(comment)
    }
  } catch (error) {
    console.error("Error getting comment by ID:", error)
    return { isSuccess: false, message: "Failed to get comment" }
  }
}

export async function updateGeneratedCommentLengthAction(
  id: string,
  selectedLength: "micro" | "medium" | "verbose"
): Promise<ActionState<SerializedGeneratedCommentDocument>> {
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
      data: serializeGeneratedCommentDocument(
        updatedDoc.data() as GeneratedCommentDocument
      )
    }
  } catch (error) {
    console.error("Error updating comment length:", error)
    return { isSuccess: false, message: "Failed to update comment length" }
  }
}

// BATCH OPERATIONS

export async function createBatchRedditThreadsAction(
  threads: CreateRedditThreadData[]
): Promise<ActionState<SerializedRedditThreadDocument[]>> {
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
    const createdDocsData = await Promise.all(
      threadRefs.map(async ({ ref }) => {
        const docSnap = await getDoc(ref)
        if (docSnap.exists()) {
          return serializeRedditThreadDocument(
            docSnap.data() as RedditThreadDocument
          )
        }
        return null
      })
    )
    
    const filteredDocs = createdDocsData.filter(doc => doc !== null) as SerializedRedditThreadDocument[];

    return {
      isSuccess: true,
      message: `Created ${filteredDocs.length} Reddit threads successfully`,
      data: filteredDocs
    }
  } catch (error) {
    console.error("Error creating batch Reddit threads:", error)
    return { isSuccess: false, message: "Failed to create Reddit threads" }
  }
}

export async function createBatchGeneratedCommentsAction(
  comments: CreateGeneratedCommentData[]
): Promise<ActionState<SerializedGeneratedCommentDocument[]>> {
  try {
    const batch = writeBatch(db)
    const commentRefs: any[] = []

    comments.forEach(commentData => {
      const commentRef = doc(
        collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS)
      )
      const data = {
        id: commentRef.id,
        ...commentData,
        status: commentData.status || "new",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      batch.set(commentRef, removeUndefinedValues(data))
      commentRefs.push({ ref: commentRef })
    })

    await batch.commit()

    // Fetch the created documents
    const createdDocsData = await Promise.all(
      commentRefs.map(async ({ ref }) => {
        const docSnap = await getDoc(ref)
        if (docSnap.exists()){
           return serializeGeneratedCommentDocument(
            docSnap.data() as GeneratedCommentDocument
          );
        }
        return null;
      })
    )
    
    const filteredDocs = createdDocsData.filter(doc => doc !== null) as SerializedGeneratedCommentDocument[];

    return {
      isSuccess: true,
      message: `Created ${filteredDocs.length} generated comments successfully`,
      data: filteredDocs
    }
  } catch (error) {
    console.error("Error creating batch generated comments:", error)
    return { isSuccess: false, message: "Failed to create generated comments" }
  }
}

export async function getGeneratedCommentsByOrganizationIdAction(
  organizationId: string
): Promise<ActionState<SerializedGeneratedCommentDocument[]>> {
  try {
    console.log(`📖 [LEAD-GEN] Fetching comments for organization: ${organizationId}`)

    // First get all campaigns for this organization
    const campaignsRef = collection(db, LEAD_COLLECTIONS.CAMPAIGNS)
    const campaignsQuery = query(campaignsRef, where("organizationId", "==", organizationId))
    const campaignsSnapshot = await getDocs(campaignsQuery)

    if (campaignsSnapshot.empty) {
      return {
        isSuccess: true,
        message: "No campaigns found for organization",
        data: []
      }
    }

    // Get all campaign IDs
    const campaignIds = campaignsSnapshot.docs.map(doc => doc.id)

    // Fetch all comments for these campaigns
    const allComments: SerializedGeneratedCommentDocument[] = []

    for (const campaignId of campaignIds) {
      const result = await getGeneratedCommentsByCampaignAction(campaignId)
      if (result.isSuccess) {
        allComments.push(...result.data)
      }
    }

    console.log(`✅ [LEAD-GEN] Found ${allComments.length} comments for organization`)

    return {
      isSuccess: true,
      message: "Comments retrieved successfully",
      data: allComments
    }
  } catch (error) {
    console.error("Error getting comments by organization:", error)
    return { isSuccess: false, message: "Failed to get organization comments" }
  }
}

// Legacy function - kept for backward compatibility
export async function getGeneratedCommentsByUserIdAction(
  userId: string
): Promise<ActionState<SerializedGeneratedCommentDocument[]>> {
  try {
    console.log(`📖 [LEAD-GEN] Fetching comments for user (LEGACY): ${userId}`)

    // First get all campaigns for this user
    const campaignsRef = collection(db, LEAD_COLLECTIONS.CAMPAIGNS)
    const campaignsQuery = query(campaignsRef, where("userId", "==", userId))
    const campaignsSnapshot = await getDocs(campaignsQuery)

    if (campaignsSnapshot.empty) {
      return {
        isSuccess: true,
        message: "No campaigns found for user",
        data: []
      }
    }

    // Get all campaign IDs
    const campaignIds = campaignsSnapshot.docs.map(doc => doc.id)

    // Fetch all comments for these campaigns
    const allComments: SerializedGeneratedCommentDocument[] = []

    for (const campaignId of campaignIds) {
      const result = await getGeneratedCommentsByCampaignAction(campaignId)
      if (result.isSuccess) {
        allComments.push(...result.data)
      }
    }

    console.log(`✅ [LEAD-GEN] Found ${allComments.length} comments for user`)

    return {
      isSuccess: true,
      message: "Comments retrieved successfully",
      data: allComments
    }
  } catch (error) {
    console.error("Error getting comments by user:", error)
    return { isSuccess: false, message: "Failed to get user comments" }
  }
}

// Alias for consistency with naming in component
export const getGeneratedCommentsByUserAction =
  getGeneratedCommentsByUserIdAction
