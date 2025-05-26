/*
<ai_context>
Contains server actions for Reddit API integration using OAuth2 authentication to fetch thread content.
</ai_context>
*/

"use server"

import { ActionState } from "@/types"
import {
  getRedditAccessTokenAction,
  refreshRedditTokenAction
} from "./reddit-oauth-actions"

export interface RedditThreadData {
  id: string
  title: string
  content: string
  author: string
  subreddit: string
  score: number
  numComments: number
  url: string
  created: number
  selfText?: string
  isVideo: boolean
  isImage: boolean
  domain: string
}

export interface RedditComment {
  id: string
  author: string
  body: string
  score: number
  created_utc: number
  is_submitter?: boolean
  replies?: RedditComment[]
  depth?: number
  awards?: number
  distinguished?: string
  stickied?: boolean
}

async function makeRedditApiCall(endpoint: string): Promise<any> {
  console.log("🔴🔴🔴 [REDDIT-API] ========== API CALL START ==========")
  console.log("🔴🔴🔴 [REDDIT-API] Timestamp:", new Date().toISOString())
  console.log("🔴🔴🔴 [REDDIT-API] Endpoint:", endpoint)
  console.log("🔴🔴🔴 [REDDIT-API] Method: GET")
  
  // Get access token
  console.log("🔴🔴🔴 [REDDIT-API] Getting access token...")
  let tokenResult = await getRedditAccessTokenAction()
  console.log("🔴🔴🔴 [REDDIT-API] Token result:", {
    isSuccess: tokenResult.isSuccess,
    hasData: !!tokenResult.data,
    message: tokenResult.message
  })

  if (!tokenResult.isSuccess) {
    // Try to refresh token if available
    console.log("🔴🔴🔴 [REDDIT-API] ⚠️ Access token failed, attempting refresh...")
    const refreshResult = await refreshRedditTokenAction()
    console.log("🔴🔴🔴 [REDDIT-API] Refresh result:", {
      isSuccess: refreshResult.isSuccess,
      message: refreshResult.message
    })
    
    if (!refreshResult.isSuccess) {
      console.log("🔴🔴🔴 [REDDIT-API] ❌ Token refresh failed:", refreshResult.message)
      console.log("🔴🔴🔴 [REDDIT-API] ========== API CALL END (AUTH FAILED) ==========")
      throw new Error(
        "No valid Reddit access token available. Please re-authenticate."
      )
    }
    
    // Get the new token
    console.log("🔴🔴🔴 [REDDIT-API] Getting new token after refresh...")
    tokenResult = await getRedditAccessTokenAction()
    if (!tokenResult.isSuccess) {
      console.log("🔴🔴🔴 [REDDIT-API] ❌ Failed to get refreshed access token")
      console.log("🔴🔴🔴 [REDDIT-API] ========== API CALL END (TOKEN FAILED) ==========")
      throw new Error("Failed to get refreshed access token")
    }
    console.log("🔴🔴🔴 [REDDIT-API] ✅ Token refreshed successfully")
  }

  const accessToken = tokenResult.data
  if (!accessToken) {
    console.log("🔴🔴🔴 [REDDIT-API] ❌ Access token is undefined")
    console.log("🔴🔴🔴 [REDDIT-API] ========== API CALL END (NO TOKEN) ==========")
    throw new Error("Access token is undefined.")
  }
  console.log("🔴🔴🔴 [REDDIT-API] 🔑 Using access token:", accessToken.substring(0, 20) + "...")

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": process.env.REDDIT_USER_AGENT || "reddit-lead-gen:v1.0.0"
  }
  console.log("🔴🔴🔴 [REDDIT-API] Request headers:", {
    Authorization: "Bearer " + accessToken.substring(0, 20) + "...",
    "User-Agent": headers["User-Agent"]
  })

  const fullUrl = `https://oauth.reddit.com${endpoint}`
  console.log("🔴🔴🔴 [REDDIT-API] Full URL:", fullUrl)
  console.log("🔴🔴🔴 [REDDIT-API] Making request...")
  
  const response = await fetch(fullUrl, { headers })
  console.log("🔴🔴🔴 [REDDIT-API] Response received")
  console.log("🔴🔴🔴 [REDDIT-API] Response status:", response.status, response.statusText)
  console.log("🔴🔴🔴 [REDDIT-API] Response headers:", Object.fromEntries(response.headers.entries()))

  if (!response.ok) {
    console.log("🔴🔴🔴 [REDDIT-API] ❌ Response not OK")
    
    if (response.status === 401) {
      // Token expired, try to refresh
      console.log("🔴🔴🔴 [REDDIT-API] 🔄 Got 401, attempting token refresh...")
      const refreshResult = await refreshRedditTokenAction()
      console.log("🔴🔴🔴 [REDDIT-API] Refresh attempt result:", refreshResult.isSuccess)
      
      if (refreshResult.isSuccess) {
        // Retry with new token
        console.log("🔴🔴🔴 [REDDIT-API] Getting new token for retry...")
        const newTokenResult = await getRedditAccessTokenAction()
        if (newTokenResult.isSuccess && newTokenResult.data) {
          console.log("🔴🔴🔴 [REDDIT-API] ✅ Got new token, retrying request...")
          const retryHeaders = {
            Authorization: `Bearer ${newTokenResult.data}`,
            "User-Agent": process.env.REDDIT_USER_AGENT || "reddit-lead-gen:v1.0.0"
          }
          console.log("🔴🔴🔴 [REDDIT-API] Retry headers:", {
            Authorization: "Bearer " + newTokenResult.data.substring(0, 20) + "...",
            "User-Agent": retryHeaders["User-Agent"]
          })
          
          const retryResponse = await fetch(fullUrl, { headers: retryHeaders })
          console.log("🔴🔴🔴 [REDDIT-API] Retry response status:", retryResponse.status, retryResponse.statusText)
          
          if (!retryResponse.ok) {
            const errorBody = await retryResponse.text()
            console.log("🔴🔴🔴 [REDDIT-API] ❌ Retry failed")
            console.log("🔴🔴🔴 [REDDIT-API] Error body:", errorBody)
            console.log("🔴🔴🔴 [REDDIT-API] ========== API CALL END (RETRY FAILED) ==========")
            throw new Error(`Reddit API error on retry: ${retryResponse.status} ${retryResponse.statusText} - ${errorBody}`)
          }
          
          const retryData = await retryResponse.json()
          console.log("🔴🔴🔴 [REDDIT-API] ✅ Retry successful")
          console.log("🔴🔴🔴 [REDDIT-API] Response data keys:", Object.keys(retryData || {}))
          console.log("🔴🔴🔴 [REDDIT-API] ========== API CALL END (RETRY SUCCESS) ==========")
          return retryData
        }
      }
      console.log("🔴🔴🔴 [REDDIT-API] ❌ Refresh failed or couldn't get new token")
      console.log("🔴🔴🔴 [REDDIT-API] ========== API CALL END (AUTH EXPIRED) ==========")
      throw new Error("Reddit authentication expired. Please re-authenticate.")
    }
    
    const errorBody = await response.text()
    console.log("🔴🔴🔴 [REDDIT-API] ❌ Request failed")
    console.log("🔴🔴🔴 [REDDIT-API] Error body:", errorBody)
    console.log("🔴🔴🔴 [REDDIT-API] ========== API CALL END (REQUEST FAILED) ==========")
    throw new Error(
      `Reddit API error: ${response.status} ${response.statusText} - ${errorBody}`
    )
  }

  const responseData = await response.json()
  console.log("🔴🔴🔴 [REDDIT-API] ✅ Request successful")
  console.log("🔴🔴🔴 [REDDIT-API] Response data keys:", Object.keys(responseData || {}))
  console.log("🔴🔴🔴 [REDDIT-API] Response data type:", typeof responseData)
  if (Array.isArray(responseData)) {
    console.log("🔴🔴🔴 [REDDIT-API] Response is array, length:", responseData.length)
  }
  console.log("🔴🔴🔴 [REDDIT-API] ========== API CALL END (SUCCESS) ==========")
  return responseData
}

async function makeRedditApiPostCall(
  endpoint: string,
  body: Record<string, any>
): Promise<any> {
  console.log(`🚀 [REDDIT-API-POST] Making POST call to: ${endpoint}`)
  // Get access token
  let tokenResult = await getRedditAccessTokenAction()

  if (!tokenResult.isSuccess) {
    console.log("🔧 [REDDIT-API-POST] Access token failed, attempting refresh...")
    const refreshResult = await refreshRedditTokenAction()
    if (!refreshResult.isSuccess) {
      console.error("❌ [REDDIT-API-POST] Token refresh failed:", refreshResult.message)
      throw new Error(
        "No valid Reddit access token available. Please re-authenticate."
      )
    }
    tokenResult = await getRedditAccessTokenAction()
    if (!tokenResult.isSuccess) {
      console.error("❌ [REDDIT-API-POST] Failed to get refreshed access token after refresh.")
      throw new Error("Failed to get refreshed access token")
    }
    console.log("✅ [REDDIT-API-POST] Token refreshed successfully.")
  }

  const accessToken = tokenResult.data
  if (!accessToken) {
    console.error("❌ [REDDIT-API-POST] Access token is undefined even after successful fetch/refresh.")
    throw new Error("Access token is undefined.")
  }
  console.log(`🔑 [REDDIT-API-POST] Using access token: ${accessToken.substring(0,20)}...`)

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": process.env.REDDIT_USER_AGENT || "reddit-lead-gen:v1.0.0",
    "Content-Type": "application/x-www-form-urlencoded"
  }

  // Convert body to x-www-form-urlencoded
  const formBody = new URLSearchParams()
  for (const key in body) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      formBody.append(key, body[key])
    }
  }
  
  console.log("📬 [REDDIT-API-POST] Request Headers:", JSON.stringify(headers, null, 2))
  console.log("📬 [REDDIT-API-POST] Request Body:", formBody.toString())

  let response = await fetch(`https://oauth.reddit.com${endpoint}`, {
    method: "POST",
    headers,
    body: formBody
  })
  console.log(`📥 [REDDIT-API-POST] Initial POST Response Status for ${endpoint}: ${response.status} ${response.statusText}`)

  if (!response.ok) {
    if (response.status === 401) {
      console.log("🔧 [REDDIT-API-POST] POST request got 401, attempting refresh...")
      const refreshResult = await refreshRedditTokenAction()
      if (refreshResult.isSuccess) {
        const newTokenResult = await getRedditAccessTokenAction()
        if (newTokenResult.isSuccess && newTokenResult.data) {
          console.log("✅ [REDDIT-API-POST] Retrying POST request with new token.")
          const newHeaders = {
            ...headers,
            Authorization: `Bearer ${newTokenResult.data}`
          }
          console.log("📬 [REDDIT-API-POST] Retry Request Headers:", JSON.stringify(newHeaders, null, 2))
          response = await fetch(`https://oauth.reddit.com${endpoint}`, {
            method: "POST",
            headers: newHeaders,
            body: formBody
          })
          console.log(`📥 [REDDIT-API-POST] Retry POST Response Status for ${endpoint}: ${response.status} ${response.statusText}`)
          if (!response.ok) {
            const errorBody = await response.text()
            console.error(
              `❌ [REDDIT-API-POST] Retry POST request failed: ${response.status} ${response.statusText}`,
              errorBody
            )
            throw new Error(`Reddit API error on retry: ${response.status} ${response.statusText} - ${errorBody}`)
          }
        } else {
          console.error("❌ [REDDIT-API-POST] Failed to get new token after refresh during 401 handling.")
          throw new Error("Reddit authentication expired. Please re-authenticate.")
        }
      } else {
        console.error("❌ [REDDIT-API-POST] Token refresh failed during 401 handling.")
        throw new Error("Reddit authentication expired. Please re-authenticate.")
      }
    } else {
      const errorBody = await response.text()
      const errorHeaders = Object.fromEntries(response.headers.entries())
      console.error(
        `❌ [REDDIT-API-POST] Initial POST request failed: ${response.status} ${response.statusText}`,
        { body: errorBody, headers: errorHeaders }
      )
      console.error("❌ [REDDIT-API-POST] Error Body:", errorBody)
      console.error("❌ [REDDIT-API-POST] Error Headers:", JSON.stringify(errorHeaders, null, 2))
      throw new Error(
        `Reddit API error: ${response.status} ${response.statusText} - ${errorBody}`
      )
    }
  }
  
  const responseText = await response.text()
  console.log("✅ [REDDIT-API-POST] Response Text:", responseText)
  try {
    const jsonData = JSON.parse(responseText)
    console.log(`✅ [REDDIT-API-POST] POST request successful for ${endpoint}. Parsed JSON response keys:`, Object.keys(jsonData || {}))
    return jsonData
  } catch (e) {
    console.warn("⚠️ [REDDIT-API-POST] Response was not valid JSON, returning raw text.")
    return responseText // Or handle non-JSON response appropriately
  }
}

export async function fetchRedditThreadAction(
  threadId: string,
  subreddit?: string
): Promise<ActionState<RedditThreadData>> {
  console.log("📖📖📖 [FETCH-THREAD] ========== FETCH START ==========")
  console.log("📖📖📖 [FETCH-THREAD] Timestamp:", new Date().toISOString())
  console.log("📖📖📖 [FETCH-THREAD] Thread ID:", threadId)
  console.log("📖📖📖 [FETCH-THREAD] Subreddit:", subreddit || "not specified")
  
  try {
    // Construct the API endpoint
    const endpoint = subreddit
      ? `/r/${subreddit}/comments/${threadId}.json`
      : `/comments/${threadId}.json`
    console.log("📖📖📖 [FETCH-THREAD] Endpoint:", endpoint)

    console.log("📖📖📖 [FETCH-THREAD] Making Reddit API call...")
    const data = await makeRedditApiCall(endpoint)
    console.log("📖📖📖 [FETCH-THREAD] API call completed")

    // Reddit returns an array with [post, comments]
    console.log("📖📖📖 [FETCH-THREAD] Data structure:", {
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : "N/A",
      hasFirstElement: Array.isArray(data) && data[0] ? "yes" : "no"
    })
    
    const postData = data[0]?.data?.children?.[0]?.data
    console.log("📖📖📖 [FETCH-THREAD] Post data extracted:", !!postData)

    if (!postData) {
      console.log("📖📖📖 [FETCH-THREAD] ❌ No post data found")
      console.log("📖📖📖 [FETCH-THREAD] Data structure debug:", {
        data0: !!data[0],
        data0_data: !!data[0]?.data,
        data0_data_children: !!data[0]?.data?.children,
        data0_data_children_length: data[0]?.data?.children?.length || 0
      })
      console.log("📖📖📖 [FETCH-THREAD] ========== FETCH END (NOT FOUND) ==========")
      return {
        isSuccess: false,
        message: `Reddit thread not found: ${threadId}`
      }
    }

    console.log("📖📖📖 [FETCH-THREAD] Post data details:", {
      id: postData.id,
      title: postData.title?.substring(0, 50) + "...",
      author: postData.author,
      subreddit: postData.subreddit,
      score: postData.score,
      num_comments: postData.num_comments,
      selftext_length: postData.selftext?.length || 0,
      is_video: postData.is_video,
      post_hint: postData.post_hint,
      domain: postData.domain
    })

    const threadData: RedditThreadData = {
      id: postData.id,
      title: postData.title,
      content: postData.selftext || postData.title,
      author: postData.author || "[deleted]",
      subreddit: postData.subreddit || "unknown",
      score: postData.score || 0,
      numComments: postData.num_comments || 0,
      url: `https://reddit.com${postData.permalink}`,
      created: postData.created_utc || 0,
      selfText: postData.selftext,
      isVideo: postData.is_video || false,
      isImage: postData.post_hint === "image",
      domain: postData.domain || ""
    }

    console.log("📖📖📖 [FETCH-THREAD] ✅ Thread data constructed successfully")
    console.log("📖📖📖 [FETCH-THREAD] Thread summary:", {
      id: threadData.id,
      title: threadData.title.substring(0, 50) + "...",
      contentLength: threadData.content.length,
      author: threadData.author,
      subreddit: threadData.subreddit,
      score: threadData.score,
      numComments: threadData.numComments
    })
    console.log("📖📖📖 [FETCH-THREAD] ========== FETCH END (SUCCESS) ==========")

    return {
      isSuccess: true,
      message: "Reddit thread fetched successfully",
      data: threadData
    }
  } catch (error) {
    console.log("📖📖📖 [FETCH-THREAD] ❌ Exception caught")
    console.log("📖📖📖 [FETCH-THREAD] Error type:", typeof error)
    console.log("📖📖📖 [FETCH-THREAD] Error:", error)
    console.log("📖📖📖 [FETCH-THREAD] Error message:", error instanceof Error ? error.message : "Unknown error")
    console.log("📖📖📖 [FETCH-THREAD] Error stack:", error instanceof Error ? error.stack : "No stack trace")

    if (error instanceof Error) {
      if (error.message.includes("authentication")) {
        console.log("📖📖📖 [FETCH-THREAD] Authentication error detected")
        console.log("📖📖📖 [FETCH-THREAD] ========== FETCH END (AUTH ERROR) ==========")
        return {
          isSuccess: false,
          message: error.message
        }
      }
      if (error.message.includes("404")) {
        console.log("📖📖📖 [FETCH-THREAD] 404 error - thread not found")
        console.log("📖📖📖 [FETCH-THREAD] ========== FETCH END (404) ==========")
        return {
          isSuccess: false,
          message: `Reddit thread not found: ${threadId}`
        }
      }
      if (error.message.includes("403")) {
        console.log("📖📖📖 [FETCH-THREAD] 403 error - access denied")
        console.log("📖📖📖 [FETCH-THREAD] ========== FETCH END (403) ==========")
        return {
          isSuccess: false,
          message: `Access denied to Reddit thread: ${threadId}`
        }
      }
      if (error.message.includes("429")) {
        console.log("📖📖📖 [FETCH-THREAD] 429 error - rate limit exceeded")
        console.log("📖📖📖 [FETCH-THREAD] ========== FETCH END (429) ==========")
        return {
          isSuccess: false,
          message: "Reddit API rate limit exceeded, please try again later"
        }
      }
    }

    console.log("📖📖📖 [FETCH-THREAD] ========== FETCH END (GENERIC ERROR) ==========")
    return {
      isSuccess: false,
      message: `Failed to fetch Reddit thread: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function fetchMultipleRedditThreadsAction(
  threadIds: { threadId: string; subreddit?: string }[]
): Promise<ActionState<RedditThreadData[]>> {
  console.log("📖📖📖 [FETCH-MULTIPLE] ========== MULTI-FETCH START ==========")
  console.log("📖📖📖 [FETCH-MULTIPLE] Timestamp:", new Date().toISOString())
  console.log("📖📖📖 [FETCH-MULTIPLE] Thread count:", threadIds.length)
  console.log("📖📖📖 [FETCH-MULTIPLE] Thread IDs:", threadIds.map(t => t.threadId))
  
  try {
    const results: RedditThreadData[] = []
    const errors: string[] = []

    for (let i = 0; i < threadIds.length; i++) {
      const { threadId, subreddit } = threadIds[i]
      console.log(`📖📖📖 [FETCH-MULTIPLE] Fetching thread ${i + 1}/${threadIds.length}: ${threadId}`)
      
      const result = await fetchRedditThreadAction(threadId, subreddit)

      if (result.isSuccess) {
        results.push(result.data)
        console.log(`📖📖📖 [FETCH-MULTIPLE] ✅ Thread ${i + 1} fetched successfully`)
      } else {
        errors.push(`${threadId}: ${result.message}`)
        console.log(`📖📖📖 [FETCH-MULTIPLE] ❌ Thread ${i + 1} failed:`, result.message)
      }

      // Add delay between requests to respect rate limits
      if (i < threadIds.length - 1) {
        console.log("📖📖📖 [FETCH-MULTIPLE] Waiting 1 second before next request...")
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const successCount = results.length
    const errorCount = errors.length

    console.log("📖📖📖 [FETCH-MULTIPLE] ✅ Multi-fetch completed")
    console.log("📖📖📖 [FETCH-MULTIPLE] Summary:", {
      total: threadIds.length,
      successful: successCount,
      failed: errorCount,
      errors: errors
    })
    console.log("📖📖📖 [FETCH-MULTIPLE] ========== MULTI-FETCH END (SUCCESS) ==========")

    return {
      isSuccess: true,
      message: `Fetched ${successCount} threads successfully, ${errorCount} failed`,
      data: results
    }
  } catch (error) {
    console.log("📖📖📖 [FETCH-MULTIPLE] ❌ Exception caught")
    console.log("📖📖📖 [FETCH-MULTIPLE] Error:", error)
    console.log("📖📖📖 [FETCH-MULTIPLE] ========== MULTI-FETCH END (ERROR) ==========")
    
    return {
      isSuccess: false,
      message: `Failed to fetch multiple Reddit threads: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function testRedditConnectionAction(): Promise<
  ActionState<{ status: string }>
> {
  try {
    // Test by fetching user info
    const data = await makeRedditApiCall("/api/v1/me")

    return {
      isSuccess: true,
      message: "Reddit OAuth connection test successful",
      data: { status: "connected" }
    }
  } catch (error) {
    console.error("Error testing Reddit connection:", error)
    return {
      isSuccess: false,
      message: `Reddit connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function getSubredditInfoAction(
  subredditName: string
): Promise<
  ActionState<{ name: string; description: string; subscribers: number }>
> {
  try {
    const data = await makeRedditApiCall(`/r/${subredditName}/about.json`)

    const subredditData = data.data

    return {
      isSuccess: true,
      message: "Subreddit info retrieved successfully",
      data: {
        name: subredditData.display_name || subredditName,
        description: subredditData.public_description || "",
        subscribers: subredditData.subscribers || 0
      }
    }
  } catch (error) {
    console.error("Error getting subreddit info:", error)
    return {
      isSuccess: false,
      message: `Failed to get subreddit info: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function fetchRedditCommentsAction(
  threadId: string,
  subreddit: string,
  sort: "best" | "top" | "new" | "controversial" | "old" = "best",
  limit: number = 100
): Promise<ActionState<RedditComment[]>> {
  try {
    console.log(
      `💬 Fetching Reddit comments for thread: ${threadId} from r/${subreddit}`
    )

    // Construct the API endpoint with sorting and limit
    const endpoint = `/r/${subreddit}/comments/${threadId}.json?sort=${sort}&limit=${limit}`

    const data = await makeRedditApiCall(endpoint)

    // Reddit returns an array with [post, comments]
    const commentsData = data[1]?.data?.children || []

    const parseComment = (commentData: any, depth: number = 0): RedditComment | null => {
      if (!commentData.data || commentData.kind !== "t1") {
        return null
      }

      const comment: RedditComment = {
        id: commentData.data.id,
        author: commentData.data.author || "[deleted]",
        body: commentData.data.body || "[removed]",
        score: commentData.data.score || 0,
        created_utc: commentData.data.created_utc || 0,
        is_submitter: commentData.data.is_submitter || false,
        depth,
        distinguished: commentData.data.distinguished,
        stickied: commentData.data.stickied,
        awards: commentData.data.total_awards_received || 0
      }

      // Parse replies if they exist
      if (commentData.data.replies && typeof commentData.data.replies === "object") {
        const replyChildren = commentData.data.replies.data?.children || []
        comment.replies = replyChildren
          .map((reply: any) => parseComment(reply, depth + 1))
          .filter((reply: RedditComment | null) => reply !== null) as RedditComment[]
      }

      return comment
    }

    const comments = commentsData
      .map((comment: any) => parseComment(comment))
      .filter((comment: RedditComment | null) => comment !== null) as RedditComment[]

    console.log(`✅ Fetched ${comments.length} comments from Reddit`)

    return {
      isSuccess: true,
      message: "Reddit comments fetched successfully",
      data: comments
    }
  } catch (error) {
    console.error("Error fetching Reddit comments:", error)

    if (error instanceof Error) {
      if (error.message.includes("authentication")) {
        return {
          isSuccess: false,
          message: error.message
        }
      }
      if (error.message.includes("404")) {
        return {
          isSuccess: false,
          message: `Reddit thread not found: ${threadId}`
        }
      }
      if (error.message.includes("429")) {
        return {
          isSuccess: false,
          message: "Reddit API rate limit exceeded, please try again later"
        }
      }
    }

    return {
      isSuccess: false,
      message: `Failed to fetch Reddit comments: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function fetchRedditCommentRepliesAction(
  commentUrl: string
): Promise<ActionState<RedditComment[]>> {
  try {
    console.log(`💬 Fetching Reddit comment replies from: ${commentUrl}`)

    // Extract thread ID and comment ID from the URL
    // URL format: https://reddit.com/r/subreddit/comments/threadId/title/commentId/
    const urlMatch = commentUrl.match(/\/r\/([^/]+)\/comments\/([^/]+)\/[^/]+\/([^/?]+)/)
    if (!urlMatch) {
      throw new Error("Invalid Reddit comment URL format")
    }

    const [, subreddit, threadId, commentId] = urlMatch
    console.log(`📍 Extracted: r/${subreddit}, thread: ${threadId}, comment: ${commentId}`)

    // Fetch the specific comment thread
    const endpoint = `/r/${subreddit}/comments/${threadId}/_/${commentId}.json?sort=best&limit=100`
    const data = await makeRedditApiCall(endpoint)

    // Reddit returns an array with [post, comments]
    const commentsData = data[1]?.data?.children || []

    const parseComment = (commentData: any, depth: number = 0): RedditComment | null => {
      if (!commentData.data || commentData.kind !== "t1") {
        return null
      }

      const comment: RedditComment = {
        id: commentData.data.id,
        author: commentData.data.author || "[deleted]",
        body: commentData.data.body || "[removed]",
        score: commentData.data.score || 0,
        created_utc: commentData.data.created_utc || 0,
        is_submitter: commentData.data.is_submitter || false,
        depth,
        distinguished: commentData.data.distinguished,
        stickied: commentData.data.stickied,
        awards: commentData.data.total_awards_received || 0
      }

      // Parse replies if they exist
      if (commentData.data.replies && typeof commentData.data.replies === "object") {
        const replyChildren = commentData.data.replies.data?.children || []
        comment.replies = replyChildren
          .map((reply: any) => parseComment(reply, depth + 1))
          .filter((reply: RedditComment | null) => reply !== null) as RedditComment[]
      }

      return comment
    }

    // Find the target comment and get its replies
    let targetComment: RedditComment | null = null
    
    const findTargetComment = (comments: any[]): RedditComment | null => {
      for (const commentData of comments) {
        if (commentData.data?.id === commentId) {
          return parseComment(commentData)
        }
        // Check replies recursively
        if (commentData.data?.replies?.data?.children) {
          const found = findTargetComment(commentData.data.replies.data.children)
          if (found) return found
        }
      }
      return null
    }

    targetComment = findTargetComment(commentsData)

    if (!targetComment) {
      console.log(`⚠️ Target comment ${commentId} not found, returning all replies`)
      // If we can't find the specific comment, return all top-level replies
      const allComments = commentsData
        .map((comment: any) => parseComment(comment))
        .filter((comment: RedditComment | null) => comment !== null) as RedditComment[]
      
      return {
        isSuccess: true,
        message: "Reddit comment replies fetched successfully",
        data: allComments
      }
    }

    const replies = targetComment.replies || []
    console.log(`✅ Fetched ${replies.length} replies for comment ${commentId}`)

    return {
      isSuccess: true,
      message: "Reddit comment replies fetched successfully",
      data: replies
    }
  } catch (error) {
    console.error("Error fetching Reddit comment replies:", error)

    if (error instanceof Error) {
      if (error.message.includes("authentication")) {
        return {
          isSuccess: false,
          message: error.message
        }
      }
      if (error.message.includes("404")) {
        return {
          isSuccess: false,
          message: "Reddit comment not found or deleted"
        }
      }
      if (error.message.includes("429")) {
        return {
          isSuccess: false,
          message: "Reddit API rate limit exceeded, please try again later"
        }
      }
    }

    return {
      isSuccess: false,
      message: `Failed to fetch Reddit comment replies: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function submitPostAction(
  subreddit: string,
  title: string,
  text: string
): Promise<ActionState<{ id: string; url: string }>> {
  console.log(`🚀 [SUBMIT-POST-ACTION] Initiating post submission to r/${subreddit}`)
  try {
    console.log(`🔧 [SUBMIT-POST] Submitting post to r/${subreddit}`)
    console.log(`📝 [SUBMIT-POST] Title: ${title}`)
    console.log(`📄 [SUBMIT-POST] Text: ${text.substring(0, 100)}...`)

    const body = {
      api_type: "json",
      kind: "self",
      sr: subreddit,
      title: title,
      text: text,
      resubmit: "true", // Allow resubmitting if a post with the same URL was already submitted (less relevant for self posts)
      validate_on_submit: "true" // Perform validation before submitting
    }

    console.log("📤 [SUBMIT-POST] Sending request with body:", body)
    const result = await makeRedditApiPostCall("/api/submit", body)
    console.log("📥 [SUBMIT-POST] Raw API Result from makeRedditApiPostCall:", JSON.stringify(result, null, 2))

    if (result.json?.errors?.length > 0) {
      const errors = result.json.errors.map((err: any) => err[1]).join(", ")
      console.error(`❌ [SUBMIT-POST] Reddit API returned errors: ${errors}`, result.json.errors)
      return {
        isSuccess: false,
        message: `Failed to submit post: ${errors}`
      }
    }

    const responseData = result.json?.data
    if (!responseData?.name) {
        console.error("❌ [SUBMIT-POST] Reddit API response missing expected data (e.g., post name/ID). Full response data:", responseData, "Full result:", result)
        let detailedMessage = "Reddit API response missing expected data."
        if(result.json && result.json.ratelimit) {
            detailedMessage += ` Rate limit: ${result.json.ratelimit} seconds.`
        }
        return { isSuccess: false, message: detailedMessage }
    }
    
    const postId = responseData.name // This is the fullname, e.g., t3_xxxxxx
    const postUrl = responseData.url

    console.log(`✅ [SUBMIT-POST] Post submitted successfully: ${postId}, URL: ${postUrl}`)

    return {
      isSuccess: true,
      message: "Post submitted successfully",
      data: { id: postId, url: postUrl }
    }
  } catch (error) {
    console.error("❌ [SUBMIT-POST] Error submitting post:", error)
    let errorMessage = "Failed to submit post."
    if (error instanceof Error) {
        errorMessage = `Failed to submit post: ${error.message}`
    }
    return { isSuccess: false, message: errorMessage }
  }
}

export async function submitCommentAction(
  parentId: string, // fullname of the post (t3_) or comment (t1_) to reply to
  text: string
): Promise<ActionState<{ id: string; parentId: string }>> {
  console.log(`🚀 [SUBMIT-COMMENT-ACTION] Initiating comment submission to ${parentId}`)
  try {
    console.log(`🔧 [SUBMIT-COMMENT] Submitting comment to ${parentId}`)
    console.log(`💬 [SUBMIT-COMMENT] Text: ${text.substring(0, 100)}...`)

    const body = {
      api_type: "json",
      thing_id: parentId,
      text: text
    }
    
    console.log("📤 [SUBMIT-COMMENT] Sending request with body:", body)
    const result = await makeRedditApiPostCall("/api/comment", body)
    console.log("📥 [SUBMIT-COMMENT] Raw API Result from makeRedditApiPostCall:", JSON.stringify(result, null, 2))

    if (result.json?.errors?.length > 0) {
      const errors = result.json.errors.map((err: any) => err[1]).join(", ")
      console.error(`❌ [SUBMIT-COMMENT] Reddit API returned errors: ${errors}`, result.json.errors)
      return {
        isSuccess: false,
        message: `Failed to submit comment: ${errors}`
      }
    }
    
    const commentData = result.json?.data?.things?.[0]?.data
    if (!commentData?.id) {
        console.error("❌ [SUBMIT-COMMENT] Reddit API response missing expected data (e.g., comment id). Full response data:", commentData, "Full result:", result)
        let detailedMessage = "Reddit API response missing expected data."
        if(result.json && result.json.ratelimit) {
            detailedMessage += ` Rate limit: ${result.json.ratelimit} seconds.`
        }
        return { isSuccess: false, message: detailedMessage }
    }

    const commentId = commentData.id
    console.log(`✅ [SUBMIT-COMMENT] Comment submitted successfully: ${commentId} to ${parentId}`)

    return {
      isSuccess: true,
      message: "Comment submitted successfully",
      data: { id: commentId, parentId: parentId }
    }
  } catch (error) {
    console.error("❌ [SUBMIT-COMMENT] Error submitting comment:", error)
    let errorMessage = "Failed to submit comment."
     if (error instanceof Error) {
        errorMessage = `Failed to submit comment: ${error.message}`
    }
    return { isSuccess: false, message: errorMessage }
  }
}

export async function getRedditUserInfoAction(): Promise<ActionState<{ name: string; karma: number }>> {
  console.log("🚀 [GET-REDDIT-USER-INFO] Fetching user info...")
  try {
    // Test by fetching user info
    const data = await makeRedditApiCall("/api/v1/me")
    console.log("ℹ️ [GET-REDDIT-USER-INFO] Raw data from /api/v1/me:", data)

    return {
      isSuccess: true,
      message: "Reddit OAuth connection test successful",
      data: {
        name: data.name || "",
        karma: data.link_karma || 0
      }
    }
  } catch (error) {
    console.error("Error testing Reddit connection:", error)
    return {
      isSuccess: false,
      message: `Reddit connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}
