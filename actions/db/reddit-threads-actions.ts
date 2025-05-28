"use server"

import { db } from "@/db/db"
import {
  REDDIT_COLLECTIONS,
  RedditThreadDocument,
  CreateRedditThreadData,
  UpdateRedditThreadData,
  ThreadInteractionDocument,
  SerializedRedditThreadDocument,
  SerializedThreadInteractionDocument
} from "@/db/firestore/reddit-threads-collections"
import { ActionState } from "@/types"
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
  limit,
  Timestamp
} from "firebase/firestore"
import { toISOString } from "@/lib/utils/timestamp-utils"
import { semanticMatchAction } from "@/actions/integrations/openai/semantic-search-actions"

// Serialization helper functions
function serializeRedditThreadDocument(
  thread: RedditThreadDocument
): SerializedRedditThreadDocument {
  console.log("🧵 [SERIALIZE] Serializing thread:", thread.id)
  console.log("🧵 [SERIALIZE] Raw fetchedAt:", thread.fetchedAt)
  console.log("🧵 [SERIALIZE] Raw updatedAt:", thread.updatedAt)
  console.log("🧵 [SERIALIZE] Raw lastCommentAt:", thread.lastCommentAt)
  console.log("🧵 [SERIALIZE] Raw lastDMAt:", thread.lastDMAt)
  
  const serialized: SerializedRedditThreadDocument = {
    id: thread.id,
    organizationId: thread.organizationId,
    title: thread.title,
    author: thread.author,
    subreddit: thread.subreddit,
    url: thread.url,
    permalink: thread.permalink,
    content: thread.content,
    contentSnippet: thread.contentSnippet,
    score: thread.score,
    numComments: thread.numComments,
    createdUtc: thread.createdUtc,
    relevanceScore: thread.relevanceScore,
    reasoning: thread.reasoning,
    keywords: thread.keywords,
    hasComment: thread.hasComment,
    hasDM: thread.hasDM,
    commentId: thread.commentId,
    dmHistoryId: thread.dmHistoryId,
    fetchedAt: toISOString(thread.fetchedAt) || new Date().toISOString(),
    updatedAt: toISOString(thread.updatedAt) || new Date().toISOString(),
    lastCommentAt: thread.lastCommentAt ? toISOString(thread.lastCommentAt) || undefined : undefined,
    lastDMAt: thread.lastDMAt ? toISOString(thread.lastDMAt) || undefined : undefined
  }
  
  console.log("🧵 [SERIALIZE] Serialized fetchedAt:", serialized.fetchedAt)
  console.log("🧵 [SERIALIZE] Serialized updatedAt:", serialized.updatedAt)
  console.log("🧵 [SERIALIZE] Serialized lastCommentAt:", serialized.lastCommentAt)
  console.log("🧵 [SERIALIZE] Serialized lastDMAt:", serialized.lastDMAt)
  
  return serialized
}

function serializeThreadInteractionDocument(
  interaction: ThreadInteractionDocument
): SerializedThreadInteractionDocument {
  return {
    id: interaction.id,
    organizationId: interaction.organizationId,
    threadId: interaction.threadId,
    userId: interaction.userId,
    type: interaction.type,
    details: interaction.details,
    timestamp: toISOString(interaction.timestamp) || new Date().toISOString()
  }
}

// Create or update a Reddit thread
export async function upsertRedditThreadAction(
  data: CreateRedditThreadData
): Promise<ActionState<SerializedRedditThreadDocument>> {
  console.log("🧵 [UPSERT-THREAD] Upserting Reddit thread:", data.id)
  
  try {
    const threadRef = doc(db, REDDIT_COLLECTIONS.THREADS, data.id)
    
    // Check if thread already exists
    const existingDoc = await getDoc(threadRef)
    
    if (existingDoc.exists()) {
      // Update existing thread
      console.log("🧵 [UPSERT-THREAD] Thread exists, updating...")
      
      const updateData: UpdateRedditThreadData = {
        relevanceScore: data.relevanceScore,
        reasoning: data.reasoning,
        updatedAt: serverTimestamp() as Timestamp
      }
      
      await updateDoc(threadRef, { ...updateData })
      
      const updatedDoc = await getDoc(threadRef)
      const updatedThread = updatedDoc.data() as RedditThreadDocument
      
      console.log("🧵 [UPSERT-THREAD] ✅ Thread updated")
      return {
        isSuccess: true,
        message: "Thread updated successfully",
        data: serializeRedditThreadDocument(updatedThread)
      }
    } else {
      // Create new thread
      console.log("🧵 [UPSERT-THREAD] Creating new thread...")
      
      const threadData: RedditThreadDocument = {
        ...data,
        hasComment: false,
        hasDM: false,
        fetchedAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      }
      
      await setDoc(threadRef, threadData)
      
      const createdDoc = await getDoc(threadRef)
      const createdThread = createdDoc.data() as RedditThreadDocument
      
      console.log("🧵 [UPSERT-THREAD] ✅ Thread created")
      return {
        isSuccess: true,
        message: "Thread created successfully",
        data: serializeRedditThreadDocument(createdThread)
      }
    }
  } catch (error) {
    console.error("🧵 [UPSERT-THREAD] ❌ Error:", error)
    return {
      isSuccess: false,
      message: `Failed to upsert thread: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

// Get Reddit threads for an organization
export async function getRedditThreadsByOrganizationAction(
  organizationId: string,
  options: {
    hasComment?: boolean
    hasDM?: boolean
    minScore?: number
    keywords?: string[]
    limitCount?: number
  } = {}
): Promise<ActionState<SerializedRedditThreadDocument[]>> {
  console.log("🧵 [GET-THREADS] Fetching threads for org:", organizationId)
  console.log("🧵 [GET-THREADS] Options:", options)
  
  try {
    const threadsRef = collection(db, REDDIT_COLLECTIONS.THREADS)
    let q = query(
      threadsRef,
      where("organizationId", "==", organizationId),
      orderBy("relevanceScore", "desc")
    )
    
    // Apply filters
    if (options.hasComment !== undefined) {
      q = query(q, where("hasComment", "==", options.hasComment))
    }
    
    if (options.hasDM !== undefined) {
      q = query(q, where("hasDM", "==", options.hasDM))
    }
    
    if (options.minScore !== undefined) {
      q = query(q, where("relevanceScore", ">=", options.minScore))
    }
    
    if (options.limitCount) {
      q = query(q, limit(options.limitCount))
    }
    
    const querySnapshot = await getDocs(q)
    let threads = querySnapshot.docs.map(doc => doc.data() as RedditThreadDocument)
    
    // Filter by keywords using semantic search if provided
    if (options.keywords && options.keywords.length > 0) {
      console.log("🧵 [GET-THREADS] Applying semantic keyword filtering...")
      console.log("🧵 [GET-THREADS] Keywords to match:", options.keywords)
      
      const filteredThreads: RedditThreadDocument[] = []
      
      for (const thread of threads) {
        // Create searchable content from thread
        const searchableContent = [
          thread.title,
          thread.content,
          thread.contentSnippet,
          thread.keywords.join(" ")
        ].filter(Boolean).join(" ")
        
        // Check if thread content semantically matches any of the keywords
        let isMatch = false
        for (const keyword of options.keywords) {
          const semanticResult = await semanticMatchAction(
            keyword,
            searchableContent,
            `Thread from r/${thread.subreddit}`
          )
          
          if (semanticResult.isSuccess && semanticResult.data.isMatch) {
            console.log(`🧵 [GET-THREADS] Thread "${thread.title}" matches keyword "${keyword}" (score: ${semanticResult.data.relevanceScore})`)
            isMatch = true
            break
          }
        }
        
        if (isMatch) {
          filteredThreads.push(thread)
        }
      }
      
      threads = filteredThreads
      console.log("🧵 [GET-THREADS] Semantic filtering complete. Threads after filtering:", threads.length)
    }
    
    console.log("🧵 [GET-THREADS] ✅ Found threads:", threads.length)
    console.log("🧵 [GET-THREADS] Serializing threads...")
    
    // Serialize all threads
    const serializedThreads = threads.map(thread => serializeRedditThreadDocument(thread))
    
    console.log("🧵 [GET-THREADS] ✅ Threads serialized successfully")
    
    return {
      isSuccess: true,
      message: "Threads retrieved successfully",
      data: serializedThreads
    }
  } catch (error) {
    console.error("🧵 [GET-THREADS] ❌ Error:", error)
    return {
      isSuccess: false,
      message: `Failed to get threads: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

// Get a single Reddit thread by ID
export async function getRedditThreadByIdAction(
  threadId: string
): Promise<ActionState<SerializedRedditThreadDocument | null>> {
  console.log("🧵 [GET-THREAD] Fetching thread:", threadId)
  
  try {
    const threadRef = doc(db, REDDIT_COLLECTIONS.THREADS, threadId)
    const threadDoc = await getDoc(threadRef)
    
    if (!threadDoc.exists()) {
      console.log("🧵 [GET-THREAD] Thread not found")
      return {
        isSuccess: false,
        message: "Thread not found"
      }
    }
    
    const thread = threadDoc.data() as RedditThreadDocument
    console.log("🧵 [GET-THREAD] ✅ Thread retrieved, serializing...")
    
    return {
      isSuccess: true,
      message: "Thread retrieved successfully",
      data: serializeRedditThreadDocument(thread)
    }
  } catch (error) {
    console.error("🧵 [GET-THREAD] ❌ Error:", error)
    return {
      isSuccess: false,
      message: `Failed to get thread: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

// Update thread interaction status
export async function updateThreadInteractionAction(
  threadId: string,
  interaction: {
    hasComment?: boolean
    hasDM?: boolean
    commentId?: string
    dmHistoryId?: string
  }
): Promise<ActionState<SerializedRedditThreadDocument>> {
  console.log("🧵 [UPDATE-INTERACTION] Updating thread interaction:", threadId)
  console.log("🧵 [UPDATE-INTERACTION] Interaction:", interaction)
  
  try {
    const threadRef = doc(db, REDDIT_COLLECTIONS.THREADS, threadId)
    
    const updateData: UpdateRedditThreadData = {
      ...interaction,
      updatedAt: serverTimestamp() as Timestamp
    }
    
    // Add timestamps for interactions
    if (interaction.hasComment) {
      updateData.lastCommentAt = serverTimestamp() as Timestamp
    }
    
    if (interaction.hasDM) {
      updateData.lastDMAt = serverTimestamp() as Timestamp
    }
    
    await updateDoc(threadRef, { ...updateData })
    
    const updatedDoc = await getDoc(threadRef)
    const updatedThread = updatedDoc.data() as RedditThreadDocument
    
    console.log("🧵 [UPDATE-INTERACTION] ✅ Interaction updated, serializing...")
    
    return {
      isSuccess: true,
      message: "Thread interaction updated successfully",
      data: serializeRedditThreadDocument(updatedThread)
    }
  } catch (error) {
    console.error("🧵 [UPDATE-INTERACTION] ❌ Error:", error)
    return {
      isSuccess: false,
      message: `Failed to update interaction: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

// Record a thread interaction
export async function recordThreadInteractionAction(
  data: {
    organizationId: string
    threadId: string
    userId: string
    type: "comment" | "dm" | "view"
    details?: {
      commentId?: string
      dmHistoryId?: string
      status?: string
    }
  }
): Promise<ActionState<SerializedThreadInteractionDocument>> {
  console.log("🧵 [RECORD-INTERACTION] Recording interaction:", data)
  
  try {
    const interactionRef = doc(collection(db, REDDIT_COLLECTIONS.THREAD_INTERACTIONS))
    
    const interactionData: ThreadInteractionDocument = {
      id: interactionRef.id,
      ...data,
      timestamp: serverTimestamp() as Timestamp
    }
    
    await setDoc(interactionRef, interactionData)
    
    console.log("🧵 [RECORD-INTERACTION] ✅ Interaction recorded, serializing...")
    
    return {
      isSuccess: true,
      message: "Interaction recorded successfully",
      data: serializeThreadInteractionDocument(interactionData)
    }
  } catch (error) {
    console.error("🧵 [RECORD-INTERACTION] ❌ Error:", error)
    return {
      isSuccess: false,
      message: `Failed to record interaction: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

// Check if user has already interacted with a thread
export async function checkThreadInteractionAction(
  organizationId: string,
  threadId: string,
  author: string
): Promise<ActionState<{
  hasComment: boolean
  hasDM: boolean
  thread: SerializedRedditThreadDocument | null
}>> {
  console.log("🧵 [CHECK-INTERACTION] Checking interaction for thread:", threadId)
  
  try {
    // Get the thread
    const threadResult = await getRedditThreadByIdAction(threadId)
    
    if (!threadResult.isSuccess || !threadResult.data) {
      return {
        isSuccess: true,
        message: "Thread not found",
        data: {
          hasComment: false,
          hasDM: false,
          thread: null
        }
      }
    }
    
    const thread = threadResult.data
    
    // Check if the thread belongs to this organization
    if (thread.organizationId !== organizationId) {
      return {
        isSuccess: true,
        message: "Thread belongs to different organization",
        data: {
          hasComment: false,
          hasDM: false,
          thread: null
        }
      }
    }
    
    console.log("🧵 [CHECK-INTERACTION] ✅ Interaction status:", {
      hasComment: thread.hasComment,
      hasDM: thread.hasDM
    })
    
    return {
      isSuccess: true,
      message: "Interaction checked successfully",
      data: {
        hasComment: thread.hasComment || false,
        hasDM: thread.hasDM || false,
        thread
      }
    }
  } catch (error) {
    console.error("🧵 [CHECK-INTERACTION] ❌ Error:", error)
    return {
      isSuccess: false,
      message: `Failed to check interaction: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 