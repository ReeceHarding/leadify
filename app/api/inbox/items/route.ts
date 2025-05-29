"use server"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getInboxItemsByOrganizationAction } from "@/actions/db/inbox-actions"
import { getOrganizationsByUserIdAction } from "@/actions/db/organizations-actions"

/**
 * GET /api/inbox/items
 *
 * Fetches inbox items for the current user's organization
 * Query parameters:
 * - status: filter by status (unread, read, action_needed, archived, replied)
 * - limit: number of items to return
 * - parentCommentId: filter by parent comment ID
 */
export async function GET(request: NextRequest) {
  console.log("\n📧 [INBOX-API] ====== FETCHING INBOX ITEMS ======")

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      console.error("📧 [INBOX-API] User not authenticated")
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    console.log("📧 [INBOX-API] User ID:", userId)

    // Get user's organization
    const orgResult = await getOrganizationsByUserIdAction(userId)
    if (
      !orgResult.isSuccess ||
      !orgResult.data ||
      orgResult.data.length === 0
    ) {
      console.error("📧 [INBOX-API] No organization found for user")
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      )
    }

    // Use the first organization (users typically have one organization)
    const organization = orgResult.data[0]
    const organizationId = organization.id
    console.log("📧 [INBOX-API] Organization ID:", organizationId)

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") as
      | "unread"
      | "read"
      | "action_needed"
      | "archived"
      | "replied"
      | null
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined
    const parentCommentId = searchParams.get("parentCommentId")

    console.log("📧 [INBOX-API] Query parameters:")
    console.log("📧 [INBOX-API] Status filter:", status || "all")
    console.log("📧 [INBOX-API] Limit:", limit || "none")
    console.log("📧 [INBOX-API] Parent comment ID:", parentCommentId || "none")

    // Fetch inbox items
    const result = await getInboxItemsByOrganizationAction(organizationId, {
      status: status || undefined,
      limit,
      parentCommentId: parentCommentId || undefined
    })

    if (!result.isSuccess) {
      console.error(
        "📧 [INBOX-API] Failed to fetch inbox items:",
        result.message
      )
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    console.log("✅ [INBOX-API] Successfully fetched inbox items")
    console.log("📧 [INBOX-API] Items count:", result.data.length)

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        count: result.data.length,
        organizationId,
        filters: {
          status: status || null,
          limit: limit || null,
          parentCommentId: parentCommentId || null
        }
      }
    })
  } catch (error) {
    console.error("📧 [INBOX-API] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
