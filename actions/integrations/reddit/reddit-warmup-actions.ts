/*
<ai_context>
Reddit API integration actions specifically for the warm-up feature.
Handles subreddit search, top posts analysis, and Reddit account info.
</ai_context>
*/

"use server"

import { ActionState } from "@/types"
import { getRedditAccessTokenAction } from "./reddit-oauth-actions"

interface RedditPost {
  id: string
  title: string
  selftext: string
  score: number
  created_utc: number
  subreddit: string
  author: string
  num_comments: number
}

interface RedditSubreddit {
  display_name: string
  display_name_prefixed: string
  subscribers: number
  public_description: string
  title: string
}

interface RedditUser {
  name: string
  link_karma: number
  comment_karma: number
  created_utc: number
  is_gold: boolean
  is_mod: boolean
  verified: boolean
}

export async function searchSubredditsAction(
  query: string
): Promise<ActionState<RedditSubreddit[]>> {
  try {
    console.log("🔍 [SEARCH-SUBREDDITS] Searching for:", query)
    
    const tokenResult = await getRedditAccessTokenAction()
    if (!tokenResult.isSuccess || !tokenResult.data) {
      return { isSuccess: false, message: "No Reddit access token available" }
    }

    const response = await fetch(
      `https://oauth.reddit.com/subreddits/search?q=${encodeURIComponent(query)}&limit=10&type=sr`,
      {
        headers: {
          Authorization: `Bearer ${tokenResult.data}`,
          "User-Agent": process.env.REDDIT_USER_AGENT || "reddit-warmup:v1.0.0"
        }
      }
    )

    if (!response.ok) {
      console.error("❌ [SEARCH-SUBREDDITS] Reddit API error:", response.status)
      return { isSuccess: false, message: "Failed to search subreddits" }
    }

    const data = await response.json()
    const subreddits = data.data.children.map((child: any) => child.data as RedditSubreddit)
    
    console.log(`✅ [SEARCH-SUBREDDITS] Found ${subreddits.length} subreddits`)
    
    return {
      isSuccess: true,
      message: "Subreddits found",
      data: subreddits
    }
  } catch (error) {
    console.error("❌ [SEARCH-SUBREDDITS] Error:", error)
    return { isSuccess: false, message: "Failed to search subreddits" }
  }
}

export async function getTopPostsFromSubredditAction(
  subreddit: string,
  timeframe: "year" | "month" | "week" = "year",
  limit: number = 10
): Promise<ActionState<RedditPost[]>> {
  try {
    console.log(`🔍 [GET-TOP-POSTS] Fetching top posts from r/${subreddit}`)
    
    const tokenResult = await getRedditAccessTokenAction()
    if (!tokenResult.isSuccess || !tokenResult.data) {
      return { isSuccess: false, message: "No Reddit access token available" }
    }

    const response = await fetch(
      `https://oauth.reddit.com/r/${subreddit}/top?t=${timeframe}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${tokenResult.data}`,
          "User-Agent": process.env.REDDIT_USER_AGENT || "reddit-warmup:v1.0.0"
        }
      }
    )

    if (!response.ok) {
      console.error("❌ [GET-TOP-POSTS] Reddit API error:", response.status)
      return { isSuccess: false, message: "Failed to fetch top posts" }
    }

    const data = await response.json()
    const posts = data.data.children.map((child: any) => child.data as RedditPost)
    
    console.log(`✅ [GET-TOP-POSTS] Found ${posts.length} top posts`)
    
    return {
      isSuccess: true,
      message: "Top posts retrieved",
      data: posts
    }
  } catch (error) {
    console.error("❌ [GET-TOP-POSTS] Error:", error)
    return { isSuccess: false, message: "Failed to fetch top posts" }
  }
}

export async function getRedditUserInfoAction(): Promise<ActionState<RedditUser>> {
  try {
    console.log("🔍 [GET-USER-INFO] Fetching Reddit user info")
    
    const tokenResult = await getRedditAccessTokenAction()
    if (!tokenResult.isSuccess || !tokenResult.data) {
      return { isSuccess: false, message: "No Reddit access token available" }
    }

    const response = await fetch(
      "https://oauth.reddit.com/api/v1/me",
      {
        headers: {
          Authorization: `Bearer ${tokenResult.data}`,
          "User-Agent": process.env.REDDIT_USER_AGENT || "reddit-warmup:v1.0.0"
        }
      }
    )

    if (!response.ok) {
      console.error("❌ [GET-USER-INFO] Reddit API error:", response.status)
      return { isSuccess: false, message: "Failed to fetch user info" }
    }

    const userInfo = await response.json() as RedditUser
    
    console.log(`✅ [GET-USER-INFO] User info retrieved: ${userInfo.name}`)
    
    return {
      isSuccess: true,
      message: "User info retrieved",
      data: userInfo
    }
  } catch (error) {
    console.error("❌ [GET-USER-INFO] Error:", error)
    return { isSuccess: false, message: "Failed to fetch user info" }
  }
}

export async function getPostCommentsAction(
  subreddit: string,
  postId: string
): Promise<ActionState<any[]>> {
  try {
    console.log(`🔍 [GET-POST-COMMENTS] Fetching comments for post ${postId} in r/${subreddit}`)
    
    const tokenResult = await getRedditAccessTokenAction()
    if (!tokenResult.isSuccess || !tokenResult.data) {
      return { isSuccess: false, message: "No Reddit access token available" }
    }

    const response = await fetch(
      `https://oauth.reddit.com/r/${subreddit}/comments/${postId}`,
      {
        headers: {
          Authorization: `Bearer ${tokenResult.data}`,
          "User-Agent": process.env.REDDIT_USER_AGENT || "reddit-warmup:v1.0.0"
        }
      }
    )

    if (!response.ok) {
      console.error("❌ [GET-POST-COMMENTS] Reddit API error:", response.status)
      return { isSuccess: false, message: "Failed to fetch comments" }
    }

    const data = await response.json()
    // Reddit returns an array where [0] is the post and [1] is the comments
    const comments = data[1]?.data?.children || []
    
    console.log(`✅ [GET-POST-COMMENTS] Found ${comments.length} comments`)
    
    return {
      isSuccess: true,
      message: "Comments retrieved",
      data: comments
    }
  } catch (error) {
    console.error("❌ [GET-POST-COMMENTS] Error:", error)
    return { isSuccess: false, message: "Failed to fetch comments" }
  }
}

export async function submitRedditPostAction(
  subreddit: string,
  title: string,
  text: string
): Promise<ActionState<{ id: string; url: string }>> {
  try {
    console.log(`🔧 [SUBMIT-POST] Submitting post to r/${subreddit}`)
    
    const tokenResult = await getRedditAccessTokenAction()
    if (!tokenResult.isSuccess || !tokenResult.data) {
      return { isSuccess: false, message: "No Reddit access token available" }
    }

    const formData = new URLSearchParams({
      api_type: "json",
      kind: "self",
      sr: subreddit,
      title: title,
      text: text
    })

    const response = await fetch(
      "https://oauth.reddit.com/api/submit",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenResult.data}`,
          "User-Agent": process.env.REDDIT_USER_AGENT || "reddit-warmup:v1.0.0",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData
      }
    )

    if (!response.ok) {
      console.error("❌ [SUBMIT-POST] Reddit API error:", response.status)
      return { isSuccess: false, message: "Failed to submit post" }
    }

    const data = await response.json()
    
    if (data.json?.errors?.length > 0) {
      console.error("❌ [SUBMIT-POST] Reddit API errors:", data.json.errors)
      return { 
        isSuccess: false, 
        message: data.json.errors[0]?.[1] || "Failed to submit post" 
      }
    }

    const postData = data.json?.data
    if (!postData) {
      return { isSuccess: false, message: "No post data returned" }
    }

    console.log(`✅ [SUBMIT-POST] Post submitted successfully: ${postData.url}`)
    
    return {
      isSuccess: true,
      message: "Post submitted successfully",
      data: {
        id: postData.id,
        url: postData.url
      }
    }
  } catch (error) {
    console.error("❌ [SUBMIT-POST] Error:", error)
    return { isSuccess: false, message: "Failed to submit post" }
  }
}

export async function submitRedditCommentAction(
  parentFullname: string,
  text: string
): Promise<ActionState<{ id: string }>> {
  try {
    console.log(`🔧 [SUBMIT-COMMENT] Submitting comment to ${parentFullname}`)
    
    const tokenResult = await getRedditAccessTokenAction()
    if (!tokenResult.isSuccess || !tokenResult.data) {
      return { isSuccess: false, message: "No Reddit access token available" }
    }

    const formData = new URLSearchParams({
      api_type: "json",
      thing_id: parentFullname,
      text: text
    })

    const response = await fetch(
      "https://oauth.reddit.com/api/comment",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenResult.data}`,
          "User-Agent": process.env.REDDIT_USER_AGENT || "reddit-warmup:v1.0.0",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData
      }
    )

    if (!response.ok) {
      console.error("❌ [SUBMIT-COMMENT] Reddit API error:", response.status)
      return { isSuccess: false, message: "Failed to submit comment" }
    }

    const data = await response.json()
    
    if (data.json?.errors?.length > 0) {
      console.error("❌ [SUBMIT-COMMENT] Reddit API errors:", data.json.errors)
      return { 
        isSuccess: false, 
        message: data.json.errors[0]?.[1] || "Failed to submit comment" 
      }
    }

    const commentData = data.json?.data?.things?.[0]?.data
    if (!commentData) {
      return { isSuccess: false, message: "No comment data returned" }
    }

    console.log(`✅ [SUBMIT-COMMENT] Comment submitted successfully: ${commentData.id}`)
    
    return {
      isSuccess: true,
      message: "Comment submitted successfully",
      data: {
        id: commentData.id
      }
    }
  } catch (error) {
    console.error("❌ [SUBMIT-COMMENT] Error:", error)
    return { isSuccess: false, message: "Failed to submit comment" }
  }
} 