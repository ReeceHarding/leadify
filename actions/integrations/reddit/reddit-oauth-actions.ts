/*
<ai_context>
Contains server actions for Reddit OAuth2 authentication flow.
</ai_context>
*/

"use server"

import { auth } from "@clerk/nextjs/server"
import { updateProfileAction } from "@/actions/db/profiles-actions"
import { ActionState, RedditOAuthTokens } from "@/types"
import { Timestamp } from "firebase/firestore"
import { cookies } from "next/headers"

export interface GenerateRedditAuthUrlOptions {
  returnUrl?: string;
}

export async function generateRedditAuthUrlAction(
  options?: GenerateRedditAuthUrlOptions
): Promise<ActionState<{ authUrl: string }>> {
  try {
    if (!process.env.REDDIT_CLIENT_ID) {
      return { isSuccess: false, message: "Reddit client ID not configured" };
    }

    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3000";

    const redirectUri = `${baseUrl}/api/reddit/callback`;
    const csrfToken = crypto.randomUUID();
    
    // Prepare state object
    const stateObject = {
      csrf: csrfToken,
      returnUrl: options?.returnUrl || "/dashboard" // Default to dashboard or a relevant page
    };
    const stateString = Buffer.from(JSON.stringify(stateObject)).toString("base64");

    const cookieStore = await cookies();
    // Store only the CSRF token in the cookie for validation, not the whole state object
    cookieStore.set("reddit_oauth_csrf", csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60, // 10 minutes
      path: "/",
      sameSite: "lax"
    });

    const authUrl = new URL("https://www.reddit.com/api/v1/authorize");
    authUrl.searchParams.set("client_id", process.env.REDDIT_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", stateString); // Pass the base64 encoded JSON state
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("duration", "permanent");
    const scopes = ["identity", "read", "submit", "edit", "history"]; // Ensure all necessary scopes are listed
    authUrl.searchParams.set("scope", scopes.join(" "));

    console.log(`🔗 Generated Reddit OAuth URL: ${authUrl.toString()}`);
    console.log(`🔐 CSRF token set in cookie (reddit_oauth_csrf). State param includes this + returnUrl.`);
    console.log(`📍 Callback URL to configure in Reddit app: ${redirectUri}`);

    return {
      isSuccess: true,
      message: "Reddit authorization URL generated",
      data: { authUrl: authUrl.toString() }
    };
  } catch (error) {
    console.error("Error generating Reddit auth URL:", error);
    return {
      isSuccess: false,
      message: `Failed to generate auth URL: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

export async function exchangeRedditCodeForTokensAction(
  code: string,
  state: string
): Promise<ActionState<RedditOAuthTokens>> {
  console.warn("DEPRECATED: exchangeRedditCodeForTokensAction is called. Use organization-based flow via /api/reddit/callback.");
  return { isSuccess: false, message: "This action is deprecated. Please use organization-specific authentication flow." };
}

export async function getRedditAccessTokenAction(): Promise<ActionState<string>> {
   console.warn("DEPRECATED: getRedditAccessTokenAction is called. Use getCurrentOrganizationTokens(orgId).");
  return { isSuccess: false, message: "This action is deprecated." };
}

export async function refreshRedditTokenAction(): Promise<ActionState<RedditOAuthTokens>> {
  console.warn("DEPRECATED: refreshRedditTokenAction is called. Use getCurrentOrganizationTokens(orgId) which handles refresh.");
  return { isSuccess: false, message: "This action is deprecated." };
}

export async function clearRedditTokensAction(): Promise<ActionState<void>> {
  console.warn("DEPRECATED: clearRedditTokensAction is called. Use clearRedditTokensFromOrganizationAction(orgId).");
  return { isSuccess: false, message: "This action is deprecated." };
}
