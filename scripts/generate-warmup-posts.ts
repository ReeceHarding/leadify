/*
<ai_context>
Script to manually generate warm-up posts for testing.
</ai_context>
*/

import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

import { generateAndScheduleWarmupPostsAction } from "../actions/warmup-queue-actions"

async function generatePosts() {
  const userId = process.argv[2]

  if (!userId) {
    console.error("❌ Please provide a userId as argument")
    console.log("Usage: npm run warmup:generate <userId>")
    process.exit(1)
  }

  console.log(`🔧 Generating warm-up posts for user: ${userId}`)

  try {
    const result = await generateAndScheduleWarmupPostsAction(userId)

    if (result.isSuccess) {
      console.log(
        `✅ Success! Generated ${result.data?.postsGenerated || 0} posts`
      )
    } else {
      console.error(`❌ Failed: ${result.message}`)
    }
  } catch (error) {
    console.error("❌ Error:", error)
  }

  process.exit(0)
}

generatePosts()
