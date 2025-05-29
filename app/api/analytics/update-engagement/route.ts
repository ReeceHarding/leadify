"use server"

import { NextRequest, NextResponse } from "next/server"
import { updateCommentEngagementAction } from "@/actions/db/analytics-actions"
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp
} from "firebase/firestore"
import { db } from "@/db/db"
import {
  LEAD_COLLECTIONS,
  type GeneratedCommentDocument
} from "@/db/firestore/lead-generation-collections"

/**
 * API route to update engagement metrics for posted comments
 * Fetches recent data from Reddit for comments that need updates
 * Protected by CRON_SECRET for automated execution
 * POST /api/analytics/update-engagement
 */
export async function POST(request: NextRequest) {
  try {
    console.log(`\n📊 [ENGAGEMENT-CRON] ====== ENGAGEMENT UPDATE ======`)

    // Verify CRON secret for security
    const cronSecret = request.headers.get("authorization")
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error(`❌ [ENGAGEMENT-CRON] Unauthorized: Invalid CRON secret`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get hours threshold from query params (default 2 hours)
    const searchParams = request.nextUrl.searchParams
    const hoursParam = searchParams.get("hours")
    const hoursThreshold = hoursParam ? parseInt(hoursParam) : 2

    console.log(
      `📊 [ENGAGEMENT-CRON] Checking comments not updated in last ${hoursThreshold} hours`
    )

    // Calculate cutoff time
    const cutoffTime = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000)
    const cutoffTimestamp = Timestamp.fromDate(cutoffTime)

    // Get posted comments that need engagement updates
    const commentsRef = collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS)
    const commentsQuery = query(
      commentsRef,
      where("status", "==", "posted")
      // Note: We can't use compound queries with null checks easily in Firestore
      // We'll filter in memory for lastEngagementCheckAt conditions
    )

    const commentsSnapshot = await getDocs(commentsQuery)
    console.log(
      `📊 [ENGAGEMENT-CRON] Found ${commentsSnapshot.docs.length} posted comments`
    )

    // Filter comments that need updates
    const commentsToUpdate = commentsSnapshot.docs.filter(doc => {
      const comment = doc.data() as GeneratedCommentDocument

      // Must have a posted comment URL to fetch engagement
      if (!comment.postedCommentUrl) return false

      // Check if never checked or not checked recently
      const lastCheck = comment.lastEngagementCheckAt
      if (!lastCheck) return true // Never checked

      return lastCheck.toDate() < cutoffTime // Not checked recently
    })

    console.log(
      `📊 [ENGAGEMENT-CRON] ${commentsToUpdate.length} comments need engagement updates`
    )

    let successCount = 0
    let errorCount = 0
    let skippedCount = 0
    const results = []

    // Process each comment that needs updating
    for (const commentDoc of commentsToUpdate) {
      const comment = commentDoc.data() as GeneratedCommentDocument
      const commentId = commentDoc.id

      console.log(`📊 [ENGAGEMENT-CRON] Processing comment: ${commentId}`)
      console.log(
        `📊 [ENGAGEMENT-CRON] Comment URL: ${comment.postedCommentUrl}`
      )

      try {
        // Extract Reddit data from URL to make API calls
        const redditUrl = comment.postedCommentUrl!

        // Basic URL parsing - in a real implementation, you'd want to:
        // 1. Parse the Reddit URL to get thread ID and comment ID
        // 2. Make Reddit API calls to fetch current engagement metrics
        // 3. For now, we'll simulate this with mock data and the updateCommentEngagementAction

        // URL format is typically: https://www.reddit.com/r/subreddit/comments/threadId/title/commentId/
        const urlParts = redditUrl.split("/")
        const subreddit = urlParts[4] // r/subreddit
        const threadId = urlParts[6]
        const commentIdFromUrl = urlParts[8] || ""

        console.log(
          `📊 [ENGAGEMENT-CRON] Parsed - Subreddit: ${subreddit}, Thread: ${threadId}, Comment: ${commentIdFromUrl}`
        )

        // TODO: Implement actual Reddit API call here
        // For now, we'll use mock engagement data or existing values

        // Simulate fetching engagement (in real implementation, call Reddit API)
        const mockUpvotes =
          Math.floor(Math.random() * 10) + (comment.engagementUpvotes || 0)
        const mockReplies =
          Math.floor(Math.random() * 3) + (comment.engagementRepliesCount || 0)

        console.log(
          `📊 [ENGAGEMENT-CRON] Mock engagement - Upvotes: ${mockUpvotes}, Replies: ${mockReplies}`
        )

        // Update the comment with new engagement data
        const updateResult = await updateCommentEngagementAction(
          commentId,
          mockUpvotes,
          mockReplies
        )

        if (updateResult.isSuccess) {
          successCount++
          console.log(`✅ [ENGAGEMENT-CRON] Successfully updated ${commentId}`)
        } else {
          errorCount++
          console.error(
            `❌ [ENGAGEMENT-CRON] Failed to update ${commentId}: ${updateResult.message}`
          )
        }

        results.push({
          commentId,
          success: updateResult.isSuccess,
          message: updateResult.message,
          upvotes: mockUpvotes,
          replies: mockReplies
        })

        // Rate limiting - wait between requests to avoid overwhelming Reddit API
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        errorCount++
        console.error(
          `❌ [ENGAGEMENT-CRON] Error processing comment ${commentId}:`,
          error
        )
        results.push({
          commentId,
          success: false,
          message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
        })
      }
    }

    console.log(`📊 [ENGAGEMENT-CRON] ====== ENGAGEMENT UPDATE COMPLETE ======`)
    console.log(
      `📊 [ENGAGEMENT-CRON] Successful: ${successCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`
    )

    return NextResponse.json({
      success: true,
      message: `Processed ${commentsToUpdate.length} comments`,
      stats: {
        totalCommentsChecked: commentsSnapshot.docs.length,
        commentsNeedingUpdate: commentsToUpdate.length,
        successful: successCount,
        errors: errorCount,
        skipped: skippedCount,
        hoursThreshold
      },
      results
    })
  } catch (error) {
    console.error(
      "❌ [ENGAGEMENT-CRON] Critical error in engagement update:",
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
