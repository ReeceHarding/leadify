"use server"

import { NextRequest, NextResponse } from "next/server"
import { syncAllActiveCommentsRepliesAction } from "@/actions/db/inbox-actions"

/**
 * POST /api/inbox/sync
 *
 * Syncs replies for all active comments in all organizations
 * Protected by CRON_SECRET for automated jobs
 * Can also be called with organizationId to sync specific organization
 */
export async function POST(request: NextRequest) {
  console.log("\n🔄 [INBOX-SYNC-API] ====== INBOX SYNC REQUEST ======")

  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error("🔄 [INBOX-SYNC-API] CRON_SECRET not configured")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("🔄 [INBOX-SYNC-API] Invalid authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body for optional parameters
    const body = await request.json().catch(() => ({}))
    const {
      organizationId,
      maxCommentsToProcess = 50,
      onlyOlderThan = 15
    } = body

    console.log("🔄 [INBOX-SYNC-API] Sync parameters:")
    console.log("🔄 [INBOX-SYNC-API] Organization ID:", organizationId || "ALL")
    console.log("🔄 [INBOX-SYNC-API] Max comments:", maxCommentsToProcess)
    console.log(
      "🔄 [INBOX-SYNC-API] Only older than:",
      onlyOlderThan,
      "minutes"
    )

    if (organizationId) {
      // Sync specific organization
      console.log(
        `🔄 [INBOX-SYNC-API] Syncing specific organization: ${organizationId}`
      )

      const result = await syncAllActiveCommentsRepliesAction(organizationId, {
        maxCommentsToProcess,
        onlyOlderThan
      })

      if (!result.isSuccess) {
        console.error("🔄 [INBOX-SYNC-API] Sync failed:", result.message)
        return NextResponse.json({ error: result.message }, { status: 500 })
      }

      console.log(
        "✅ [INBOX-SYNC-API] Organization sync completed successfully"
      )
      console.log("🔄 [INBOX-SYNC-API] Results:", result.data)

      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          organizationId,
          ...result.data
        }
      })
    } else {
      // Sync all organizations (future implementation)
      // For now, return error asking for organizationId
      console.error("🔄 [INBOX-SYNC-API] Organization ID is required")
      return NextResponse.json(
        {
          error: "organizationId is required",
          message: "Please provide an organizationId in the request body"
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("🔄 [INBOX-SYNC-API] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/inbox/sync
 *
 * Returns sync status and statistics
 */
export async function GET(request: NextRequest) {
  console.log("\n🔄 [INBOX-SYNC-STATUS] ====== SYNC STATUS REQUEST ======")

  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId query parameter is required" },
        { status: 400 }
      )
    }

    // TODO: Implement sync status tracking
    // For now, return basic status
    return NextResponse.json({
      success: true,
      data: {
        organizationId,
        status: "ready",
        lastSyncAt: null,
        message: "Sync status tracking not yet implemented"
      }
    })
  } catch (error) {
    console.error("🔄 [INBOX-SYNC-STATUS] Error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
