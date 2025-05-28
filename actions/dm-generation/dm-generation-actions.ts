"use server"

import { ActionState } from "@/types"
import { generateDMAction } from "@/actions/integrations/openai/dm-generation-actions"
import { Timestamp } from "firebase/firestore"

interface GeneratePersonalizedDMParams {
  postTitle: string
  postContent: string
  postAuthor: string
  postCreatedAt: string
  subreddit: string
  businessContext: string
  targetAudience: string
  valueProposition: string
}

interface GeneratedDM {
  message: string
  followUp?: string
}

export async function generatePersonalizedDMAction(
  params: GeneratePersonalizedDMParams
): Promise<ActionState<GeneratedDM>> {
  try {
    console.log("💬 [DM-GEN] Generating personalized DM...")
    console.log("💬 [DM-GEN] Post:", params.postTitle)
    console.log("💬 [DM-GEN] Author:", params.postAuthor)
    
    // Calculate how long ago the post was created
    const postDate = new Date(params.postCreatedAt)
    const now = new Date()
    const diffMs = now.getTime() - postDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    let timeReference = "recently"
    if (diffDays === 0) {
      timeReference = "today"
    } else if (diffDays === 1) {
      timeReference = "yesterday"
    } else if (diffDays < 7) {
      timeReference = "a few days ago"
    } else if (diffDays < 14) {
      timeReference = "last week"
    } else if (diffDays < 30) {
      timeReference = "a few weeks ago"
    } else {
      timeReference = "a while back"
    }
    
    // Convert string date to Timestamp for the OpenAI action
    const postCreatedAtTimestamp = Timestamp.fromDate(new Date(params.postCreatedAt))
    
    // Generate the DM using OpenAI
    const result = await generateDMAction({
      postTitle: params.postTitle,
      postContent: params.postContent,
      postAuthor: params.postAuthor,
      postCreatedAt: postCreatedAtTimestamp,
      subreddit: params.subreddit,
      businessContext: params.businessContext,
      targetAudience: params.targetAudience,
      valueProposition: params.valueProposition
    })
    
    if (result.isSuccess) {
      console.log("✅ [DM-GEN] DM generated successfully")
      return {
        isSuccess: true,
        message: "DM generated successfully",
        data: result.data
      }
    } else {
      console.error("❌ [DM-GEN] Failed to generate DM:", result.message)
      return {
        isSuccess: false,
        message: result.message
      }
    }
  } catch (error) {
    console.error("❌ [DM-GEN] Error generating DM:", error)
    return {
      isSuccess: false,
      message: `Failed to generate DM: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 