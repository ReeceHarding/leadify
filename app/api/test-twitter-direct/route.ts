"use server"

import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔥 [TEST-TWITTER-DIRECT] Starting direct API test")

    const body = await request.json()
    const { query = "twitter" } = body

    const TWITTER_AIO_API_KEY = process.env.TWITTER_AIO_API_KEY
    const TWITTER_AIO_BASE_URL = "https://twitter-aio.p.rapidapi.com"

    if (!TWITTER_AIO_API_KEY) {
      return NextResponse.json(
        { error: "Twitter AIO API key not configured" },
        { status: 500 }
      )
    }

    console.log("🔥 [TEST-TWITTER-DIRECT] Testing query:", query)

    // Test the basic /search endpoint without any filters
    const params = new URLSearchParams({
      query: query,
      count: "10",
      category: "Latest"
    })

    const fullUrl = `${TWITTER_AIO_BASE_URL}/search?${params}`
    console.log("🔥 [TEST-TWITTER-DIRECT] Request URL:", fullUrl)

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": TWITTER_AIO_API_KEY,
        "X-RapidAPI-Host": "twitter-aio.p.rapidapi.com",
        Accept: "application/json"
      }
    })

    console.log("🔥 [TEST-TWITTER-DIRECT] Response status:", response.status)
    console.log(
      "🔥 [TEST-TWITTER-DIRECT] Response headers:",
      Object.fromEntries(response.headers.entries())
    )

    const responseText = await response.text()
    console.log(
      "🔥 [TEST-TWITTER-DIRECT] Raw response length:",
      responseText.length
    )
    console.log(
      "🔥 [TEST-TWITTER-DIRECT] Raw response preview:",
      responseText.substring(0, 1000)
    )

    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error(
        "🔥 [TEST-TWITTER-DIRECT] Failed to parse response:",
        parseError
      )
      return NextResponse.json({
        error: "Failed to parse API response",
        status: response.status,
        rawResponse: responseText.substring(0, 500)
      })
    }

    return NextResponse.json({
      status: response.status,
      success: response.ok,
      data: data,
      rawResponseLength: responseText.length
    })
  } catch (error) {
    console.error("🔥 [TEST-TWITTER-DIRECT] Error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
