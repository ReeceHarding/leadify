/*
<ai_context>
API endpoint for processing Reddit warm-up posts and comments.
This would typically be called by a cron job.
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
  Timestamp,
  orderBy,
  limit
} from "firebase/firestore"
import { WARMUP_COLLECTIONS } from "@/db/firestore/warmup-collections"
import {
  submitRedditPostAction,
  submitRedditCommentAction
} from "@/actions/integrations/reddit/reddit-warmup-actions"
import {
  updateWarmupPostAction,
  updateWarmupRateLimitAction,
  updateWarmupCommentAction
} from "@/actions/db/warmup-actions"
import { generateCommentsForWarmupPostAction } from "@/actions/warmup-queue-actions"

export async function POST(request: Request) {
  try {
    // Verify the request is authorized (you might want to add a secret key check)
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🔧 [PROCESS-WARMUP] Starting warm-up queue processing")

    const now = Timestamp.now()
    let postsProcessed = 0
    let commentsProcessed = 0

    // Process queued posts
    const postsQuery = query(
      collection(db, WARMUP_COLLECTIONS.WARMUP_POSTS),
      where("status", "==", "queued"),
      where("scheduledFor", "<=", now),
      orderBy("scheduledFor", "asc"),
      limit(10) // Process up to 10 posts at a time
    )

    const postsSnapshot = await getDocs(postsQuery)

    for (const postDoc of postsSnapshot.docs) {
      const post = postDoc.data()

      try {
        console.log(
          `📤 [PROCESS-WARMUP] Submitting post to r/${post.subreddit}`
        )

        // Submit to Reddit
        const submitResult = await submitRedditPostAction(
          post.subreddit,
          post.title,
          post.content
        )

        if (submitResult.isSuccess && submitResult.data) {
          // Update post status
          await updateWarmupPostAction(post.id, {
            status: "posted",
            postedAt: Timestamp.now(),
            redditPostId: submitResult.data.id,
            redditPostUrl: submitResult.data.url
          })

          // Update rate limit
          await updateWarmupRateLimitAction(post.userId, post.subreddit)

          // Generate comments for the post
          await generateCommentsForWarmupPostAction(
            post.id,
            submitResult.data.id,
            post.subreddit
          )

          postsProcessed++
          console.log(
            `✅ [PROCESS-WARMUP] Post submitted successfully: ${submitResult.data.url}`
          )
        } else {
          // Mark as failed
          await updateWarmupPostAction(post.id, {
            status: "failed",
            error: submitResult.message
          })
          console.error(
            `❌ [PROCESS-WARMUP] Failed to submit post: ${submitResult.message}`
          )
        }
      } catch (error) {
        console.error(
          `❌ [PROCESS-WARMUP] Error processing post ${post.id}:`,
          error
        )
        await updateWarmupPostAction(post.id, {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }

    // Process queued comments
    const commentsQuery = query(
      collection(db, WARMUP_COLLECTIONS.WARMUP_COMMENTS),
      where("status", "==", "queued"),
      where("scheduledFor", "<=", now),
      orderBy("scheduledFor", "asc"),
      limit(20) // Process up to 20 comments at a time
    )

    const commentsSnapshot = await getDocs(commentsQuery)

    for (const commentDoc of commentsSnapshot.docs) {
      const comment = commentDoc.data()

      try {
        console.log(`💬 [PROCESS-WARMUP] Submitting comment`)

        // Get the parent post to get the Reddit post ID
        const postQuery = query(
          collection(db, WARMUP_COLLECTIONS.WARMUP_POSTS),
          where("id", "==", comment.warmupPostId)
        )
        const postSnapshot = await getDocs(postQuery)

        if (!postSnapshot.empty) {
          const post = postSnapshot.docs[0].data()

          if (post.redditPostId) {
            // Submit comment to Reddit
            const parentFullname = comment.parentCommentId
              ? `t1_${comment.parentCommentId}`
              : `t3_${post.redditPostId}`

            const submitResult = await submitRedditCommentAction(
              parentFullname,
              comment.content
            )

            if (submitResult.isSuccess && submitResult.data) {
              // Update comment status
              await updateWarmupCommentAction(comment.id, {
                status: "posted",
                postedAt: Timestamp.now(),
                redditCommentId: submitResult.data.id
              })

              commentsProcessed++
              console.log(`✅ [PROCESS-WARMUP] Comment submitted successfully`)
            } else {
              // Mark as failed
              await updateWarmupCommentAction(comment.id, {
                status: "failed",
                error: submitResult.message
              })
              console.error(
                `❌ [PROCESS-WARMUP] Failed to submit comment: ${submitResult.message}`
              )
            }
          }
        }
      } catch (error) {
        console.error(
          `❌ [PROCESS-WARMUP] Error processing comment ${comment.id}:`,
          error
        )
        await updateWarmupCommentAction(comment.id, {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }

    console.log(
      `✅ [PROCESS-WARMUP] Processed ${postsProcessed} posts and ${commentsProcessed} comments`
    )

    return NextResponse.json({
      success: true,
      postsProcessed,
      commentsProcessed
    })
  } catch (error) {
    console.error("❌ [PROCESS-WARMUP] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
