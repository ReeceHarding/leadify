"use server"

/*
<ai_context>
Actions for managing the potential_leads_feed collection.
Handles CRUD operations for potential leads during the monitoring workflow.
</ai_context>
*/

import { db } from "@/db/db"
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
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  onSnapshot
} from "firebase/firestore"
import {
  POTENTIAL_LEADS_COLLECTIONS,
  PotentialLeadDocument,
  SerializedPotentialLeadDocument,
  CreatePotentialLeadData,
  UpdatePotentialLeadData,
  PotentialLeadStatus
} from "@/db/schema"
import { toISOString } from "@/lib/utils/timestamp-utils"

/**
 * Helper function to serialize PotentialLeadDocument Timestamps to ISO strings
 */
function serializePotentialLeadTimestamps(
  lead: PotentialLeadDocument
): SerializedPotentialLeadDocument {
  return {
    ...lead,
    discovered_at: toISOString(lead.discovered_at),
    qualified_at: lead.qualified_at ? toISOString(lead.qualified_at) : undefined,
    createdAt: toISOString(lead.createdAt),
    updatedAt: toISOString(lead.updatedAt),
  } as SerializedPotentialLeadDocument
}

/**
 * Create a new potential lead
 */
export async function createPotentialLeadAction(
  data: CreatePotentialLeadData
): Promise<ActionState<SerializedPotentialLeadDocument>> {
  console.log("🎯 [POTENTIAL-LEAD-CREATE] Creating potential lead", { id: data.id, title: data.title })

  try {
    // Check if lead already exists
    const existingQuery = query(
      collection(db, POTENTIAL_LEADS_COLLECTIONS.POTENTIAL_LEADS_FEED),
      where("id", "==", data.id),
      where("campaignId", "==", data.campaignId)
    )
    const existingSnapshot = await getDocs(existingQuery)
    
    if (!existingSnapshot.empty) {
      console.log("🎯 [POTENTIAL-LEAD-CREATE] Lead already exists")
      return {
        isSuccess: false,
        message: "Potential lead already exists"
      }
    }

    const potentialLeadRef = doc(collection(db, POTENTIAL_LEADS_COLLECTIONS.POTENTIAL_LEADS_FEED), data.id)
    
    const potentialLeadData = {
      ...data,
      status: data.status || "new" as PotentialLeadStatus,
      discovered_at: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await setDoc(potentialLeadRef, potentialLeadData)
    
    // Fetch the document again to get server-generated timestamps
    const createdDocSnapshot = await getDoc(potentialLeadRef)
    if (!createdDocSnapshot.exists()) {
      throw new Error("Failed to create potential lead document.")
    }
    const createdData = { ...createdDocSnapshot.data() } as PotentialLeadDocument
    
    console.log("🎯 [POTENTIAL-LEAD-CREATE] ✅ Potential lead created successfully", { id: data.id })
    
    return {
      isSuccess: true,
      message: "Potential lead created successfully",
      data: serializePotentialLeadTimestamps(createdData)
    }
  } catch (error) {
    console.error("🎯 [POTENTIAL-LEAD-CREATE] ❌ Error:", error)
    return {
      isSuccess: false,
      message: "Failed to create potential lead"
    }
  }
}

/**
 * Get potential leads by campaign ID and status
 */
export async function getPotentialLeadsByCampaignAction(
  campaignId: string,
  status?: PotentialLeadStatus,
  limitCount: number = 50
): Promise<ActionState<SerializedPotentialLeadDocument[]>> {
  console.log("🎯 [POTENTIAL-LEADS-GET] Fetching potential leads for campaign:", campaignId, "status:", status)

  try {
    let leadsQuery = query(
      collection(db, POTENTIAL_LEADS_COLLECTIONS.POTENTIAL_LEADS_FEED),
      where("campaignId", "==", campaignId),
      orderBy("discovered_at", "desc"),
      limit(limitCount)
    )

    // Add status filter if provided
    if (status) {
      leadsQuery = query(
        collection(db, POTENTIAL_LEADS_COLLECTIONS.POTENTIAL_LEADS_FEED),
        where("campaignId", "==", campaignId),
        where("status", "==", status),
        orderBy("discovered_at", "desc"),
        limit(limitCount)
      )
    }

    const snapshot = await getDocs(leadsQuery)
    const leads = snapshot.docs.map(doc => {
      const leadData = { ...doc.data() } as PotentialLeadDocument
      return serializePotentialLeadTimestamps(leadData)
    })
    
    console.log("🎯 [POTENTIAL-LEADS-GET] ✅ Found", leads.length, "potential leads")
    
    return {
      isSuccess: true,
      message: `Found ${leads.length} potential leads`,
      data: leads
    }
  } catch (error) {
    console.error("🎯 [POTENTIAL-LEADS-GET] ❌ Error:", error)
    return {
      isSuccess: false,
      message: "Failed to get potential leads"
    }
  }
}

/**
 * Get potential leads by organization ID (for real-time monitoring)
 */
export async function getPotentialLeadsByOrganizationAction(
  organizationId: string,
  status?: PotentialLeadStatus,
  limitCount: number = 100
): Promise<ActionState<SerializedPotentialLeadDocument[]>> {
  console.log("🎯 [POTENTIAL-LEADS-ORG] Fetching potential leads for organization:", organizationId, "status:", status)

  try {
    let leadsQuery = query(
      collection(db, POTENTIAL_LEADS_COLLECTIONS.POTENTIAL_LEADS_FEED),
      where("organizationId", "==", organizationId),
      orderBy("discovered_at", "desc"),
      limit(limitCount)
    )

    // Add status filter if provided
    if (status) {
      leadsQuery = query(
        collection(db, POTENTIAL_LEADS_COLLECTIONS.POTENTIAL_LEADS_FEED),
        where("organizationId", "==", organizationId),
        where("status", "==", status),
        orderBy("discovered_at", "desc"),
        limit(limitCount)
      )
    }

    const snapshot = await getDocs(leadsQuery)
    const leads = snapshot.docs.map(doc => {
      const leadData = { ...doc.data() } as PotentialLeadDocument
      return serializePotentialLeadTimestamps(leadData)
    })
    
    console.log("🎯 [POTENTIAL-LEADS-ORG] ✅ Found", leads.length, "potential leads")
    
    return {
      isSuccess: true,
      message: `Found ${leads.length} potential leads`,
      data: leads
    }
  } catch (error) {
    console.error("🎯 [POTENTIAL-LEADS-ORG] ❌ Error:", error)
    return {
      isSuccess: false,
      message: "Failed to get potential leads"
    }
  }
}

/**
 * Update a potential lead
 */
export async function updatePotentialLeadAction(
  leadId: string,
  data: UpdatePotentialLeadData
): Promise<ActionState<SerializedPotentialLeadDocument>> {
  console.log("🎯 [POTENTIAL-LEAD-UPDATE] Updating potential lead:", leadId, data)

  try {
    const leadRef = doc(db, POTENTIAL_LEADS_COLLECTIONS.POTENTIAL_LEADS_FEED, leadId)
    
    const updateDataWithTimestamp = {
      ...data,
      updatedAt: serverTimestamp()
    }
    
    await updateDoc(leadRef, updateDataWithTimestamp)
    
    const updatedDocSnapshot = await getDoc(leadRef)
    if (!updatedDocSnapshot.exists()) {
        throw new Error("Failed to fetch updated potential lead document.")
    }
    const updatedData = { ...updatedDocSnapshot.data() } as PotentialLeadDocument
    
    console.log("🎯 [POTENTIAL-LEAD-UPDATE] ✅ Potential lead updated successfully")
    
    return {
      isSuccess: true,
      message: "Potential lead updated successfully",
      data: serializePotentialLeadTimestamps(updatedData)
    }
  } catch (error) {
    console.error("🎯 [POTENTIAL-LEAD-UPDATE] ❌ Error:", error)
    return {
      isSuccess: false,
      message: "Failed to update potential lead"
    }
  }
}

/**
 * Delete a potential lead
 */
export async function deletePotentialLeadAction(leadId: string): Promise<ActionState<void>> {
  console.log("🎯 [POTENTIAL-LEAD-DELETE] Deleting potential lead:", leadId)

  try {
    await deleteDoc(doc(db, POTENTIAL_LEADS_COLLECTIONS.POTENTIAL_LEADS_FEED, leadId))
    
    console.log("🎯 [POTENTIAL-LEAD-DELETE] ✅ Potential lead deleted successfully")
    
    return {
      isSuccess: true,
      message: "Potential lead deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("🎯 [POTENTIAL-LEAD-DELETE] ❌ Error:", error)
    return {
      isSuccess: false,
      message: "Failed to delete potential lead"
    }
  }
}

/**
 * Batch update status for multiple potential leads
 */
export async function batchUpdatePotentialLeadsStatusAction(
  leadIds: string[],
  status: PotentialLeadStatus
): Promise<ActionState<number>> {
  console.log("🎯 [POTENTIAL-LEADS-BATCH] Batch updating", leadIds.length, "leads to status:", status)

  try {
    let successCount = 0
    
    for (const leadId of leadIds) {
      try {
        const leadRef = doc(db, POTENTIAL_LEADS_COLLECTIONS.POTENTIAL_LEADS_FEED, leadId)
        await updateDoc(leadRef, {
          status,
          updatedAt: serverTimestamp()
        })
        successCount++
      } catch (error) {
        console.error(`🎯 [POTENTIAL-LEADS-BATCH] Failed to update lead ${leadId}:`, error)
      }
    }
    
    console.log("🎯 [POTENTIAL-LEADS-BATCH] ✅ Updated", successCount, "of", leadIds.length, "leads")
    
    return {
      isSuccess: true,
      message: `Updated ${successCount} of ${leadIds.length} leads`,
      data: successCount
    }
  } catch (error) {
    console.error("🎯 [POTENTIAL-LEADS-BATCH] ❌ Error:", error)
    return {
      isSuccess: false,
      message: "Failed to batch update leads"
    }
  }
} 