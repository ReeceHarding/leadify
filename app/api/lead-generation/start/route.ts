import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { runFullLeadGenerationWorkflowAction } from "@/actions/lead-generation/workflow-actions"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { campaignId } = await req.json()

    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign ID is required" },
        { status: 400 }
      )
    }

    console.log(
      "🔥 [API] Starting lead generation workflow for campaign:",
      campaignId
    )

    // Start the workflow
    const result = await runFullLeadGenerationWorkflowAction(campaignId)

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Lead generation workflow started",
      data: result.data
    })
  } catch (error) {
    console.error("🔥 [API] Error starting lead generation:", error)
    return NextResponse.json(
      { error: "Failed to start lead generation" },
      { status: 500 }
    )
  }
}
