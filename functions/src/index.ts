/*
<ai_context>
Firebase Cloud Functions for Reddit warm-up system.
These functions run on schedule to process posts and check comments.
</ai_context>
*/

import * as functions from "firebase-functions"
import * as admin from "firebase-admin"
import { Timestamp } from "firebase-admin/firestore"

// Initialize Firebase Admin
admin.initializeApp()

const db = admin.firestore()

// Collections
const WARMUP_COLLECTIONS = {
  WARMUP_ACCOUNTS: "warmupAccounts",
  WARMUP_POSTS: "warmupPosts",
  WARMUP_COMMENTS: "warmupComments",
  SUBREDDIT_ANALYSIS: "subredditAnalysis",
  WARMUP_RATE_LIMITS: "warmupRateLimits"
}

// Process warm-up posts queue - runs every 5 minutes
export const processWarmupQueue = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: "1GB"
  })
  .pubsub
  .schedule("every 5 minutes")
  .onRun(async (context) => {
    console.log("🔧 [PROCESS-WARMUP] Starting warm-up queue processing")

    try {
      // Call your existing API endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/queue/process-warmup`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
            "Content-Type": "application/json"
          }
        }
      )

      const result = await response.json()
      console.log("✅ [PROCESS-WARMUP] Queue processed:", result)
      
      return null
    } catch (error) {
      console.error("❌ [PROCESS-WARMUP] Error:", error)
      throw error
    }
  })

// Check for new comments - runs every 30 minutes
export const checkWarmupComments = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: "1GB"
  })
  .pubsub
  .schedule("every 30 minutes")
  .onRun(async (context) => {
    console.log("🔧 [CHECK-COMMENTS] Starting comment check")

    try {
      // Call your existing API endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/queue/check-warmup-comments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
            "Content-Type": "application/json"
          }
        }
      )

      const result = await response.json()
      console.log("✅ [CHECK-COMMENTS] Comments checked:", result)
      
      return null
    } catch (error) {
      console.error("❌ [CHECK-COMMENTS] Error:", error)
      throw error
    }
  })

// Generate new posts daily - runs at 2 AM UTC
export const generateDailyPosts = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: "2GB"
  })
  .pubsub
  .schedule("0 2 * * *")
  .timeZone("UTC")
  .onRun(async (context) => {
    console.log("🔧 [GENERATE-POSTS] Starting daily post generation")

    try {
      // Get all active warm-up accounts
      const accountsSnapshot = await db
        .collection(WARMUP_COLLECTIONS.WARMUP_ACCOUNTS)
        .where("isActive", "==", true)
        .get()

      let totalPostsGenerated = 0

      for (const doc of accountsSnapshot.docs) {
        const account = doc.data()
        
        // Check if warm-up period is still active
        const now = Timestamp.now()
        if (now.toMillis() > account.warmupEndDate.toMillis()) {
          console.log(`⏰ [GENERATE-POSTS] Warm-up period ended for user ${account.userId}`)
          continue
        }

        try {
          // Call your post generation endpoint
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/warmup/generate-posts`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.CRON_SECRET}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ userId: account.userId })
            }
          )

          const result = await response.json()
          totalPostsGenerated += result.postsGenerated || 0
        } catch (error) {
          console.error(`❌ [GENERATE-POSTS] Error for user ${account.userId}:`, error)
        }
      }

      console.log(`✅ [GENERATE-POSTS] Generated ${totalPostsGenerated} posts total`)
      return null
    } catch (error) {
      console.error("❌ [GENERATE-POSTS] Error:", error)
      throw error
    }
  })

// Clean up old data - runs weekly
export const cleanupWarmupData = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "1GB"
  })
  .pubsub
  .schedule("0 3 * * 0") // Sunday at 3 AM UTC
  .timeZone("UTC")
  .onRun(async (context) => {
    console.log("🧹 [CLEANUP] Starting warm-up data cleanup")

    try {
      const thirtyDaysAgo = Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      )

      // Clean up old posts
      const oldPostsQuery = await db
        .collection(WARMUP_COLLECTIONS.WARMUP_POSTS)
        .where("createdAt", "<", thirtyDaysAgo)
        .where("status", "in", ["posted", "failed"])
        .get()

      const batch = db.batch()
      let deletedCount = 0

      oldPostsQuery.forEach((doc) => {
        batch.delete(doc.ref)
        deletedCount++
      })

      if (deletedCount > 0) {
        await batch.commit()
        console.log(`✅ [CLEANUP] Deleted ${deletedCount} old posts`)
      }

      return null
    } catch (error) {
      console.error("❌ [CLEANUP] Error:", error)
      throw error
    }
  })

// Health check - runs every hour to ensure system is working
export const warmupHealthCheck = functions
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB"
  })
  .pubsub
  .schedule("every 60 minutes")
  .onRun(async (context) => {
    console.log("🏥 [HEALTH-CHECK] Checking warm-up system health")

    try {
      // Check for stuck posts
      const oneHourAgo = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000))
      
      const stuckPostsQuery = await db
        .collection(WARMUP_COLLECTIONS.WARMUP_POSTS)
        .where("status", "==", "queued")
        .where("scheduledFor", "<", oneHourAgo)
        .get()

      if (!stuckPostsQuery.empty) {
        console.warn(`⚠️ [HEALTH-CHECK] Found ${stuckPostsQuery.size} stuck posts`)
        
        // You could send an alert here
        // await sendAlert(`Found ${stuckPostsQuery.size} stuck warm-up posts`)
      }

      console.log("✅ [HEALTH-CHECK] System healthy")
      return null
    } catch (error) {
      console.error("❌ [HEALTH-CHECK] Error:", error)
      throw error
    }
  }) 