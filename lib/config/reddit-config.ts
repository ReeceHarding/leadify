/*
<ai_context>
Centralized Reddit API configuration
</ai_context>
*/

export const REDDIT_CONFIG = {
  USER_AGENT: "Leadify/1.0 (by /u/leadify)",
  API_BASE_URL: "https://oauth.reddit.com",
  RATE_LIMIT_WINDOW: 60000, // 1 minute in ms
  RATE_LIMIT_REQUESTS: 60, // 60 requests per minute
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  TOKEN_REFRESH_BUFFER: 300000 // 5 minutes before expiry
} as const

export const REDDIT_ERRORS = {
  NO_TOKEN: "No Reddit access token available",
  RATE_LIMITED: "Reddit API rate limit exceeded",
  INVALID_TOKEN: "Invalid or expired Reddit token",
  NO_ORGANIZATION: "Organization ID is required for Reddit API calls",
  API_ERROR: "Reddit API error"
} as const
