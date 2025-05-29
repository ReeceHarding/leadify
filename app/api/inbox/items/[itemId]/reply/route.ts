"use server"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { replyToInboxItemAction } from "@/actions/db/inbox-actions"
import { getOrganizationsByUserIdAction } from "@/actions/db/organizations-actions"

/**
 * POST /api/inbox/items/[itemId]/reply
 *
 * Posts a reply to an inbox item on Reddit
 * Body should contain the reply text
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  console.log("\n📧 [INBOX-REPLY-API] ====== REPLYING TO INBOX ITEM ======")

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      console.error("📧 [INBOX-REPLY-API] User not authenticated")
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get params
    const { itemId } = await params
    console.log("📧 [INBOX-REPLY-API] Item ID:", itemId)
    console.log("📧 [INBOX-REPLY-API] User ID:", userId)

    // Get user's organization
    const orgResult = await getOrganizationsByUserIdAction(userId)
    if (
      !orgResult.isSuccess ||
      !orgResult.data ||
      orgResult.data.length === 0
    ) {
      console.error("📧 [INBOX-REPLY-API] No organization found for user")
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      )
    }

    const organization = orgResult.data[0]
    const organizationId = organization.id
    console.log("📧 [INBOX-REPLY-API] Organization ID:", organizationId)

    // Parse request body
    const body = await request.json()
    const { replyText } = body

    console.log(
      "📧 [INBOX-REPLY-API] Reply text length:",
      replyText?.length || 0
    )

    // Validate reply text
    if (
      !replyText ||
      typeof replyText !== "string" ||
      replyText.trim().length === 0
    ) {
      console.error("📧 [INBOX-REPLY-API] Invalid reply text")
      return NextResponse.json(
        { error: "Reply text is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    if (replyText.trim().length > 10000) {
      console.error("📧 [INBOX-REPLY-API] Reply text too long")
      return NextResponse.json(
        { error: "Reply text must be 10,000 characters or less" },
        { status: 400 }
      )
    }

    // Post reply to Reddit
    console.log("📧 [INBOX-REPLY-API] Posting reply to Reddit...")
    const result = await replyToInboxItemAction(
      organizationId,
      itemId,
      replyText.trim()
    )

    if (!result.isSuccess) {
      console.error(
        "📧 [INBOX-REPLY-API] Failed to post reply:",
        result.message
      )

      // Return more specific error messages for common Reddit API errors
      let statusCode = 500
      let errorMessage = result.message

      if (result.message.includes("authentication")) {
        statusCode = 401
        errorMessage =
          "Reddit authentication required. Please reconnect your Reddit account."
      } else if (result.message.includes("rate limit")) {
        statusCode = 429
        errorMessage = "Reddit API rate limit exceeded. Please try again later."
      } else if (result.message.includes("permission")) {
        statusCode = 403
        errorMessage = "You don't have permission to reply in this subreddit."
      }

      return NextResponse.json({ error: errorMessage }, { status: statusCode })
    }

    console.log("✅ [INBOX-REPLY-API] Reply posted successfully")
    console.log("📧 [INBOX-REPLY-API] Comment URL:", result.data.commentUrl)

    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        commentId: result.data.commentId,
        commentUrl: result.data.commentUrl,
        itemId
      }
    })
  } catch (error) {
    console.error("📧 [INBOX-REPLY-API] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
