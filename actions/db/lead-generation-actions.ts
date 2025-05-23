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
  writeBatch,
  Timestamp
} from "firebase/firestore"

// Create serialized versions that can be passed to client components
export interface SerializedSearchResultDocument {
  id: string
  campaignId: string
  keyword: string
  redditUrl: string
  threadId?: string
  title: string
  snippet: string
  position: number
  processed: boolean
  createdAt: string
  updatedAt: string
}

export interface SerializedRedditThreadDocument {
  id: string
  campaignId: string
  searchResultId: string
  threadId: string
  subreddit: string
  title: string
  content: string
  author: string
  score: number
  numComments: number
  url: string
  processed: boolean
  relevanceScore?: number
  createdAt: string
  updatedAt: string
}

export interface SerializedGeneratedCommentDocument {
  id: string
  campaignId: string
  redditThreadId: string
  threadId: string
  postUrl: string
  postTitle: string
  postAuthor: string
  postContentSnippet: string
  relevanceScore: number
  reasoning: string
  microComment: string
  mediumComment: string
  verboseComment: string
  status: "new" | "viewed" | "approved" | "rejected" | "used"
  selectedLength?: "micro" | "medium" | "verbose"
  approved: boolean
  used: boolean
  createdAt: string
  updatedAt: string
  postScore?: number
  keyword?: string
}

// Serialization helper functions
function serializeSearchResultDocument(
  searchResult: SearchResultDocument
): SerializedSearchResultDocument {
  return {
    ...searchResult,
    createdAt:
      searchResult.createdAt instanceof Timestamp
        ? searchResult.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    updatedAt:
      searchResult.updatedAt instanceof Timestamp
        ? searchResult.updatedAt.toDate().toISOString()
        : new Date().toISOString()
  }
}

function serializeRedditThreadDocument(
  thread: RedditThreadDocument
): SerializedRedditThreadDocument {
  return {
    ...thread,
    createdAt:
      thread.createdAt instanceof Timestamp
        ? thread.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    updatedAt:
      thread.updatedAt instanceof Timestamp
        ? thread.updatedAt.toDate().toISOString()
        : new Date().toISOString()
  }
}

function serializeGeneratedCommentDocument(
  comment: GeneratedCommentDocument
): SerializedGeneratedCommentDocument {
  return {
    ...comment,
    createdAt:
      comment.createdAt instanceof Timestamp
        ? comment.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    updatedAt:
      comment.updatedAt instanceof Timestamp
        ? comment.updatedAt.toDate().toISOString()
        : new Date().toISOString()
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
    console.log(`\n💾 [LEAD-GEN-DB] ====== CREATING GENERATED COMMENT ======`)
    console.log(`💾 [LEAD-GEN-DB] Campaign ID: ${data.campaignId}`)
    console.log(`💾 [LEAD-GEN-DB] Post Title: ${data.postTitle}`)
    console.log(`💾 [LEAD-GEN-DB] Relevance Score: ${data.relevanceScore}`)
    console.log(`💾 [LEAD-GEN-DB] Collection: ${LEAD_COLLECTIONS.GENERATED_COMMENTS}`)
    
    const commentRef = doc(collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS))
    console.log(`💾 [LEAD-GEN-DB] Generated doc ID: ${commentRef.id}`)

    const commentData: Omit<GeneratedCommentDocument, "createdAt" | "updatedAt" | "id"> & { createdAt?: any; updatedAt?: any } = {
      campaignId: data.campaignId,
      redditThreadId: data.redditThreadId,
      threadId: data.threadId,
      postUrl: data.postUrl,
      postTitle: data.postTitle,
      postAuthor: data.postAuthor,
      postContentSnippet: data.postContentSnippet,
      relevanceScore: data.relevanceScore,
      reasoning: data.reasoning,
      microComment: data.microComment,
      mediumComment: data.mediumComment,
      verboseComment: data.verboseComment,
      status: data.status || "new", // Default to 'new'
      approved: false, // Default to false, can be updated later
      used: false, // Default to false
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
      data: createdDoc.data() as GeneratedCommentDocument
    }
  } catch (error) {
    console.error("❌ [LEAD-GEN-DB] Error creating generated comment:", error)
    return { isSuccess: false, message: "Failed to create generated comment" }
  }
}

export async function updateGeneratedCommentAction(
  id: string,
  data: {
    microComment?: string
    mediumComment?: string
    verboseComment?: string
    status?: "new" | "viewed" | "approved" | "rejected" | "used"
    selectedLength?: "micro" | "medium" | "verbose"
    approved?: boolean
    used?: boolean
  }
): Promise<ActionState<GeneratedCommentDocument>> {
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
      data: updatedDoc.data() as GeneratedCommentDocument
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
    console.log(`📖 [LEAD-GEN] Fetching generated comments for campaign ${campaignId}`)
    
    // Fetch generated comments
    const commentsRef = collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS)
    const q = query(commentsRef, where("campaignId", "==", campaignId))
    const querySnapshot = await getDocs(q)

    // Fetch Reddit threads for this campaign to get scores
    const threadsRef = collection(db, LEAD_COLLECTIONS.REDDIT_THREADS)
    const threadsQuery = query(threadsRef, where("campaignId", "==", campaignId))
    const threadsSnapshot = await getDocs(threadsQuery)
    
    // Create a map of thread ID to thread data for quick lookup
    const threadMap = new Map<string, RedditThreadDocument>()
    threadsSnapshot.docs.forEach(doc => {
      const thread = doc.data() as RedditThreadDocument
      threadMap.set(doc.id, thread)
    })
    
    // Fetch search results to get keywords
    const searchResultsRef = collection(db, LEAD_COLLECTIONS.SEARCH_RESULTS)
    const searchQuery = query(searchResultsRef, where("campaignId", "==", campaignId))
    const searchSnapshot = await getDocs(searchQuery)
    
    // Create a map of thread URL to keyword for lookup
    const keywordMap = new Map<string, string>()
    searchSnapshot.docs.forEach(doc => {
      const searchResult = doc.data() as SearchResultDocument
      keywordMap.set(searchResult.redditUrl, searchResult.keyword)
    })

    const comments = querySnapshot.docs.map(doc => {
      const rawComment = doc.data() as GeneratedCommentDocument
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
    
    console.log(`✅ [LEAD-GEN] Found ${comments.length} comments with enriched data`)

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
  selectedLength: "micro" | "medium" | "verbose"
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
      const commentRef = doc(
        collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS)
      )
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
