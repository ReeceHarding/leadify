/*
<ai_context>
Contains server actions for Reddit OAuth2 authentication flow with user-specific token storage in Firestore.
</ai_context>
*/

"use server"

import { ActionState, RedditOAuthTokens } from "@/types"
import { auth } from "@clerk/nextjs/server"
import {
  updateProfileAction,
  getProfileByUserIdAction
} from "@/actions/db/profiles-actions"
import { Timestamp } from "firebase/firestore"
import { cookies } from "next/headers"

export async function saveRedditTokensToProfileAction(
  tokens: RedditOAuthTokens,
  username: string
): Promise<ActionState<void>> {
  try {
    console.log(
      "🔧 [SAVE-REDDIT-TOKENS] Saving Reddit tokens to user profile..."
    )

    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "User not authenticated" }
    }

    // Calculate expiration timestamp
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + tokens.expires_in * 1000)
    )

    const updateResult = await updateProfileAction(userId, {
      redditAccessToken: tokens.access_token,
      redditRefreshToken: tokens.refresh_token,
      redditTokenExpiresAt: expiresAt,
      redditUsername: username
    })

    if (!updateResult.isSuccess) {
      return updateResult
    }

    console.log(
      "✅ [SAVE-REDDIT-TOKENS] Reddit tokens saved to profile successfully"
    )

    return {
      isSuccess: true,
      message: "Reddit tokens saved successfully",
      data: undefined
    }
  } catch (error) {
    console.error("❌ [SAVE-REDDIT-TOKENS] Error saving Reddit tokens:", error)
    return {
      isSuccess: false,
      message: `Failed to save Reddit tokens: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function getRedditTokensFromProfileAction(): Promise<
  ActionState<{
    accessToken: string
    refreshToken?: string
    expiresAt?: Date
    username?: string
  }>
> {
  try {
    console.log(
      "🔧 [GET-REDDIT-TOKENS] Getting Reddit tokens from user profile..."
    )

    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "User not authenticated" }
    }

    const profileResult = await getProfileByUserIdAction(userId)
    if (!profileResult.isSuccess || !profileResult.data) {
      return { isSuccess: false, message: "Profile not found" }
    }

    const profile = profileResult.data

    if (!profile.redditAccessToken) {
      return {
        isSuccess: false,
        message: "No Reddit access token found in profile"
      }
    }

    console.log("✅ [GET-REDDIT-TOKENS] Reddit tokens retrieved from profile")

    return {
      isSuccess: true,
      message: "Reddit tokens retrieved",
      data: {
        accessToken: profile.redditAccessToken,
        refreshToken: profile.redditRefreshToken,
        expiresAt: profile.redditTokenExpiresAt
          ? new Date(profile.redditTokenExpiresAt)
          : undefined,
        username: profile.redditUsername
      }
    }
  } catch (error) {
    console.error("❌ [GET-REDDIT-TOKENS] Error getting Reddit tokens:", error)
    return {
      isSuccess: false,
      message: `Failed to get Reddit tokens: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function refreshRedditTokenFromProfileAction(): Promise<
  ActionState<RedditOAuthTokens>
> {
  try {
    console.log("🔧 [REFRESH-REDDIT-TOKEN] Refreshing Reddit token...")

    if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
      return { isSuccess: false, message: "Reddit credentials not configured" }
    }

    const tokensResult = await getRedditTokensFromProfileAction()
    if (!tokensResult.isSuccess || !tokensResult.data.refreshToken) {
      return { isSuccess: false, message: "No refresh token available" }
    }

    const tokenResponse = await fetch(
      "https://www.reddit.com/api/v1/access_token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            process.env.REDDIT_USER_AGENT || "reddit-lead-gen:v1.0.0"
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokensResult.data.refreshToken
        })
      }
    )

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Token refresh failed:", errorText)
      return {
        isSuccess: false,
        message: `Token refresh failed: ${tokenResponse.status}`
      }
    }

    const tokens: RedditOAuthTokens = await tokenResponse.json()

    // Save updated tokens to profile
    await saveRedditTokensToProfileAction(
      tokens,
      tokensResult.data.username || ""
    )

    console.log(
      "✅ [REFRESH-REDDIT-TOKEN] Reddit tokens refreshed successfully"
    )

    return {
      isSuccess: true,
      message: "Reddit tokens refreshed",
      data: tokens
    }
  } catch (error) {
    console.error(
      "❌ [REFRESH-REDDIT-TOKEN] Error refreshing Reddit tokens:",
      error
    )
    return {
      isSuccess: false,
      message: `Failed to refresh tokens: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function clearRedditTokensFromProfileAction(): Promise<
  ActionState<void>
> {
  try {
    console.log(
      "🔧 [CLEAR-REDDIT-TOKENS] Clearing Reddit tokens from profile..."
    )

    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "User not authenticated" }
    }

    const updateResult = await updateProfileAction(userId, {
      redditAccessToken: undefined,
      redditRefreshToken: undefined,
      redditTokenExpiresAt: undefined,
      redditUsername: undefined
    })

    if (!updateResult.isSuccess) {
      return updateResult
    }

    console.log("✅ [CLEAR-REDDIT-TOKENS] Reddit tokens cleared from profile")

    return {
      isSuccess: true,
      message: "Reddit tokens cleared successfully",
      data: undefined
    }
  } catch (error) {
    console.error(
      "❌ [CLEAR-REDDIT-TOKENS] Error clearing Reddit tokens:",
      error
    )
    return {
      isSuccess: false,
      message: "Failed to clear Reddit tokens"
    }
  }
}

export async function exchangeRedditCodeForTokensUserAction(
  code: string,
  state: string
): Promise<ActionState<RedditOAuthTokens>> {
  try {
    console.log(
      "🔧 [EXCHANGE-REDDIT-CODE] Exchanging Reddit code for tokens..."
    )

    if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
      return { isSuccess: false, message: "Reddit credentials not configured" }
    }

    // Verify state parameter
    const cookieStore = await cookies()
    const storedState = cookieStore.get("reddit_oauth_state")?.value

    if (!storedState || storedState !== state) {
      return { isSuccess: false, message: "Invalid state parameter" }
    }

    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3000"

    const redirectUri = `${baseUrl}/api/reddit/callback`

    // Exchange code for tokens
    const tokenResponse = await fetch(
      "https://www.reddit.com/api/v1/access_token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            process.env.REDDIT_USER_AGENT || "reddit-lead-gen:v1.0.0"
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri
        })
      }
    )

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Token exchange failed:", errorText)
      return {
        isSuccess: false,
        message: `Token exchange failed: ${tokenResponse.status}`
      }
    }

    const tokens: RedditOAuthTokens = await tokenResponse.json()

    // Get Reddit username
    const userResponse = await fetch("https://oauth.reddit.com/api/v1/me", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "User-Agent": process.env.REDDIT_USER_AGENT || "reddit-lead-gen:v1.0.0"
      }
    })

    let username = ""
    if (userResponse.ok) {
      const userData = await userResponse.json()
      username = userData.name
    }

    // Save tokens to user profile
    await saveRedditTokensToProfileAction(tokens, username)

    // Clear the state cookie
    cookieStore.delete("reddit_oauth_state")

    console.log(
      "✅ [EXCHANGE-REDDIT-CODE] Reddit OAuth tokens obtained and saved"
    )

    return {
      isSuccess: true,
      message: "Reddit authentication successful",
      data: tokens
    }
  } catch (error) {
    console.error(
      "❌ [EXCHANGE-REDDIT-CODE] Error exchanging Reddit code:",
      error
    )
    return {
      isSuccess: false,
      message: `Failed to exchange code: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}
