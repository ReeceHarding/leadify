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

export async function fetchUserTweetsAction(
  username: string,
  count: number = 30
): Promise<ActionState<TwitterAIOTweet[]>> {
  console.log("🔥 [TWITTER-AIO] Starting fetchUserTweetsAction")
  console.log("🔥 [TWITTER-AIO] Username:", username)
  console.log("🔥 [TWITTER-AIO] Count:", count)

  try {
    if (!TWITTER_AIO_API_KEY) {
      console.error("🔥 [TWITTER-AIO] API key not found")
      return {
        isSuccess: false,
        message: "Twitter AIO API key not configured. Please add TWITTER_AIO_API_KEY to your environment variables."
      }
    }

    // Remove @ symbol if present
    const cleanUsername = username.replace("@", "").trim()
    console.log("🔥 [TWITTER-AIO] Clean username:", cleanUsername)

    // According to Twitter AIO docs, we should use /search with fromTheseAccounts filter
    const filters = {
      fromTheseAccounts: [cleanUsername],
      removeReplies: true // Only get original tweets, not replies
    }
    
    const url = `${TWITTER_AIO_BASE_URL}/search`
    const params = new URLSearchParams({
      query: `from:${cleanUsername}`, // Basic query to get tweets from user
      count: Math.min(count, 100).toString(),
      category: "Latest", // Get latest tweets
      filters: JSON.stringify(filters)
    })
    
    const fullUrl = `${url}?${params}`
    console.log("🔥 [TWITTER-AIO] Request URL:", fullUrl)
    console.log("🔥 [TWITTER-AIO] Filters:", JSON.stringify(filters, null, 2))

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": TWITTER_AIO_API_KEY,
        "X-RapidAPI-Host": "twitter-aio.p.rapidapi.com",
        "Accept": "application/json"
      }
    })

    console.log("🔥 [TWITTER-AIO] Response status:", response.status)
    console.log("🔥 [TWITTER-AIO] Response headers:", Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log("🔥 [TWITTER-AIO] Raw response length:", responseText.length)
    console.log("🔥 [TWITTER-AIO] Raw response preview:", responseText.substring(0, 500))

    if (!response.ok) {
      console.error("🔥 [TWITTER-AIO] API error:", response.status, responseText)
      
      // Handle specific error cases
      if (response.status === 404) {
        return {
          isSuccess: false,
          message: "User not found. Please check the Twitter handle."
        }
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
          message: "Access forbidden. The API key may not have the required permissions."
        }
      }
      
      return {
        isSuccess: false,
        message: `Twitter API error: ${response.status} - ${responseText}`
      }
    }

    // Try to parse the response
    let data: TwitterAIOSearchResponse
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("🔥 [TWITTER-AIO] Failed to parse response:", parseError)
      return {
        isSuccess: false,
        message: "Invalid response from Twitter API. The service may be experiencing issues."
      }
    }

    console.log("🔥 [TWITTER-AIO] Response data type:", typeof data)
    console.log("🔥 [TWITTER-AIO] Response data keys:", data ? Object.keys(data) : 'null')
    console.log("🔥 [TWITTER-AIO] Full response structure:", JSON.stringify(data, null, 2).substring(0, 1000))

    // Check for API error in response
    if (data && data.error) {
      console.error("🔥 [TWITTER-AIO] API returned error:", data.error)
      return {
        isSuccess: false,
        message: data.error
      }
    }

    // Check if response is empty object
    if (data && typeof data === 'object' && Object.keys(data).length === 0) {
      console.error("🔥 [TWITTER-AIO] API returned empty object")
      return {
        isSuccess: false,
        message: "The Twitter API service is currently not returning data. This appears to be an issue with the Twitter AIO service. Please try again later or contact support if the issue persists."
      }
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
      return {
        isSuccess: false,
        message: "No tweets found. The user may have no public tweets or the account may be private."
      }
    }

    if (tweets.length === 0) {
      return {
        isSuccess: false,
        message: "No tweets found for this user. They may have no public tweets or the account may be private."
      }
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

    console.log("🔥 [TWITTER-AIO] Successfully fetched tweets:", normalizedTweets.length)
    console.log("🔥 [TWITTER-AIO] Sample tweet:", normalizedTweets[0]?.text?.substring(0, 100))

    return {
      isSuccess: true,
      message: `Successfully fetched ${normalizedTweets.length} tweets`,
      data: normalizedTweets
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
        "Accept": "application/json"
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

    console.log("🔥 [TWITTER-AIO] Successfully searched tweets:", normalizedTweets.length)

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