"use server"

import { db } from "@/db/db"
import {
  LEAD_COLLECTIONS,
  InboxItemDocument,
  CreateInboxItemData,
  UpdateInboxItemData,
  GeneratedCommentDocument,
  UpdateGeneratedCommentData
} from "@/db/firestore/lead-generation-collections"
import { ActionState, SerializedInboxItemDocument, SerializedGeneratedCommentDocument } from "@/types"
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
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  Timestamp
} from "firebase/firestore"
import { toISOString } from "@/lib/utils/timestamp-utils"
import { fetchRedditCommentRepliesAction } from "@/actions/integrations/reddit/reddit-actions"
import { analyzeSentimentAction, analyzeBatchSentimentAction } from "@/actions/integrations/openai/sentiment-analysis-actions"
import { postCommentToRedditAction } from "@/actions/integrations/reddit/reddit-posting-actions"

// ============================================================================
// SERIALIZATION HELPER FUNCTIONS
// ============================================================================

function serializeInboxItemDocument(item: InboxItemDocument): SerializedInboxItemDocument {
  console.log("📧 [SERIALIZE-INBOX] Serializing inbox item:", item.id)
  
  return {
    id: item.id,
    organizationId: item.organizationId,
    parent_leadify_comment_id: item.parent_leadify_comment_id,
    parent_reddit_comment_id: item.parent_reddit_comment_id,
    reddit_thread_id: item.reddit_thread_id,
    author: item.author,
    body: item.body,
    created_utc: item.created_utc,
    permalink: item.permalink,
    sentiment: item.sentiment,
    status: item.status,
    notes: item.notes,
    fetched_at: toISOString(item.fetched_at) || new Date().toISOString(),
    score: item.score,
    depth: item.depth,
    our_response_id: item.our_response_id,
    responded_at: item.responded_at ? (toISOString(item.responded_at) || undefined) : undefined,
    createdAt: toISOString(item.createdAt) || new Date().toISOString(),
    updatedAt: toISOString(item.updatedAt) || new Date().toISOString()
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

// ============================================================================
// INBOX ITEM CRUD ACTIONS
// ============================================================================

export async function createInboxItemAction(
  data: CreateInboxItemData & { id?: string }
): Promise<ActionState<SerializedInboxItemDocument>> {
  try {
    console.log(`\n📧 [CREATE-INBOX-ITEM] ====== CREATING INBOX ITEM ======`)
    console.log(`📧 [CREATE-INBOX-ITEM] Parent Comment ID: ${data.parent_leadify_comment_id}`)
    console.log(`📧 [CREATE-INBOX-ITEM] Reddit Author: ${data.author}`)
    console.log(`📧 [CREATE-INBOX-ITEM] Organization: ${data.organizationId}`)

    // Use the provided ID or generate a new one
    const documentId = data.id || doc(collection(db, LEAD_COLLECTIONS.INBOX_ITEMS)).id
    const inboxRef = doc(db, LEAD_COLLECTIONS.INBOX_ITEMS, documentId)
    console.log(`📧 [CREATE-INBOX-ITEM] Using doc ID: ${inboxRef.id}`)

    const inboxData: Omit<InboxItemDocument, "createdAt" | "updatedAt" | "id"> = {
      organizationId: data.organizationId,
      parent_leadify_comment_id: data.parent_leadify_comment_id,
      parent_reddit_comment_id: data.parent_reddit_comment_id,
      reddit_thread_id: data.reddit_thread_id,
      author: data.author,
      body: data.body,
      created_utc: data.created_utc,
      permalink: data.permalink,
      sentiment: data.sentiment,
      status: "unread", // Default status
      fetched_at: serverTimestamp() as any,
      score: data.score,
      depth: data.depth
    }

    const finalInboxData = {
      id: inboxRef.id,
      ...inboxData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    console.log(`📧 [CREATE-INBOX-ITEM] Writing to Firestore...`)
    await setDoc(inboxRef, removeUndefinedValues(finalInboxData))
    console.log(`✅ [CREATE-INBOX-ITEM] Successfully wrote to Firestore`)

    const createdDoc = await getDoc(inboxRef)
    if (!createdDoc.exists()) {
      console.error(`❌ [CREATE-INBOX-ITEM] Document not found after creation!`)
      return {
        isSuccess: false,
        message: "Document not found after creation"
      }
    }

    console.log(`✅ [CREATE-INBOX-ITEM] Verified document exists in Firestore`)
    console.log(`📧 [CREATE-INBOX-ITEM] ====== INBOX ITEM CREATION COMPLETE ======\n`)

    return {
      isSuccess: true,
      message: "Inbox item created successfully",
      data: serializeInboxItemDocument(createdDoc.data() as InboxItemDocument)
    }
  } catch (error) {
    console.error("❌ [CREATE-INBOX-ITEM] Error creating inbox item:", error)
    return { 
      isSuccess: false, 
      message: `Failed to create inbox item: ${error instanceof Error ? error.message : "Unknown error"}` 
    }
  }
}

export async function getInboxItemsByOrganizationAction(
  organizationId: string,
  options?: {
    status?: "unread" | "read" | "action_needed" | "archived" | "replied"
    limit?: number
    parentCommentId?: string
  }
): Promise<ActionState<SerializedInboxItemDocument[]>> {
  try {
    console.log(`\n📧 [GET-INBOX-ITEMS] ====== FETCHING INBOX ITEMS ======`)
    console.log(`📧 [GET-INBOX-ITEMS] Organization: ${organizationId}`)
    console.log(`📧 [GET-INBOX-ITEMS] Status filter: ${options?.status || "all"}`)
    console.log(`📧 [GET-INBOX-ITEMS] Limit: ${options?.limit || "none"}`)

    const inboxRef = collection(db, LEAD_COLLECTIONS.INBOX_ITEMS)
    let q = query(
      inboxRef, 
      where("organizationId", "==", organizationId),
      orderBy("created_utc", "desc")
    )

    if (options?.status) {
      q = query(
        inboxRef,
        where("organizationId", "==", organizationId),
        where("status", "==", options.status),
        orderBy("created_utc", "desc")
      )
    }

    if (options?.parentCommentId) {
      q = query(
        inboxRef,
        where("organizationId", "==", organizationId),
        where("parent_leadify_comment_id", "==", options.parentCommentId),
        orderBy("created_utc", "desc")
      )
    }

    if (options?.limit) {
      q = query(q, limit(options.limit))
    }

    console.log(`📧 [GET-INBOX-ITEMS] Executing Firestore query...`)
    const querySnapshot = await getDocs(q)
    console.log(`📧 [GET-INBOX-ITEMS] Query returned ${querySnapshot.docs.length} documents`)

    const inboxItems = querySnapshot.docs.map(doc => 
      serializeInboxItemDocument(doc.data() as InboxItemDocument)
    )

    console.log(`✅ [GET-INBOX-ITEMS] Successfully fetched inbox items`)
    console.log(`📧 [GET-INBOX-ITEMS] ====== FETCH COMPLETE ======\n`)

    return {
      isSuccess: true,
      message: `Successfully fetched ${inboxItems.length} inbox items`,
      data: inboxItems
    }
  } catch (error) {
    console.error("❌ [GET-INBOX-ITEMS] Error fetching inbox items:", error)
    return { 
      isSuccess: false, 
      message: `Failed to fetch inbox items: ${error instanceof Error ? error.message : "Unknown error"}` 
    }
  }
}

export async function updateInboxItemStatusAction(
  inboxItemId: string,
  updates: UpdateInboxItemData
): Promise<ActionState<SerializedInboxItemDocument>> {
  try {
    console.log(`\n📧 [UPDATE-INBOX-ITEM] ====== UPDATING INBOX ITEM ======`)
    console.log(`📧 [UPDATE-INBOX-ITEM] Item ID: ${inboxItemId}`)
    console.log(`📧 [UPDATE-INBOX-ITEM] Updates:`, updates)

    const inboxRef = doc(db, LEAD_COLLECTIONS.INBOX_ITEMS, inboxItemId)
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    }

    console.log(`📧 [UPDATE-INBOX-ITEM] Writing updates to Firestore...`)
    await updateDoc(inboxRef, removeUndefinedValues(updateData))
    console.log(`✅ [UPDATE-INBOX-ITEM] Successfully updated Firestore`)

    const updatedDoc = await getDoc(inboxRef)
    if (!updatedDoc.exists()) {
      console.error(`❌ [UPDATE-INBOX-ITEM] Document not found after update!`)
      return {
        isSuccess: false,
        message: "Inbox item not found"
      }
    }

    console.log(`✅ [UPDATE-INBOX-ITEM] Verified document exists after update`)
    console.log(`📧 [UPDATE-INBOX-ITEM] ====== UPDATE COMPLETE ======\n`)

    return {
      isSuccess: true,
      message: "Inbox item updated successfully",
      data: serializeInboxItemDocument(updatedDoc.data() as InboxItemDocument)
    }
  } catch (error) {
    console.error("❌ [UPDATE-INBOX-ITEM] Error updating inbox item:", error)
    return { 
      isSuccess: false, 
      message: `Failed to update inbox item: ${error instanceof Error ? error.message : "Unknown error"}` 
    }
  }
}

export async function deleteInboxItemAction(
  inboxItemId: string
): Promise<ActionState<void>> {
  try {
    console.log(`\n📧 [DELETE-INBOX-ITEM] ====== DELETING INBOX ITEM ======`)
    console.log(`📧 [DELETE-INBOX-ITEM] Item ID: ${inboxItemId}`)

    const inboxRef = doc(db, LEAD_COLLECTIONS.INBOX_ITEMS, inboxItemId)
    
    console.log(`📧 [DELETE-INBOX-ITEM] Deleting from Firestore...`)
    await deleteDoc(inboxRef)
    console.log(`✅ [DELETE-INBOX-ITEM] Successfully deleted from Firestore`)

    console.log(`📧 [DELETE-INBOX-ITEM] ====== DELETE COMPLETE ======\n`)

    return {
      isSuccess: true,
      message: "Inbox item deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("❌ [DELETE-INBOX-ITEM] Error deleting inbox item:", error)
    return { 
      isSuccess: false, 
      message: `Failed to delete inbox item: ${error instanceof Error ? error.message : "Unknown error"}` 
    }
  }
}

// ============================================================================
// REPLY MANAGEMENT ACTIONS
// ============================================================================

export async function fetchAndStoreRepliesForLeadifyCommentAction(
  leadifyCommentId: string,
  organizationId: string
): Promise<ActionState<{ newRepliesCount: number; totalRepliesCount: number }>> {
  try {
    console.log(`\n📧 [FETCH-REPLIES] ====== FETCHING REPLIES FOR COMMENT ======`)
    console.log(`📧 [FETCH-REPLIES] Leadify Comment ID: ${leadifyCommentId}`)
    console.log(`📧 [FETCH-REPLIES] Organization: ${organizationId}`)

    // Get the generated comment to find its Reddit comment ID and URL
    const commentRef = doc(db, LEAD_COLLECTIONS.GENERATED_COMMENTS, leadifyCommentId)
    const commentDoc = await getDoc(commentRef)
    
    if (!commentDoc.exists()) {
      console.error(`❌ [FETCH-REPLIES] Generated comment not found: ${leadifyCommentId}`)
      return {
        isSuccess: false,
        message: "Generated comment not found"
      }
    }

    const commentData = commentDoc.data() as GeneratedCommentDocument
    console.log(`📧 [FETCH-REPLIES] Found comment: ${commentData.postTitle}`)
    console.log(`📧 [FETCH-REPLIES] Posted URL: ${commentData.postedCommentUrl}`)

    if (!commentData.postedCommentUrl) {
      console.error(`❌ [FETCH-REPLIES] Comment has no posted URL`)
      return {
        isSuccess: false,
        message: "Comment has no posted URL - cannot fetch replies"
      }
    }

    // Extract Reddit comment ID from the URL for tracking
    const redditCommentId = commentData.postedCommentUrl.match(/\/([^\/]+)\/?$/)?.[1]
    console.log(`📧 [FETCH-REPLIES] Extracted Reddit comment ID: ${redditCommentId}`)

    // Fetch replies from Reddit
    console.log(`📧 [FETCH-REPLIES] Fetching replies from Reddit...`)
    const repliesResult = await fetchRedditCommentRepliesAction(
      organizationId,
      commentData.postedCommentUrl
    )

    if (!repliesResult.isSuccess) {
      console.error(`❌ [FETCH-REPLIES] Failed to fetch replies: ${repliesResult.message}`)
      
      // Update the comment with failed fetch attempt
      await updateDoc(commentRef, {
        last_reply_fetch_at: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      return {
        isSuccess: false,
        message: `Failed to fetch replies from Reddit: ${repliesResult.message}`
      }
    }

    const replies = repliesResult.data
    console.log(`📧 [FETCH-REPLIES] Found ${replies.length} replies from Reddit`)

    if (replies.length === 0) {
      // Update comment with successful but empty fetch
      await updateDoc(commentRef, {
        last_reply_fetch_at: serverTimestamp(),
        unread_reply_count: 0,
        updatedAt: serverTimestamp()
      })

      return {
        isSuccess: true,
        message: "No new replies found",
        data: { newRepliesCount: 0, totalRepliesCount: 0 }
      }
    }

    // Get existing inbox items to avoid duplicates
    const existingItemsQuery = query(
      collection(db, LEAD_COLLECTIONS.INBOX_ITEMS),
      where("parent_leadify_comment_id", "==", leadifyCommentId)
    )
    const existingItemsSnapshot = await getDocs(existingItemsQuery)
    const existingIds = new Set(existingItemsSnapshot.docs.map(doc => doc.id))

    console.log(`📧 [FETCH-REPLIES] Found ${existingIds.size} existing inbox items`)

    // Filter out replies that already exist
    const newReplies = replies.filter(reply => !existingIds.has(reply.id))
    console.log(`📧 [FETCH-REPLIES] ${newReplies.length} new replies to process`)

    if (newReplies.length === 0) {
      // Update comment with successful fetch but no new replies
      await updateDoc(commentRef, {
        last_reply_fetch_at: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      return {
        isSuccess: true,
        message: "No new replies found",
        data: { newRepliesCount: 0, totalRepliesCount: replies.length }
      }
    }

    // Analyze sentiment for new replies
    console.log(`📧 [FETCH-REPLIES] Analyzing sentiment for ${newReplies.length} new replies...`)
    const sentimentItems = newReplies.map(reply => ({
      id: reply.id,
      text: reply.body,
      context: {
        author: reply.author,
        originalComment: commentData[(commentData.selectedLength || "medium") + "Comment" as keyof GeneratedCommentDocument] as string,
        subreddit: commentData.postUrl?.match(/r\/([^/]+)/)?.[1]
      }
    }))

    const sentimentResult = await analyzeBatchSentimentAction(sentimentItems)
    const sentimentMap = new Map()
    
    if (sentimentResult.isSuccess) {
      sentimentResult.data.forEach(item => {
        sentimentMap.set(item.id, item.sentiment.sentiment)
      })
      console.log(`✅ [FETCH-REPLIES] Sentiment analysis completed for ${sentimentResult.data.length} replies`)
    } else {
      console.warn(`⚠️ [FETCH-REPLIES] Sentiment analysis failed: ${sentimentResult.message}`)
    }

    // Create inbox items for new replies
    console.log(`📧 [FETCH-REPLIES] Creating inbox items for ${newReplies.length} new replies...`)
    const batch = writeBatch(db)
    let actionRequiredCount = 0
    let unreadCount = 0

    for (const reply of newReplies) {
      const sentiment = sentimentMap.get(reply.id) || "neutral"
      const inboxItemRef = doc(db, LEAD_COLLECTIONS.INBOX_ITEMS, reply.id)
      
      // Determine status based on sentiment and content
      let status: "unread" | "action_needed" = "unread"
      if (sentiment === "negative" || reply.body.toLowerCase().includes("complaint") || 
          reply.body.toLowerCase().includes("problem") || reply.body.toLowerCase().includes("issue")) {
        status = "action_needed"
        actionRequiredCount++
      } else {
        unreadCount++
      }

      // Build permalink URL - Reddit comments might not have direct permalink
      const replyPermalink = `https://reddit.com/r/${commentData.postUrl?.match(/r\/([^/]+)/)?.[1] || 'unknown'}/comments/${commentData.threadId.replace('t3_', '')}/_/${reply.id}/`

      const inboxItemData: Omit<InboxItemDocument, "createdAt" | "updatedAt"> = {
        id: reply.id,
        organizationId,
        parent_leadify_comment_id: leadifyCommentId,
        parent_reddit_comment_id: redditCommentId || commentData.reddit_comment_id || "unknown",
        reddit_thread_id: commentData.threadId,
        author: reply.author,
        body: reply.body,
        created_utc: reply.created_utc || reply.createdUtc || 0,
        permalink: replyPermalink,
        sentiment,
        status,
        fetched_at: serverTimestamp() as any,
        score: reply.score,
        depth: reply.depth || 0
      }

      batch.set(inboxItemRef, {
        ...removeUndefinedValues(inboxItemData),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    }

    // Update the parent comment with reply information
    const latestReply = newReplies.sort((a, b) => (b.created_utc || b.createdUtc || 0) - (a.created_utc || a.createdUtc || 0))[0]
    const commentUpdates: UpdateGeneratedCommentData = {
      reddit_comment_id: redditCommentId,
      last_reply_fetch_at: serverTimestamp() as any,
      unread_reply_count: (commentData.unread_reply_count || 0) + newReplies.length,
      last_reply_author: latestReply.author,
      last_reply_snippet: latestReply.body.substring(0, 100) + (latestReply.body.length > 100 ? "..." : ""),
      last_reply_timestamp: Timestamp.fromDate(new Date((latestReply.created_utc || latestReply.createdUtc || 0) * 1000)),
      lead_interaction_status: actionRequiredCount > 0 ? "pending_reply" : "new"
    }

    batch.update(commentRef, removeUndefinedValues(commentUpdates))

    console.log(`📧 [FETCH-REPLIES] Committing batch operations...`)
    await batch.commit()
    console.log(`✅ [FETCH-REPLIES] Successfully created ${newReplies.length} inbox items`)

    console.log(`📧 [FETCH-REPLIES] ====== REPLY FETCHING COMPLETE ======\n`)

    return {
      isSuccess: true,
      message: `Successfully fetched and stored ${newReplies.length} new replies`,
      data: { 
        newRepliesCount: newReplies.length, 
        totalRepliesCount: replies.length 
      }
    }
  } catch (error) {
    console.error("❌ [FETCH-REPLIES] Error fetching and storing replies:", error)
    return { 
      isSuccess: false, 
      message: `Failed to fetch and store replies: ${error instanceof Error ? error.message : "Unknown error"}` 
    }
  }
}

export async function replyToInboxItemAction(
  organizationId: string,
  inboxItemId: string,
  replyText: string
): Promise<ActionState<{ commentId: string; commentUrl: string }>> {
  try {
    console.log(`\n📧 [REPLY-TO-INBOX] ====== REPLYING TO INBOX ITEM ======`)
    console.log(`📧 [REPLY-TO-INBOX] Inbox Item ID: ${inboxItemId}`)
    console.log(`📧 [REPLY-TO-INBOX] Organization: ${organizationId}`)
    console.log(`📧 [REPLY-TO-INBOX] Reply length: ${replyText.length}`)

    // Get the inbox item
    const inboxRef = doc(db, LEAD_COLLECTIONS.INBOX_ITEMS, inboxItemId)
    const inboxDoc = await getDoc(inboxRef)
    
    if (!inboxDoc.exists()) {
      console.error(`❌ [REPLY-TO-INBOX] Inbox item not found: ${inboxItemId}`)
      return {
        isSuccess: false,
        message: "Inbox item not found"
      }
    }

    const inboxItem = inboxDoc.data() as InboxItemDocument
    console.log(`📧 [REPLY-TO-INBOX] Found inbox item from u/${inboxItem.author}`)

    // The parent Reddit comment ID should be the ID of the reply we're responding to
    const parentId = `t1_${inboxItemId}` // Reddit comment ID format

    console.log(`📧 [REPLY-TO-INBOX] Posting reply to Reddit...`)
    console.log(`📧 [REPLY-TO-INBOX] Parent ID: ${parentId}`)

    // Post the reply to Reddit
    const postResult = await postCommentToRedditAction({
      organizationId,
      parentId,
      text: replyText
    })

    if (!postResult.isSuccess) {
      console.error(`❌ [REPLY-TO-INBOX] Failed to post reply: ${postResult.message}`)
      return postResult
    }

    console.log(`✅ [REPLY-TO-INBOX] Reply posted successfully: ${postResult.data.link}`)

    // Update the inbox item to mark it as replied
    const updateData: UpdateInboxItemData = {
      status: "replied",
      our_response_id: postResult.data.id,
      responded_at: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any
    }

    await updateDoc(inboxRef, removeUndefinedValues(updateData))
    console.log(`✅ [REPLY-TO-INBOX] Updated inbox item status to 'replied'`)

    // Update the parent Leadify comment's interaction status
    const parentCommentRef = doc(db, LEAD_COLLECTIONS.GENERATED_COMMENTS, inboxItem.parent_leadify_comment_id)
    await updateDoc(parentCommentRef, {
      lead_interaction_status: "followed_up",
      updatedAt: serverTimestamp()
    })
    console.log(`✅ [REPLY-TO-INBOX] Updated parent comment interaction status`)

    console.log(`📧 [REPLY-TO-INBOX] ====== REPLY COMPLETE ======\n`)

    return {
      isSuccess: true,
      message: "Reply posted successfully",
      data: {
        commentId: postResult.data.id,
        commentUrl: postResult.data.link
      }
    }
  } catch (error) {
    console.error("❌ [REPLY-TO-INBOX] Error replying to inbox item:", error)
    return { 
      isSuccess: false, 
      message: `Failed to reply to inbox item: ${error instanceof Error ? error.message : "Unknown error"}` 
    }
  }
}

// ============================================================================
// BATCH SYNC ACTIONS
// ============================================================================

export async function syncAllActiveCommentsRepliesAction(
  organizationId: string,
  options?: {
    maxCommentsToProcess?: number
    onlyOlderThan?: number // minutes
  }
): Promise<ActionState<{ 
  commentsProcessed: number
  totalNewReplies: number
  errors: string[]
}>> {
  try {
    console.log(`\n📧 [SYNC-ALL-REPLIES] ====== SYNCING ALL ACTIVE COMMENTS ======`)
    console.log(`📧 [SYNC-ALL-REPLIES] Organization: ${organizationId}`)
    console.log(`📧 [SYNC-ALL-REPLIES] Max comments: ${options?.maxCommentsToProcess || "unlimited"}`)
    console.log(`📧 [SYNC-ALL-REPLIES] Only older than: ${options?.onlyOlderThan || 15} minutes`)

    // Get posted comments that need reply checking
    const commentsRef = collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS)
    
    // Calculate cutoff time for last fetch
    const cutoffMinutes = options?.onlyOlderThan || 15
    const cutoffTime = Timestamp.fromDate(new Date(Date.now() - cutoffMinutes * 60 * 1000))
    
    let q = query(
      commentsRef,
      where("organizationId", "==", organizationId),
      where("status", "==", "posted"),
      orderBy("last_reply_fetch_at", "asc")
    )

    if (options?.maxCommentsToProcess) {
      q = query(q, limit(options.maxCommentsToProcess))
    }

    console.log(`📧 [SYNC-ALL-REPLIES] Fetching posted comments...`)
    const commentsSnapshot = await getDocs(q)
    const comments = commentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as (GeneratedCommentDocument & { id: string })[]

    console.log(`📧 [SYNC-ALL-REPLIES] Found ${comments.length} posted comments`)

    // Filter comments that need checking (either never checked or old enough)
    const commentsToCheck = comments.filter(comment => 
      !comment.last_reply_fetch_at || 
      comment.last_reply_fetch_at.toDate() < cutoffTime.toDate()
    )

    console.log(`📧 [SYNC-ALL-REPLIES] ${commentsToCheck.length} comments need reply checking`)

    if (commentsToCheck.length === 0) {
      return {
        isSuccess: true,
        message: "No comments need reply checking at this time",
        data: {
          commentsProcessed: 0,
          totalNewReplies: 0,
          errors: []
        }
      }
    }

    let commentsProcessed = 0
    let totalNewReplies = 0
    const errors: string[] = []

    // Process comments in small batches to avoid overwhelming Reddit API
    const batchSize = 3
    for (let i = 0; i < commentsToCheck.length; i += batchSize) {
      const batch = commentsToCheck.slice(i, i + batchSize)
      
      console.log(`📧 [SYNC-ALL-REPLIES] Processing batch ${Math.floor(i / batchSize) + 1}`)
      
      const batchPromises = batch.map(async comment => {
        try {
          console.log(`📧 [SYNC-ALL-REPLIES] Checking replies for comment: ${comment.postTitle}`)
          
          const result = await fetchAndStoreRepliesForLeadifyCommentAction(
            comment.id,
            organizationId
          )
          
          if (result.isSuccess) {
            commentsProcessed++
            totalNewReplies += result.data.newRepliesCount
            console.log(`✅ [SYNC-ALL-REPLIES] Found ${result.data.newRepliesCount} new replies for comment ${comment.id}`)
          } else {
            errors.push(`Comment ${comment.id}: ${result.message}`)
            console.error(`❌ [SYNC-ALL-REPLIES] Failed to check comment ${comment.id}: ${result.message}`)
          }
        } catch (error) {
          const errorMsg = `Comment ${comment.id}: ${error instanceof Error ? error.message : "Unknown error"}`
          errors.push(errorMsg)
          console.error(`❌ [SYNC-ALL-REPLIES] Error checking comment ${comment.id}:`, error)
        }
      })
      
      await Promise.all(batchPromises)
      
      // Rate limiting: wait between batches
      if (i + batchSize < commentsToCheck.length) {
        console.log(`📧 [SYNC-ALL-REPLIES] Waiting 5 seconds before next batch...`)
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }

    console.log(`📧 [SYNC-ALL-REPLIES] ====== SYNC COMPLETE ======`)
    console.log(`📧 [SYNC-ALL-REPLIES] Comments processed: ${commentsProcessed}`)
    console.log(`📧 [SYNC-ALL-REPLIES] Total new replies: ${totalNewReplies}`)
    console.log(`📧 [SYNC-ALL-REPLIES] Errors: ${errors.length}`)

    return {
      isSuccess: true,
      message: `Sync completed: ${commentsProcessed} comments processed, ${totalNewReplies} new replies found`,
      data: {
        commentsProcessed,
        totalNewReplies,
        errors
      }
    }
  } catch (error) {
    console.error("❌ [SYNC-ALL-REPLIES] Error in sync process:", error)
    return { 
      isSuccess: false, 
      message: `Failed to sync replies: ${error instanceof Error ? error.message : "Unknown error"}` 
    }
  }
} 