/*
<ai_context>
Handles Reddit OAuth2 authentication flow initiation.
Redirects users to Reddit's authorization page with proper scopes.
</ai_context>
*/

import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      )
    }

    console.log(`🔐 Starting Reddit OAuth flow for user: ${userId}`)

    // Reddit OAuth configuration
    const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID
    const REDDIT_REDIRECT_URI = process.env.REDDIT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/reddit/callback`

    if (!REDDIT_CLIENT_ID) {
      console.error("Reddit client ID not configured")
      return NextResponse.json(
        { error: "Reddit OAuth not configured" },
        { status: 500 }
      )
    }

    // Generate state parameter for security
    const state = Buffer.from(
      JSON.stringify({ userId, timestamp: Date.now() })
    ).toString("base64")

    // Reddit OAuth scopes needed for our app
    const scopes = [
      "identity", // Access user's Reddit identity
      "read", // Read posts and comments
      "submit", // Submit comments
      "edit", // Edit own comments
      "history" // Access user's history
    ].join(" ")

    // Build Reddit authorization URL
    const authUrl = new URL("https://www.reddit.com/api/v1/authorize")
    authUrl.searchParams.append("client_id", REDDIT_CLIENT_ID)
    authUrl.searchParams.append("response_type", "code")
    authUrl.searchParams.append("state", state)
    authUrl.searchParams.append("redirect_uri", REDDIT_REDIRECT_URI)
    authUrl.searchParams.append("duration", "permanent") // Get refresh token
    authUrl.searchParams.append("scope", scopes)

    console.log(`🔐 Redirecting to Reddit OAuth: ${authUrl.toString()}`)

    // Redirect to Reddit
    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error("Error in Reddit auth route:", error)
    return NextResponse.json(
      { error: "Failed to initiate Reddit authentication" },
      { status: 500 }
    )
  }
} 