/*
<ai_context>
API endpoint for generating warm-up posts for a specific organization.
Can be called manually or by scheduled functions.
</ai_context>
*/

import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { generateAndScheduleWarmupPostsAction } from "@/actions/warmup-queue-actions"
import { getOrganizationsByUserIdAction } from "@/actions/db/organizations-actions"

export async function POST(request: Request) {
  try {
    // Verify the request is authorized
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { organizationId, userId } = body

    // Support both organizationId (preferred) and userId (legacy)
    let targetOrganizationId = organizationId

    if (!targetOrganizationId && userId) {
      // Legacy support: get first organization for user
      console.log(
        `🔧 [GENERATE-POSTS-API] Legacy mode: Getting organization for user: ${userId}`
      )
      const orgsResult = await getOrganizationsByUserIdAction(userId)
      if (
        orgsResult.isSuccess &&
        orgsResult.data &&
        orgsResult.data.length > 0
      ) {
        targetOrganizationId = orgsResult.data[0].id
        console.log(
          `🔧 [GENERATE-POSTS-API] Found organization: ${targetOrganizationId}`
        )
      }
    }

    if (!targetOrganizationId) {
      return NextResponse.json(
        { error: "organizationId is required (or userId for legacy support)" },
        { status: 400 }
      )
    }

    console.log(
      `🔧 [GENERATE-POSTS-API] Generating posts for organization: ${targetOrganizationId}`
    )

    const result =
      await generateAndScheduleWarmupPostsAction(targetOrganizationId)

    if (result.isSuccess) {
      return NextResponse.json({
        success: true,
        postsGenerated: result.data?.postsGenerated || 0,
        message: result.message
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("❌ [GENERATE-POSTS-API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
