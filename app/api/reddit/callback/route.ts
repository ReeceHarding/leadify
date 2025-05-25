"use server"

import { NextRequest, NextResponse } from "next/server"
import { exchangeRedditCodeForTokensUserAction } from "@/actions/integrations/reddit-oauth-user-actions"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    // Handle OAuth errors
    if (error) {
      console.error("Reddit OAuth error:", error)
      // Try to get return URL from state if available
      let returnUrl = "/onboarding"
      if (state) {
        try {
          const stateData = JSON.parse(Buffer.from(state, "base64").toString())
          returnUrl = stateData.returnUrl || "/onboarding"
        } catch (e) {
          console.error("Failed to parse state for error redirect:", e)
        }
      }
      
      return NextResponse.redirect(
        new URL(
          `${returnUrl}?error=${encodeURIComponent(`Reddit authorization failed: ${error}`)}`,
          request.url
        )
      )
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("Missing required OAuth parameters")
      // Try to get return URL from state if available
      let returnUrl = "/onboarding"
      if (state) {
        try {
          const stateData = JSON.parse(Buffer.from(state, "base64").toString())
          returnUrl = stateData.returnUrl || "/onboarding"
        } catch (e) {
          console.error("Failed to parse state for error redirect:", e)
        }
      }
      
      return NextResponse.redirect(
        new URL(`${returnUrl}?error=Invalid+OAuth+response`, request.url)
      )
    }

    // Exchange code for tokens and save to user profile
    const result = await exchangeRedditCodeForTokensUserAction(code, state)

    if (!result.isSuccess) {
      console.error("Token exchange failed:", result.message)
      // Parse return URL from state for error redirect
      let returnUrl = "/onboarding"
      try {
        const stateData = JSON.parse(Buffer.from(state, "base64").toString())
        returnUrl = stateData.returnUrl || "/onboarding"
      } catch (error) {
        console.error("Failed to parse state parameter:", error)
      }
      
      return NextResponse.redirect(
        new URL(
          `${returnUrl}?error=${encodeURIComponent(result.message)}`,
          request.url
        )
      )
    }

    // Parse return URL from state
    let returnUrl = "/onboarding"
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString())
      returnUrl = stateData.returnUrl || "/onboarding"
    } catch (error) {
      console.error("Failed to parse state parameter:", error)
    }

    // Success - redirect back to the return URL with success message
    const redirectUrl = new URL(returnUrl, request.url)
    redirectUrl.searchParams.set("success", "Reddit authentication successful")
    
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error("OAuth callback error:", error)
    // Try to get return URL from query params (fallback)
    const searchParams = request.nextUrl.searchParams
    const state = searchParams.get("state")
    let returnUrl = "/onboarding"
    
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, "base64").toString())
        returnUrl = stateData.returnUrl || "/onboarding"
      } catch (e) {
        console.error("Failed to parse state for error redirect:", e)
      }
    }
    
    return NextResponse.redirect(
      new URL(`${returnUrl}?error=Authentication+failed`, request.url)
    )
  }
}
