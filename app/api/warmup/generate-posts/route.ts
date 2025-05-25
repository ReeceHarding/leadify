/*
<ai_context>
API endpoint for generating warm-up posts for a specific user.
This can be called by Firebase Cloud Scheduler or any cron service.
</ai_context>
*/

import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { generateAndScheduleWarmupPostsAction } from "@/actions/warmup-queue-actions"

export async function POST(request: Request) {
  try {
    // Verify the request is authorized
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    console.log(`🔧 [GENERATE-POSTS-API] Generating posts for user: ${userId}`)

    const result = await generateAndScheduleWarmupPostsAction(userId)

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      postsGenerated: result.data?.postsGenerated || 0
    })
  } catch (error) {
    console.error("❌ [GENERATE-POSTS-API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 