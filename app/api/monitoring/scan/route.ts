import { NextResponse } from "next/server"
import {
  getMonitorsDueForCheckAction,
  recordMonitoringCheckAction
} from "@/actions/db/campaign-monitor-actions"
import { scanForNewPostsByMonitorAction } from "@/actions/monitoring/scanner-actions"

/**
 * API endpoint for scanning Reddit for new posts matching campaign keywords
 * This should be called frequently by a cron job (every 1-5 minutes)
 */
export async function GET(request: Request) {
  console.log("🔍 [MONITOR-SCAN] Starting scheduled Reddit scanning")

  try {
    // Optional: Check for cron secret for security
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("🔍 [MONITOR-SCAN] Unauthorized scan request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all monitors due for checking
    const monitorsResult = await getMonitorsDueForCheckAction()

    if (!monitorsResult.isSuccess || !monitorsResult.data) {
      console.error(
        "🔍 [MONITOR-SCAN] Failed to get monitors:",
        monitorsResult.message
      )
      return NextResponse.json(
        { error: "Failed to get monitors for scanning" },
        { status: 500 }
      )
    }

    const monitors = monitorsResult.data
    console.log(`🔍 [MONITOR-SCAN] Found ${monitors.length} monitors to scan`)

    if (monitors.length === 0) {
      return NextResponse.json({
        message: "No monitors due for scanning",
        monitorsScanned: 0,
        totalPostsFound: 0,
        totalNewPostsAdded: 0
      })
    }

    const results = []
    let totalPostsFound = 0
    let totalNewPostsAdded = 0
    let totalApiCalls = 0

    // Process each monitor
    for (const monitor of monitors) {
      console.log(
        `🔍 [MONITOR-SCAN] Scanning monitor ${monitor.id} for campaign ${monitor.campaignId}`
      )

      try {
        // Run the scanner for this monitor
        const scanResult = await scanForNewPostsByMonitorAction(monitor)

        if (scanResult.isSuccess && scanResult.data) {
          const { postsFound, newPostsAdded, apiCallsUsed } = scanResult.data

          totalPostsFound += postsFound
          totalNewPostsAdded += newPostsAdded
          totalApiCalls += apiCallsUsed

          // Record the successful scan
          await recordMonitoringCheckAction(monitor.id, {
            postsFound,
            newPostsAdded,
            apiCallsUsed,
            success: true
          })

          results.push({
            monitorId: monitor.id,
            campaignId: monitor.campaignId,
            postsFound,
            newPostsAdded,
            apiCallsUsed,
            success: true
          })

          console.log(
            `🔍 [MONITOR-SCAN] ✅ Monitor ${monitor.id} scan complete - Found: ${postsFound}, Added: ${newPostsAdded}`
          )
        } else {
          throw new Error(scanResult.message || "Scan failed")
        }
      } catch (error) {
        console.error(
          `🔍 [MONITOR-SCAN] Error scanning monitor ${monitor.id}:`,
          error
        )

        // Record the failed scan
        await recordMonitoringCheckAction(monitor.id, {
          postsFound: 0,
          newPostsAdded: 0,
          apiCallsUsed: 0,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })

        results.push({
          monitorId: monitor.id,
          campaignId: monitor.campaignId,
          error: error instanceof Error ? error.message : "Unknown error",
          success: false
        })
      }
    }

    console.log(
      `🔍 [MONITOR-SCAN] ✅ Scanning complete - Monitors: ${monitors.length}, Posts found: ${totalPostsFound}, New posts added: ${totalNewPostsAdded}, API calls: ${totalApiCalls}`
    )

    return NextResponse.json({
      message: "Reddit scanning completed",
      monitorsScanned: monitors.length,
      totalPostsFound,
      totalNewPostsAdded,
      totalApiCalls,
      results
    })
  } catch (error) {
    console.error("🔍 [MONITOR-SCAN] ❌ Fatal scanning error:", error)
    return NextResponse.json(
      { error: "Internal server error during Reddit scanning" },
      { status: 500 }
    )
  }
}

// POST method for manual triggering (same as GET)
export async function POST(request: Request) {
  return GET(request)
}
