"use server"

import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { fetchRedditCommentsAction } from "@/actions/integrations/reddit/reddit-actions"
import { getOrganizationsByUserIdAction } from "@/actions/db/organizations-actions"

export async function GET(request: Request) {
  try {
    // Check authentication
    const { userId } = await auth()

    if (!userId) {
      console.log("🚫 [REDDIT-COMMENTS-API] Unauthorized request - no user ID")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get("threadId")
    const subreddit = searchParams.get("subreddit")
    const sort = searchParams.get("sort") as
      | "best"
      | "top"
      | "new"
      | "controversial"
      | "old"
      | null
    const limit = searchParams.get("limit")

    console.log("🔍 [REDDIT-COMMENTS-API] Request params:", {
      threadId,
      subreddit,
      sort,
      limit,
      userId
    })

    // Validate required parameters
    if (!threadId || !subreddit) {
      console.log("❌ [REDDIT-COMMENTS-API] Missing required parameters")
      return NextResponse.json(
        { error: "Missing required parameters: threadId and subreddit" },
        { status: 400 }
      )
    }

    // Get user's organization
    const organizationsResult = await getOrganizationsByUserIdAction(userId)
    if (
      !organizationsResult.isSuccess ||
      organizationsResult.data.length === 0
    ) {
      console.log("❌ [REDDIT-COMMENTS-API] No organization found for user")
      return NextResponse.json(
        { error: "No organization found. Please complete onboarding." },
        { status: 400 }
      )
    }

    const organizationId = organizationsResult.data[0].id

    // Fetch comments from Reddit
    console.log(
      `📥 [REDDIT-COMMENTS-API] Fetching comments for thread ${threadId} in r/${subreddit}`
    )

    const result = await fetchRedditCommentsAction(
      organizationId,
      threadId,
      subreddit,
      sort || "best",
      limit ? parseInt(limit) : 100
    )

    if (!result.isSuccess) {
      console.error(
        "❌ [REDDIT-COMMENTS-API] Failed to fetch comments:",
        result.message
      )

      // Handle specific error cases
      if (result.message.includes("authentication")) {
        return NextResponse.json(
          { error: "Reddit authentication required", requiresAuth: true },
          { status: 403 }
        )
      }

      if (result.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Reddit API rate limit exceeded. Please try again later." },
          { status: 429 }
        )
      }

      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    console.log(
      `✅ [REDDIT-COMMENTS-API] Successfully fetched ${result.data.length} comments`
    )

    // Return the comments
    return NextResponse.json({
      comments: result.data,
      metadata: {
        threadId,
        subreddit,
        sort: sort || "best",
        count: result.data.length
      }
    })
  } catch (error) {
    console.error("❌ [REDDIT-COMMENTS-API] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
