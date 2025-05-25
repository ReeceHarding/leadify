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
  // Get access token
  let tokenResult = await getRedditAccessTokenAction()

  if (!tokenResult.isSuccess) {
    // Try to refresh token if available
    console.log("🔧 [REDDIT-API] Access token failed, attempting refresh...")
    const refreshResult = await refreshRedditTokenAction()
    if (!refreshResult.isSuccess) {
      console.error("❌ [REDDIT-API] Token refresh failed:", refreshResult.message)
      throw new Error(
        "No valid Reddit access token available. Please re-authenticate."
      )
    }
    // Get the new token
    tokenResult = await getRedditAccessTokenAction()
    if (!tokenResult.isSuccess) {
      console.error("❌ [REDDIT-API] Failed to get refreshed access token after refresh.")
      throw new Error("Failed to get refreshed access token")
    }
    console.log("✅ [REDDIT-API] Token refreshed successfully.")
  }

  const accessToken = tokenResult.data
  if (!accessToken) {
    console.error("❌ [REDDIT-API] Access token is undefined even after successful fetch/refresh.")
    throw new Error("Access token is undefined.")
  }

  const response = await fetch(`https://oauth.reddit.com${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": process.env.REDDIT_USER_AGENT || "reddit-lead-gen:v1.0.0"
    }
  })

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired, try to refresh
      console.log("🔧 [REDDIT-API] GET request got 401, attempting refresh...")
      const refreshResult = await refreshRedditTokenAction()
      if (refreshResult.isSuccess) {
        // Retry with new token
        const newTokenResult = await getRedditAccessTokenAction()
        if (newTokenResult.isSuccess && newTokenResult.data) {
          console.log("✅ [REDDIT-API] Retrying GET request with new token.")
          const retryResponse = await fetch(
            `https://oauth.reddit.com${endpoint}`,
            {
              headers: {
                Authorization: `Bearer ${newTokenResult.data}`,
                "User-Agent":
                  process.env.REDDIT_USER_AGENT || "reddit-lead-gen:v1.0.0"
              }
            }
          )
          if (!retryResponse.ok) {
            const errorBody = await retryResponse.text()
            console.error(
              `❌ [REDDIT-API] Retry GET request failed: ${retryResponse.status} ${retryResponse.statusText}`,
              errorBody
            )
            throw new Error(`Reddit API error on retry: ${retryResponse.status} ${retryResponse.statusText} - ${errorBody}`)
          }
          return await retryResponse.json()
        }
      }
      console.error("❌ [REDDIT-API] Refresh failed after 401 on GET, or new token was invalid.")
      throw new Error("Reddit authentication expired. Please re-authenticate.")
    }
    const errorBody = await response.text()
    console.error(
      `❌ [REDDIT-API] Initial GET request failed: ${response.status} ${response.statusText}`,
      errorBody
    )
    throw new Error(
      `Reddit API error: ${response.status} ${response.statusText} - ${errorBody}`
    )
  }

  return await response.json()
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
  
  console.log("📬 [REDDIT-API-POST] Request Headers:", headers)
  console.log("📬 [REDDIT-API-POST] Request Body:", formBody.toString())

  let response = await fetch(`https://oauth.reddit.com${endpoint}`, {
    method: "POST",
    headers,
    body: formBody
  })

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
          console.log("📬 [REDDIT-API-POST] Retry Request Headers:", newHeaders)
          response = await fetch(`https://oauth.reddit.com${endpoint}`, {
            method: "POST",
            headers: newHeaders,
            body: formBody
          })
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
    return JSON.parse(responseText)
  } catch (e) {
    console.warn("⚠️ [REDDIT-API-POST] Response was not valid JSON, returning raw text.")
    return responseText // Or handle non-JSON response appropriately
  }
}

export async function fetchRedditThreadAction(
  threadId: string,
  subreddit?: string
): Promise<ActionState<RedditThreadData>> {
  try {
    console.log(
      `📖 Fetching Reddit thread: ${threadId} from r/${subreddit || "unknown"}`
    )

    // Construct the API endpoint
    const endpoint = subreddit
      ? `/r/${subreddit}/comments/${threadId}.json`
      : `/comments/${threadId}.json`

    const data = await makeRedditApiCall(endpoint)

    // Reddit returns an array with [post, comments]
    const postData = data[0]?.data?.children?.[0]?.data

    if (!postData) {
      return {
        isSuccess: false,
        message: `Reddit thread not found: ${threadId}`
      }
    }

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

    console.log(
      `✅ Reddit thread fetched: "${threadData.title}" (${threadData.content.length} chars)`
    )

    return {
      isSuccess: true,
      message: "Reddit thread fetched successfully",
      data: threadData
    }
  } catch (error) {
    console.error("Error fetching Reddit thread:", error)

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
      if (error.message.includes("403")) {
        return {
          isSuccess: false,
          message: `Access denied to Reddit thread: ${threadId}`
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
      message: `Failed to fetch Reddit thread: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function fetchMultipleRedditThreadsAction(
  threadIds: { threadId: string; subreddit?: string }[]
): Promise<ActionState<RedditThreadData[]>> {
  try {
    const results: RedditThreadData[] = []
    const errors: string[] = []

    console.log(`📖 Fetching ${threadIds.length} Reddit threads...`)

    for (const { threadId, subreddit } of threadIds) {
      const result = await fetchRedditThreadAction(threadId, subreddit)

      if (result.isSuccess) {
        results.push(result.data)
      } else {
        errors.push(`${threadId}: ${result.message}`)
        console.error(`Failed to fetch thread ${threadId}:`, result.message)
      }

      // Add delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const successCount = results.length
    const errorCount = errors.length

    return {
      isSuccess: true,
      message: `Fetched ${successCount} threads successfully, ${errorCount} failed`,
      data: results
    }
  } catch (error) {
    console.error("Error in multiple thread fetch:", error)
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
    console.log("📥 [SUBMIT-POST] Raw API Result:", JSON.stringify(result, null, 2))

    if (result.json?.errors?.length > 0) {
      const errors = result.json.errors.map((err: any) => err[1]).join(", ")
      console.error(`❌ [SUBMIT-POST] Reddit API returned errors: ${errors}`, result.json.errors)
      return {
        isSuccess: false,
        message: `Failed to submit post: ${errors}`
      }
    }

    if (!result.json?.data?.name) {
        console.error("❌ [SUBMIT-POST] Reddit API response missing expected data (e.g., post name/ID). Full response:", result)
        let detailedMessage = "Reddit API response missing expected data."
        if(result.json && result.json.ratelimit) {
            detailedMessage += ` Rate limit: ${result.json.ratelimit} seconds.`
        }
        return { isSuccess: false, message: detailedMessage }
    }
    
    const postId = result.json.data.name // This is the fullname, e.g., t3_xxxxxx
    const postUrl = result.json.data.url

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
    console.log("📥 [SUBMIT-COMMENT] Raw API Result:", JSON.stringify(result, null, 2))

    if (result.json?.errors?.length > 0) {
      const errors = result.json.errors.map((err: any) => err[1]).join(", ")
      console.error(`❌ [SUBMIT-COMMENT] Reddit API returned errors: ${errors}`, result.json.errors)
      return {
        isSuccess: false,
        message: `Failed to submit comment: ${errors}`
      }
    }
    
    if (!result.json?.data?.things?.[0]?.data?.id) {
        console.error("❌ [SUBMIT-COMMENT] Reddit API response missing expected data (e.g., comment id). Full response:", result)
        let detailedMessage = "Reddit API response missing expected data."
        if(result.json && result.json.ratelimit) {
            detailedMessage += ` Rate limit: ${result.json.ratelimit} seconds.`
        }
        return { isSuccess: false, message: detailedMessage }
    }

    const commentId = result.json.data.things[0].data.id
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
  try {
    // Test by fetching user info
    const data = await makeRedditApiCall("/api/v1/me")

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
