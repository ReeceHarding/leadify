"use server"

import { db } from "@/db/db"
import {
  MONITORING_COLLECTIONS,
  CampaignMonitorDocument,
  CreateCampaignMonitorData,
  UpdateCampaignMonitorData,
  frequencyToMs
} from "@/db/schema"
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
  Timestamp
} from "firebase/firestore"

/**
 * Create a new campaign monitor
 */
export async function createCampaignMonitorAction(
  data: CreateCampaignMonitorData
): Promise<ActionState<CampaignMonitorDocument>> {
  console.log("📊 [MONITOR-CREATE] Creating campaign monitor", { campaignId: data.campaignId })

  try {
    // Check if monitor already exists
    const existingQuery = query(
      collection(db, MONITORING_COLLECTIONS.CAMPAIGN_MONITORS),
      where("campaignId", "==", data.campaignId)
    )
    const existingSnapshot = await getDocs(existingQuery)
    
    if (!existingSnapshot.empty) {
      console.log("📊 [MONITOR-CREATE] Monitor already exists for campaign")
      return {
        isSuccess: false,
        message: "Monitor already exists for this campaign"
      }
    }

    const monitorRef = doc(collection(db, MONITORING_COLLECTIONS.CAMPAIGN_MONITORS))
    const frequency = data.frequency || "1hour"
    const nextCheckTime = Timestamp.fromMillis(Date.now() + frequencyToMs(frequency))
    
    const monitorData: Omit<CampaignMonitorDocument, "id"> = {
      campaignId: data.campaignId,
      organizationId: data.organizationId,
      userId: data.userId,
      
      // Settings
      enabled: data.enabled ?? true,
      frequency,
      priority: data.priority || "medium",
      
      // Tracking
      lastCheckAt: null,
      nextCheckAt: nextCheckTime,
      lastPostFoundAt: null,
      consecutiveEmptyChecks: 0,
      totalChecks: 0,
      totalPostsFound: 0,
      
      // API usage
      apiCallsToday: 0,
      apiCallsMonth: 0,
      lastApiReset: Timestamp.now(),
      
      // Metadata
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    }

    await setDoc(monitorRef, monitorData)
    
    const createdDoc = await getDoc(monitorRef)
    const createdData = { id: monitorRef.id, ...createdDoc.data() } as CampaignMonitorDocument
    
    console.log("📊 [MONITOR-CREATE] ✅ Monitor created successfully", { id: monitorRef.id })
    
    return {
      isSuccess: true,
      message: "Campaign monitor created successfully",
      data: createdData
    }
  } catch (error) {
    console.error("📊 [MONITOR-CREATE] ❌ Error:", error)
    return {
      isSuccess: false,
      message: "Failed to create campaign monitor"
    }
  }
}

/**
 * Get campaign monitor by campaign ID
 */
export async function getCampaignMonitorAction(
  campaignId: string
): Promise<ActionState<CampaignMonitorDocument | null>> {
  console.log("📊 [MONITOR-GET] Fetching monitor for campaign:", campaignId)

  try {
    const monitorQuery = query(
      collection(db, MONITORING_COLLECTIONS.CAMPAIGN_MONITORS),
      where("campaignId", "==", campaignId)
    )
    const snapshot = await getDocs(monitorQuery)
    
    if (snapshot.empty) {
      console.log("📊 [MONITOR-GET] No monitor found")
      return {
        isSuccess: true,
        message: "No monitor found for campaign",
        data: null
      }
    }
    
    const monitorDoc = snapshot.docs[0]
    const monitorData = { id: monitorDoc.id, ...monitorDoc.data() } as CampaignMonitorDocument
    
    console.log("📊 [MONITOR-GET] ✅ Monitor found", { id: monitorDoc.id })
    
    return {
      isSuccess: true,
      message: "Monitor retrieved successfully",
      data: monitorData
    }
  } catch (error) {
    console.error("📊 [MONITOR-GET] ❌ Error:", error)
    return {
      isSuccess: false,
      message: "Failed to get campaign monitor"
    }
  }
}

/**
 * Update campaign monitor
 */
export async function updateCampaignMonitorAction(
  monitorId: string,
  data: UpdateCampaignMonitorData
): Promise<ActionState<CampaignMonitorDocument>> {
  console.log("📊 [MONITOR-UPDATE] Updating monitor:", monitorId, data)

  try {
    const monitorRef = doc(db, MONITORING_COLLECTIONS.CAMPAIGN_MONITORS, monitorId)
    
    // If frequency is being updated, calculate new nextCheckAt
    if (data.frequency && !data.nextCheckAt) {
      data.nextCheckAt = Timestamp.fromMillis(Date.now() + frequencyToMs(data.frequency))
    }
    
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }
    
    await updateDoc(monitorRef, updateData)
    
    const updatedDoc = await getDoc(monitorRef)
    const updatedData = { id: monitorId, ...updatedDoc.data() } as CampaignMonitorDocument
    
    console.log("📊 [MONITOR-UPDATE] ✅ Monitor updated successfully")
    
    return {
      isSuccess: true,
      message: "Monitor updated successfully",
      data: updatedData
    }
  } catch (error) {
    console.error("📊 [MONITOR-UPDATE] ❌ Error:", error)
    return {
      isSuccess: false,
      message: "Failed to update campaign monitor"
    }
  }
}

/**
 * Get all monitors due for checking
 */
export async function getMonitorsDueForCheckAction(): Promise<ActionState<CampaignMonitorDocument[]>> {
  console.log("📊 [MONITOR-DUE] Checking for monitors due for checking")

  try {
    const now = Timestamp.now()
    const monitorsQuery = query(
      collection(db, MONITORING_COLLECTIONS.CAMPAIGN_MONITORS),
      where("enabled", "==", true),
      where("nextCheckAt", "<=", now)
    )
    
    const snapshot = await getDocs(monitorsQuery)
    const monitors = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CampaignMonitorDocument))
    
    console.log("📊 [MONITOR-DUE] ✅ Found", monitors.length, "monitors due for checking")
    
    return {
      isSuccess: true,
      message: `Found ${monitors.length} monitors due for checking`,
      data: monitors
    }
  } catch (error) {
    console.error("📊 [MONITOR-DUE] ❌ Error:", error)
    return {
      isSuccess: false,
      message: "Failed to get monitors due for checking"
    }
  }
}

/**
 * Record a monitoring check
 */
export async function recordMonitoringCheckAction(
  monitorId: string,
  results: {
    postsFound: number
    newPostsAdded: number
    apiCallsUsed: number
    success: boolean
    error?: string
  }
): Promise<ActionState<void>> {
  console.log("📊 [MONITOR-RECORD] Recording check for monitor:", monitorId, results)

  try {
    const monitorRef = doc(db, MONITORING_COLLECTIONS.CAMPAIGN_MONITORS, monitorId)
    const monitorDoc = await getDoc(monitorRef)
    
    if (!monitorDoc.exists()) {
      throw new Error("Monitor not found")
    }
    
    const monitor = monitorDoc.data() as Omit<CampaignMonitorDocument, "id">
    const now = Timestamp.now()
    
    // Calculate next check time
    const nextCheckTime = Timestamp.fromMillis(now.toMillis() + frequencyToMs(monitor.frequency))
    
    // Update monitor stats
    const updateData: UpdateCampaignMonitorData = {
      lastCheckAt: now,
      nextCheckAt: nextCheckTime,
      totalChecks: (monitor.totalChecks || 0) + 1,
      totalPostsFound: (monitor.totalPostsFound || 0) + results.postsFound,
      apiCallsToday: (monitor.apiCallsToday || 0) + results.apiCallsUsed,
      apiCallsMonth: (monitor.apiCallsMonth || 0) + results.apiCallsUsed
    }
    
    // Update consecutive empty checks
    if (results.postsFound === 0) {
      updateData.consecutiveEmptyChecks = (monitor.consecutiveEmptyChecks || 0) + 1
    } else {
      updateData.consecutiveEmptyChecks = 0
      updateData.lastPostFoundAt = now
    }
    
    // Update the monitor
    await updateDoc(monitorRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    })
    
    // Create log entry
    const logRef = doc(collection(db, MONITORING_COLLECTIONS.MONITORING_LOGS))
    await setDoc(logRef, {
      monitorId,
      campaignId: monitor.campaignId,
      organizationId: monitor.organizationId,
      checkStartedAt: now,
      checkCompletedAt: now,
      status: results.success ? "success" : "failed",
      postsFound: results.postsFound,
      newPostsAdded: results.newPostsAdded,
      apiCallsUsed: results.apiCallsUsed,
      error: results.error,
      createdAt: serverTimestamp()
    })
    
    console.log("📊 [MONITOR-RECORD] ✅ Check recorded successfully")
    
    return {
      isSuccess: true,
      message: "Monitoring check recorded",
      data: undefined
    }
  } catch (error) {
    console.error("📊 [MONITOR-RECORD] ❌ Error:", error)
    return {
      isSuccess: false,
      message: "Failed to record monitoring check"
    }
  }
} 