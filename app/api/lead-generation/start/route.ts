import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { runFullLeadGenerationWorkflowAction } from "@/actions/lead-generation/workflow-actions"

export async function POST(req: NextRequest) {
  console.log("🔥🔥🔥 [API-LEAD-GEN] POST request received")
  console.log(
    "🔥🔥🔥 [API-LEAD-GEN] Headers:",
    Object.fromEntries(req.headers.entries())
  )
  console.log("🔥🔥🔥 [API-LEAD-GEN] URL:", req.url)
  console.log("🔥🔥🔥 [API-LEAD-GEN] Method:", req.method)

  try {
    console.log("🔥🔥🔥 [API-LEAD-GEN] Checking authentication...")
    const { userId } = await auth()
    console.log("🔥🔥🔥 [API-LEAD-GEN] Auth result - userId:", userId)

    if (!userId) {
      console.log("🔥🔥🔥 [API-LEAD-GEN] No userId, returning 401")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔥🔥🔥 [API-LEAD-GEN] Parsing request body...")
    const body = await req.json()
    console.log("🔥🔥🔥 [API-LEAD-GEN] Request body:", body)

    const { campaignId } = body
    console.log("🔥🔥🔥 [API-LEAD-GEN] Campaign ID from body:", campaignId)

    if (!campaignId) {
      console.log("🔥🔥🔥 [API-LEAD-GEN] No campaignId provided, returning 400")
      return NextResponse.json(
        { error: "Campaign ID is required" },
        { status: 400 }
      )
    }

    console.log("🔥🔥🔥 [API-LEAD-GEN] Starting lead generation workflow...")
    console.log(
      "🔥🔥🔥 [API-LEAD-GEN] Calling runFullLeadGenerationWorkflowAction with campaignId:",
      campaignId
    )

    // Start the workflow
    const result = await runFullLeadGenerationWorkflowAction(campaignId)

    console.log("🔥🔥🔥 [API-LEAD-GEN] Workflow result:", {
      isSuccess: result.isSuccess,
      message: result.message,
      hasData: !!result.data,
      dataKeys: result.data ? Object.keys(result.data) : []
    })

    if (!result.isSuccess) {
      console.error("🔥🔥🔥 [API-LEAD-GEN] Workflow failed:", result.message)
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    console.log("🔥🔥🔥 [API-LEAD-GEN] Success! Returning response")
    const response = {
      success: true,
      message: "Lead generation workflow started",
      data: result.data
    }
    console.log("🔥🔥🔥 [API-LEAD-GEN] Response data:", response)

    return NextResponse.json(response)
  } catch (error) {
    console.error("🔥🔥🔥 [API-LEAD-GEN] Caught error:", error)
    console.error("🔥🔥🔥 [API-LEAD-GEN] Error type:", typeof error)
    console.error(
      "🔥🔥🔥 [API-LEAD-GEN] Error message:",
      error instanceof Error ? error.message : String(error)
    )
    console.error(
      "🔥🔥🔥 [API-LEAD-GEN] Error stack:",
      error instanceof Error ? error.stack : "No stack"
    )

    return NextResponse.json(
      { error: "Failed to start lead generation" },
      { status: 500 }
    )
  }
}
