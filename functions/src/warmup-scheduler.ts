/*
<ai_context>
Firebase Functions for Reddit warm-up scheduling.
These functions run on a schedule to process posts and comments.
</ai_context>
*/

import * as functions from "firebase-functions"
import * as admin from "firebase-admin"
import fetch from "node-fetch"

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

// Process warm-up queue every 5 minutes
export const processWarmupQueue = functions
  .runWith({
    timeoutSeconds: 300, // 5 minutes
    memory: "512MB"
  })
  .pubsub.schedule("every 5 minutes")
  .onRun(async context => {
    console.log("🔧 [WARMUP-QUEUE] Starting warm-up queue processing")

    try {
      // Get the base URL from environment config
      const baseUrl =
        functions.config().app?.url || "https://your-app.vercel.app"
      const cronSecret = functions.config().cron?.secret

      if (!cronSecret) {
        console.error("❌ [WARMUP-QUEUE] CRON_SECRET not configured")
        return null
      }

      const response = await fetch(`${baseUrl}/api/queue/process-warmup`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`✅ [WARMUP-QUEUE] Processed ${data.postsProcessed} posts`)

      return data
    } catch (error) {
      console.error("❌ [WARMUP-QUEUE] Error:", error)
      throw error
    }
  })

// Check for new comments every 30 minutes
export const checkWarmupComments = functions
  .runWith({
    timeoutSeconds: 300, // 5 minutes
    memory: "512MB"
  })
  .pubsub.schedule("every 30 minutes")
  .onRun(async context => {
    console.log("🔧 [CHECK-COMMENTS] Starting comment check")

    try {
      const baseUrl =
        functions.config().app?.url || "https://your-app.vercel.app"
      const cronSecret = functions.config().cron?.secret

      if (!cronSecret) {
        console.error("❌ [CHECK-COMMENTS] CRON_SECRET not configured")
        return null
      }

      const response = await fetch(
        `${baseUrl}/api/queue/check-warmup-comments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cronSecret}`,
            "Content-Type": "application/json"
          }
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(
        `✅ [CHECK-COMMENTS] Checked ${data.postsChecked} posts, generated ${data.repliesGenerated} replies`
      )

      return data
    } catch (error) {
      console.error("❌ [CHECK-COMMENTS] Error:", error)
      throw error
    }
  })

// Generate posts for all active warm-up accounts (runs once per day)
export const generateDailyWarmupPosts = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: "1GB"
  })
  .pubsub.schedule("every day 09:00")
  .timeZone("America/New_York")
  .onRun(async context => {
    console.log("🔧 [GENERATE-POSTS] Starting daily post generation")

    try {
      // Query all active warm-up accounts
      const now = admin.firestore.Timestamp.now()
      const accountsSnapshot = await db
        .collection("warmupAccounts")
        .where("isActive", "==", true)
        .where("warmupEndDate", ">", now)
        .get()

      console.log(
        `📊 [GENERATE-POSTS] Found ${accountsSnapshot.size} active warm-up accounts`
      )

      let totalPostsGenerated = 0

      // Process each account
      for (const doc of accountsSnapshot.docs) {
        const account = doc.data()
        console.log(
          `🔄 [GENERATE-POSTS] Processing account for user: ${account.userId}`
        )

        try {
          // Call the generation endpoint for this user
          const baseUrl =
            functions.config().app?.url || "https://your-app.vercel.app"
          const cronSecret = functions.config().cron?.secret

          const response = await fetch(`${baseUrl}/api/warmup/generate-posts`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${cronSecret}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ userId: account.userId })
          })

          if (response.ok) {
            const data = await response.json()
            totalPostsGenerated += data.postsGenerated || 0
            console.log(
              `✅ [GENERATE-POSTS] Generated ${data.postsGenerated} posts for user ${account.userId}`
            )
          }
        } catch (error) {
          console.error(
            `❌ [GENERATE-POSTS] Error processing user ${account.userId}:`,
            error
          )
        }
      }

      console.log(
        `✅ [GENERATE-POSTS] Total posts generated: ${totalPostsGenerated}`
      )
      return { totalPostsGenerated }
    } catch (error) {
      console.error("❌ [GENERATE-POSTS] Error:", error)
      throw error
    }
  })
