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
  const tokenResult = await getRedditAccessTokenAction()

  if (!tokenResult.isSuccess) {
    // Try to refresh token if available
    const refreshResult = await refreshRedditTokenAction()
    if (!refreshResult.isSuccess) {
      throw new Error(
        "No valid Reddit access token available. Please re-authenticate."
      )
    }
    // Get the new token
    const newTokenResult = await getRedditAccessTokenAction()
    if (!newTokenResult.isSuccess) {
      throw new Error("Failed to get refreshed access token")
    }
  }

  const accessToken = tokenResult.isSuccess
    ? tokenResult.data
    : (await getRedditAccessTokenAction()).data

  const response = await fetch(`https://oauth.reddit.com${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": process.env.REDDIT_USER_AGENT || "reddit-lead-gen:v1.0.0"
    }
  })

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired, try to refresh
      const refreshResult = await refreshRedditTokenAction()
      if (refreshResult.isSuccess) {
        // Retry with new token
        const newTokenResult = await getRedditAccessTokenAction()
        if (newTokenResult.isSuccess) {
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
            throw new Error(`Reddit API error: ${retryResponse.status}`)
          }
          return await retryResponse.json()
        }
      }
      throw new Error("Reddit authentication expired. Please re-authenticate.")
    }
    throw new Error(
      `Reddit API error: ${response.status} ${response.statusText}`
    )
  }

  return await response.json()
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
