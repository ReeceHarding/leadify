"use server"

import { db } from "@/db/db"
import {
  DM_PROGRESS_COLLECTIONS,
  DMProgressDocument,
  CreateDMProgressData,
  UpdateDMProgressData,
  DM_PROGRESS_STAGES,
  StageStatus
} from "@/db/firestore/dm-progress-collections"
import { ActionState } from "@/types"
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore"

export async function createDMProgressAction(
  automationId: string,
  organizationId: string,
  userId: string
): Promise<ActionState<DMProgressDocument>> {
  console.log("📊 [CREATE-DM-PROGRESS] Creating progress tracking for automation:", automationId)
  
  try {
    const progressRef = doc(db, DM_PROGRESS_COLLECTIONS.DM_PROGRESS, automationId)
    
    // Initialize all stages as pending
    const stages: StageStatus[] = DM_PROGRESS_STAGES.map(stageName => ({
      name: stageName,
      status: "pending" as const
    }))
    
    const progressData: Omit<DMProgressDocument, "id"> = {
      automationId,
      organizationId,
      userId,
      status: "pending",
      currentStage: "Initializing",
      stages,
      totalProgress: 0,
      startedAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    }
    
    console.log("📊 [CREATE-DM-PROGRESS] Writing progress document...")
    await setDoc(progressRef, progressData)
    
    const createdDoc = await getDoc(progressRef)
    if (!createdDoc.exists()) {
      throw new Error("Failed to create progress document")
    }
    
    const createdProgress = { id: automationId, ...createdDoc.data() } as DMProgressDocument
    console.log("📊 [CREATE-DM-PROGRESS] ✅ Progress tracking created")
    
    return {
      isSuccess: true,
      message: "DM progress tracking created",
      data: createdProgress
    }
  } catch (error) {
    console.error("📊 [CREATE-DM-PROGRESS] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to create DM progress tracking" }
  }
}

export async function getDMProgressAction(
  automationId: string
): Promise<ActionState<DMProgressDocument | null>> {
  console.log("📊 [GET-DM-PROGRESS] Fetching progress for automation:", automationId)
  
  try {
    const progressRef = doc(db, DM_PROGRESS_COLLECTIONS.DM_PROGRESS, automationId)
    const progressDoc = await getDoc(progressRef)
    
    if (!progressDoc.exists()) {
      console.log("📊 [GET-DM-PROGRESS] No progress document found")
      return {
        isSuccess: true,
        message: "No progress found",
        data: null
      }
    }
    
    const progress = { id: automationId, ...progressDoc.data() } as DMProgressDocument
    console.log("📊 [GET-DM-PROGRESS] ✅ Progress retrieved")
    
    return {
      isSuccess: true,
      message: "Progress retrieved successfully",
      data: progress
    }
  } catch (error) {
    console.error("📊 [GET-DM-PROGRESS] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to get DM progress" }
  }
}

export async function updateDMProgressAction(
  automationId: string,
  data: UpdateDMProgressData
): Promise<ActionState<DMProgressDocument>> {
  console.log("📊 [UPDATE-DM-PROGRESS] Updating progress for automation:", automationId)
  console.log("📊 [UPDATE-DM-PROGRESS] Update data:", data)
  
  try {
    const progressRef = doc(db, DM_PROGRESS_COLLECTIONS.DM_PROGRESS, automationId)
    
    // Get current progress
    const currentDoc = await getDoc(progressRef)
    if (!currentDoc.exists()) {
      throw new Error("Progress document not found")
    }
    
    const currentProgress = currentDoc.data() as DMProgressDocument
    let updatedStages = [...currentProgress.stages]
    
    // Update stage if provided
    if (data.stageUpdate) {
      const stageIndex = updatedStages.findIndex(
        s => s.name === data.stageUpdate!.stageName
      )
      
      if (stageIndex !== -1) {
        updatedStages[stageIndex] = {
          ...updatedStages[stageIndex],
          status: data.stageUpdate.status,
          message: data.stageUpdate.message,
          progress: data.stageUpdate.progress
        }
        
        // Set timestamps
        if (data.stageUpdate.status === "in_progress" && !updatedStages[stageIndex].startedAt) {
          updatedStages[stageIndex].startedAt = Timestamp.now()
        } else if (data.stageUpdate.status === "completed" || data.stageUpdate.status === "error") {
          updatedStages[stageIndex].completedAt = Timestamp.now()
        }
      }
    }
    
    // Prepare update data
    const updateData: any = {
      ...data,
      stages: updatedStages,
      updatedAt: serverTimestamp()
    }
    
    // Remove stageUpdate from updateData as it's already processed
    delete updateData.stageUpdate
    
    // Set completedAt if status is completed or error
    if (data.status === "completed" || data.status === "error") {
      updateData.completedAt = serverTimestamp()
    }
    
    console.log("📊 [UPDATE-DM-PROGRESS] Writing update...")
    await updateDoc(progressRef, updateData)
    
    const updatedDoc = await getDoc(progressRef)
    const updatedProgress = { id: automationId, ...updatedDoc.data() } as DMProgressDocument
    
    console.log("📊 [UPDATE-DM-PROGRESS] ✅ Progress updated")
    console.log("📊 [UPDATE-DM-PROGRESS] Current stage:", updatedProgress.currentStage)
    console.log("📊 [UPDATE-DM-PROGRESS] Total progress:", updatedProgress.totalProgress)
    
    return {
      isSuccess: true,
      message: "Progress updated successfully",
      data: updatedProgress
    }
  } catch (error) {
    console.error("📊 [UPDATE-DM-PROGRESS] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to update DM progress" }
  }
}

export async function deleteDMProgressAction(
  automationId: string
): Promise<ActionState<void>> {
  console.log("📊 [DELETE-DM-PROGRESS] Deleting progress for automation:", automationId)
  
  try {
    const progressRef = doc(db, DM_PROGRESS_COLLECTIONS.DM_PROGRESS, automationId)
    await updateDoc(progressRef, {
      status: "completed",
      updatedAt: serverTimestamp()
    })
    
    console.log("📊 [DELETE-DM-PROGRESS] ✅ Progress marked as completed")
    
    return {
      isSuccess: true,
      message: "Progress completed",
      data: undefined
    }
  } catch (error) {
    console.error("📊 [DELETE-DM-PROGRESS] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to complete DM progress" }
  }
} 