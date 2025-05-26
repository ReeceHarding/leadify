"use server"

import { db } from "@/db/db"
import { ActionState } from "@/types"
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from "firebase/firestore"

export interface LeadGenerationProgress {
  campaignId: string
  status: "pending" | "in_progress" | "completed" | "error"
  currentStage: string
  stages: {
    name: string
    status: "pending" | "in_progress" | "completed" | "error"
    startedAt?: Timestamp
    completedAt?: Timestamp
    message?: string
    progress?: number // 0-100
  }[]
  totalProgress: number // 0-100
  startedAt: Timestamp
  completedAt?: Timestamp
  error?: string
  results?: {
    totalThreadsFound: number
    totalThreadsAnalyzed: number
    totalCommentsGenerated: number
    averageRelevanceScore: number
  }
}

export const LEAD_GENERATION_STAGES = [
  { name: "Initializing", duration: 3000 },
  { name: "Analyzing Business", duration: 5000 },
  { name: "Scraping Website", duration: 8000 },
  { name: "Searching Reddit", duration: 12000 },
  { name: "Retrieving Threads", duration: 10000 },
  { name: "Analyzing Relevance", duration: 8000 },
  { name: "Generating Comments", duration: 10000 },
  { name: "Finalizing Results", duration: 4000 }
]

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
    const updateData: any = {}

    if (updates.status) {
      updateData.status = updates.status
      if (updates.status === "completed") {
        updateData.completedAt = serverTimestamp()
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
        updatedStages[stageIndex] = {
          ...updatedStages[stageIndex],
          status: updates.stageUpdate.status,
          message: updates.stageUpdate.message,
          progress: updates.stageUpdate.progress
        }

        if (updates.stageUpdate.status === "in_progress" && !updatedStages[stageIndex].startedAt) {
          updatedStages[stageIndex].startedAt = serverTimestamp() as Timestamp
        }

        if (updates.stageUpdate.status === "completed") {
          updatedStages[stageIndex].completedAt = serverTimestamp() as Timestamp
        }

        updateData.stages = updatedStages
      }
    }

    if (updates.totalProgress !== undefined) {
      updateData.totalProgress = updates.totalProgress
    }

    if (updates.error) {
      updateData.error = updates.error
    }

    if (updates.results) {
      updateData.results = updates.results
    }

    await setDoc(progressRef, updateData, { merge: true })

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