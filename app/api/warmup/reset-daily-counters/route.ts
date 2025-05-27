import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/db"
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore"
import { WARMUP_COLLECTIONS } from "@/db/firestore/warmup-collections"

// This API route should be called by a cron job at midnight daily
// It resets the daily counters for all active warmup accounts

export async function GET(request: NextRequest) {
  // Verify the request is from an authorized source (e.g., cron job secret)
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log("❌ [WARMUP-RESET] Unauthorized request")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("🔄 [WARMUP-RESET] Starting daily counter reset")

  try {
    // Get all active warmup accounts
    const warmupCollection = collection(db, WARMUP_COLLECTIONS.WARMUP_ACCOUNTS)
    const q = query(warmupCollection, where("isActive", "==", true))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      console.log("📭 [WARMUP-RESET] No active warmup accounts to reset")
      return NextResponse.json({
        message: "No active warmup accounts",
        reset: 0
      })
    }

    let resetCount = 0
    const errors = []

    for (const docSnapshot of snapshot.docs) {
      const accountData = docSnapshot.data()
      const accountId = docSnapshot.id

      console.log(
        `📝 [WARMUP-RESET] Resetting counters for account ${accountId} (${accountData.redditUsername})`
      )

      try {
        // Reset daily counters and increment current day
        const currentDay = accountData.currentDay || 1
        const nextDay = currentDay < 7 ? currentDay + 1 : 7 // Cap at 7 days

        await updateDoc(
          doc(db, WARMUP_COLLECTIONS.WARMUP_ACCOUNTS, accountId),
          {
            postsToday: 0,
            commentsToday: 0,
            currentDay: nextDay,
            updatedAt: serverTimestamp()
          }
        )

        console.log(
          `✅ [WARMUP-RESET] Reset counters for ${accountData.redditUsername}, now on day ${nextDay}`
        )
        resetCount++

        // Check if warmup period is complete
        if (nextDay >= 7 && accountData.status !== "completed") {
          await updateDoc(
            doc(db, WARMUP_COLLECTIONS.WARMUP_ACCOUNTS, accountId),
            {
              status: "completed",
              isActive: false
            }
          )
          console.log(
            `🎉 [WARMUP-RESET] Warmup completed for ${accountData.redditUsername}`
          )
        }
      } catch (error) {
        console.error(
          `❌ [WARMUP-RESET] Error resetting account ${accountId}:`,
          error
        )
        errors.push({
          accountId,
          username: accountData.redditUsername,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }

    console.log(
      `🏁 [WARMUP-RESET] Completed reset. Reset: ${resetCount}, Errors: ${errors.length}`
    )

    return NextResponse.json({
      message: "Daily counter reset completed",
      reset: resetCount,
      errors: errors.length,
      errorDetails: errors
    })
  } catch (error) {
    console.error("❌ [WARMUP-RESET] Fatal error:", error)
    return NextResponse.json(
      {
        error: "Failed to reset daily counters",
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
