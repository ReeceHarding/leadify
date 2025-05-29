/*
<ai_context>
Database actions for unified cross-organization posting queue management.
Handles Reddit accounts, queue items, settings, and advanced scheduling.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import {
  UNIFIED_QUEUE_COLLECTIONS,
  RedditAccountDocument,
  UnifiedPostQueueDocument,
  QueueSettingsDocument,
  PostingScheduleDocument,
  SerializedRedditAccountDocument,
  SerializedUnifiedPostQueueDocument,
  SerializedQueueSettingsDocument,
  SerializedPostingScheduleDocument,
  CreateRedditAccountData,
  UpdateRedditAccountData,
  CreateUnifiedPostQueueData,
  UpdateUnifiedPostQueueData,
  CreateQueueSettingsData,
  UpdateQueueSettingsData
} from "@/db/schema"
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
  Timestamp,
  orderBy,
  limit,
  writeBatch
} from "firebase/firestore"
import { removeUndefinedValues } from "@/lib/firebase-utils"
import { toISOString } from "@/lib/utils/timestamp-utils"

console.log("🔧🔧🔧 [UNIFIED-QUEUE-ACTIONS] Actions loaded")

// Serialization helpers
function serializeTimestamp(timestamp: any): string {
  return toISOString(timestamp) || new Date().toISOString()
}

function serializeRedditAccount(account: RedditAccountDocument): SerializedRedditAccountDocument {
  return {
    ...account,
    lastPostAt: account.lastPostAt ? serializeTimestamp(account.lastPostAt) : undefined,
    nextScheduledPost: account.nextScheduledPost ? serializeTimestamp(account.nextScheduledPost) : undefined,
    createdAt: serializeTimestamp(account.createdAt),
    updatedAt: serializeTimestamp(account.updatedAt)
  }
}

function serializeUnifiedPostQueue(post: UnifiedPostQueueDocument): SerializedUnifiedPostQueueDocument {
  return {
    ...post,
    scheduledFor: serializeTimestamp(post.scheduledFor),
    createdAt: serializeTimestamp(post.createdAt),
    updatedAt: serializeTimestamp(post.updatedAt),
    postedAt: post.postedAt ? serializeTimestamp(post.postedAt) : undefined
  }
}

function serializeQueueSettings(settings: QueueSettingsDocument): SerializedQueueSettingsDocument {
  return {
    ...settings,
    createdAt: serializeTimestamp(settings.createdAt),
    updatedAt: serializeTimestamp(settings.updatedAt)
  }
}

function serializePostingSchedule(schedule: PostingScheduleDocument): SerializedPostingScheduleDocument {
  return {
    ...schedule,
    createdAt: serializeTimestamp(schedule.createdAt),
    updatedAt: serializeTimestamp(schedule.updatedAt)
  }
}

// Reddit Account Management
export async function createOrUpdateRedditAccountAction(
  data: CreateRedditAccountData
): Promise<ActionState<SerializedRedditAccountDocument>> {
  try {
    console.log("🔧 [UNIFIED-QUEUE] Creating/updating Reddit account:", data.redditUsername)
    
    const accountRef = doc(db, UNIFIED_QUEUE_COLLECTIONS.REDDIT_ACCOUNTS, data.redditUsername)
    const existingDoc = await getDoc(accountRef)
    
    if (existingDoc.exists()) {
      // Update existing account by adding organization ID if not present
      const existing = existingDoc.data() as RedditAccountDocument
      const updatedOrgIds = [...new Set([...existing.organizationIds, ...data.organizationIds])]
      
      const updateData = {
        organizationIds: updatedOrgIds,
        isActive: data.isActive ?? existing.isActive,
        updatedAt: serverTimestamp() as any
      }
      
      await updateDoc(accountRef, removeUndefinedValues(updateData))
      
      const updatedDoc = await getDoc(accountRef)
      const result = updatedDoc.data() as RedditAccountDocument
      
      console.log("✅ [UNIFIED-QUEUE] Reddit account updated:", result.redditUsername)
      return {
        isSuccess: true,
        message: "Reddit account updated successfully",
        data: serializeRedditAccount(result)
      }
    } else {
      // Create new account
      const accountData: RedditAccountDocument = {
        id: data.redditUsername,
        redditUsername: data.redditUsername,
        organizationIds: data.organizationIds,
        isActive: data.isActive ?? true,
        currentQueueLength: 0,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any
      }
      
      await setDoc(accountRef, accountData)
      
      console.log("✅ [UNIFIED-QUEUE] Reddit account created:", accountData.redditUsername)
      return {
        isSuccess: true,
        message: "Reddit account created successfully",
        data: serializeRedditAccount(accountData)
      }
    }
  } catch (error) {
    console.error("❌ [UNIFIED-QUEUE] Error creating/updating Reddit account:", error)
    return { isSuccess: false, message: "Failed to create/update Reddit account" }
  }
}

export async function getRedditAccountAction(
  redditUsername: string
): Promise<ActionState<SerializedRedditAccountDocument>> {
  try {
    console.log("🔍 [UNIFIED-QUEUE] Getting Reddit account:", redditUsername)
    
    const accountRef = doc(db, UNIFIED_QUEUE_COLLECTIONS.REDDIT_ACCOUNTS, redditUsername)
    const accountDoc = await getDoc(accountRef)
    
    if (!accountDoc.exists()) {
      console.log("⚠️ [UNIFIED-QUEUE] Reddit account not found:", redditUsername)
      return { isSuccess: false, message: "Reddit account not found" }
    }
    
    const account = accountDoc.data() as RedditAccountDocument
    console.log("✅ [UNIFIED-QUEUE] Reddit account retrieved:", account.redditUsername)
    
    return {
      isSuccess: true,
      message: "Reddit account retrieved successfully",
      data: serializeRedditAccount(account)
    }
  } catch (error) {
    console.error("❌ [UNIFIED-QUEUE] Error getting Reddit account:", error)
    return { isSuccess: false, message: "Failed to get Reddit account" }
  }
}

export async function getRedditAccountsByOrganizationAction(
  organizationId: string
): Promise<ActionState<SerializedRedditAccountDocument[]>> {
  try {
    console.log("🔍 [UNIFIED-QUEUE] Getting Reddit accounts for organization:", organizationId)
    
    const accountsQuery = query(
      collection(db, UNIFIED_QUEUE_COLLECTIONS.REDDIT_ACCOUNTS),
      where("organizationIds", "array-contains", organizationId),
      where("isActive", "==", true)
    )
    
    const accountsSnapshot = await getDocs(accountsQuery)
    const accounts = accountsSnapshot.docs.map(doc => serializeRedditAccount(doc.data() as RedditAccountDocument))
    
    console.log("✅ [UNIFIED-QUEUE] Found Reddit accounts:", accounts.length)
    
    return {
      isSuccess: true,
      message: "Reddit accounts retrieved successfully",
      data: accounts
    }
  } catch (error) {
    console.error("❌ [UNIFIED-QUEUE] Error getting Reddit accounts:", error)
    return { isSuccess: false, message: "Failed to get Reddit accounts" }
  }
}

// Queue Management
export async function addToUnifiedQueueAction(
  data: CreateUnifiedPostQueueData
): Promise<ActionState<SerializedUnifiedPostQueueDocument>> {
  try {
    console.log("🔧 [UNIFIED-QUEUE] Adding to unified queue:", {
      type: data.type,
      redditAccount: data.redditAccount,
      subreddit: data.subreddit
    })
    
    // Get current queue length for position
    const queueQuery = query(
      collection(db, UNIFIED_QUEUE_COLLECTIONS.UNIFIED_POST_QUEUE),
      where("redditAccount", "==", data.redditAccount),
      where("status", "==", "queued"),
      orderBy("queuePosition", "desc"),
      limit(1)
    )
    
    const queueSnapshot = await getDocs(queueQuery)
    const nextPosition = queueSnapshot.empty ? 1 : (queueSnapshot.docs[0].data().queuePosition + 1)
    
    // Calculate scheduled time based on queue position and settings
    const scheduledFor = data.scheduledFor || await calculateNextScheduledTime(data.redditAccount, nextPosition)
    
    const queueRef = doc(collection(db, UNIFIED_QUEUE_COLLECTIONS.UNIFIED_POST_QUEUE))
    
    const queueData: UnifiedPostQueueDocument = {
      id: queueRef.id,
      redditAccount: data.redditAccount,
      organizationId: data.organizationId,
      campaignId: data.campaignId,
      warmupAccountId: data.warmupAccountId,
      type: data.type,
      subreddit: data.subreddit,
      title: data.title,
      content: data.content,
      parentId: data.parentId,
      queuePosition: nextPosition,
      priority: data.priority || "normal",
      scheduledFor: scheduledFor,
      status: "queued",
      campaignName: data.campaignName,
      organizationName: data.organizationName,
      relevanceScore: data.relevanceScore,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any
    }
    
    await setDoc(queueRef, queueData)
    
    // Update Reddit account queue length
    await updateRedditAccountQueueLength(data.redditAccount)
    
    console.log("✅ [UNIFIED-QUEUE] Added to queue at position:", nextPosition)
    
    return {
      isSuccess: true,
      message: "Added to unified queue successfully",
      data: serializeUnifiedPostQueue(queueData)
    }
  } catch (error) {
    console.error("❌ [UNIFIED-QUEUE] Error adding to queue:", error)
    return { isSuccess: false, message: "Failed to add to unified queue" }
  }
}

export async function getUnifiedQueueByRedditAccountAction(
  redditAccount: string,
  status?: "queued" | "posted" | "failed" | "cancelled"
): Promise<ActionState<SerializedUnifiedPostQueueDocument[]>> {
  try {
    console.log("🔍 [UNIFIED-QUEUE] Getting queue for Reddit account:", redditAccount)
    
    let queueQuery = query(
      collection(db, UNIFIED_QUEUE_COLLECTIONS.UNIFIED_POST_QUEUE),
      where("redditAccount", "==", redditAccount)
    )
    
    if (status) {
      queueQuery = query(queueQuery, where("status", "==", status))
    }
    
    queueQuery = query(queueQuery, orderBy("queuePosition", "asc"))
    
    const queueSnapshot = await getDocs(queueQuery)
    const queueItems = queueSnapshot.docs.map(doc => serializeUnifiedPostQueue(doc.data() as UnifiedPostQueueDocument))
    
    console.log("✅ [UNIFIED-QUEUE] Retrieved queue items:", queueItems.length)
    
    return {
      isSuccess: true,
      message: "Queue retrieved successfully",
      data: queueItems
    }
  } catch (error) {
    console.error("❌ [UNIFIED-QUEUE] Error getting queue:", error)
    return { isSuccess: false, message: "Failed to get queue" }
  }
}

export async function updateUnifiedQueueItemAction(
  queueItemId: string,
  data: UpdateUnifiedPostQueueData
): Promise<ActionState<SerializedUnifiedPostQueueDocument>> {
  try {
    console.log("🔧 [UNIFIED-QUEUE] Updating queue item:", queueItemId)
    
    const queueRef = doc(db, UNIFIED_QUEUE_COLLECTIONS.UNIFIED_POST_QUEUE, queueItemId)
    
    const updateData = {
      ...removeUndefinedValues(data),
      updatedAt: serverTimestamp() as any
    }
    
    await updateDoc(queueRef, updateData)
    
    const updatedDoc = await getDoc(queueRef)
    const result = updatedDoc.data() as UnifiedPostQueueDocument
    
    console.log("✅ [UNIFIED-QUEUE] Queue item updated")
    
    return {
      isSuccess: true,
      message: "Queue item updated successfully",
      data: serializeUnifiedPostQueue(result)
    }
  } catch (error) {
    console.error("❌ [UNIFIED-QUEUE] Error updating queue item:", error)
    return { isSuccess: false, message: "Failed to update queue item" }
  }
}

export async function reorderUnifiedQueueAction(
  redditAccount: string,
  queueItemId: string,
  newPosition: number
): Promise<ActionState<SerializedUnifiedPostQueueDocument[]>> {
  try {
    console.log("🔧 [UNIFIED-QUEUE] Reordering queue for:", redditAccount)
    console.log("🔧 [UNIFIED-QUEUE] Moving item:", queueItemId, "to position:", newPosition)
    
    // Get all queued items for this Reddit account
    const queueQuery = query(
      collection(db, UNIFIED_QUEUE_COLLECTIONS.UNIFIED_POST_QUEUE),
      where("redditAccount", "==", redditAccount),
      where("status", "==", "queued"),
      orderBy("queuePosition", "asc")
    )
    
    const queueSnapshot = await getDocs(queueQuery)
    const queueItems = queueSnapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data() as UnifiedPostQueueDocument
    }))
    
    // Find the item to move
    const itemToMove = queueItems.find(item => item.id === queueItemId)
    if (!itemToMove) {
      return { isSuccess: false, message: "Queue item not found" }
    }
    
    // Remove the item from its current position
    const filteredItems = queueItems.filter(item => item.id !== queueItemId)
    
    // Insert at new position
    filteredItems.splice(newPosition - 1, 0, itemToMove)
    
    // Update positions and recalculate scheduled times
    const batch = writeBatch(db)
    const updatedItems: SerializedUnifiedPostQueueDocument[] = []
    
    for (let i = 0; i < filteredItems.length; i++) {
      const item = filteredItems[i]
      const newQueuePosition = i + 1
      const newScheduledTime = await calculateNextScheduledTime(redditAccount, newQueuePosition)
      
      const itemRef = doc(db, UNIFIED_QUEUE_COLLECTIONS.UNIFIED_POST_QUEUE, item.id)
      batch.update(itemRef, {
        queuePosition: newQueuePosition,
        scheduledFor: newScheduledTime,
        updatedAt: serverTimestamp()
      })
      
      updatedItems.push(serializeUnifiedPostQueue({
        ...item.data,
        queuePosition: newQueuePosition,
        scheduledFor: newScheduledTime,
        updatedAt: Timestamp.now()
      }))
    }
    
    await batch.commit()
    
    console.log("✅ [UNIFIED-QUEUE] Queue reordered successfully")
    
    return {
      isSuccess: true,
      message: "Queue reordered successfully",
      data: updatedItems.sort((a, b) => a.queuePosition - b.queuePosition)
    }
  } catch (error) {
    console.error("❌ [UNIFIED-QUEUE] Error reordering queue:", error)
    return { isSuccess: false, message: "Failed to reorder queue" }
  }
}

// Queue Settings Management
export async function createOrUpdateQueueSettingsAction(
  data: CreateQueueSettingsData & UpdateQueueSettingsData
): Promise<ActionState<SerializedQueueSettingsDocument>> {
  try {
    console.log("🔧 [UNIFIED-QUEUE] Creating/updating queue settings for:", data.redditAccount)
    
    const settingsRef = doc(db, UNIFIED_QUEUE_COLLECTIONS.QUEUE_SETTINGS, data.redditAccount)
    const existingDoc = await getDoc(settingsRef)
    
    if (existingDoc.exists()) {
      // Update existing settings
      const updateData = {
        ...removeUndefinedValues(data),
        updatedAt: serverTimestamp() as any
      }
      
      await updateDoc(settingsRef, updateData)
    } else {
      // Create default settings
      const defaultSettings: QueueSettingsDocument = {
        id: data.redditAccount,
        redditAccount: data.redditAccount,
        postingMode: data.postingMode || "safe",
        minIntervalMinutes: data.minIntervalMinutes || 120, // 2 hours
        maxIntervalMinutes: data.maxIntervalMinutes || 480, // 8 hours
        dailyPostLimit: data.dailyPostLimit || 3,
        dailyCommentLimit: data.dailyCommentLimit || 5,
        subredditSettings: data.subredditSettings || {},
        warmupToLeadRatio: data.warmupToLeadRatio || 0.5,
        activeHours: data.activeHours || { start: 9, end: 17 },
        activeDays: data.activeDays || [1, 2, 3, 4, 5], // Monday to Friday
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any
      }
      
      await setDoc(settingsRef, defaultSettings)
    }
    
    const updatedDoc = await getDoc(settingsRef)
    const result = updatedDoc.data() as QueueSettingsDocument
    
    console.log("✅ [UNIFIED-QUEUE] Queue settings saved")
    
    return {
      isSuccess: true,
      message: "Queue settings saved successfully",
      data: serializeQueueSettings(result)
    }
  } catch (error) {
    console.error("❌ [UNIFIED-QUEUE] Error saving queue settings:", error)
    return { isSuccess: false, message: "Failed to save queue settings" }
  }
}

export async function getQueueSettingsAction(
  redditAccount: string
): Promise<ActionState<SerializedQueueSettingsDocument>> {
  try {
    console.log("🔍 [UNIFIED-QUEUE] Getting queue settings for:", redditAccount)
    
    const settingsRef = doc(db, UNIFIED_QUEUE_COLLECTIONS.QUEUE_SETTINGS, redditAccount)
    const settingsDoc = await getDoc(settingsRef)
    
    if (!settingsDoc.exists()) {
      // Create default settings if none exist
      const defaultResult = await createOrUpdateQueueSettingsAction({
        redditAccount,
        postingMode: "safe"
      })
      return defaultResult
    }
    
    const settings = settingsDoc.data() as QueueSettingsDocument
    console.log("✅ [UNIFIED-QUEUE] Queue settings retrieved")
    
    return {
      isSuccess: true,
      message: "Queue settings retrieved successfully",
      data: serializeQueueSettings(settings)
    }
  } catch (error) {
    console.error("❌ [UNIFIED-QUEUE] Error getting queue settings:", error)
    return { isSuccess: false, message: "Failed to get queue settings" }
  }
}

// Helper functions
async function updateRedditAccountQueueLength(redditUsername: string): Promise<void> {
  try {
    const queueQuery = query(
      collection(db, UNIFIED_QUEUE_COLLECTIONS.UNIFIED_POST_QUEUE),
      where("redditAccount", "==", redditUsername),
      where("status", "==", "queued")
    )
    
    const queueSnapshot = await getDocs(queueQuery)
    const queueLength = queueSnapshot.size
    
    const accountRef = doc(db, UNIFIED_QUEUE_COLLECTIONS.REDDIT_ACCOUNTS, redditUsername)
    await updateDoc(accountRef, {
      currentQueueLength: queueLength,
      updatedAt: serverTimestamp()
    })
    
    console.log("✅ [UNIFIED-QUEUE] Updated queue length for:", redditUsername, ":", queueLength)
  } catch (error) {
    console.error("❌ [UNIFIED-QUEUE] Error updating queue length:", error)
  }
}

async function calculateNextScheduledTime(redditAccount: string, queuePosition: number): Promise<Timestamp> {
  try {
    // Get queue settings for this Reddit account
    const settingsResult = await getQueueSettingsAction(redditAccount)
    
    if (!settingsResult.isSuccess) {
      // Use default timing if no settings found
      const defaultInterval = 4 * 60 * 60 * 1000 // 4 hours in milliseconds
      return Timestamp.fromDate(new Date(Date.now() + (defaultInterval * queuePosition)))
    }
    
    const settings = settingsResult.data
    
    // Calculate base interval based on posting mode
    let baseIntervalMinutes: number
    
    switch (settings.postingMode) {
      case "aggressive":
        baseIntervalMinutes = Math.max(30, settings.minIntervalMinutes) // Minimum 30 minutes
        break
      case "safe":
        baseIntervalMinutes = Math.max(240, settings.maxIntervalMinutes) // Minimum 4 hours
        break
      case "custom":
        baseIntervalMinutes = (settings.minIntervalMinutes + settings.maxIntervalMinutes) / 2
        break
      default:
        baseIntervalMinutes = 240 // 4 hours default
    }
    
    // Add jitter to avoid patterns (±20% randomization)
    const jitter = (Math.random() - 0.5) * 0.4 * baseIntervalMinutes
    const finalIntervalMinutes = Math.max(15, baseIntervalMinutes + jitter) // Minimum 15 minutes
    
    // Calculate scheduled time based on position in queue
    const intervalMs = finalIntervalMinutes * 60 * 1000
    const scheduledTime = new Date(Date.now() + (intervalMs * queuePosition))
    
    // Ensure it's within active hours if specified
    const activeStart = settings.activeHours.start
    const activeEnd = settings.activeHours.end
    
    if (activeStart !== undefined && activeEnd !== undefined) {
      const hour = scheduledTime.getHours()
      if (hour < activeStart || hour >= activeEnd) {
        // Move to next active period
        const nextDay = new Date(scheduledTime)
        nextDay.setDate(nextDay.getDate() + 1)
        nextDay.setHours(activeStart, 0, 0, 0)
        return Timestamp.fromDate(nextDay)
      }
    }
    
    console.log("🕐 [UNIFIED-QUEUE] Calculated scheduled time for position", queuePosition, ":", scheduledTime.toISOString())
    
    return Timestamp.fromDate(scheduledTime)
  } catch (error) {
    console.error("❌ [UNIFIED-QUEUE] Error calculating scheduled time:", error)
    // Fallback to simple calculation
    const defaultInterval = 4 * 60 * 60 * 1000 // 4 hours
    return Timestamp.fromDate(new Date(Date.now() + (defaultInterval * queuePosition)))
  }
} 