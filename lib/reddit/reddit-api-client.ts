/*
<ai_context>
Centralized Reddit API client with rate limiting and error handling
</ai_context>
*/

import { REDDIT_CONFIG, REDDIT_ERRORS } from "@/lib/config/reddit-config"
import { getCurrentOrganizationTokens } from "@/actions/integrations/reddit/reddit-auth-helpers"
import { loggers } from "@/lib/logger"

const logger = loggers.reddit

interface RateLimitInfo {
  remaining: number
  reset: number
  used: number
}

class RedditAPIClient {
  private rateLimits = new Map<string, RateLimitInfo>()
  private requestQueue = new Map<string, Promise<any>>()

  private async checkRateLimit(organizationId: string): Promise<void> {
    const rateLimit = this.rateLimits.get(organizationId)
    if (!rateLimit) return

    if (rateLimit.remaining <= 0) {
      const waitTime = rateLimit.reset - Date.now()
      if (waitTime > 0) {
        logger.warn(
          `Rate limited for org ${organizationId}, waiting ${waitTime}ms`
        )
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  private updateRateLimit(organizationId: string, headers: Headers): void {
    const remaining = parseInt(headers.get("x-ratelimit-remaining") || "60")
    const reset = parseInt(headers.get("x-ratelimit-reset") || "0") * 1000
    const used = parseInt(headers.get("x-ratelimit-used") || "0")

    this.rateLimits.set(organizationId, { remaining, reset, used })
  }

  private async getHeaders(organizationId: string): Promise<HeadersInit> {
    const tokenResult = await getCurrentOrganizationTokens(organizationId)

    if (!tokenResult.isSuccess || !tokenResult.data?.accessToken) {
      throw new Error(REDDIT_ERRORS.NO_TOKEN)
    }

    return {
      Authorization: `Bearer ${tokenResult.data.accessToken}`,
      "User-Agent": REDDIT_CONFIG.USER_AGENT,
      "Content-Type": "application/json"
    }
  }

  private async makeRequest(
    organizationId: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    await this.checkRateLimit(organizationId)

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${REDDIT_CONFIG.API_BASE_URL}${endpoint}`

    const headers = await this.getHeaders(organizationId)

    let lastError: Error | null = null

    for (let attempt = 0; attempt < REDDIT_CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...headers,
            ...options.headers
          }
        })

        this.updateRateLimit(organizationId, response.headers)

        if (response.status === 429) {
          const retryAfter =
            parseInt(response.headers.get("retry-after") || "60") * 1000
          logger.warn(`Rate limited, retrying after ${retryAfter}ms`)
          await new Promise(resolve => setTimeout(resolve, retryAfter))
          continue
        }

        if (response.status === 401) {
          throw new Error(REDDIT_ERRORS.INVALID_TOKEN)
        }

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Reddit API error: ${response.status} - ${error}`)
        }

        return response
      } catch (error) {
        lastError = error as Error
        logger.error(
          `Reddit API request failed (attempt ${attempt + 1}):`,
          error
        )

        if (attempt < REDDIT_CONFIG.RETRY_ATTEMPTS - 1) {
          await new Promise(resolve =>
            setTimeout(resolve, REDDIT_CONFIG.RETRY_DELAY * (attempt + 1))
          )
        }
      }
    }

    throw lastError || new Error(REDDIT_ERRORS.API_ERROR)
  }

  async get(organizationId: string, endpoint: string): Promise<any> {
    if (!organizationId) {
      throw new Error(REDDIT_ERRORS.NO_ORGANIZATION)
    }

    const response = await this.makeRequest(organizationId, endpoint)
    return response.json()
  }

  async post(
    organizationId: string,
    endpoint: string,
    body: any
  ): Promise<any> {
    if (!organizationId) {
      throw new Error(REDDIT_ERRORS.NO_ORGANIZATION)
    }

    const response = await this.makeRequest(organizationId, endpoint, {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body)
    })

    return response.json()
  }

  async postForm(
    organizationId: string,
    endpoint: string,
    formData: URLSearchParams
  ): Promise<any> {
    if (!organizationId) {
      throw new Error(REDDIT_ERRORS.NO_ORGANIZATION)
    }

    const response = await this.makeRequest(organizationId, endpoint, {
      method: "POST",
      body: formData.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    })

    return response.json()
  }
}

export const redditClient = new RedditAPIClient()
export default redditClient
