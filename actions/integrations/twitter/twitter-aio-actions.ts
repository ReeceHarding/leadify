/*
<ai_context>
Twitter AIO integration for fetching user tweets and analyzing writing style.
Updated to follow official Twitter AIO API documentation.
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

// Updated response structure based on Twitter AIO docs
interface TwitterAIOResponse {
  tweets?: TwitterAIOTweet[]
  data?: TwitterAIOTweet[]
  result?: {
    tweets: TwitterAIOTweet[]
  }
  error?: string
  message?: string
  status?: string
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

    // According to Twitter AIO docs, the correct endpoint is /user/tweets
    const endpoint = `/user/tweets?username=${cleanUsername}&count=${Math.min(count, 100)}`
    const url = `${TWITTER_AIO_BASE_URL}${endpoint}`
    
    console.log("🔥 [TWITTER-AIO] Request URL:", url)
    console.log("🔥 [TWITTER-AIO] Request headers:", {
      "X-RapidAPI-Key": "***hidden***",
      "X-RapidAPI-Host": "twitter-aio.p.rapidapi.com"
    })

    const response = await fetch(url, {
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
    let data: any
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
    if (data && typeof data === 'object' && (data.error || data.message === "error" || data.status === "error")) {
      console.error("🔥 [TWITTER-AIO] API returned error:", data.error || data.message)
      return {
        isSuccess: false,
        message: data.error || data.message || "Twitter API returned an error"
      }
    }

    // Handle different response structures based on Twitter AIO docs
    let tweets: TwitterAIOTweet[] = []
    
    // Check if response is empty object
    if (data && typeof data === 'object' && Object.keys(data).length === 0) {
      console.error("🔥 [TWITTER-AIO] API returned empty object")
      return {
        isSuccess: false,
        message: "The Twitter API service is currently not returning data. This appears to be an issue with the Twitter AIO service. Please try again later or contact support if the issue persists."
      }
    }
    
    if (data && data.tweets && Array.isArray(data.tweets)) {
      // Direct tweets array
      tweets = data.tweets
      console.log("🔥 [TWITTER-AIO] Found tweets in root tweets array")
    } else if (data && data.data && Array.isArray(data.data)) {
      // Tweets in data array
      tweets = data.data
      console.log("🔥 [TWITTER-AIO] Found tweets in data array")
    } else if (data && data.result?.tweets && Array.isArray(data.result.tweets)) {
      // Tweets in result.tweets
      tweets = data.result.tweets
      console.log("🔥 [TWITTER-AIO] Found tweets in result.tweets")
    } else if (Array.isArray(data)) {
      // Response is directly an array
      tweets = data as TwitterAIOTweet[]
      console.log("🔥 [TWITTER-AIO] Response is direct array")
    } else {
      console.error("🔥 [TWITTER-AIO] No tweets found in response structure")
      return {
        isSuccess: false,
        message: "No tweets found. The Twitter API may be experiencing issues or the response format has changed."
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
      count: Math.min(count, 100).toString(), // API limit
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
    let data: TwitterAIOResponse
    
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
        message: `Twitter API error: ${data.error}`
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