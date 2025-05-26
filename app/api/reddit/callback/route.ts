"use server"

import { NextRequest, NextResponse } from "next/server"
import { exchangeRedditCodeForTokensOrganizationAction } from "@/actions/integrations/reddit/reddit-oauth-organization-actions"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  let parsedReturnUrl = "/onboarding" // Default, updated by validated state
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const stateFromReddit = searchParams.get("state") // This is base64 encoded JSON: {csrf, returnUrl}
  const error = searchParams.get("error")

  const responseHeaders = new Headers()
  const addCookieToClear = (name: string) => {
    responseHeaders.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
    )
  }

  try {
    const cookieStore = await cookies()
    const storedCsrfToken = cookieStore.get("reddit_oauth_csrf")?.value
    addCookieToClear("reddit_oauth_csrf") // Clear CSRF cookie in response

    if (!stateFromReddit) {
      console.error("[CALLBACK] State parameter missing from Reddit redirect.")
      addCookieToClear("reddit_auth_org_id")
      return NextResponse.redirect(
        new URL(
          `${parsedReturnUrl}?error=${encodeURIComponent("Invalid session: State missing.")}`,
          request.url
        ),
        { headers: responseHeaders }
      )
    }

    let decodedState: { csrf?: string; returnUrl?: string } = {}
    try {
      decodedState = JSON.parse(
        Buffer.from(stateFromReddit, "base64").toString()
      )
      if (decodedState.returnUrl) {
        parsedReturnUrl = decodedState.returnUrl
      }
    } catch (e) {
      console.error("[CALLBACK] Failed to parse state parameter:", e)
      addCookieToClear("reddit_auth_org_id")
      return NextResponse.redirect(
        new URL(
          `${parsedReturnUrl}?error=${encodeURIComponent("Invalid session state: Cannot parse.")}`,
          request.url
        ),
        { headers: responseHeaders }
      )
    }

    if (
      !storedCsrfToken ||
      !decodedState.csrf ||
      storedCsrfToken !== decodedState.csrf
    ) {
      console.error(
        "[CALLBACK] Invalid CSRF token. Stored:",
        storedCsrfToken,
        "Received in state:",
        decodedState.csrf
      )
      addCookieToClear("reddit_auth_org_id")
      return NextResponse.redirect(
        new URL(
          `${parsedReturnUrl}?error=${encodeURIComponent("Invalid session state: CSRF mismatch. Please try again.")}`,
          request.url
        ),
        { headers: responseHeaders }
      )
    }

    // CSRF is valid, proceed

    if (error) {
      console.error("[CALLBACK] Reddit OAuth error from params:", error)
      addCookieToClear("reddit_auth_org_id")
      return NextResponse.redirect(
        new URL(
          `${parsedReturnUrl}?error=${encodeURIComponent(`Reddit authorization failed: ${error}`)}`,
          request.url
        ),
        { headers: responseHeaders }
      )
    }

    if (!code) {
      console.error("[CALLBACK] Missing required OAuth parameter: code.")
      addCookieToClear("reddit_auth_org_id")
      return NextResponse.redirect(
        new URL(
          `${parsedReturnUrl}?error=${encodeURIComponent("Invalid OAuth response: Missing code.")}`,
          request.url
        ),
        { headers: responseHeaders }
      )
    }

    const orgIdCookie = cookieStore.get("reddit_auth_org_id")
    const organizationId = orgIdCookie?.value
    addCookieToClear("reddit_auth_org_id") // Clear orgId cookie after reading

    if (!organizationId) {
      console.error(
        "[CALLBACK] Organization ID cookie not found or already used/cleared."
      )
      return NextResponse.redirect(
        new URL(
          `${parsedReturnUrl}?error=${encodeURIComponent("Organization context missing or session expired. Please try connecting again.")}`,
          request.url
        ),
        { headers: responseHeaders }
      )
    }

    console.log(
      `[CALLBACK] Processing org-specific Reddit auth for org: ${organizationId}, state CSRF validated.`
    )
    // Pass the original stateFromReddit (which is base64) to the action.
    // The action `exchangeRedditCodeForTokensOrganizationAction` is responsible for validating the `state` again with the CSRF cookie `reddit_oauth_csrf`
    // (or we can pass `storedCsrfToken` to it if it doesn't read cookies itself).
    // For now, we assume it re-validates or that our validation here is primary.
    const result = await exchangeRedditCodeForTokensOrganizationAction(
      code,
      stateFromReddit,
      organizationId
    )
    // `exchangeRedditCodeForTokensOrganizationAction` should also delete the `reddit_oauth_state` (now `reddit_oauth_csrf`) cookie if it re-validates.
    // Since we clear `reddit_oauth_csrf` above, the action might not find it.
    // It might be better if the action takes the `storedCsrfToken` for its own validation step.

    if (!result.isSuccess) {
      console.error(
        "[CALLBACK] Token exchange failed for organization:",
        result.message
      )
      return NextResponse.redirect(
        new URL(
          `${parsedReturnUrl}?error=${encodeURIComponent(result.message || "Token exchange failed.")}`,
          request.url
        ),
        { headers: responseHeaders }
      )
    }

    const finalSuccessReturnUrl =
      parsedReturnUrl === "/onboarding" && organizationId
        ? `/reddit/settings?organizationId=${organizationId}`
        : parsedReturnUrl

    const redirectUrl = new URL(finalSuccessReturnUrl, request.url)
    redirectUrl.searchParams.set(
      "success",
      "Reddit authentication successful for organization"
    )

    console.log(
      "[CALLBACK] Redirecting to success URL:",
      redirectUrl.toString()
    )
    return NextResponse.redirect(redirectUrl, { headers: responseHeaders })
  } catch (e) {
    console.error("[CALLBACK] OAuth callback unexpected error:", e)
    const errorMsg =
      e instanceof Error
        ? e.message
        : "An unexpected error occurred during authentication."
    addCookieToClear("reddit_auth_org_id")
    addCookieToClear("reddit_oauth_csrf")
    return NextResponse.redirect(
      new URL(
        `${parsedReturnUrl}?error=${encodeURIComponent("Authentication failed: " + errorMsg)}`,
        request.url
      ),
      { headers: responseHeaders }
    )
  }
}
