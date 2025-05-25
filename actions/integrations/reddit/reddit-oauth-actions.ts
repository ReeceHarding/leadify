/*
<ai_context>
Contains server actions for Reddit OAuth2 authentication flow.
</ai_context>
*/

"use server"

import { ActionState } from "@/types"
import { cookies } from "next/headers"

export interface RedditOAuthTokens {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  refresh_token?: string
}

export async function generateRedditAuthUrlAction(): Promise<
  ActionState<{ authUrl: string }>
> {
  try {
    if (!process.env.REDDIT_CLIENT_ID) {
      return { isSuccess: false, message: "Reddit client ID not configured" }
    }

    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3000"

    const redirectUri = `${baseUrl}/api/reddit/callback`
    const state = crypto.randomUUID()
    const scopes = ["identity", "read", "submit", "edit", "history"]

    // Store state in cookie for verification
    const cookieStore = await cookies()
    cookieStore.set("reddit_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60 // 10 minutes
    })

    const authUrl = new URL("https://www.reddit.com/api/v1/authorize")
    authUrl.searchParams.set("client_id", process.env.REDDIT_CLIENT_ID)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("state", state)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("duration", "permanent")
    authUrl.searchParams.set("scope", scopes.join(" "))

    console.log(`🔗 Generated Reddit OAuth URL: ${authUrl.toString()}`)
    console.log(`📍 Callback URL to configure in Reddit app: ${redirectUri}`)

    return {
      isSuccess: true,
      message: "Reddit authorization URL generated",
      data: { authUrl: authUrl.toString() }
    }
  } catch (error) {
    console.error("Error generating Reddit auth URL:", error)
    return {
      isSuccess: false,
      message: `Failed to generate auth URL: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function exchangeRedditCodeForTokensAction(
  code: string,
  state: string
): Promise<ActionState<RedditOAuthTokens>> {
  try {
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

    // Clear the state cookie
    cookieStore.delete("reddit_oauth_state")

    // Store tokens securely (you might want to encrypt these)
    cookieStore.set("reddit_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: tokens.expires_in
    })

    if (tokens.refresh_token) {
      cookieStore.set("reddit_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 365 * 24 * 60 * 60 // 1 year
      })
    }

    console.log("✅ Reddit OAuth tokens obtained successfully")

    return {
      isSuccess: true,
      message: "Reddit authentication successful",
      data: tokens
    }
  } catch (error) {
    console.error("Error exchanging Reddit code for tokens:", error)
    return {
      isSuccess: false,
      message: `Failed to exchange code: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function getRedditAccessTokenAction(): Promise<
  ActionState<string>
> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get("reddit_access_token")?.value

    if (!accessToken) {
      return { isSuccess: false, message: "No Reddit access token found" }
    }

    return {
      isSuccess: true,
      message: "Reddit access token retrieved",
      data: accessToken
    }
  } catch (error) {
    console.error("Error getting Reddit access token:", error)
    return {
      isSuccess: false,
      message: `Failed to get access token: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function refreshRedditTokenAction(): Promise<
  ActionState<RedditOAuthTokens>
> {
  try {
    if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
      return { isSuccess: false, message: "Reddit credentials not configured" }
    }

    const cookieStore = await cookies()
    const refreshToken = cookieStore.get("reddit_refresh_token")?.value

    if (!refreshToken) {
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
          refresh_token: refreshToken
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

    // Update stored tokens
    cookieStore.set("reddit_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: tokens.expires_in
    })

    console.log("✅ Reddit tokens refreshed successfully")

    return {
      isSuccess: true,
      message: "Reddit tokens refreshed",
      data: tokens
    }
  } catch (error) {
    console.error("Error refreshing Reddit tokens:", error)
    return {
      isSuccess: false,
      message: `Failed to refresh tokens: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function clearRedditTokensAction(): Promise<ActionState<void>> {
  try {
    console.log("🔧 [CLEAR-REDDIT-TOKENS] Clearing Reddit OAuth tokens...")

    const cookieStore = await cookies()

    // Clear all Reddit-related cookies
    cookieStore.delete("reddit_access_token")
    cookieStore.delete("reddit_refresh_token")
    cookieStore.delete("reddit_oauth_state")

    console.log("✅ [CLEAR-REDDIT-TOKENS] Reddit tokens cleared successfully")

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
