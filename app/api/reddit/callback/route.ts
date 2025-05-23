"use server"

import { NextRequest, NextResponse } from "next/server"
import { exchangeRedditCodeForTokensAction } from "@/actions/integrations/reddit-oauth-actions"

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
          `/dashboard?error=${encodeURIComponent(`Reddit authorization failed: ${error}`)}`,
          request.url
        )
      )
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("Missing required OAuth parameters")
      return NextResponse.redirect(
        new URL("/dashboard?error=Invalid+OAuth+response", request.url)
      )
    }

    // Exchange code for tokens
    const result = await exchangeRedditCodeForTokensAction(code, state)

    if (!result.isSuccess) {
      console.error("Token exchange failed:", result.message)
      return NextResponse.redirect(
        new URL(
          `/dashboard?error=${encodeURIComponent(result.message)}`,
          request.url
        )
      )
    }

    // Success - redirect to dashboard with success message
    return NextResponse.redirect(
      new URL(
        "/dashboard?success=Reddit+authentication+successful",
        request.url
      )
    )
  } catch (error) {
    console.error("OAuth callback error:", error)
    return NextResponse.redirect(
      new URL("/dashboard?error=Authentication+failed", request.url)
    )
  }
}
