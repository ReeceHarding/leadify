"use server"

import { db } from "@/db/db"
import {
  ActionState,
  LeadGenerationProgress,
  LEAD_GENERATION_STAGES
} from "@/types"
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore"

export async function createLeadGenerationProgressAction(
  campaignId: string
): Promise<ActionState<LeadGenerationProgress>> {
  try {
    const progressRef = doc(db, "lead_generation_progress", campaignId)

    const progressData: LeadGenerationProgress = {
      campaignId,
      status: "pending",
      currentStage: "Initializing",
      stages: LEAD_GENERATION_STAGES.map(stage => ({
        name: stage.name,
        status: "pending"
      })),
      totalProgress: 0,
      startedAt: serverTimestamp() as Timestamp
    }

    await setDoc(progressRef, progressData)

    return {
      isSuccess: true,
      message: "Progress tracking created",
      data: progressData
    }
  } catch (error) {
    console.error("Error creating progress:", error)
    return {
      isSuccess: false,
      message: "Failed to create progress tracking"
    }
  }
}

export async function updateLeadGenerationProgressAction(
  campaignId: string,
  updates: {
    status?: "pending" | "in_progress" | "completed" | "error"
    currentStage?: string
    stageUpdate?: {
      stageName: string
      status: "pending" | "in_progress" | "completed" | "error"
      message?: string
      progress?: number
    }
    totalProgress?: number
    error?: string
    results?: LeadGenerationProgress["results"]
  }
): Promise<ActionState<void>> {
  try {
    const progressRef = doc(db, "lead_generation_progress", campaignId)
    const progressDoc = await getDoc(progressRef)

    if (!progressDoc.exists()) {
      return {
        isSuccess: false,
        message: "Progress tracking not found"
      }
    }

    const currentData = progressDoc.data() as LeadGenerationProgress
    const updateData: Record<string, any> = {
      updatedAt: serverTimestamp()
    }

    if (updates.status) {
      updateData.status = updates.status
      if (updates.status === "completed" && !currentData.completedAt) {
        updateData.completedAt = serverTimestamp()
      }
      if (updates.status === "error" && !updates.error) {
        updateData.error = "An unspecified error occurred."
      }
    }

    if (updates.currentStage) {
      updateData.currentStage = updates.currentStage
    }

    if (updates.stageUpdate) {
      const stageIndex = currentData.stages.findIndex(
        s => s.name === updates.stageUpdate!.stageName
      )

      if (stageIndex !== -1) {
        const updatedStages = [...currentData.stages]
        const stageToUpdate = { ...updatedStages[stageIndex] }

        stageToUpdate.status = updates.stageUpdate.status
        
        if (updates.stageUpdate.message !== undefined) {
          stageToUpdate.message = updates.stageUpdate.message
        }
        if (updates.stageUpdate.progress !== undefined) {
          stageToUpdate.progress = updates.stageUpdate.progress
        }

        if (
          updates.stageUpdate.status === "in_progress" &&
          !stageToUpdate.startedAt
        ) {
          stageToUpdate.startedAt = serverTimestamp() as Timestamp
        }

        if (updates.stageUpdate.status === "completed" && !stageToUpdate.completedAt) {
          stageToUpdate.completedAt = serverTimestamp() as Timestamp
        }
        
        updatedStages[stageIndex] = stageToUpdate
        updateData.stages = updatedStages
      } else {
        console.warn(`[PROGRESS-UPDATE] Stage "${updates.stageUpdate.stageName}" not found for campaign ${campaignId}`)
      }
    }

    if (updates.totalProgress !== undefined) {
      updateData.totalProgress = updates.totalProgress
    }

    if (updates.error && updates.error.trim() !== "") {
      updateData.error = updates.error
      if (updateData.status !== 'error') {
        updateData.status = 'error'
      }
    } else if (updates.hasOwnProperty('error') && updates.error === null) {
      updateData.error = null
    }

    if (updates.results) {
      updateData.results = updates.results
    }
    
    for (const key in updateData) {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    }

    if (Object.keys(updateData).length > 1) {
        await setDoc(progressRef, updateData, { merge: true })
        console.log(`[PROGRESS-UPDATE] Progress updated for ${campaignId}:`, updateData)
    } else {
        console.log(`[PROGRESS-UPDATE] No actual changes to update for ${campaignId} besides timestamp.`)
    }

    return {
      isSuccess: true,
      message: "Progress updated",
      data: undefined
    }
  } catch (error) {
    console.error("Error updating progress:", error)
    return {
      isSuccess: false,
      message: "Failed to update progress"
    }
  }
}

export async function getLeadGenerationProgressAction(
  campaignId: string
): Promise<ActionState<LeadGenerationProgress | null>> {
  try {
    const progressRef = doc(db, "lead_generation_progress", campaignId)
    const progressDoc = await getDoc(progressRef)

    if (!progressDoc.exists()) {
      return {
        isSuccess: true,
        message: "No progress found",
        data: null
      }
    }

    return {
      isSuccess: true,
      message: "Progress retrieved",
      data: progressDoc.data() as LeadGenerationProgress
    }
  } catch (error) {
    console.error("Error getting progress:", error)
    return {
      isSuccess: false,
      message: "Failed to get progress"
    }
  }
}
