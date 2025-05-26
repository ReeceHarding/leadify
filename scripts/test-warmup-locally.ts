/*
<ai_context>
Local testing script for Reddit warm-up system.
Simulates cron jobs running in the background.
</ai_context>
*/

import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m"
}

function log(message: string, color: string = colors.reset) {
  const timestamp = new Date().toISOString()
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`)
}

async function callEndpoint(endpoint: string, name: string) {
  try {
    log(`🔧 Calling ${name}...`, colors.cyan)

    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET || "test-secret"}`,
        "Content-Type": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    log(`✅ ${name} completed: ${JSON.stringify(data)}`, colors.green)
    return data
  } catch (error) {
    log(`❌ ${name} failed: ${error}`, colors.red)
    return null
  }
}

async function processWarmupQueue() {
  return callEndpoint("/api/queue/process-warmup", "Process Warmup Queue")
}

async function checkWarmupComments() {
  return callEndpoint(
    "/api/queue/check-warmup-comments",
    "Check Warmup Comments"
  )
}

async function runScheduler() {
  log("🚀 Starting Reddit Warm-up Local Scheduler", colors.bright + colors.blue)
  log("Press Ctrl+C to stop\n", colors.yellow)

  // Process warmup queue every 5 minutes
  const warmupInterval = setInterval(
    async () => {
      await processWarmupQueue()
    },
    5 * 60 * 1000
  ) // 5 minutes

  // Check comments every 30 minutes
  const commentInterval = setInterval(
    async () => {
      await checkWarmupComments()
    },
    30 * 60 * 1000
  ) // 30 minutes

  // Run immediately on start
  await processWarmupQueue()
  await checkWarmupComments()

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    log("\n🛑 Shutting down scheduler...", colors.yellow)
    clearInterval(warmupInterval)
    clearInterval(commentInterval)
    process.exit(0)
  })
}

// Add test mode for rapid testing
const isTestMode = process.argv.includes("--test")

if (isTestMode) {
  log("🧪 Running in TEST MODE - Faster intervals", colors.yellow)

  async function runTestMode() {
    // Run every 30 seconds for testing
    setInterval(async () => {
      await processWarmupQueue()
    }, 30 * 1000) // 30 seconds

    // Check comments every 2 minutes for testing
    setInterval(
      async () => {
        await checkWarmupComments()
      },
      2 * 60 * 1000
    ) // 2 minutes

    // Run immediately
    await processWarmupQueue()
    await checkWarmupComments()
  }

  runTestMode()
} else {
  runScheduler()
}
