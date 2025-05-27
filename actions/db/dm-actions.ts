"use server"

import { db } from "@/db/db"
import {
  DM_COLLECTIONS,
  DMDocument,
  DMTemplateDocument,
  DMAutomationDocument,
  DMHistoryDocument,
  CreateDMData,
  CreateDMTemplateData,
  CreateDMAutomationData,
  UpdateDMData,
  UpdateDMTemplateData,
  UpdateDMAutomationData
} from "@/db/firestore/dm-collections"
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
  orderBy,
  limit,
  Timestamp
} from "firebase/firestore"

// DM Actions
export async function createDMAction(
  data: CreateDMData
): Promise<ActionState<DMDocument>> {
  console.log("🚀 [CREATE-DM] Starting DM creation...")
  console.log("🚀 [CREATE-DM] Input data:", data)
  
  try {
    const dmRef = doc(collection(db, DM_COLLECTIONS.DMS))
    console.log("🚀 [CREATE-DM] Generated DM ID:", dmRef.id)
    
    const dmData = {
      id: dmRef.id,
      ...data,
      status: "pending" as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    console.log("🚀 [CREATE-DM] Writing to Firestore...")
    await setDoc(dmRef, dmData)
    
    console.log("🚀 [CREATE-DM] Reading back created document...")
    const createdDoc = await getDoc(dmRef)
    
    if (!createdDoc.exists()) {
      throw new Error("Failed to create DM document")
    }
    
    const createdDM = createdDoc.data() as DMDocument
    console.log("🚀 [CREATE-DM] ✅ DM created successfully:", createdDM.id)
    
    return {
      isSuccess: true,
      message: "DM created successfully",
      data: createdDM
    }
  } catch (error) {
    console.error("🚀 [CREATE-DM] ❌ Error creating DM:", error)
    return { isSuccess: false, message: "Failed to create DM" }
  }
}

export async function getDMsByOrganizationAction(
  organizationId: string,
  status?: "pending" | "sent" | "failed" | "skipped"
): Promise<ActionState<DMDocument[]>> {
  console.log("🔍 [GET-DMS] Fetching DMs for organization:", organizationId)
  console.log("🔍 [GET-DMS] Status filter:", status || "all")
  
  try {
    const dmsRef = collection(db, DM_COLLECTIONS.DMS)
    let q = query(
      dmsRef,
      where("organizationId", "==", organizationId),
      orderBy("createdAt", "desc")
    )
    
    if (status) {
      q = query(
        dmsRef,
        where("organizationId", "==", organizationId),
        where("status", "==", status),
        orderBy("createdAt", "desc")
      )
    }
    
    const querySnapshot = await getDocs(q)
    const dms = querySnapshot.docs.map(doc => doc.data() as DMDocument)
    
    console.log("🔍 [GET-DMS] ✅ Found DMs:", dms.length)
    
    return {
      isSuccess: true,
      message: "DMs retrieved successfully",
      data: dms
    }
  } catch (error) {
    console.error("🔍 [GET-DMS] ❌ Error getting DMs:", error)
    return { isSuccess: false, message: "Failed to get DMs" }
  }
}

export async function updateDMAction(
  id: string,
  data: UpdateDMData
): Promise<ActionState<DMDocument>> {
  console.log("📝 [UPDATE-DM] Updating DM:", id)
  console.log("📝 [UPDATE-DM] Update data:", data)
  
  try {
    const dmRef = doc(db, DM_COLLECTIONS.DMS, id)
    
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }
    
    console.log("📝 [UPDATE-DM] Writing update to Firestore...")
    await updateDoc(dmRef, updateData)
    
    const updatedDoc = await getDoc(dmRef)
    if (!updatedDoc.exists()) {
      throw new Error("DM not found after update")
    }
    
    const updatedDM = updatedDoc.data() as DMDocument
    console.log("📝 [UPDATE-DM] ✅ DM updated successfully")
    
    return {
      isSuccess: true,
      message: "DM updated successfully",
      data: updatedDM
    }
  } catch (error) {
    console.error("📝 [UPDATE-DM] ❌ Error updating DM:", error)
    return { isSuccess: false, message: "Failed to update DM" }
  }
}

export async function deleteDMAction(id: string): Promise<ActionState<void>> {
  console.log("🗑️ [DELETE-DM] Deleting DM:", id)
  
  try {
    await deleteDoc(doc(db, DM_COLLECTIONS.DMS, id))
    console.log("🗑️ [DELETE-DM] ✅ DM deleted successfully")
    
    return {
      isSuccess: true,
      message: "DM deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("🗑️ [DELETE-DM] ❌ Error deleting DM:", error)
    return { isSuccess: false, message: "Failed to delete DM" }
  }
}

// DM Template Actions
export async function createDMTemplateAction(
  data: CreateDMTemplateData
): Promise<ActionState<DMTemplateDocument>> {
  console.log("📋 [CREATE-TEMPLATE] Creating DM template...")
  console.log("📋 [CREATE-TEMPLATE] Input data:", data)
  
  try {
    const templateRef = doc(collection(db, DM_COLLECTIONS.DM_TEMPLATES))
    
    const templateData = {
      id: templateRef.id,
      ...data,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    console.log("📋 [CREATE-TEMPLATE] Writing to Firestore...")
    await setDoc(templateRef, templateData)
    
    const createdDoc = await getDoc(templateRef)
    if (!createdDoc.exists()) {
      throw new Error("Failed to create template")
    }
    
    const createdTemplate = createdDoc.data() as DMTemplateDocument
    console.log("📋 [CREATE-TEMPLATE] ✅ Template created:", createdTemplate.id)
    
    return {
      isSuccess: true,
      message: "DM template created successfully",
      data: createdTemplate
    }
  } catch (error) {
    console.error("📋 [CREATE-TEMPLATE] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to create DM template" }
  }
}

export async function getDMTemplatesByOrganizationAction(
  organizationId: string
): Promise<ActionState<DMTemplateDocument[]>> {
  console.log("📋 [GET-TEMPLATES] Fetching templates for org:", organizationId)
  
  try {
    const templatesRef = collection(db, DM_COLLECTIONS.DM_TEMPLATES)
    const q = query(
      templatesRef,
      where("organizationId", "==", organizationId),
      orderBy("createdAt", "desc")
    )
    
    const querySnapshot = await getDocs(q)
    const templates = querySnapshot.docs.map(doc => doc.data() as DMTemplateDocument)
    
    console.log("📋 [GET-TEMPLATES] ✅ Found templates:", templates.length)
    
    return {
      isSuccess: true,
      message: "Templates retrieved successfully",
      data: templates
    }
  } catch (error) {
    console.error("📋 [GET-TEMPLATES] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to get templates" }
  }
}

export async function updateDMTemplateAction(
  id: string,
  data: UpdateDMTemplateData
): Promise<ActionState<DMTemplateDocument>> {
  console.log("📋 [UPDATE-TEMPLATE] Updating template:", id)
  
  try {
    const templateRef = doc(db, DM_COLLECTIONS.DM_TEMPLATES, id)
    
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }
    
    await updateDoc(templateRef, updateData)
    
    const updatedDoc = await getDoc(templateRef)
    if (!updatedDoc.exists()) {
      throw new Error("Template not found")
    }
    
    const updatedTemplate = updatedDoc.data() as DMTemplateDocument
    console.log("📋 [UPDATE-TEMPLATE] ✅ Template updated")
    
    return {
      isSuccess: true,
      message: "Template updated successfully",
      data: updatedTemplate
    }
  } catch (error) {
    console.error("📋 [UPDATE-TEMPLATE] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to update template" }
  }
}

export async function deleteDMTemplateAction(id: string): Promise<ActionState<void>> {
  console.log("📋 [DELETE-TEMPLATE] Deleting template:", id)
  
  try {
    await deleteDoc(doc(db, DM_COLLECTIONS.DM_TEMPLATES, id))
    console.log("📋 [DELETE-TEMPLATE] ✅ Template deleted")
    
    return {
      isSuccess: true,
      message: "Template deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("📋 [DELETE-TEMPLATE] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to delete template" }
  }
}

// DM Automation Actions
export async function createDMAutomationAction(
  data: CreateDMAutomationData
): Promise<ActionState<DMAutomationDocument>> {
  console.log("🤖 [CREATE-AUTOMATION] Creating automation...")
  console.log("🤖 [CREATE-AUTOMATION] Input data:", data)
  
  try {
    const automationRef = doc(collection(db, DM_COLLECTIONS.DM_AUTOMATIONS))
    
    const automationData = {
      id: automationRef.id,
      ...data,
      isActive: true,
      dmsSentToday: 0,
      lastResetAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    console.log("🤖 [CREATE-AUTOMATION] Writing to Firestore...")
    await setDoc(automationRef, automationData)
    
    const createdDoc = await getDoc(automationRef)
    if (!createdDoc.exists()) {
      throw new Error("Failed to create automation")
    }
    
    const createdAutomation = createdDoc.data() as DMAutomationDocument
    console.log("🤖 [CREATE-AUTOMATION] ✅ Automation created:", createdAutomation.id)
    
    return {
      isSuccess: true,
      message: "Automation created successfully",
      data: createdAutomation
    }
  } catch (error) {
    console.error("🤖 [CREATE-AUTOMATION] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to create automation" }
  }
}

export async function getDMAutomationsByOrganizationAction(
  organizationId: string
): Promise<ActionState<DMAutomationDocument[]>> {
  console.log("🤖 [GET-AUTOMATIONS] Fetching automations for org:", organizationId)
  
  try {
    const automationsRef = collection(db, DM_COLLECTIONS.DM_AUTOMATIONS)
    const q = query(
      automationsRef,
      where("organizationId", "==", organizationId),
      orderBy("createdAt", "desc")
    )
    
    const querySnapshot = await getDocs(q)
    const automations = querySnapshot.docs.map(doc => doc.data() as DMAutomationDocument)
    
    console.log("🤖 [GET-AUTOMATIONS] ✅ Found automations:", automations.length)
    
    return {
      isSuccess: true,
      message: "Automations retrieved successfully",
      data: automations
    }
  } catch (error) {
    console.error("🤖 [GET-AUTOMATIONS] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to get automations" }
  }
}

export async function updateDMAutomationAction(
  id: string,
  data: UpdateDMAutomationData
): Promise<ActionState<DMAutomationDocument>> {
  console.log("🤖 [UPDATE-AUTOMATION] Updating automation:", id)
  
  try {
    const automationRef = doc(db, DM_COLLECTIONS.DM_AUTOMATIONS, id)
    
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }
    
    await updateDoc(automationRef, updateData)
    
    const updatedDoc = await getDoc(automationRef)
    if (!updatedDoc.exists()) {
      throw new Error("Automation not found")
    }
    
    const updatedAutomation = updatedDoc.data() as DMAutomationDocument
    console.log("🤖 [UPDATE-AUTOMATION] ✅ Automation updated")
    
    return {
      isSuccess: true,
      message: "Automation updated successfully",
      data: updatedAutomation
    }
  } catch (error) {
    console.error("🤖 [UPDATE-AUTOMATION] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to update automation" }
  }
}

export async function deleteDMAutomationAction(id: string): Promise<ActionState<void>> {
  console.log("🤖 [DELETE-AUTOMATION] Deleting automation:", id)
  
  try {
    await deleteDoc(doc(db, DM_COLLECTIONS.DM_AUTOMATIONS, id))
    console.log("🤖 [DELETE-AUTOMATION] ✅ Automation deleted")
    
    return {
      isSuccess: true,
      message: "Automation deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("🤖 [DELETE-AUTOMATION] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to delete automation" }
  }
}

export async function getDMAutomationByIdAction(
  id: string
): Promise<ActionState<DMAutomationDocument | null>> {
  console.log("🤖 [GET-AUTOMATION-BY-ID] Fetching automation:", id)
  
  try {
    const automationRef = doc(db, DM_COLLECTIONS.DM_AUTOMATIONS, id)
    const automationDoc = await getDoc(automationRef)
    
    if (!automationDoc.exists()) {
      console.log("🤖 [GET-AUTOMATION-BY-ID] Automation not found")
      return {
        isSuccess: false,
        message: "Automation not found"
      }
    }
    
    const automation = automationDoc.data() as DMAutomationDocument
    console.log("🤖 [GET-AUTOMATION-BY-ID] ✅ Automation retrieved")
    
    return {
      isSuccess: true,
      message: "Automation retrieved successfully",
      data: automation
    }
  } catch (error) {
    console.error("🤖 [GET-AUTOMATION-BY-ID] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to get automation" }
  }
}

export async function getDMTemplateByIdAction(
  id: string
): Promise<ActionState<DMTemplateDocument | null>> {
  console.log("📋 [GET-TEMPLATE-BY-ID] Fetching template:", id)
  
  try {
    const templateRef = doc(db, DM_COLLECTIONS.DM_TEMPLATES, id)
    const templateDoc = await getDoc(templateRef)
    
    if (!templateDoc.exists()) {
      console.log("📋 [GET-TEMPLATE-BY-ID] Template not found")
      return {
        isSuccess: false,
        message: "Template not found"
      }
    }
    
    const template = templateDoc.data() as DMTemplateDocument
    console.log("📋 [GET-TEMPLATE-BY-ID] ✅ Template retrieved")
    
    return {
      isSuccess: true,
      message: "Template retrieved successfully",
      data: template
    }
  } catch (error) {
    console.error("📋 [GET-TEMPLATE-BY-ID] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to get template" }
  }
}

// DM History Actions
export async function createDMHistoryAction(
  data: Omit<DMHistoryDocument, "id" | "createdAt">
): Promise<ActionState<DMHistoryDocument>> {
  console.log("📜 [CREATE-HISTORY] Recording DM history...")
  
  try {
    const historyRef = doc(collection(db, DM_COLLECTIONS.DM_HISTORY))
    
    const historyData = {
      id: historyRef.id,
      ...data,
      createdAt: serverTimestamp()
    }
    
    await setDoc(historyRef, historyData)
    
    const createdDoc = await getDoc(historyRef)
    if (!createdDoc.exists()) {
      throw new Error("Failed to create history")
    }
    
    const createdHistory = createdDoc.data() as DMHistoryDocument
    console.log("📜 [CREATE-HISTORY] ✅ History recorded")
    
    return {
      isSuccess: true,
      message: "DM history recorded successfully",
      data: createdHistory
    }
  } catch (error) {
    console.error("📜 [CREATE-HISTORY] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to record DM history" }
  }
}

export async function getDMHistoryByOrganizationAction(
  organizationId: string,
  limitCount: number = 50
): Promise<ActionState<DMHistoryDocument[]>> {
  console.log("📜 [GET-HISTORY] Fetching DM history for org:", organizationId)
  
  try {
    const historyRef = collection(db, DM_COLLECTIONS.DM_HISTORY)
    const q = query(
      historyRef,
      where("organizationId", "==", organizationId),
      orderBy("sentAt", "desc"),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    const history = querySnapshot.docs.map(doc => doc.data() as DMHistoryDocument)
    
    console.log("📜 [GET-HISTORY] ✅ Found history entries:", history.length)
    
    return {
      isSuccess: true,
      message: "DM history retrieved successfully",
      data: history
    }
  } catch (error) {
    console.error("📜 [GET-HISTORY] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to get DM history" }
  }
}

// Check if user has already sent DM to a post author
export async function checkDMAlreadySentAction(
  organizationId: string,
  postAuthor: string
): Promise<ActionState<boolean>> {
  console.log("🔍 [CHECK-DM-SENT] Checking if DM already sent to:", postAuthor)
  
  try {
    const historyRef = collection(db, DM_COLLECTIONS.DM_HISTORY)
    const q = query(
      historyRef,
      where("organizationId", "==", organizationId),
      where("postAuthor", "==", postAuthor),
      limit(1)
    )
    
    const querySnapshot = await getDocs(q)
    const alreadySent = !querySnapshot.empty
    
    console.log("🔍 [CHECK-DM-SENT] Already sent?", alreadySent)
    
    return {
      isSuccess: true,
      message: alreadySent ? "DM already sent to this user" : "No DM sent to this user",
      data: alreadySent
    }
  } catch (error) {
    console.error("🔍 [CHECK-DM-SENT] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to check DM history" }
  }
} 