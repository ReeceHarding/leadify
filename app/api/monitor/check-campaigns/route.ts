import { NextResponse } from "next/server"
import {
  getMonitorsDueForCheckAction,
  recordMonitoringCheckAction
} from "@/actions/db/campaign-monitor-actions"
import { scanForNewPostsByMonitorAction } from "@/actions/monitoring/scanner-actions"

/**
 * API endpoint for checking campaigns that are due for monitoring
 * Updated to use the new lightweight scanning approach
 * This should be called by a cron job or scheduled function
 */
export async function GET(request: Request) {
  console.log("🔍 [MONITOR-CHECK] Starting scheduled campaign monitoring check")

  try {
    // Get all monitors due for checking
    const monitorsResult = await getMonitorsDueForCheckAction()

    if (!monitorsResult.isSuccess || !monitorsResult.data) {
      console.error(
        "🔍 [MONITOR-CHECK] Failed to get monitors:",
        monitorsResult.message
      )
      return NextResponse.json(
        { error: "Failed to get monitors for checking" },
        { status: 500 }
      )
    }

    const monitors = monitorsResult.data
    console.log(
      `🔍 [MONITOR-CHECK] Found ${monitors.length} campaigns to check`
    )

    if (monitors.length === 0) {
      return NextResponse.json({
        message: "No campaigns due for checking",
        monitorsChecked: 0
      })
    }

    const results = []
    let totalPostsFound = 0
    let totalNewPostsAdded = 0

    // Process each monitor using the new scanning approach
    for (const monitor of monitors) {
      console.log(
        `🔍 [MONITOR-CHECK] Processing campaign ${monitor.campaignId} with monitor ${monitor.id}`
      )

      try {
        // Use the new lightweight scanning instead of full workflow
        const scanResult = await scanForNewPostsByMonitorAction(monitor)

        if (scanResult.isSuccess && scanResult.data) {
          const { postsFound, newPostsAdded, apiCallsUsed } = scanResult.data

          totalPostsFound += postsFound
          totalNewPostsAdded += newPostsAdded

          // Record the successful check
          await recordMonitoringCheckAction(monitor.id, {
            postsFound,
            newPostsAdded,
            apiCallsUsed,
            success: true
          })

          results.push({
            campaignId: monitor.campaignId,
            monitorId: monitor.id,
            postsFound,
            newPostsAdded,
            success: true
          })

          console.log(
            `🔍 [MONITOR-CHECK] ✅ Campaign ${monitor.campaignId} checked successfully - Found: ${postsFound}, Added: ${newPostsAdded}`
          )
        } else {
          throw new Error(scanResult.message || "Scan failed")
        }
      } catch (error) {
        console.error(
          `🔍 [MONITOR-CHECK] Error processing campaign ${monitor.campaignId}:`,
          error
        )

        await recordMonitoringCheckAction(monitor.id, {
          postsFound: 0,
          newPostsAdded: 0,
          apiCallsUsed: 0,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })

        results.push({
          campaignId: monitor.campaignId,
          monitorId: monitor.id,
          error: error instanceof Error ? error.message : "Unknown error",
          success: false
        })
      }
    }

    console.log(
      `🔍 [MONITOR-CHECK] Completed checking ${monitors.length} campaigns - Found ${totalPostsFound} posts, added ${totalNewPostsAdded} new potential leads`
    )

    return NextResponse.json({
      message: "Campaign monitoring check completed",
      monitorsChecked: monitors.length,
      totalPostsFound,
      totalNewPostsAdded,
      results
    })
  } catch (error) {
    console.error("🔍 [MONITOR-CHECK] Fatal error:", error)
    return NextResponse.json(
      { error: "Internal server error during monitoring check" },
      { status: 500 }
    )
  }
}

// Optional: Add authentication to ensure only authorized services can call this endpoint
export async function POST(request: Request) {
  // You could add a secret key check here
  const authHeader = request.headers.get("authorization")
  const expectedKey = process.env.MONITOR_API_KEY

  if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Delegate to GET handler
  return GET(request)
}
