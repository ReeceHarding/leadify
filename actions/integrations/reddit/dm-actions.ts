"use server"

import { ActionState } from "@/types"
import { getCurrentOrganizationTokens } from "./reddit-auth-helpers"

interface SendDMData {
  organizationId: string
  recipientUsername: string
  subject: string
  message: string
}

interface SendDMResponse {
  messageId: string
  conversationId: string
}

export async function sendRedditDMAction(
  data: SendDMData
): Promise<ActionState<SendDMResponse>> {
  console.log("📨 [SEND-DM] Starting Reddit DM send...")
  console.log("📨 [SEND-DM] Organization:", data.organizationId)
  console.log("📨 [SEND-DM] Recipient:", data.recipientUsername)
  console.log("📨 [SEND-DM] Subject:", data.subject)
  console.log("📨 [SEND-DM] Message length:", data.message.length)
  
  try {
    // Get access token for organization
    const tokenResult = await getCurrentOrganizationTokens(data.organizationId)
    if (!tokenResult.isSuccess) {
      throw new Error(tokenResult.message)
    }
    
    const accessToken = tokenResult.data.accessToken
    console.log("📨 [SEND-DM] Got access token")
    
    // Reddit API endpoint for sending messages
    const url = "https://oauth.reddit.com/api/compose"
    
    // Prepare the form data
    const formData = new URLSearchParams({
      api_type: "json",
      subject: data.subject,
      text: data.message,
      to: data.recipientUsername
    })
    
    console.log("📨 [SEND-DM] Sending request to Reddit API...")
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "User-Agent": "Leadify/1.0.0",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    })
    
    console.log("📨 [SEND-DM] Response status:", response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error("📨 [SEND-DM] Error response:", errorText)
      throw new Error(`Reddit API error: ${response.status} - ${errorText}`)
    }
    
    const result = await response.json()
    console.log("📨 [SEND-DM] API Response:", JSON.stringify(result, null, 2))
    
    // Check for Reddit API errors
    if (result.json?.errors?.length > 0) {
      const error = result.json.errors[0]
      throw new Error(`Reddit error: ${error[0]} - ${error[1]}`)
    }
    
    // Extract message data from response
    const messageData = result.json?.data
    if (!messageData) {
      throw new Error("No message data in response")
    }
    
    console.log("📨 [SEND-DM] ✅ DM sent successfully")
    console.log("📨 [SEND-DM] Message ID:", messageData.id)
    
    return {
      isSuccess: true,
      message: "DM sent successfully",
      data: {
        messageId: messageData.id || "unknown",
        conversationId: messageData.name || "unknown"
      }
    }
  } catch (error) {
    console.error("📨 [SEND-DM] ❌ Error sending DM:", error)
    return { 
      isSuccess: false, 
      message: error instanceof Error ? error.message : "Failed to send DM" 
    }
  }
}

// Send follow-up DM in existing conversation
export async function sendFollowUpDMAction(
  organizationId: string,
  conversationId: string,
  message: string
): Promise<ActionState<SendDMResponse>> {
  console.log("📨 [SEND-FOLLOWUP] Sending follow-up DM...")
  console.log("📨 [SEND-FOLLOWUP] Organization:", organizationId)
  console.log("📨 [SEND-FOLLOWUP] Conversation ID:", conversationId)
  console.log("📨 [SEND-FOLLOWUP] Message length:", message.length)
  
  try {
    // Get access token for organization
    const tokenResult = await getCurrentOrganizationTokens(organizationId)
    if (!tokenResult.isSuccess) {
      throw new Error(tokenResult.message)
    }
    
    const token = tokenResult.data.accessToken
    
    // Reddit API endpoint for replying to messages
    const url = "https://oauth.reddit.com/api/comment"
    
    const formData = new URLSearchParams({
      api_type: "json",
      text: message,
      thing_id: conversationId
    })
    
    console.log("📨 [SEND-FOLLOWUP] Sending request to Reddit API...")
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": "Leadify/1.0.0",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error("📨 [SEND-FOLLOWUP] Error response:", errorText)
      throw new Error(`Reddit API error: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (result.json?.errors?.length > 0) {
      const error = result.json.errors[0]
      throw new Error(`Reddit error: ${error[0]} - ${error[1]}`)
    }
    
    console.log("📨 [SEND-FOLLOWUP] ✅ Follow-up sent successfully")
    
    return {
      isSuccess: true,
      message: "Follow-up DM sent successfully",
      data: {
        messageId: result.json?.data?.things?.[0]?.data?.id || "unknown",
        conversationId: conversationId
      }
    }
  } catch (error) {
    console.error("📨 [SEND-FOLLOWUP] ❌ Error:", error)
    return { 
      isSuccess: false, 
      message: error instanceof Error ? error.message : "Failed to send follow-up" 
    }
  }
}

// Check if we can send DM to a user (rate limits, blocks, etc.)
export async function checkCanSendDMAction(
  organizationId: string,
  username: string
): Promise<ActionState<boolean>> {
  console.log("🔍 [CHECK-CAN-DM] Checking if can DM user:", username)
  console.log("🔍 [CHECK-CAN-DM] Organization:", organizationId)
  
  try {
    const tokenResult = await getCurrentOrganizationTokens(organizationId)
    if (!tokenResult.isSuccess) {
      throw new Error(tokenResult.message)
    }
    
    const token = tokenResult.data.accessToken
    
    // Get user info to check if they accept DMs
    const url = `https://oauth.reddit.com/user/${username}/about`
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": "Leadify/1.0.0"
      }
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log("🔍 [CHECK-CAN-DM] User not found")
        return {
          isSuccess: true,
          message: "User not found",
          data: false
        }
      }
      throw new Error(`Reddit API error: ${response.status}`)
    }
    
    const userData = await response.json()
    
    // Check if user accepts PMs
    const acceptsPMs = userData.data?.accept_pms !== false
    const isSuspended = userData.data?.is_suspended === true
    
    console.log("🔍 [CHECK-CAN-DM] User accepts PMs:", acceptsPMs)
    console.log("🔍 [CHECK-CAN-DM] User suspended:", isSuspended)
    
    const canSend = acceptsPMs && !isSuspended
    
    return {
      isSuccess: true,
      message: canSend ? "Can send DM to user" : "Cannot send DM to user",
      data: canSend
    }
  } catch (error) {
    console.error("🔍 [CHECK-CAN-DM] ❌ Error:", error)
    return { 
      isSuccess: false, 
      message: "Failed to check DM status" 
    }
  }
} 