/*
<ai_context>
Twitter AIO integration for fetching user tweets and analyzing writing style.
Updated to follow official Twitter AIO API documentation.
Uses /search endpoint with fromTheseAccounts filter to get user tweets.
</ai_context>
*/

"use server"

import { ActionState } from "@/types"

// Twitter AIO API configuration
const TWITTER_AIO_BASE_URL = "https://twitter-aio.p.rapidapi.com"
const TWITTER_AIO_API_KEY = process.env.TWITTER_AIO_API_KEY

interface TwitterAIOTweet {
  id: string
  text: string
  created_at: string
  public_metrics: {
    like_count: number
    retweet_count: number
    reply_count: number
  }
  author?: {
    username: string
    name: string
  }
}

// Response structure based on Twitter AIO docs
interface TwitterAIOSearchResponse {
  tweets?: TwitterAIOTweet[]
  data?: TwitterAIOTweet[]
  cursor_top?: string
  cursor_bottom?: string
  error?: string
}

// Helper: Fetch tweets via Nitter RSS feed as a fallback when Twitter AIO fails
async function fetchTweetsViaNitter(
  username: string,
  count: number
): Promise<TwitterAIOTweet[]> {
  try {
    // Allow overriding the Nitter instance via env for reliability
    const NITTER_BASE =
      process.env.NITTER_INSTANCE?.replace(/\/$/, "") ||
      "https://nitter.net"

    const rssUrl = `${NITTER_BASE}/${username}/rss`
    console.log("🔥 [TWITTER-AIO] Fallback RSS URL:", rssUrl)

    const response = await fetch(rssUrl, {
      // Force no-cache in case the instance caches heavily
      headers: { "Cache-Control": "no-cache" }
    })

    if (!response.ok) {
      console.error(
        "🔥 [TWITTER-AIO] Nitter RSS fetch failed:",
        response.status,
        await response.text().catch(() => "")
      )
      return []
    }

    const xmlText = await response.text()

    // Very small XML parser: extract <item> blocks and pull out <title>, <link>, <pubDate>
    const items = xmlText.split(/<item>/).slice(1) // first split is preamble
    const tweets: TwitterAIOTweet[] = []

    for (const item of items) {
      if (tweets.length >= count) break

      const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)
      const linkMatch = item.match(/<link>(.*?)<\/link>/)
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/)

      if (!titleMatch || !linkMatch || !dateMatch) continue

      const text = titleMatch[1].trim()
      const link = linkMatch[1].trim()
      const createdAt = new Date(dateMatch[1].trim()).toISOString()

      const idMatch = link.match(/status\/(\d+)/)
      const id = idMatch ? idMatch[1] : Math.random().toString()

      tweets.push({
        id,
        text,
        created_at: createdAt,
        public_metrics: {
          like_count: 0,
          retweet_count: 0,
          reply_count: 0
        },
        author: { username, name: username }
      })
    }

    console.log("🔥 [TWITTER-AIO] Fallback tweets fetched:", tweets.length)
    return tweets
  } catch (err) {
    console.error("🔥 [TWITTER-AIO] Fallback Nitter error:", err)
    return []
  }
}

export async function fetchUserTweetsAction(
  username: string,
  count: number = 30
): Promise<ActionState<TwitterAIOTweet[]>> {
  console.log("🔥 [TWITTER-AIO] Starting fetchUserTweetsAction")
  console.log("🔥 [TWITTER-AIO] Username:", username)
  console.log("🔥 [TWITTER-AIO] Count:", count)

  try {
    const hasApiKey = Boolean(TWITTER_AIO_API_KEY)

    if (!hasApiKey) {
      console.warn(
        "🔥 [TWITTER-AIO] No API key found – skipping Twitter AIO requests and using fallback"
      )
    }

    // Remove @ symbol if present
    const cleanUsername = username.replace("@", "").trim()
    console.log("🔥 [TWITTER-AIO] Clean username:", cleanUsername)

    // Use the correct /search endpoint with fromTheseAccounts filter
    const filters = {
      fromTheseAccounts: [cleanUsername],
      removeReplies: true // Only get original tweets, not replies
    }

    // Try different query formats
    const queries = [
      `from:${cleanUsername}`, // Standard Twitter search syntax
      cleanUsername, // Just the username
      `@${cleanUsername}` // With @ symbol
    ]

    let lastError = ""
    
    // Only loop through RapidAPI queries if we actually have a key configured
    for (const query of (hasApiKey ? queries : [])) {
      console.log(`🔥 [TWITTER-AIO] Trying query: "${query}"`)
      
      const params = new URLSearchParams({
        query: query,
        count: Math.min(count, 100).toString(),
        category: "Latest", // Get latest tweets
        filters: JSON.stringify(filters)
      })

      const fullUrl = `${TWITTER_AIO_BASE_URL}/search?${params}`
      console.log("🔥 [TWITTER-AIO] Request URL:", fullUrl)
      console.log("🔥 [TWITTER-AIO] Filters:", JSON.stringify(filters, null, 2))

      const headers: HeadersInit = {
        "X-RapidAPI-Host": "twitter-aio.p.rapidapi.com",
        Accept: "application/json"
      }

      // Only attach API key if we have one (should always be true in this block)
      if (TWITTER_AIO_API_KEY) {
        headers["X-RapidAPI-Key"] = TWITTER_AIO_API_KEY
      }

      try {
        const response = await fetch(fullUrl, {
          method: "GET",
          headers
        })

        console.log("🔥 [TWITTER-AIO] Response status:", response.status)
        console.log(
          "🔥 [TWITTER-AIO] Response headers:",
          Object.fromEntries(response.headers.entries())
        )

        const responseText = await response.text()
        console.log("🔥 [TWITTER-AIO] Raw response length:", responseText.length)
        console.log(
          "🔥 [TWITTER-AIO] Raw response preview:",
          responseText.substring(0, 500)
        )

        if (!response.ok) {
          console.error(
            "🔥 [TWITTER-AIO] API error:",
            response.status,
            responseText
          )

          // Handle specific error cases
          if (response.status === 404) {
            lastError = "User not found. Please check the Twitter handle."
            continue
          } else if (response.status === 429) {
            return {
              isSuccess: false,
              message: "Rate limit exceeded. Please try again later."
            }
          } else if (response.status === 401) {
            return {
              isSuccess: false,
              message: "Invalid API key. Please check your Twitter AIO API key."
            }
          } else if (response.status === 403) {
            return {
              isSuccess: false,
              message:
                "Access forbidden. The API key may not have the required permissions."
            }
          }

          lastError = `Twitter API error: ${response.status} - ${responseText}`
          continue
        }

        // Try to parse the response
        let data: TwitterAIOSearchResponse
        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.error("🔥 [TWITTER-AIO] Failed to parse response:", parseError)
          lastError = "Invalid response from Twitter API. The service may be experiencing issues."
          continue
        }

        console.log("🔥 [TWITTER-AIO] Response data type:", typeof data)
        console.log(
          "🔥 [TWITTER-AIO] Response data keys:",
          data ? Object.keys(data) : "null"
        )
        console.log(
          "🔥 [TWITTER-AIO] Full response structure:",
          JSON.stringify(data, null, 2).substring(0, 1000)
        )

        // Check for API error in response
        if (data && data.error) {
          console.error("🔥 [TWITTER-AIO] API returned error:", data.error)
          lastError = data.error
          continue
        }

        // Check if response is empty object
        if (data && typeof data === "object" && Object.keys(data).length === 0) {
          console.error("🔥 [TWITTER-AIO] API returned empty object")
          lastError = "The Twitter API service is currently not returning data. This appears to be an issue with the Twitter AIO service."
          continue
        }

        // Extract tweets from response
        let tweets: TwitterAIOTweet[] = []

        if (data && data.tweets && Array.isArray(data.tweets)) {
          tweets = data.tweets
          console.log("🔥 [TWITTER-AIO] Found tweets in tweets array")
        } else if (data && data.data && Array.isArray(data.data)) {
          tweets = data.data
          console.log("🔥 [TWITTER-AIO] Found tweets in data array")
        } else if (Array.isArray(data)) {
          tweets = data as TwitterAIOTweet[]
          console.log("🔥 [TWITTER-AIO] Response is direct array")
        } else {
          console.error("🔥 [TWITTER-AIO] No tweets found in response structure")
          lastError = "No tweets found. The user may have no public tweets or the account may be private."
          continue
        }

        if (tweets.length === 0) {
          lastError = "No tweets found for this user. They may have no public tweets or the account may be private."
          continue
        }

        console.log("🔥 [TWITTER-AIO] Tweets count:", tweets.length)

        // Normalize tweet structure to ensure consistency
        const normalizedTweets = tweets.map(tweet => ({
          id: tweet.id || Math.random().toString(),
          text: tweet.text || "",
          created_at: tweet.created_at || new Date().toISOString(),
          public_metrics: tweet.public_metrics || {
            like_count: 0,
            retweet_count: 0,
            reply_count: 0
          },
          author: tweet.author || { username: cleanUsername, name: cleanUsername }
        }))

        console.log(
          "🔥 [TWITTER-AIO] Successfully fetched tweets:",
          normalizedTweets.length
        )
        console.log(
          "🔥 [TWITTER-AIO] Sample tweet:",
          normalizedTweets[0]?.text?.substring(0, 100)
        )

        return {
          isSuccess: true,
          message: `Successfully fetched ${normalizedTweets.length} tweets`,
          data: normalizedTweets
        }

      } catch (error) {
        console.error("🔥 [TWITTER-AIO] Request error:", error)
        lastError = error instanceof Error ? error.message : "Unknown error"
        continue
      }
    }

    // If we get here, all queries failed – try fallback via Nitter RSS
    console.error(
      "🔥 [TWITTER-AIO] All RapidAPI queries skipped/failed – attempting fallback via Nitter"
    )

    const fallbackTweets = await fetchTweetsViaNitter(cleanUsername, count)

    if (fallbackTweets.length > 0) {
      return {
        isSuccess: true,
        message: `Successfully fetched ${fallbackTweets.length} tweets via fallback`,
        data: fallbackTweets
      }
    }

    // Still no tweets
    return {
      isSuccess: false,
      message:
        lastError ||
        "Unable to fetch tweets. Both Twitter AIO and the fallback method failed. The account may be private or the services are unavailable."
    }
    
  } catch (error) {
    console.error("🔥 [TWITTER-AIO] Error fetching tweets:", error)
    return {
      isSuccess: false,
      message: `Failed to fetch tweets: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function searchTwitterAction(
  query: string,
  count: number = 20,
  category: "Top" | "Latest" | "People" | "Photos" | "Videos" = "Latest"
): Promise<ActionState<TwitterAIOTweet[]>> {
  console.log("🔥 [TWITTER-AIO] Starting searchTwitterAction")
  console.log("🔥 [TWITTER-AIO] Query:", query)
  console.log("🔥 [TWITTER-AIO] Count:", count)
  console.log("🔥 [TWITTER-AIO] Category:", category)

  try {
    if (!TWITTER_AIO_API_KEY) {
      console.error("🔥 [TWITTER-AIO] API key not found")
      return {
        isSuccess: false,
        message: "Twitter AIO API key not configured"
      }
    }

    // Use the correct /search endpoint
    const url = `${TWITTER_AIO_BASE_URL}/search`
    const params = new URLSearchParams({
      query: query,
      count: Math.min(count, 100).toString(),
      category: category
    })

    console.log("🔥 [TWITTER-AIO] Request URL:", `${url}?${params}`)

    const response = await fetch(`${url}?${params}`, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": TWITTER_AIO_API_KEY,
        "X-RapidAPI-Host": "twitter-aio.p.rapidapi.com",
        Accept: "application/json"
      }
    })

    console.log("🔥 [TWITTER-AIO] Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("🔥 [TWITTER-AIO] API error:", errorText)
      return {
        isSuccess: false,
        message: `Twitter AIO API error: ${response.status} - ${errorText}`
      }
    }

    const responseText = await response.text()
    let data: TwitterAIOSearchResponse

    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("🔥 [TWITTER-AIO] Failed to parse response:", parseError)
      return {
        isSuccess: false,
        message: "Invalid response from Twitter API"
      }
    }

    console.log("🔥 [TWITTER-AIO] Response data keys:", Object.keys(data))

    // Check for API error
    if (data.error) {
      console.error("🔥 [TWITTER-AIO] API returned error:", data.error)
      return {
        isSuccess: false,
        message: data.error
      }
    }

    // Extract tweets from response
    let tweets: TwitterAIOTweet[] = []
    if (data.tweets && Array.isArray(data.tweets)) {
      tweets = data.tweets
    } else if (data.data && Array.isArray(data.data)) {
      tweets = data.data
    } else if (Array.isArray(data)) {
      tweets = data as TwitterAIOTweet[]
    } else {
      console.error("🔥 [TWITTER-AIO] No tweets found in search response")
      return {
        isSuccess: false,
        message: "No tweets found for this search query"
      }
    }

    const normalizedTweets = tweets.map((tweet: any) => ({
      id: tweet.id || Math.random().toString(),
      text: tweet.text || "",
      created_at: tweet.created_at || new Date().toISOString(),
      public_metrics: tweet.public_metrics || {
        like_count: 0,
        retweet_count: 0,
        reply_count: 0
      },
      author: tweet.author || { username: "unknown", name: "Unknown User" }
    }))

    console.log(
      "🔥 [TWITTER-AIO] Successfully searched tweets:",
      normalizedTweets.length
    )

    return {
      isSuccess: true,
      message: `Successfully found ${normalizedTweets.length} tweets`,
      data: normalizedTweets
    }
  } catch (error) {
    console.error("🔥 [TWITTER-AIO] Error searching tweets:", error)
    return {
      isSuccess: false,
      message: `Failed to search tweets: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}
