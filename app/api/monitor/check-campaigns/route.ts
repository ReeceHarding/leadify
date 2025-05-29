import { NextResponse } from "next/server"
import {
  getMonitorsDueForCheckAction,
  recordMonitoringCheckAction
} from "@/actions/db/campaign-monitor-actions"
import { getCampaignByIdAction } from "@/actions/db/campaign-actions"
import { runFullLeadGenerationWorkflowAction } from "@/actions/lead-generation/workflow-actions"

/**
 * API endpoint for checking campaigns that are due for monitoring
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

    // Process each monitor
    for (const monitor of monitors) {
      console.log(
        `🔍 [MONITOR-CHECK] Processing campaign ${monitor.campaignId}`
      )

      try {
        // Get campaign details
        const campaignResult = await getCampaignByIdAction(monitor.campaignId)

        if (!campaignResult.isSuccess || !campaignResult.data) {
          console.error(
            `🔍 [MONITOR-CHECK] Failed to get campaign ${monitor.campaignId}`
          )
          await recordMonitoringCheckAction(monitor.id, {
            postsFound: 0,
            newPostsAdded: 0,
            apiCallsUsed: 0,
            success: false,
            error: "Campaign not found"
          })
          continue
        }

        const campaign = campaignResult.data

        // Run the existing lead generation workflow for this campaign
        console.log(
          `🔍 [MONITOR-CHECK] Running lead generation workflow for campaign: ${campaign.name}`
        )

        const workflowResult = await runFullLeadGenerationWorkflowAction(
          monitor.campaignId
        )

        if (workflowResult.isSuccess) {
          console.log(
            `🔍 [MONITOR-CHECK] Workflow completed successfully for ${campaign.name}`
          )

          // For now, we'll just track that the workflow ran
          // The actual results will be visible in the lead finder dashboard
          const postsFound = 1 // Placeholder - actual count would need different approach
          const newPostsAdded = 1 // Placeholder
          const apiCallsUsed = campaign.keywords.length // Estimate based on keywords

          // Record the check results
          await recordMonitoringCheckAction(monitor.id, {
            postsFound,
            newPostsAdded,
            apiCallsUsed,
            success: true
          })

          results.push({
            campaignId: monitor.campaignId,
            campaignName: campaign.name,
            postsFound,
            newPostsAdded,
            success: true
          })
        } else {
          throw new Error(workflowResult.message)
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
          error: error instanceof Error ? error.message : "Unknown error",
          success: false
        })
      }
    }

    console.log(
      `🔍 [MONITOR-CHECK] Completed checking ${monitors.length} campaigns`
    )

    return NextResponse.json({
      message: "Campaign monitoring check completed",
      monitorsChecked: monitors.length,
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
