"use server"

import { ActionState } from "@/types"
import { getCurrentOrganizationTokens } from "@/actions/integrations/reddit/reddit-auth-helpers"
import { loggers } from "@/lib/logger"

const logger = loggers.reddit

interface SendDMResult {
  success: boolean
  messageId?: string
}

export async function sendRedditDMAction(
  organizationId: string,
  recipientUsername: string,
  subject: string,
  message: string
): Promise<ActionState<SendDMResult>> {
  try {
    logger.info(`📨 [REDDIT-DM] Sending DM to u/${recipientUsername}`)
    console.log(`📨 [REDDIT-DM] Organization: ${organizationId}`)
    console.log(`📨 [REDDIT-DM] Subject: ${subject}`)
    console.log(`📨 [REDDIT-DM] Message length: ${message.length}`)

    // Get Reddit access token
    const tokenResult = await getCurrentOrganizationTokens(organizationId)
    if (!tokenResult.isSuccess || !tokenResult.data.accessToken) {
      logger.error("❌ [REDDIT-DM] No valid Reddit access token")
      return {
        isSuccess: false,
        message: "No valid Reddit access token. Please re-authenticate with Reddit."
      }
    }

    const accessToken = tokenResult.data.accessToken

    // Send the DM using Reddit API
    const response = await fetch("https://oauth.reddit.com/api/compose", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "Leadify:1.0.0 (by /u/leadify_bot)",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        api_type: "json",
        subject: subject,
        text: message,
        to: recipientUsername
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`❌ [REDDIT-DM] Reddit API error: ${response.status} - ${errorText}`)
      
      if (response.status === 403) {
        return {
          isSuccess: false,
          message: "User has blocked DMs or you don't have permission to message them"
        }
      }
      
      if (response.status === 404) {
        return {
          isSuccess: false,
          message: "User not found"
        }
      }
      
      return {
        isSuccess: false,
        message: `Failed to send DM: ${response.statusText}`
      }
    }

    const data = await response.json()
    
    // Check for Reddit API errors
    if (data.json?.errors?.length > 0) {
      const error = data.json.errors[0]
      logger.error(`❌ [REDDIT-DM] Reddit API error:`, error)
      
      if (error[0] === "USER_DOESNT_EXIST") {
        return {
          isSuccess: false,
          message: "User not found or has deleted their account"
        }
      }
      
      if (error[0] === "NOT_WHITELISTED_BY_USER_MESSAGE") {
        return {
          isSuccess: false,
          message: "User has disabled DMs from users they don't follow"
        }
      }
      
      return {
        isSuccess: false,
        message: `Reddit error: ${error[1] || error[0]}`
      }
    }

    logger.info(`✅ [REDDIT-DM] DM sent successfully to u/${recipientUsername}`)
    
    return {
      isSuccess: true,
      message: "DM sent successfully",
      data: {
        success: true,
        messageId: data.json?.data?.name || undefined
      }
    }
  } catch (error) {
    logger.error("❌ [REDDIT-DM] Error sending DM:", error)
    return {
      isSuccess: false,
      message: `Failed to send DM: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function checkDMStatusAction(
  organizationId: string,
  messageId: string
): Promise<ActionState<{ status: string; replies?: any[] }>> {
  try {
    logger.info(`🔍 [REDDIT-DM] Checking DM status: ${messageId}`)

    // Get Reddit access token
    const tokenResult = await getCurrentOrganizationTokens(organizationId)
    if (!tokenResult.isSuccess || !tokenResult.data.accessToken) {
      return {
        isSuccess: false,
        message: "No valid Reddit access token"
      }
    }

    const accessToken = tokenResult.data.accessToken

    // Get message details
    const response = await fetch(`https://oauth.reddit.com/message/messages/${messageId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "Leadify:1.0.0 (by /u/leadify_bot)"
      }
    })

    if (!response.ok) {
      return {
        isSuccess: false,
        message: `Failed to check DM status: ${response.statusText}`
      }
    }

    const data = await response.json()
    
    return {
      isSuccess: true,
      message: "DM status retrieved",
      data: {
        status: data.data?.replies ? "replied" : "sent",
        replies: data.data?.replies || []
      }
    }
  } catch (error) {
    logger.error("❌ [REDDIT-DM] Error checking DM status:", error)
    return {
      isSuccess: false,
      message: `Failed to check DM status: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 