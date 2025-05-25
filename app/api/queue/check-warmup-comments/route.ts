/*
<ai_context>
API endpoint for checking new comments on warm-up posts.
This should be called by a cron job every 30 minutes.
</ai_context>
*/

import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { db } from "@/db/db"
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from "firebase/firestore"
import { WARMUP_COLLECTIONS } from "@/db/firestore/warmup-collections"
import { getPostCommentsAction } from "@/actions/integrations/reddit/reddit-warmup-actions"
import { generateWarmupCommentsAction } from "@/actions/integrations/openai/warmup-content-generation-actions"
import {
  createWarmupCommentAction,
  getWarmupCommentsByPostIdAction
} from "@/actions/db/warmup-actions"

export async function POST(request: Request) {
  try {
    // Verify the request is authorized
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔧 [CHECK-COMMENTS] Starting comment check for warm-up posts")

    let postsChecked = 0
    let newCommentsFound = 0
    let repliesGenerated = 0

    // Get all posted warm-up posts from the last 7 days
    const sevenDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    )

    const postsQuery = query(
      collection(db, WARMUP_COLLECTIONS.WARMUP_POSTS),
      where("status", "==", "posted"),
      where("postedAt", ">=", sevenDaysAgo)
    )

    const postsSnapshot = await getDocs(postsQuery)

    for (const postDoc of postsSnapshot.docs) {
      const post = postDoc.data()

      if (!post.redditPostId) continue

      try {
        console.log(
          `🔍 [CHECK-COMMENTS] Checking comments for post in r/${post.subreddit}`
        )
        postsChecked++

        // Get existing comments we've already replied to
        const existingCommentsResult = await getWarmupCommentsByPostIdAction(
          post.id
        )
        const existingParentCommentIds = new Set(
          existingCommentsResult.data
            ?.map(c => c.redditParentCommentId)
            .filter(Boolean) || []
        )

        // Fetch current comments from Reddit
        const commentsResult = await getPostCommentsAction(
          post.subreddit,
          post.redditPostId
        )
        if (!commentsResult.isSuccess || !commentsResult.data) {
          console.error(
            `❌ [CHECK-COMMENTS] Failed to fetch comments for post ${post.id}`
          )
          continue
        }

        // Filter out comments we've already replied to
        const newComments = commentsResult.data.filter(comment => {
          const commentId = comment.data?.id
          return (
            commentId &&
            !existingParentCommentIds.has(commentId) &&
            !comment.data.author.includes("[deleted]")
          )
        })

        if (newComments.length === 0) {
          console.log(`ℹ️ [CHECK-COMMENTS] No new comments for post ${post.id}`)
          continue
        }

        newCommentsFound += newComments.length
        console.log(
          `📝 [CHECK-COMMENTS] Found ${newComments.length} new comments`
        )

        // Generate replies for new comments
        const repliesResult = await generateWarmupCommentsAction(
          newComments,
          `${post.title} - Post in r/${post.subreddit}`
        )

        if (!repliesResult.isSuccess || !repliesResult.data) {
          console.error(
            `❌ [CHECK-COMMENTS] Failed to generate replies for post ${post.id}`
          )
          continue
        }

        // Schedule the replies with spacing
        let commentDelay = 0
        const minDelay = 3 * 60 * 1000 // 3 minutes
        const maxDelay = 4 * 60 * 1000 // 4 minutes

        for (const reply of repliesResult.data) {
          const scheduledFor = Timestamp.fromDate(
            new Date(Date.now() + commentDelay)
          )

          // Store the Reddit comment ID so we don't reply to it again
          await createWarmupCommentAction({
            userId: post.userId,
            warmupPostId: post.id,
            redditParentCommentId: reply.commentId,
            content: reply.reply,
            scheduledFor
          })

          repliesGenerated++

          // Add random delay between 3-4 minutes for next comment
          commentDelay += minDelay + Math.random() * (maxDelay - minDelay)
        }

        console.log(
          `✅ [CHECK-COMMENTS] Scheduled ${repliesResult.data.length} replies for post ${post.id}`
        )
      } catch (error) {
        console.error(
          `❌ [CHECK-COMMENTS] Error checking post ${post.id}:`,
          error
        )
      }
    }

    console.log(
      `✅ [CHECK-COMMENTS] Checked ${postsChecked} posts, found ${newCommentsFound} new comments, generated ${repliesGenerated} replies`
    )

    return NextResponse.json({
      success: true,
      postsChecked,
      newCommentsFound,
      repliesGenerated
    })
  } catch (error) {
    console.error("❌ [CHECK-COMMENTS] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
