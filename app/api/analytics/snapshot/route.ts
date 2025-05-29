"use server"

import { NextRequest, NextResponse } from "next/server"
import { calculateAndStoreAnalyticsSnapshotAction } from "@/actions/db/analytics-actions"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/db/db"
import { ORGANIZATION_COLLECTIONS } from "@/db/firestore/organizations-collections"

/**
 * API route to generate daily analytics snapshots for all organizations
 * Protected by CRON_SECRET for automated execution
 * POST /api/analytics/snapshot
 */
export async function POST(request: NextRequest) {
  try {
    console.log(`\n🔄 [ANALYTICS-CRON] ====== DAILY SNAPSHOT GENERATION ======`)

    // Verify CRON secret for security
    const cronSecret = request.headers.get("authorization")
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error(`❌ [ANALYTICS-CRON] Unauthorized: Invalid CRON secret`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get target date (yesterday by default, or from query params)
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get("date")
    const targetDate = dateParam
      ? new Date(dateParam)
      : new Date(Date.now() - 24 * 60 * 60 * 1000)

    console.log(`🔄 [ANALYTICS-CRON] Target date: ${targetDate.toISOString()}`)

    // Get all organizations
    const orgsRef = collection(db, ORGANIZATION_COLLECTIONS.ORGANIZATIONS)
    const orgsSnapshot = await getDocs(orgsRef)

    console.log(
      `🔄 [ANALYTICS-CRON] Found ${orgsSnapshot.docs.length} organizations`
    )

    const results = []
    let successCount = 0
    let errorCount = 0

    // Process each organization
    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id
      console.log(`🔄 [ANALYTICS-CRON] Processing organization: ${orgId}`)

      try {
        const result = await calculateAndStoreAnalyticsSnapshotAction(
          orgId,
          targetDate
        )

        if (result.isSuccess) {
          successCount++
          console.log(`✅ [ANALYTICS-CRON] Successfully processed ${orgId}`)
        } else {
          errorCount++
          console.error(
            `❌ [ANALYTICS-CRON] Failed to process ${orgId}: ${result.message}`
          )
        }

        results.push({
          organizationId: orgId,
          success: result.isSuccess,
          message: result.message
        })
      } catch (error) {
        errorCount++
        console.error(`❌ [ANALYTICS-CRON] Error processing ${orgId}:`, error)
        results.push({
          organizationId: orgId,
          success: false,
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        })
      }
    }

    console.log(
      `🔄 [ANALYTICS-CRON] ====== SNAPSHOT GENERATION COMPLETE ======`
    )
    console.log(
      `🔄 [ANALYTICS-CRON] Successful: ${successCount}, Errors: ${errorCount}`
    )

    return NextResponse.json({
      success: true,
      message: `Processed ${orgsSnapshot.docs.length} organizations`,
      stats: {
        totalOrganizations: orgsSnapshot.docs.length,
        successful: successCount,
        errors: errorCount,
        targetDate: targetDate.toISOString()
      },
      results
    })
  } catch (error) {
    console.error(
      "❌ [ANALYTICS-CRON] Critical error in snapshot generation:",
      error
    )
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
