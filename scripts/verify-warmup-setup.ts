/*
<ai_context>
Script to verify warm-up system setup before testing.
</ai_context>
*/

import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m"
}

function checkEnvVar(name: string, required: boolean = true): boolean {
  const value = process.env[name]
  if (value) {
    console.log(`${colors.green}✓${colors.reset} ${name} is set`)
    return true
  } else if (required) {
    console.log(`${colors.red}✗${colors.reset} ${name} is missing`)
    return false
  } else {
    console.log(
      `${colors.yellow}⚠${colors.reset} ${name} is optional but not set`
    )
    return true
  }
}

console.log(
  `${colors.cyan}🔍 Verifying Reddit Warm-up System Setup${colors.reset}\n`
)

console.log("Checking required environment variables:")
const requiredVars = [
  "CRON_SECRET",
  "OPENAI_API_KEY",
  "REDDIT_CLIENT_ID",
  "REDDIT_CLIENT_SECRET",
  "REDDIT_USER_AGENT",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
]

let allGood = true
for (const varName of requiredVars) {
  if (!checkEnvVar(varName)) {
    allGood = false
  }
}

console.log("\nChecking optional environment variables:")
checkEnvVar("REDDIT_REDIRECT_URI", false)

if (allGood) {
  console.log(
    `\n${colors.green}✅ All required environment variables are set!${colors.reset}`
  )
  console.log("\nNext steps:")
  console.log("1. Run 'npm run dev' in one terminal")
  console.log("2. Run 'npm run warmup:test' in another terminal")
  console.log("3. Go to http://localhost:3000/reddit/warm-up")
  console.log("4. Connect your Reddit account and add subreddits")
} else {
  console.log(
    `\n${colors.red}❌ Some required environment variables are missing!${colors.reset}`
  )
  console.log("\nPlease set the missing variables in your .env.local file")
}

process.exit(allGood ? 0 : 1)
