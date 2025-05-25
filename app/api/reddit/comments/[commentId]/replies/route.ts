import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

// Mock Reddit comment structure
interface RedditComment {
  id: string
  author: string
  body: string
  score: number
  created_utc: number
  replies?: RedditComment[]
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ commentId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { commentId } = await context.params
    
    console.log(`📖 Fetching replies for comment: ${commentId}`)

    // TODO: Implement real Reddit API integration
    // For now, return mock data
    const mockReplies: RedditComment[] = [
      {
        id: "t1_mock1",
        author: "helpful_redditor",
        body: "This is really helpful! I've been looking for something like this.",
        score: 12,
        created_utc: Date.now() / 1000 - 3600 // 1 hour ago
      },
      {
        id: "t1_mock2",
        author: "curious_user",
        body: "How does this compare to other similar solutions? Any pros/cons?",
        score: 5,
        created_utc: Date.now() / 1000 - 7200 // 2 hours ago
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        commentId,
        replies: mockReplies
      }
    })
  } catch (error) {
    console.error("Error fetching Reddit replies:", error)
    return NextResponse.json(
      { error: "Failed to fetch replies" },
      { status: 500 }
    )
  }
} 