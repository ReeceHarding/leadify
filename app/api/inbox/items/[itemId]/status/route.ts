"use server"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { updateInboxItemStatusAction } from "@/actions/db/inbox-actions"

/**
 * PUT /api/inbox/items/[itemId]/status
 *
 * Updates the status of an inbox item
 * Body should contain status and optional notes
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  console.log(
    "\n📧 [INBOX-STATUS-API] ====== UPDATING INBOX ITEM STATUS ======"
  )

  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      console.error("📧 [INBOX-STATUS-API] User not authenticated")
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get params
    const { itemId } = await params
    console.log("📧 [INBOX-STATUS-API] Item ID:", itemId)
    console.log("📧 [INBOX-STATUS-API] User ID:", userId)

    // Parse request body
    const body = await request.json()
    const { status, notes, sentiment } = body

    console.log("📧 [INBOX-STATUS-API] Update data:")
    console.log("📧 [INBOX-STATUS-API] Status:", status)
    console.log("📧 [INBOX-STATUS-API] Notes:", notes || "none")
    console.log("📧 [INBOX-STATUS-API] Sentiment:", sentiment || "unchanged")

    // Validate status if provided
    const validStatuses = [
      "unread",
      "read",
      "action_needed",
      "archived",
      "replied"
    ]
    if (status && !validStatuses.includes(status)) {
      console.error("📧 [INBOX-STATUS-API] Invalid status:", status)
      return NextResponse.json(
        {
          error: "Invalid status",
          validStatuses
        },
        { status: 400 }
      )
    }

    // Update inbox item
    const result = await updateInboxItemStatusAction(itemId, {
      status,
      notes,
      sentiment
    })

    if (!result.isSuccess) {
      console.error(
        "📧 [INBOX-STATUS-API] Failed to update inbox item:",
        result.message
      )
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    console.log("✅ [INBOX-STATUS-API] Inbox item status updated successfully")

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.data
    })
  } catch (error) {
    console.error("📧 [INBOX-STATUS-API] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
