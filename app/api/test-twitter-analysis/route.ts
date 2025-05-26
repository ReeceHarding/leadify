"use server"

import { NextRequest, NextResponse } from "next/server"
import { fetchUserTweetsAction } from "@/actions/integrations/twitter/twitter-aio-actions"

export async function POST(request: NextRequest) {
  try {
    console.log("🔥 [TEST-TWITTER-API] Starting test")

    const body = await request.json()
    const { username } = body

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      )
    }

    console.log("🔥 [TEST-TWITTER-API] Testing username:", username)

    const result = await fetchUserTweetsAction(username, 10)

    console.log("🔥 [TEST-TWITTER-API] Result:", {
      isSuccess: result.isSuccess,
      message: result.message,
      dataLength: result.data?.length || 0
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("🔥 [TEST-TWITTER-API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
