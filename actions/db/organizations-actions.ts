/*
<ai_context>
Contains server actions for organizations management in Firestore.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import {
  ORGANIZATION_COLLECTIONS,
  OrganizationDocument,
  OrganizationMemberDocument,
  CreateOrganizationData,
  UpdateOrganizationData,
  SerializedOrganizationDocument,
  SerializedOrganizationMemberDocument
} from "@/db/schema"
import { ActionState } from "@/types"
import { removeUndefinedValues } from "@/lib/firebase-utils"
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  collection,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch
} from "firebase/firestore"
import { auth } from "@clerk/nextjs/server"
import { toISOString } from "@/lib/utils/timestamp-utils"
import { adminDb } from "@/lib/firebase-admin"

// Serialization helper functions
function serializeOrganizationDocument(
  org: OrganizationDocument
): SerializedOrganizationDocument {
  console.log("🏢 [SERIALIZE-ORG] Starting serialization")

  return {
    ...org,
    createdAt: toISOString(org.createdAt) || new Date().toISOString(),
    updatedAt: toISOString(org.updatedAt) || new Date().toISOString(),
    redditTokenExpiresAt: toISOString(org.redditTokenExpiresAt) || (org.redditTokenExpiresAt as any)
  }
}

function serializeOrganizationMemberDocument(
  member: OrganizationMemberDocument
): SerializedOrganizationMemberDocument {
  return {
    ...member,
    joinedAt: toISOString(member.joinedAt) || new Date().toISOString(),
    updatedAt: toISOString(member.updatedAt) || new Date().toISOString()
  }
}

export async function createOrganizationAction(
  data: CreateOrganizationData
): Promise<ActionState<SerializedOrganizationDocument>> {
  console.log("🏢🏢🏢 [CREATE-ORG] ========== ACTION START ==========")
  console.log("🏢🏢🏢 [CREATE-ORG] Timestamp:", new Date().toISOString())
  console.log("🏢🏢🏢 [CREATE-ORG] Input data:", {
    name: data.name,
    ownerId: data.ownerId,
    website: data.website,
    plan: data.plan || "free"
  })

  try {
    const { userId } = await auth()
    if (!userId || userId !== data.ownerId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    console.log("🏢🏢🏢 [CREATE-ORG] Creating new organization document...")
    const orgRef = doc(collection(db, ORGANIZATION_COLLECTIONS.ORGANIZATIONS))
    const memberRef = doc(
      collection(db, ORGANIZATION_COLLECTIONS.ORGANIZATION_MEMBERS)
    )

    console.log("🏢🏢🏢 [CREATE-ORG] Generated organization ID:", orgRef.id)
    console.log("🏢🏢🏢 [CREATE-ORG] Generated member ID:", memberRef.id)

    const orgData: Omit<OrganizationDocument, "id"> = {
      name: data.name,
      ownerId: data.ownerId,
      website: data.website || "",
      businessDescription: data.businessDescription || "",
      plan: data.plan || "free",
      isActive: true,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    }

    const memberData: Omit<OrganizationMemberDocument, "id"> = {
      organizationId: orgRef.id,
      userId: data.ownerId,
      role: "owner",
      joinedAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    }

    console.log("🏢🏢🏢 [CREATE-ORG] Writing to Firestore with batch...")
    const batch = writeBatch(db)
    batch.set(orgRef, removeUndefinedValues(orgData))
    batch.set(memberRef, removeUndefinedValues(memberData))
    await batch.commit()

    console.log(
      "🏢🏢🏢 [CREATE-ORG] ✅ Organization and member created successfully"
    )

    // Get the created document to return with actual timestamps
    const createdDoc = await getDoc(orgRef)
    const createdData = {
      id: orgRef.id,
      ...createdDoc.data()
    } as OrganizationDocument

    // Create all necessary components for the organization
    console.log("🏢🏢🏢 [CREATE-ORG] Creating organization components...")
    
    // 1. Create Knowledge Base
    console.log("🏢🏢🏢 [CREATE-ORG] Creating knowledge base...")
    try {
      const { createKnowledgeBaseAction } = await import("@/actions/db/personalization-actions")
      const kbResult = await createKnowledgeBaseAction({
        userId: data.ownerId,
        organizationId: orgRef.id,
        websiteUrl: data.website || "",
        customInformation: data.businessDescription || "",
        summary: "",
        keyFacts: []
      })
      
      if (kbResult.isSuccess) {
        console.log("🏢🏢🏢 [CREATE-ORG] ✅ Knowledge base created successfully")
      } else {
        console.warn("🏢🏢🏢 [CREATE-ORG] ⚠️ Failed to create knowledge base:", kbResult.message)
      }
    } catch (kbError) {
      console.error("🏢🏢🏢 [CREATE-ORG] ❌ Error creating knowledge base:", kbError)
    }

    // 2. Create Voice Settings
    console.log("🏢🏢🏢 [CREATE-ORG] Creating voice settings...")
    try {
      const { createVoiceSettingsAction } = await import("@/actions/db/personalization-actions")
      const voiceResult = await createVoiceSettingsAction({
        userId: data.ownerId,
        organizationId: orgRef.id,
        writingStyle: "casual",
        personaType: "user",
        useCasualTone: true,
        useEmojis: false,
        useAllLowercase: false,
        useFirstPerson: false
      })
      
      if (voiceResult.isSuccess) {
        console.log("🏢🏢🏢 [CREATE-ORG] ✅ Voice settings created successfully")
      } else {
        console.warn("🏢🏢🏢 [CREATE-ORG] ⚠️ Failed to create voice settings:", voiceResult.message)
      }
    } catch (voiceError) {
      console.error("🏢🏢🏢 [CREATE-ORG] ❌ Error creating voice settings:", voiceError)
    }

    // 3. Create Default Campaign (if website is provided)
    if (data.website) {
      console.log("🏢🏢🏢 [CREATE-ORG] Creating default campaign...")
      try {
        const { createCampaignAction } = await import("@/actions/db/campaign-actions")
        const { generateCampaignNameAction } = await import("@/actions/lead-generation/campaign-name-actions")
        
        // Generate a campaign name
        const nameResult = await generateCampaignNameAction({
          businessName: data.name,
          website: data.website,
          keywords: [] // Empty keywords for initial campaign
        })
        
        const campaignName = nameResult.isSuccess 
          ? nameResult.data 
          : `${data.name} - Initial Lead Search`
        
        const campaignResult = await createCampaignAction({
          userId: data.ownerId,
          organizationId: orgRef.id,
          name: campaignName,
          website: data.website,
          businessDescription: data.businessDescription || "",
          keywords: [] // User will add keywords later
        })
        
        if (campaignResult.isSuccess) {
          console.log("🏢🏢🏢 [CREATE-ORG] ✅ Default campaign created successfully")
        } else {
          console.warn("🏢🏢🏢 [CREATE-ORG] ⚠️ Failed to create default campaign:", campaignResult.message)
        }
      } catch (campaignError) {
        console.error("🏢🏢🏢 [CREATE-ORG] ❌ Error creating default campaign:", campaignError)
      }
    }

    console.log(
      "🏢🏢🏢 [CREATE-ORG] ========== ACTION END (SUCCESS) =========="
    )
    return {
      isSuccess: true,
      message: "Organization created successfully",
      data: serializeOrganizationDocument(createdData)
    }
  } catch (error) {
    console.error("🏢🏢🏢 [CREATE-ORG] ❌ Error:", error)
    console.log("🏢🏢🏢 [CREATE-ORG] ========== ACTION END (ERROR) ==========")
    return { isSuccess: false, message: "Failed to create organization" }
  }
}

export async function getOrganizationsByUserIdAction(
  userId: string
): Promise<ActionState<SerializedOrganizationDocument[]>> {
  console.log("🏢🏢🏢 [GET-ORGS-BY-USER] ========== ACTION START ==========")
  console.log("🏢🏢🏢 [GET-ORGS-BY-USER] Timestamp:", new Date().toISOString())
  console.log("🏢🏢🏢 [GET-ORGS-BY-USER] User ID:", userId)

  try {
    const { userId: authUserId } = await auth()
    if (!authUserId || authUserId !== userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // First get all organization IDs where user is a member
    console.log(
      "🏢🏢🏢 [GET-ORGS-BY-USER] Fetching organization memberships..."
    )
    const membersQuery = query(
      collection(db, ORGANIZATION_COLLECTIONS.ORGANIZATION_MEMBERS),
      where("userId", "==", userId)
    )
    const membersSnapshot = await getDocs(membersQuery)

    console.log(
      "🏢🏢🏢 [GET-ORGS-BY-USER] Found memberships:",
      membersSnapshot.size
    )

    if (membersSnapshot.empty) {
      console.log("🏢🏢🏢 [GET-ORGS-BY-USER] No organizations found for user")
      return {
        isSuccess: true,
        message: "No organizations found",
        data: []
      }
    }

    // Get organization IDs
    const orgIds = membersSnapshot.docs.map(doc => doc.data().organizationId)
    console.log("🏢🏢🏢 [GET-ORGS-BY-USER] Organization IDs:", orgIds)

    // Fetch all organizations
    const organizations: SerializedOrganizationDocument[] = []
    for (const orgId of orgIds) {
      const orgDoc = await getDoc(
        doc(db, ORGANIZATION_COLLECTIONS.ORGANIZATIONS, orgId)
      )
      if (orgDoc.exists()) {
        const orgData = {
          id: orgDoc.id,
          ...orgDoc.data()
        } as OrganizationDocument
        organizations.push(serializeOrganizationDocument(orgData))
      }
    }

    console.log(
      "🏢🏢🏢 [GET-ORGS-BY-USER] Total organizations found:",
      organizations.length
    )
    console.log(
      "🏢🏢🏢 [GET-ORGS-BY-USER] ✅ Organizations retrieved successfully"
    )
    console.log(
      "🏢🏢🏢 [GET-ORGS-BY-USER] ========== ACTION END (SUCCESS) =========="
    )

    return {
      isSuccess: true,
      message: "Organizations retrieved successfully",
      data: organizations
    }
  } catch (error) {
    console.error("🏢🏢🏢 [GET-ORGS-BY-USER] ❌ Error:", error)
    console.log(
      "🏢🏢🏢 [GET-ORGS-BY-USER] ========== ACTION END (ERROR) =========="
    )
    return { isSuccess: false, message: "Failed to get organizations" }
  }
}

// Version without auth check for use in middleware
export async function getOrganizationsByUserIdWithoutAuthAction(
  userId: string
): Promise<ActionState<SerializedOrganizationDocument[]>> {
  console.log("🏢🏢🏢 [GET-ORGS-BY-USER-NO-AUTH] ========== ACTION START ==========")
  console.log("🏢🏢🏢 [GET-ORGS-BY-USER-NO-AUTH] Timestamp:", new Date().toISOString())
  console.log("🏢🏢🏢 [GET-ORGS-BY-USER-NO-AUTH] User ID:", userId)

  try {
    // First get all organization IDs where user is a member
    console.log(
      "🏢🏢🏢 [GET-ORGS-BY-USER-NO-AUTH] Fetching organization memberships..."
    )
    const membersQuery = query(
      collection(db, ORGANIZATION_COLLECTIONS.ORGANIZATION_MEMBERS),
      where("userId", "==", userId)
    )
    const membersSnapshot = await getDocs(membersQuery)

    console.log(
      "🏢🏢🏢 [GET-ORGS-BY-USER-NO-AUTH] Found memberships:",
      membersSnapshot.size
    )

    if (membersSnapshot.empty) {
      console.log("🏢🏢🏢 [GET-ORGS-BY-USER-NO-AUTH] No organizations found for user")
      return {
        isSuccess: true,
        message: "No organizations found",
        data: []
      }
    }

    // Get organization IDs
    const orgIds = membersSnapshot.docs.map(doc => doc.data().organizationId)
    console.log("🏢🏢🏢 [GET-ORGS-BY-USER-NO-AUTH] Organization IDs:", orgIds)

    // Fetch all organizations
    const organizations: SerializedOrganizationDocument[] = []
    for (const orgId of orgIds) {
      const orgDoc = await getDoc(
        doc(db, ORGANIZATION_COLLECTIONS.ORGANIZATIONS, orgId)
      )
      if (orgDoc.exists()) {
        const orgData = {
          id: orgDoc.id,
          ...orgDoc.data()
        } as OrganizationDocument
        organizations.push(serializeOrganizationDocument(orgData))
      }
    }

    console.log(
      "🏢🏢🏢 [GET-ORGS-BY-USER-NO-AUTH] Total organizations found:",
      organizations.length
    )
    console.log(
      "🏢🏢🏢 [GET-ORGS-BY-USER-NO-AUTH] ✅ Organizations retrieved successfully"
    )
    console.log(
      "🏢🏢🏢 [GET-ORGS-BY-USER-NO-AUTH] ========== ACTION END (SUCCESS) =========="
    )

    return {
      isSuccess: true,
      message: "Organizations retrieved successfully",
      data: organizations
    }
  } catch (error) {
    console.error("🏢🏢🏢 [GET-ORGS-BY-USER-NO-AUTH] ❌ Error:", error)
    console.log(
      "🏢🏢🏢 [GET-ORGS-BY-USER-NO-AUTH] ========== ACTION END (ERROR) =========="
    )
    return { isSuccess: false, message: "Failed to get organizations" }
  }
}

export async function getOrganizationByIdAction(
  organizationId: string
): Promise<ActionState<SerializedOrganizationDocument>> {
  console.log("🏢🏢🏢 [GET-ORG-BY-ID] ========== ACTION START ==========")
  console.log("🏢🏢🏢 [GET-ORG-BY-ID] Timestamp:", new Date().toISOString())
  console.log("🏢🏢🏢 [GET-ORG-BY-ID] Organization ID:", organizationId)

  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Check if user is a member of this organization
    console.log("🏢🏢🏢 [GET-ORG-BY-ID] Checking membership...")
    const memberQuery = query(
      collection(db, ORGANIZATION_COLLECTIONS.ORGANIZATION_MEMBERS),
      where("organizationId", "==", organizationId),
      where("userId", "==", userId)
    )
    const memberSnapshot = await getDocs(memberQuery)

    if (memberSnapshot.empty) {
      console.log(
        "🏢🏢🏢 [GET-ORG-BY-ID] User is not a member of this organization"
      )
      return { isSuccess: false, message: "Not a member of this organization" }
    }

    console.log("🏢🏢🏢 [GET-ORG-BY-ID] Fetching organization document...")
    const orgDoc = await getDoc(
      doc(db, ORGANIZATION_COLLECTIONS.ORGANIZATIONS, organizationId)
    )

    if (!orgDoc.exists()) {
      console.log("🏢🏢🏢 [GET-ORG-BY-ID] Organization not found")
      return { isSuccess: false, message: "Organization not found" }
    }

    const orgData = { id: orgDoc.id, ...orgDoc.data() } as OrganizationDocument
    console.log("🏢🏢🏢 [GET-ORG-BY-ID] ✅ Organization retrieved successfully")
    console.log(
      "🏢🏢🏢 [GET-ORG-BY-ID] ========== ACTION END (SUCCESS) =========="
    )

    return {
      isSuccess: true,
      message: "Organization retrieved successfully",
      data: serializeOrganizationDocument(orgData)
    }
  } catch (error) {
    console.error("🏢🏢🏢 [GET-ORG-BY-ID] ❌ Error:", error)
    console.log(
      "🏢🏢🏢 [GET-ORG-BY-ID] ========== ACTION END (ERROR) =========="
    )
    return { isSuccess: false, message: "Failed to get organization" }
  }
}

export async function updateOrganizationAction(
  organizationId: string,
  data: UpdateOrganizationData
): Promise<ActionState<SerializedOrganizationDocument>> {
  console.log("🏢🏢🏢 [UPDATE-ORG] ========== ACTION START ==========")
  console.log("🏢🏢🏢 [UPDATE-ORG] Timestamp:", new Date().toISOString())
  console.log("🏢🏢🏢 [UPDATE-ORG] Organization ID:", organizationId)
  console.log("🏢🏢🏢 [UPDATE-ORG] Update data:", data)

  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Check if user is an admin or owner of this organization
    console.log("🏢🏢🏢 [UPDATE-ORG] Checking permissions...")
    const memberQuery = query(
      collection(db, ORGANIZATION_COLLECTIONS.ORGANIZATION_MEMBERS),
      where("organizationId", "==", organizationId),
      where("userId", "==", userId)
    )
    const memberSnapshot = await getDocs(memberQuery)

    if (memberSnapshot.empty) {
      console.log(
        "🏢🏢🏢 [UPDATE-ORG] User is not a member of this organization"
      )
      return { isSuccess: false, message: "Not a member of this organization" }
    }

    const memberData = memberSnapshot.docs[0].data()
    if (memberData.role !== "owner" && memberData.role !== "admin") {
      console.log(
        "🏢🏢🏢 [UPDATE-ORG] User does not have permission to update organization"
      )
      return { isSuccess: false, message: "Insufficient permissions" }
    }

    console.log("🏢🏢🏢 [UPDATE-ORG] Updating organization...")
    const orgRef = doc(
      db,
      ORGANIZATION_COLLECTIONS.ORGANIZATIONS,
      organizationId
    )

    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }

    await updateDoc(orgRef, removeUndefinedValues(updateData))
    console.log("🏢🏢🏢 [UPDATE-ORG] ✅ Organization updated successfully")

    // Get the updated document
    const updatedDoc = await getDoc(orgRef)
    const updatedData = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as OrganizationDocument

    console.log(
      "🏢🏢🏢 [UPDATE-ORG] ========== ACTION END (SUCCESS) =========="
    )
    return {
      isSuccess: true,
      message: "Organization updated successfully",
      data: serializeOrganizationDocument(updatedData)
    }
  } catch (error) {
    console.error("🏢🏢🏢 [UPDATE-ORG] ❌ Error:", error)
    console.log("🏢🏢🏢 [UPDATE-ORG] ========== ACTION END (ERROR) ==========")
    return { isSuccess: false, message: "Failed to update organization" }
  }
}

export async function deleteOrganizationAction(
  organizationId: string
): Promise<ActionState<void>> {
  console.log("🏢🏢🏢 [DELETE-ORG] ========== ACTION START ==========")
  console.log("🏢🏢🏢 [DELETE-ORG] Timestamp:", new Date().toISOString())
  console.log("🏢🏢🏢 [DELETE-ORG] Organization ID:", organizationId)

  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Check if user is the owner of this organization
    console.log("🏢🏢🏢 [DELETE-ORG] Checking ownership...")
    const orgDoc = await getDoc(
      doc(db, ORGANIZATION_COLLECTIONS.ORGANIZATIONS, organizationId)
    )

    if (!orgDoc.exists()) {
      console.log("🏢🏢🏢 [DELETE-ORG] Organization not found")
      return { isSuccess: false, message: "Organization not found" }
    }

    const orgData = orgDoc.data() as OrganizationDocument
    if (orgData.ownerId !== userId) {
      console.log(
        "🏢🏢🏢 [DELETE-ORG] User is not the owner of this organization"
      )
      return {
        isSuccess: false,
        message: "Only the owner can delete the organization"
      }
    }

    console.log("🏢🏢🏢 [DELETE-ORG] Deleting organization and members...")
    const batch = writeBatch(db)

    // Delete organization
    batch.delete(
      doc(db, ORGANIZATION_COLLECTIONS.ORGANIZATIONS, organizationId)
    )

    // Delete all members
    const membersQuery = query(
      collection(db, ORGANIZATION_COLLECTIONS.ORGANIZATION_MEMBERS),
      where("organizationId", "==", organizationId)
    )
    const membersSnapshot = await getDocs(membersQuery)
    membersSnapshot.forEach(doc => {
      batch.delete(doc.ref)
    })

    await batch.commit()
    console.log("🏢🏢🏢 [DELETE-ORG] ✅ Organization deleted successfully")
    console.log(
      "🏢🏢🏢 [DELETE-ORG] ========== ACTION END (SUCCESS) =========="
    )

    return {
      isSuccess: true,
      message: "Organization deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("🏢🏢🏢 [DELETE-ORG] ❌ Error:", error)
    console.log("🏢🏢🏢 [DELETE-ORG] ========== ACTION END (ERROR) ==========")
    return { isSuccess: false, message: "Failed to delete organization" }
  }
}

// Version for use in middleware with Firebase Admin SDK
export async function getOrganizationsByUserIdForMiddlewareAction(
  userId: string
): Promise<ActionState<SerializedOrganizationDocument[]>> {
  console.log("🏢🏢🏢 [GET-ORGS-MIDDLEWARE] ========== ACTION START ==========")
  console.log("🏢🏢🏢 [GET-ORGS-MIDDLEWARE] Timestamp:", new Date().toISOString())
  console.log("🏢🏢🏢 [GET-ORGS-MIDDLEWARE] User ID:", userId)

  try {
    // Use Firebase Admin SDK
    const adminFirestore = adminDb()
    
    // First get all organization IDs where user is a member
    console.log(
      "🏢🏢🏢 [GET-ORGS-MIDDLEWARE] Fetching organization memberships..."
    )
    
    const membersSnapshot = await adminFirestore
      .collection(ORGANIZATION_COLLECTIONS.ORGANIZATION_MEMBERS)
      .where("userId", "==", userId)
      .get()

    console.log(
      "🏢🏢🏢 [GET-ORGS-MIDDLEWARE] Found memberships:",
      membersSnapshot.size
    )

    if (membersSnapshot.empty) {
      console.log("🏢🏢🏢 [GET-ORGS-MIDDLEWARE] No organizations found for user")
      return {
        isSuccess: true,
        message: "No organizations found",
        data: []
      }
    }

    // Get organization IDs
    const orgIds = membersSnapshot.docs.map(doc => doc.data().organizationId)
    console.log("🏢🏢🏢 [GET-ORGS-MIDDLEWARE] Organization IDs:", orgIds)

    // Fetch all organizations
    const organizations: SerializedOrganizationDocument[] = []
    for (const orgId of orgIds) {
      const orgDoc = await adminFirestore
        .collection(ORGANIZATION_COLLECTIONS.ORGANIZATIONS)
        .doc(orgId)
        .get()
        
      if (orgDoc.exists) {
        const orgData = {
          id: orgDoc.id,
          ...orgDoc.data()
        } as OrganizationDocument
        organizations.push(serializeOrganizationDocument(orgData))
      }
    }

    console.log(
      "🏢🏢🏢 [GET-ORGS-MIDDLEWARE] Total organizations found:",
      organizations.length
    )
    console.log(
      "🏢🏢🏢 [GET-ORGS-MIDDLEWARE] ✅ Organizations retrieved successfully"
    )
    console.log(
      "🏢🏢🏢 [GET-ORGS-MIDDLEWARE] ========== ACTION END (SUCCESS) =========="
    )

    return {
      isSuccess: true,
      message: "Organizations retrieved successfully",
      data: organizations
    }
  } catch (error) {
    console.error("🏢🏢🏢 [GET-ORGS-MIDDLEWARE] ❌ Error:", error)
    console.log(
      "🏢🏢🏢 [GET-ORGS-MIDDLEWARE] ========== ACTION END (ERROR) =========="
    )
    return { isSuccess: false, message: "Failed to get organizations" }
  }
}
