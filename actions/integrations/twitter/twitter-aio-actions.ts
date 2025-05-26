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
        message:
          "Twitter AIO API key not configured. Please add TWITTER_AIO_API_KEY to your environment variables."
      }
    }

    // Remove @ symbol if present
    const cleanUsername = username.replace("@", "").trim()
    console.log("🔥 [TWITTER-AIO] Clean username:", cleanUsername)

    // Try multiple potential endpoints based on common Twitter API patterns
    const endpointsToTry = [
      { name: "user", path: "/user", params: { username: cleanUsername } },
      { name: "user-tweets", path: "/user-tweets", params: { username: cleanUsername } },
      { name: "profile", path: "/profile", params: { username: cleanUsername } },
      { name: "tweets", path: "/tweets", params: { username: cleanUsername } },
      { name: "user-timeline", path: "/user-timeline", params: { username: cleanUsername } }
    ]

    let lastError = ""
    
    for (const endpoint of endpointsToTry) {
      console.log(`🔥 [TWITTER-AIO] Trying endpoint: ${endpoint.name} (${endpoint.path})`)
      
      try {
        const params = new URLSearchParams({
          ...endpoint.params,
          count: Math.min(count, 100).toString()
        })
        
        const fullUrl = `${TWITTER_AIO_BASE_URL}${endpoint.path}?${params}`
        console.log("🔥 [TWITTER-AIO] Request URL:", fullUrl)

        const response = await fetch(fullUrl, {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": TWITTER_AIO_API_KEY,
            "X-RapidAPI-Host": "twitter-aio.p.rapidapi.com",
            Accept: "application/json"
          }
        })

        console.log(`🔥 [TWITTER-AIO] ${endpoint.name} response status:`, response.status)

        if (response.status === 404) {
          console.log(`🔥 [TWITTER-AIO] Endpoint ${endpoint.name} not found, trying next...`)
          lastError = `Endpoint ${endpoint.path} not found`
          continue
        }

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`🔥 [TWITTER-AIO] ${endpoint.name} error:`, response.status, errorText)
          lastError = `${endpoint.name}: ${response.status} - ${errorText}`
          
          // If it's a rate limit or auth error, don't try other endpoints
          if (response.status === 429 || response.status === 401 || response.status === 403) {
            return {
              isSuccess: false,
              message: response.status === 429 
                ? "Rate limit exceeded. Please try again later."
                : response.status === 401
                ? "Invalid API key. Please check your Twitter AIO API key."
                : "Access forbidden. The API key may not have the required permissions."
            }
          }
          continue
        }

        const responseText = await response.text()
        console.log(`🔥 [TWITTER-AIO] ${endpoint.name} response length:`, responseText.length)

        let data: any
        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.error(`🔥 [TWITTER-AIO] ${endpoint.name} parse error:`, parseError)
          lastError = `${endpoint.name}: Invalid JSON response`
          continue
        }

        // Check for API error in response
        if (data && data.error) {
          console.error(`🔥 [TWITTER-AIO] ${endpoint.name} API error:`, data.error)
          lastError = `${endpoint.name}: ${data.error}`
          continue
        }

        // Try to extract tweets from various possible response structures
        let tweets: TwitterAIOTweet[] = []
        
        if (data && data.tweets && Array.isArray(data.tweets)) {
          tweets = data.tweets
          console.log(`🔥 [TWITTER-AIO] Found tweets in ${endpoint.name}.tweets`)
        } else if (data && data.data && Array.isArray(data.data)) {
          tweets = data.data
          console.log(`🔥 [TWITTER-AIO] Found tweets in ${endpoint.name}.data`)
        } else if (Array.isArray(data)) {
          tweets = data
          console.log(`🔥 [TWITTER-AIO] Found tweets as direct array in ${endpoint.name}`)
        } else if (data && data.timeline && Array.isArray(data.timeline)) {
          tweets = data.timeline
          console.log(`🔥 [TWITTER-AIO] Found tweets in ${endpoint.name}.timeline`)
        } else {
          console.log(`🔥 [TWITTER-AIO] No tweets found in ${endpoint.name} response structure`)
          lastError = `${endpoint.name}: No tweets found in response`
          continue
        }

        if (tweets.length === 0) {
          console.log(`🔥 [TWITTER-AIO] ${endpoint.name} returned empty tweets array`)
          lastError = `${endpoint.name}: Empty tweets array`
          continue
        }

        // Success! Normalize and return tweets
        const normalizedTweets = tweets.map((tweet: any) => ({
          id: tweet.id || tweet.tweet_id || Math.random().toString(),
          text: tweet.text || tweet.full_text || tweet.content || "",
          created_at: tweet.created_at || tweet.timestamp || new Date().toISOString(),
          public_metrics: tweet.public_metrics || tweet.metrics || {
            like_count: tweet.likes || tweet.favorite_count || 0,
            retweet_count: tweet.retweets || tweet.retweet_count || 0,
            reply_count: tweet.replies || tweet.reply_count || 0
          },
          author: tweet.author || tweet.user || { 
            username: cleanUsername, 
            name: cleanUsername 
          }
        }))

        console.log(`🔥 [TWITTER-AIO] Successfully fetched ${normalizedTweets.length} tweets from ${endpoint.name}`)
        
        return {
          isSuccess: true,
          message: `Successfully fetched ${normalizedTweets.length} tweets`,
          data: normalizedTweets
        }

      } catch (endpointError) {
        console.error(`🔥 [TWITTER-AIO] ${endpoint.name} request error:`, endpointError)
        lastError = `${endpoint.name}: ${endpointError instanceof Error ? endpointError.message : "Unknown error"}`
        continue
      }
    }

    // If we get here, all endpoints failed
    console.error("🔥 [TWITTER-AIO] All endpoints failed")
    return {
      isSuccess: false,
      message: `Twitter AIO API endpoints are not responding correctly. Last error: ${lastError}. The API may have changed or be experiencing issues.`
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

    // Try using /tweets endpoint instead of /search
    const url = `${TWITTER_AIO_BASE_URL}/tweets`
    const params = new URLSearchParams({
      query: query,
      count: Math.min(count, 100).toString()
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
