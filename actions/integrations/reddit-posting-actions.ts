/*
<ai_context>
Contains server actions for posting comments to Reddit using OAuth2 authentication.
</ai_context>
*/

"use server"

import { ActionState } from "@/types"
import {
  getRedditTokensFromProfileAction,
  refreshRedditTokenFromProfileAction
} from "./reddit-oauth-user-actions"
import { updateGeneratedCommentAction } from "@/actions/db/lead-generation-actions"

interface PostCommentParams {
  parentId: string // thread ID or comment ID (t3_xxx for posts, t1_xxx for comments)
  text: string
}

interface PostedComment {
  id: string
  name: string // full name (t1_xxx)
  link: string
  author: string
  body: string
  created: number
}

async function makeRedditApiPost(endpoint: string, body: any): Promise<any> {
  // Get access token from user's profile
  const tokenResult = await getRedditTokensFromProfileAction()

  if (!tokenResult.isSuccess) {
    // Try to refresh token if available
    const refreshResult = await refreshRedditTokenFromProfileAction()
    if (!refreshResult.isSuccess) {
      throw new Error(
        "No valid Reddit access token available. Please re-authenticate."
      )
    }
    // Get the new token
    const newTokenResult = await getRedditTokensFromProfileAction()
    if (!newTokenResult.isSuccess) {
      throw new Error("Failed to get refreshed access token")
    }
  }

  const accessToken = tokenResult.isSuccess
    ? tokenResult.data.accessToken
    : (await getRedditTokensFromProfileAction()).data?.accessToken

  if (!accessToken) {
    throw new Error("No access token available")
  }

  const response = await fetch(`https://oauth.reddit.com${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": process.env.REDDIT_USER_AGENT || "reddit-lead-gen:v1.0.0",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams(body).toString()
  })

  if (!response.ok) {
    const errorData = await response.text()
    console.error("Reddit API error:", response.status, errorData)
    
    if (response.status === 401) {
      throw new Error("Reddit authentication expired. Please re-authenticate.")
    }
    
    if (response.status === 403) {
      throw new Error(
        "You don't have permission to post in this subreddit. Common reasons: " +
        "minimum karma requirements, account age restrictions, or you need to join the subreddit first. " +
        "Try posting to a different subreddit or check the subreddit's rules."
      )
    }
    
    if (response.status === 429) {
      throw new Error("Reddit rate limit exceeded. Please try again later.")
    }
    
    throw new Error(`Reddit API error: ${response.status} - ${errorData}`)
  }

  return await response.json()
}

export async function postCommentToRedditAction(
  params: PostCommentParams
): Promise<ActionState<PostedComment>> {
  try {
    console.log(`📝 Posting comment to Reddit: ${params.parentId}`)
    
    // Ensure parent ID has proper prefix
    const parentFullname = params.parentId.startsWith("t3_") || params.parentId.startsWith("t1_") 
      ? params.parentId 
      : `t3_${params.parentId}`
    
    const data = await makeRedditApiPost("/api/comment", {
      parent: parentFullname,
      text: params.text,
      api_type: "json"
    })

    // Reddit returns nested structure: {json: {data: {things: [...]}}}
    const commentData = data?.json?.data?.things?.[0]?.data

    if (!commentData) {
      throw new Error("Invalid response from Reddit API")
    }

    const postedComment: PostedComment = {
      id: commentData.id,
      name: commentData.name,
      link: `https://reddit.com${commentData.permalink || ""}`,
      author: commentData.author,
      body: commentData.body,
      created: commentData.created_utc
    }

    console.log(`✅ Comment posted successfully: ${postedComment.link}`)

    return {
      isSuccess: true,
      message: "Comment posted to Reddit successfully",
      data: postedComment
    }
  } catch (error) {
    console.error("Error posting comment to Reddit:", error)
    
    if (error instanceof Error) {
      return {
        isSuccess: false,
        message: error.message
      }
    }
    
    return {
      isSuccess: false,
      message: "Failed to post comment to Reddit"
    }
  }
}

export async function postCommentAndUpdateStatusAction(
  leadId: string,
  threadId: string,
  comment: string
): Promise<ActionState<PostedComment>> {
  try {
    console.log(`📝 Posting comment and updating status for lead: ${leadId}`)
    
    // First, post the comment
    const postResult = await postCommentToRedditAction({
      parentId: threadId,
      text: comment
    })
    
    if (!postResult.isSuccess) {
      return postResult
    }
    
    // Update the status in Firestore
    const updateResult = await updateGeneratedCommentAction(leadId, {
      status: "used",
      used: true
    })
    
    if (!updateResult.isSuccess) {
      console.error("Failed to update status in database:", updateResult.message)
      // Still return success since the comment was posted
    }
    
    return postResult
  } catch (error) {
    console.error("Error in postCommentAndUpdateStatus:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to post comment"
    }
  }
}

export async function testRedditPostingAction(): Promise<
  ActionState<{ canPost: boolean; username?: string }>
> {
  try {
    // Test by getting user info
    const tokenResult = await getRedditTokensFromProfileAction()
    
    if (!tokenResult.isSuccess) {
      return {
        isSuccess: false,
        message: "No Reddit access token found. Please authenticate."
      }
    }
    
    const response = await fetch("https://oauth.reddit.com/api/v1/me", {
      headers: {
        Authorization: `Bearer ${tokenResult.data.accessToken}`,
        "User-Agent": process.env.REDDIT_USER_AGENT || "reddit-lead-gen:v1.0.0"
      }
    })
    
    if (!response.ok) {
      return {
        isSuccess: false,
        message: "Failed to verify Reddit authentication"
      }
    }
    
    const userData = await response.json()
    
    return {
      isSuccess: true,
      message: "Reddit posting capability verified",
      data: {
        canPost: true,
        username: userData.name
      }
    }
  } catch (error) {
    console.error("Error testing Reddit posting:", error)
    return {
      isSuccess: false,
      message: "Failed to test Reddit posting capability"
    }
  }
} 