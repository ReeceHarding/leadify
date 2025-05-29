import { NextResponse } from "next/server"
import { qualifyPotentialLeadAction } from "@/actions/lead-generation/workflow-actions"
import {
  getPotentialLeadsByOrganizationAction,
  batchUpdatePotentialLeadsStatusAction
} from "@/actions/db/potential-leads-actions"

/**
 * API endpoint for qualifying potential leads with AI analysis
 * This should be called less frequently than scanning (every 5-15 minutes)
 * or triggered after new potential leads are found
 */
export async function GET(request: Request) {
  console.log("🎯 [MONITOR-QUALIFY] Starting potential lead qualification")

  try {
    // Optional: Check for cron secret for security
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("🎯 [MONITOR-QUALIFY] Unauthorized qualification request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse URL parameters for batch size and organization filtering
    const url = new URL(request.url)
    const batchSize = parseInt(url.searchParams.get("batchSize") || "10")
    const organizationId = url.searchParams.get("organizationId")

    console.log(
      `🎯 [MONITOR-QUALIFY] Batch size: ${batchSize}, Organization: ${organizationId || "all"}`
    )

    // Get potential leads with status "new"
    let unqualifiedLeads
    if (organizationId) {
      const leadsResult = await getPotentialLeadsByOrganizationAction(
        organizationId,
        "new",
        batchSize
      )
      if (!leadsResult.isSuccess) {
        throw new Error(
          `Failed to get leads for organization: ${leadsResult.message}`
        )
      }
      unqualifiedLeads = leadsResult.data
    } else {
      // If no organization specified, we'd need a different approach
      // For now, require organizationId to avoid qualifying across all orgs
      return NextResponse.json(
        { error: "organizationId parameter is required" },
        { status: 400 }
      )
    }

    console.log(
      `🎯 [MONITOR-QUALIFY] Found ${unqualifiedLeads.length} unqualified leads`
    )

    if (unqualifiedLeads.length === 0) {
      return NextResponse.json({
        message: "No unqualified leads found",
        leadsProcessed: 0,
        qualifiedLeads: 0,
        ignoredLeads: 0
      })
    }

    const results = []
    let qualifiedCount = 0
    let ignoredCount = 0
    let errorCount = 0

    // Process each potential lead
    for (const lead of unqualifiedLeads) {
      console.log(
        `🎯 [MONITOR-QUALIFY] Qualifying lead ${lead.id}: "${lead.title}"`
      )

      try {
        const qualifyResult = await qualifyPotentialLeadAction(
          lead.id,
          lead.organizationId
        )

        if (qualifyResult.isSuccess && qualifyResult.data) {
          const { qualified, relevanceScore, generatedCommentId } =
            qualifyResult.data

          if (qualified) {
            qualifiedCount++
            console.log(
              `🎯 [MONITOR-QUALIFY] ✅ Lead ${lead.id} qualified with score ${relevanceScore}`
            )
          } else {
            ignoredCount++
            console.log(
              `🎯 [MONITOR-QUALIFY] ❌ Lead ${lead.id} ignored with score ${relevanceScore}`
            )
          }

          results.push({
            leadId: lead.id,
            title: lead.title,
            qualified,
            relevanceScore,
            generatedCommentId,
            success: true
          })
        } else {
          throw new Error(qualifyResult.message)
        }
      } catch (error) {
        console.error(
          `🎯 [MONITOR-QUALIFY] Error qualifying lead ${lead.id}:`,
          error
        )

        errorCount++
        results.push({
          leadId: lead.id,
          title: lead.title,
          error: error instanceof Error ? error.message : "Unknown error",
          success: false
        })
      }
    }

    console.log(
      `🎯 [MONITOR-QUALIFY] ✅ Qualification complete - Processed: ${unqualifiedLeads.length}, Qualified: ${qualifiedCount}, Ignored: ${ignoredCount}, Errors: ${errorCount}`
    )

    return NextResponse.json({
      message: "Lead qualification completed",
      leadsProcessed: unqualifiedLeads.length,
      qualifiedLeads: qualifiedCount,
      ignoredLeads: ignoredCount,
      errorLeads: errorCount,
      results
    })
  } catch (error) {
    console.error("🎯 [MONITOR-QUALIFY] ❌ Fatal qualification error:", error)
    return NextResponse.json(
      { error: "Internal server error during lead qualification" },
      { status: 500 }
    )
  }
}

/**
 * POST method for manual qualification requests with specific lead IDs
 */
export async function POST(request: Request) {
  console.log("🎯 [MONITOR-QUALIFY] Manual qualification request")

  try {
    // Parse request body
    const body = await request.json()
    const { leadIds, organizationId } = body

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: "leadIds array is required" },
        { status: 400 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      )
    }

    console.log(
      `🎯 [MONITOR-QUALIFY] Manual qualification of ${leadIds.length} leads`
    )

    const results = []
    let qualifiedCount = 0
    let ignoredCount = 0
    let errorCount = 0

    // Process each specified lead
    for (const leadId of leadIds) {
      try {
        const qualifyResult = await qualifyPotentialLeadAction(
          leadId,
          organizationId
        )

        if (qualifyResult.isSuccess && qualifyResult.data) {
          const { qualified, relevanceScore, generatedCommentId } =
            qualifyResult.data

          if (qualified) {
            qualifiedCount++
          } else {
            ignoredCount++
          }

          results.push({
            leadId,
            qualified,
            relevanceScore,
            generatedCommentId,
            success: true
          })
        } else {
          throw new Error(qualifyResult.message)
        }
      } catch (error) {
        console.error(
          `🎯 [MONITOR-QUALIFY] Error qualifying lead ${leadId}:`,
          error
        )

        errorCount++
        results.push({
          leadId,
          error: error instanceof Error ? error.message : "Unknown error",
          success: false
        })
      }
    }

    console.log(
      `🎯 [MONITOR-QUALIFY] ✅ Manual qualification complete - Qualified: ${qualifiedCount}, Ignored: ${ignoredCount}, Errors: ${errorCount}`
    )

    return NextResponse.json({
      message: "Manual lead qualification completed",
      leadsProcessed: leadIds.length,
      qualifiedLeads: qualifiedCount,
      ignoredLeads: ignoredCount,
      errorLeads: errorCount,
      results
    })
  } catch (error) {
    console.error("🎯 [MONITOR-QUALIFY] ❌ Manual qualification error:", error)
    return NextResponse.json(
      { error: "Internal server error during manual qualification" },
      { status: 500 }
    )
  }
}
