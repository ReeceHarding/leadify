"use server"

import { db } from "@/db/db"
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp
} from "firebase/firestore"
import { ActionState } from "@/types"
import { postCommentAndUpdateStatusAction } from "./reddit-posting-actions"
import { POSTING_QUEUE_COLLECTIONS } from "@/db/firestore/posting-queue-collections"

// Constants for rate limiting
const MIN_DELAY_MINUTES = 5
const MAX_DELAY_MINUTES = 7
const RATE_LIMIT_COLLECTION = POSTING_QUEUE_COLLECTIONS.REDDIT_RATE_LIMITS

interface RateLimitData {
  userId: string
  lastPostTime: Timestamp
  postsInLastHour: number
  updatedAt: Timestamp
}

interface QueueItem {
  leadId: string
  threadId: string
  comment: string
  priority: number
  scheduledFor: Timestamp
  retryCount: number
  status: "pending" | "processing" | "completed" | "failed"
}

/**
 * Get the next allowed posting time for a user
 */
async function getNextAllowedPostTime(userId: string): Promise<Date> {
  console.log(`🕐 [RATE-LIMIT] Checking rate limit for user: ${userId}`)

  try {
    const rateLimitRef = doc(db, RATE_LIMIT_COLLECTION, userId)
    const rateLimitDoc = await getDoc(rateLimitRef)

    if (!rateLimitDoc.exists()) {
      console.log(
        `🆕 [RATE-LIMIT] No rate limit record found, user can post immediately`
      )
      return new Date() // First post, can post immediately
    }

    const data = rateLimitDoc.data() as RateLimitData
    const lastPostTime = data.lastPostTime.toDate()

    // Calculate minimum time for next post (5-7 minutes randomized)
    const randomDelayMinutes =
      MIN_DELAY_MINUTES +
      Math.random() * (MAX_DELAY_MINUTES - MIN_DELAY_MINUTES)
    const nextAllowedTime = new Date(
      lastPostTime.getTime() + randomDelayMinutes * 60 * 1000
    )

    console.log(`📊 [RATE-LIMIT] Last post: ${lastPostTime.toISOString()}`)
    console.log(
      `📊 [RATE-LIMIT] Random delay: ${randomDelayMinutes.toFixed(2)} minutes`
    )
    console.log(
      `📊 [RATE-LIMIT] Next allowed: ${nextAllowedTime.toISOString()}`
    )

    return nextAllowedTime
  } catch (error) {
    console.error(`❌ [RATE-LIMIT] Error checking rate limit:`, error)
    // On error, be conservative and wait the full time
    return new Date(Date.now() + MAX_DELAY_MINUTES * 60 * 1000)
  }
}

/**
 * Update the rate limit record after a successful post
 */
async function updateRateLimit(userId: string): Promise<void> {
  console.log(`📝 [RATE-LIMIT] Updating rate limit for user: ${userId}`)

  try {
    const rateLimitRef = doc(db, RATE_LIMIT_COLLECTION, userId)
    const rateLimitDoc = await getDoc(rateLimitRef)

    if (!rateLimitDoc.exists()) {
      // Create new rate limit record
      await setDoc(rateLimitRef, {
        userId,
        lastPostTime: serverTimestamp(),
        postsInLastHour: 1,
        updatedAt: serverTimestamp()
      })
    } else {
      // Update existing record
      const data = rateLimitDoc.data() as RateLimitData
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const lastPostTime = data.lastPostTime.toDate()

      // Reset hourly counter if last post was more than an hour ago
      const postsInLastHour =
        lastPostTime < hourAgo ? 1 : data.postsInLastHour + 1

      await updateDoc(rateLimitRef, {
        lastPostTime: serverTimestamp(),
        postsInLastHour,
        updatedAt: serverTimestamp()
      })

      console.log(
        `✅ [RATE-LIMIT] Updated: ${postsInLastHour} posts in last hour`
      )
    }
  } catch (error) {
    console.error(`❌ [RATE-LIMIT] Error updating rate limit:`, error)
  }
}

/**
 * Process a single post with rate limiting
 */
export async function processPostWithRateLimit(
  userId: string,
  leadId: string,
  threadId: string,
  comment: string
): Promise<ActionState<{ link?: string; waitTime?: number }>> {
  console.log(`🚀 [POST-QUEUE] Processing post for lead: ${leadId}`)

  try {
    // Check rate limit
    const nextAllowedTime = await getNextAllowedPostTime(userId)
    const now = new Date()

    if (nextAllowedTime > now) {
      const waitTimeMs = nextAllowedTime.getTime() - now.getTime()
      const waitTimeMinutes = Math.ceil(waitTimeMs / 60000)

      console.log(
        `⏳ [POST-QUEUE] Rate limited. Must wait ${waitTimeMinutes} minutes`
      )

      return {
        isSuccess: false,
        message: `Rate limited. Please wait ${waitTimeMinutes} minutes before posting again.`
      }
    }

    // Post the comment
    const result = await postCommentAndUpdateStatusAction(
      leadId,
      threadId,
      comment
    )

    if (result.isSuccess) {
      // Update rate limit on successful post
      await updateRateLimit(userId)
      console.log(
        `✅ [POST-QUEUE] Successfully posted comment for lead: ${leadId}`
      )

      return {
        isSuccess: true,
        message: "Comment posted successfully",
        data: { link: result.data?.link }
      }
    } else {
      console.error(`❌ [POST-QUEUE] Failed to post comment: ${result.message}`)
      return result
    }
  } catch (error) {
    console.error(`❌ [POST-QUEUE] Error processing post:`, error)
    return {
      isSuccess: false,
      message: "Failed to process post"
    }
  }
}

/**
 * Queue multiple posts for async processing with rate limiting
 */
export async function queuePostsForAsyncProcessing(
  userId: string,
  posts: Array<{ leadId: string; threadId: string; comment: string }>
): Promise<ActionState<{ queuedCount: number; estimatedTime: number }>> {
  console.log(
    `📋 [POST-QUEUE] Queueing ${posts.length} posts for user: ${userId}`
  )

  try {
    const nextAllowedTime = await getNextAllowedPostTime(userId)
    let scheduledTime = new Date(
      Math.max(nextAllowedTime.getTime(), Date.now())
    )

    const queueCollection = collection(
      db,
      POSTING_QUEUE_COLLECTIONS.POSTING_QUEUE
    )
    let queuedCount = 0

    for (const post of posts) {
      // Add to queue with scheduled time
      const queueItem: QueueItem = {
        leadId: post.leadId,
        threadId: post.threadId,
        comment: post.comment,
        priority: 0,
        scheduledFor: Timestamp.fromDate(scheduledTime),
        retryCount: 0,
        status: "pending"
      }

      await setDoc(doc(queueCollection), {
        ...queueItem,
        userId,
        createdAt: serverTimestamp()
      })

      queuedCount++

      // Schedule next post with randomized delay
      const delayMinutes =
        MIN_DELAY_MINUTES +
        Math.random() * (MAX_DELAY_MINUTES - MIN_DELAY_MINUTES)
      scheduledTime = new Date(
        scheduledTime.getTime() + delayMinutes * 60 * 1000
      )
    }

    // Calculate total estimated time
    const totalMinutes = Math.ceil(
      (scheduledTime.getTime() - Date.now()) / 60000
    )

    console.log(
      `✅ [POST-QUEUE] Queued ${queuedCount} posts. Estimated completion: ${totalMinutes} minutes`
    )

    return {
      isSuccess: true,
      message: `Queued ${queuedCount} posts for processing`,
      data: {
        queuedCount,
        estimatedTime: totalMinutes
      }
    }
  } catch (error) {
    console.error(`❌ [POST-QUEUE] Error queueing posts:`, error)
    return {
      isSuccess: false,
      message: "Failed to queue posts"
    }
  }
}

/**
 * Get posting queue status for a user
 */
export async function getPostingQueueStatus(
  userId: string
): Promise<
  ActionState<{
    pending: number
    processing: number
    completed: number
    failed: number
    nextPostTime?: Date
  }>
> {
  try {
    const queueCollection = collection(
      db,
      POSTING_QUEUE_COLLECTIONS.POSTING_QUEUE
    )
    const q = query(
      queueCollection,
      where("userId", "==", userId),
      where("status", "!=", "completed"),
      orderBy("scheduledFor", "asc")
    )

    const snapshot = await getDocs(q)
    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    }

    snapshot.docs.forEach(doc => {
      const data = doc.data() as QueueItem
      stats[data.status]++
    })

    // Get next allowed post time
    const nextAllowedTime = await getNextAllowedPostTime(userId)

    return {
      isSuccess: true,
      message: "Queue status retrieved",
      data: {
        ...stats,
        nextPostTime: nextAllowedTime
      }
    }
  } catch (error) {
    console.error(`❌ [POST-QUEUE] Error getting queue status:`, error)
    return {
      isSuccess: false,
      message: "Failed to get queue status"
    }
  }
}
