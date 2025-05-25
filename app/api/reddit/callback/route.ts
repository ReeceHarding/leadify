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
      return NextResponse.redirect(
        new URL(
          `/onboarding?error=${encodeURIComponent(`Reddit authorization failed: ${error}`)}`,
          request.url
        )
      )
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("Missing required OAuth parameters")
      return NextResponse.redirect(
        new URL("/onboarding?error=Invalid+OAuth+response", request.url)
      )
    }

    // Exchange code for tokens and save to user profile
    const result = await exchangeRedditCodeForTokensUserAction(code, state)

    if (!result.isSuccess) {
      console.error("Token exchange failed:", result.message)
      return NextResponse.redirect(
        new URL(
          `/onboarding?error=${encodeURIComponent(result.message)}`,
          request.url
        )
      )
    }

    // Success - redirect back to onboarding with success message
    return NextResponse.redirect(
      new URL(
        "/onboarding?success=Reddit+authentication+successful",
        request.url
      )
    )
  } catch (error) {
    console.error("OAuth callback error:", error)
    return NextResponse.redirect(
      new URL("/onboarding?error=Authentication+failed", request.url)
    )
  }
}
