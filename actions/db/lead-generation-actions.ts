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
  relevanceScore: number
  reasoning: string
  microComment: string
  mediumComment: string
  verboseComment: string
  selectedLength?: "micro" | "medium" | "verbose"
  approved: boolean
  used: boolean
  createdAt: string
  updatedAt: string
}

// Serialization helper functions
function serializeSearchResultDocument(searchResult: SearchResultDocument): SerializedSearchResultDocument {
  return {
    ...searchResult,
    createdAt: searchResult.createdAt instanceof Timestamp 
      ? searchResult.createdAt.toDate().toISOString()
      : new Date().toISOString(),
    updatedAt: searchResult.updatedAt instanceof Timestamp 
      ? searchResult.updatedAt.toDate().toISOString() 
      : new Date().toISOString()
  }
}

function serializeRedditThreadDocument(thread: RedditThreadDocument): SerializedRedditThreadDocument {
  return {
    ...thread,
    createdAt: thread.createdAt instanceof Timestamp 
      ? thread.createdAt.toDate().toISOString()
      : new Date().toISOString(),
    updatedAt: thread.updatedAt instanceof Timestamp 
      ? thread.updatedAt.toDate().toISOString() 
      : new Date().toISOString()
  }
}

function serializeGeneratedCommentDocument(comment: GeneratedCommentDocument): SerializedGeneratedCommentDocument {
  return {
    ...comment,
    createdAt: comment.createdAt instanceof Timestamp 
      ? comment.createdAt.toDate().toISOString()
      : new Date().toISOString(),
    updatedAt: comment.updatedAt instanceof Timestamp 
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
): Promise<ActionState<SerializedGeneratedCommentDocument[]>> {
  try {
    const commentsRef = collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS)
    const q = query(commentsRef, where("campaignId", "==", campaignId))
    const querySnapshot = await getDocs(q)
    
    const comments = querySnapshot.docs.map(doc => {
      const rawComment = doc.data() as GeneratedCommentDocument
      return serializeGeneratedCommentDocument(rawComment)
    })
    
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