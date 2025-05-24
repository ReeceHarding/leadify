import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/db"
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  doc,
  Timestamp
} from "firebase/firestore"
import { postCommentAndUpdateStatusAction } from "@/actions/integrations/reddit-posting-actions"
import { POSTING_QUEUE_COLLECTIONS } from "@/db/firestore/posting-queue-collections"

// This API route should be called by a cron job every minute
// It processes pending posts that are scheduled for now or earlier

export async function GET(request: NextRequest) {
  // Verify the request is from an authorized source (e.g., cron job secret)
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log("❌ [QUEUE-PROCESSOR] Unauthorized request")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("🔄 [QUEUE-PROCESSOR] Starting queue processing run")

  try {
    // Get posts that are scheduled for now or earlier and still pending
    const now = new Date()
    const queueCollection = collection(
      db,
      POSTING_QUEUE_COLLECTIONS.POSTING_QUEUE
    )
    const q = query(
      queueCollection,
      where("status", "==", "pending"),
      where("scheduledFor", "<=", Timestamp.fromDate(now)),
      orderBy("scheduledFor", "asc"),
      limit(1) // Process one at a time to respect rate limits
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      console.log("📭 [QUEUE-PROCESSOR] No posts to process")
      return NextResponse.json({
        message: "No posts to process",
        processed: 0
      })
    }

    let processedCount = 0
    let errors = []

    for (const docSnapshot of snapshot.docs) {
      const postData = docSnapshot.data()
      const postId = docSnapshot.id

      console.log(
        `📝 [QUEUE-PROCESSOR] Processing post ${postId} for lead ${postData.leadId}`
      )

      try {
        // Update status to processing
        await updateDoc(
          doc(db, POSTING_QUEUE_COLLECTIONS.POSTING_QUEUE, postId),
          {
            status: "processing",
            processingStartedAt: Timestamp.now()
          }
        )

        // Post the comment
        const result = await postCommentAndUpdateStatusAction(
          postData.leadId,
          postData.threadId,
          postData.comment
        )

        if (result.isSuccess) {
          console.log(
            `✅ [QUEUE-PROCESSOR] Successfully posted comment for lead ${postData.leadId}`
          )

          // Update status to completed
          await updateDoc(
            doc(db, POSTING_QUEUE_COLLECTIONS.POSTING_QUEUE, postId),
            {
              status: "completed",
              completedAt: Timestamp.now(),
              resultLink: result.data?.link || null
            }
          )

          processedCount++
        } else {
          console.error(
            `❌ [QUEUE-PROCESSOR] Failed to post: ${result.message}`
          )

          // Update status to failed and increment retry count
          const newRetryCount = (postData.retryCount || 0) + 1
          const maxRetries = 3

          await updateDoc(
            doc(db, POSTING_QUEUE_COLLECTIONS.POSTING_QUEUE, postId),
            {
              status: newRetryCount >= maxRetries ? "failed" : "pending",
              retryCount: newRetryCount,
              lastError: result.message,
              lastErrorAt: Timestamp.now(),
              // If retrying, schedule for 10 minutes later
              scheduledFor:
                newRetryCount < maxRetries
                  ? Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000))
                  : postData.scheduledFor
            }
          )

          errors.push({
            postId,
            leadId: postData.leadId,
            error: result.message,
            retryCount: newRetryCount
          })
        }
      } catch (error) {
        console.error(
          `❌ [QUEUE-PROCESSOR] Error processing post ${postId}:`,
          error
        )

        // Update status to failed
        await updateDoc(
          doc(db, POSTING_QUEUE_COLLECTIONS.POSTING_QUEUE, postId),
          {
            status: "failed",
            lastError: error instanceof Error ? error.message : "Unknown error",
            lastErrorAt: Timestamp.now()
          }
        )

        errors.push({
          postId,
          leadId: postData.leadId,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }

    console.log(
      `🏁 [QUEUE-PROCESSOR] Completed processing. Processed: ${processedCount}, Errors: ${errors.length}`
    )

    return NextResponse.json({
      message: "Queue processing completed",
      processed: processedCount,
      errors: errors.length,
      errorDetails: errors
    })
  } catch (error) {
    console.error("❌ [QUEUE-PROCESSOR] Fatal error:", error)
    return NextResponse.json(
      {
        error: "Failed to process queue",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}
