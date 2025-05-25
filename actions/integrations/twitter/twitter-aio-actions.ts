/*
<ai_context>
Twitter AIO integration for fetching user tweets and analyzing writing style.
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
}

interface TwitterAIOUserResponse {
  data: {
    tweets: TwitterAIOTweet[]
    user: {
      username: string
      name: string
      public_metrics: {
        followers_count: number
        following_count: number
        tweet_count: number
      }
    }
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
    if (!TWITTER_AIO_API_KEY) {
      console.error("🔥 [TWITTER-AIO] API key not found")
      return {
        isSuccess: false,
        message: "Twitter AIO API key not configured"
      }
    }

    // Remove @ symbol if present
    const cleanUsername = username.replace("@", "")
    console.log("🔥 [TWITTER-AIO] Clean username:", cleanUsername)

    const url = `${TWITTER_AIO_BASE_URL}/user/tweets`
    const params = new URLSearchParams({
      username: cleanUsername,
      count: count.toString()
    })

    console.log("🔥 [TWITTER-AIO] Request URL:", `${url}?${params}`)

    const response = await fetch(`${url}?${params}`, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": TWITTER_AIO_API_KEY,
        "X-RapidAPI-Host": "twitter-aio.p.rapidapi.com"
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

    const data: TwitterAIOUserResponse = await response.json()
    console.log("🔥 [TWITTER-AIO] Response data keys:", Object.keys(data))
    console.log("🔥 [TWITTER-AIO] Tweets count:", data.data?.tweets?.length || 0)

    if (!data.data?.tweets) {
      console.error("🔥 [TWITTER-AIO] No tweets found in response")
      return {
        isSuccess: false,
        message: "No tweets found for this user"
      }
    }

    const tweets = data.data.tweets.map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      public_metrics: tweet.public_metrics
    }))

    console.log("🔥 [TWITTER-AIO] Successfully fetched tweets:", tweets.length)
    console.log("🔥 [TWITTER-AIO] Sample tweet:", tweets[0]?.text?.substring(0, 100))

    return {
      isSuccess: true,
      message: `Successfully fetched ${tweets.length} tweets`,
      data: tweets
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
  count: number = 20
): Promise<ActionState<TwitterAIOTweet[]>> {
  console.log("🔥 [TWITTER-AIO] Starting searchTwitterAction")
  console.log("🔥 [TWITTER-AIO] Query:", query)
  console.log("🔥 [TWITTER-AIO] Count:", count)

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
      count: count.toString(),
      category: "Latest"
    })

    console.log("🔥 [TWITTER-AIO] Request URL:", `${url}?${params}`)

    const response = await fetch(`${url}?${params}`, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": TWITTER_AIO_API_KEY,
        "X-RapidAPI-Host": "twitter-aio.p.rapidapi.com"
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

    const data = await response.json()
    console.log("🔥 [TWITTER-AIO] Response data keys:", Object.keys(data))

    if (!data.tweets) {
      console.error("🔥 [TWITTER-AIO] No tweets found in search response")
      return {
        isSuccess: false,
        message: "No tweets found for this search query"
      }
    }

    const tweets = data.tweets.map((tweet: any) => ({
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      public_metrics: tweet.public_metrics || {
        like_count: 0,
        retweet_count: 0,
        reply_count: 0
      }
    }))

    console.log("🔥 [TWITTER-AIO] Successfully searched tweets:", tweets.length)

    return {
      isSuccess: true,
      message: `Successfully found ${tweets.length} tweets`,
      data: tweets
    }
  } catch (error) {
    console.error("🔥 [TWITTER-AIO] Error searching tweets:", error)
    return {
      isSuccess: false,
      message: `Failed to search tweets: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 