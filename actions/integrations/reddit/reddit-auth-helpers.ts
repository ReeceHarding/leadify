/*
<ai_context>
Helper functions for Reddit authentication using organization-based tokens.
This centralizes the logic for getting and refreshing Reddit tokens.
</ai_context>
*/

"use server"

import { ActionState } from "@/types"
import {
  getRedditTokensFromOrganizationAction,
  refreshRedditTokenFromOrganizationAction
} from "./reddit-oauth-organization-actions"

export interface RedditTokenResult {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  username?: string
}

/**
 * Get current Reddit tokens for an organization, automatically refreshing if needed
 */
export async function getCurrentOrganizationTokens(
  organizationId: string
): Promise<ActionState<RedditTokenResult>> {
  console.log("🔑 [REDDIT-AUTH-HELPER] Getting tokens for organization:", organizationId)
  
  // First try to get existing tokens
  const result = await getRedditTokensFromOrganizationAction(organizationId)
  
  if (result.isSuccess && result.data.accessToken) {
    // Check if token is expired
    const now = new Date()
    const expiresAt = result.data.expiresAt
    
    if (expiresAt && expiresAt > now) {
      console.log("✅ [REDDIT-AUTH-HELPER] Token is valid")
      return result
    }
    
    console.log("🔄 [REDDIT-AUTH-HELPER] Token expired, attempting refresh")
  }
  
  // If no valid token or expired, try to refresh
  if (result.data?.refreshToken) {
    console.log("🔄 [REDDIT-AUTH-HELPER] Refreshing token...")
    const refreshResult = await refreshRedditTokenFromOrganizationAction(organizationId)
    
    if (refreshResult.isSuccess) {
      console.log("✅ [REDDIT-AUTH-HELPER] Token refreshed successfully")
      // Get the updated tokens
      return getRedditTokensFromOrganizationAction(organizationId)
    } else {
      console.error("❌ [REDDIT-AUTH-HELPER] Token refresh failed:", refreshResult.message)
    }
  }
  
  // If we get here, we couldn't get valid tokens
  return {
    isSuccess: false,
    message: "No valid Reddit access token available. Please reconnect your Reddit account in organization settings."
  }
}

/**
 * Make an authenticated Reddit API GET request
 */
export async function makeRedditApiGet(
  organizationId: string,
  endpoint: string
): Promise<Response> {
  const tokenResult = await getCurrentOrganizationTokens(organizationId)
  
  if (!tokenResult.isSuccess) {
    throw new Error(tokenResult.message)
  }
  
  const response = await fetch(`https://oauth.reddit.com${endpoint}`, {
    headers: {
      Authorization: `Bearer ${tokenResult.data.accessToken}`,
      "User-Agent": process.env.REDDIT_USER_AGENT || "Leadify/1.0"
    }
  })
  
  return response
}

/**
 * Make an authenticated Reddit API POST request
 */
export async function makeRedditApiPost(
  organizationId: string,
  endpoint: string,
  body: Record<string, any>
): Promise<Response> {
  const tokenResult = await getCurrentOrganizationTokens(organizationId)
  
  if (!tokenResult.isSuccess) {
    throw new Error(tokenResult.message)
  }
  
  const response = await fetch(`https://oauth.reddit.com${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenResult.data.accessToken}`,
      "User-Agent": process.env.REDDIT_USER_AGENT || "Leadify/1.0",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(body).toString()
  })
  
  return response
} 