/*
<ai_context>
Reddit API integration actions specifically for the warm-up feature.
Handles subreddit search, top posts analysis, and Reddit account info.
</ai_context>
*/

"use server"

import { ActionState } from "@/types"
import { makeRedditApiGet, makeRedditApiPost } from "./reddit-auth-helpers"

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
  organizationId: string,
  query: string
): Promise<ActionState<RedditSubreddit[]>> {
  try {
    console.log(`🔍 [SEARCH-SUBREDDITS] Searching for: "${query}", org: ${organizationId}`);
    if (!organizationId) {
      return { isSuccess: false, message: "Organization ID is required" };
    }

    const endpoint = `/subreddits/search?q=${encodeURIComponent(query)}&limit=10&type=sr`;
    const response = await makeRedditApiGet(organizationId, endpoint);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("❌ [SEARCH-SUBREDDITS] Reddit API error:", response.status, errorBody);
      return { isSuccess: false, message: `Failed to search subreddits: ${response.status}` };
    }

    const data = await response.json();
    const subreddits = data.data.children.map(
      (child: any) => child.data as RedditSubreddit
    );

    console.log(`✅ [SEARCH-SUBREDDITS] Found ${subreddits.length} subreddits`);
    return { isSuccess: true, message: "Subreddits found", data: subreddits };

  } catch (error) {
    console.error("❌ [SEARCH-SUBREDDITS] Error:", error);
    return { 
        isSuccess: false, 
        message: `Failed to search subreddits: ${error instanceof Error ? error.message : "Unknown error"}` 
    };
  }
}

export async function getTopPostsFromSubredditAction(
  organizationId: string,
  subreddit: string,
  timeframe: "year" | "month" | "week" = "year",
  limit: number = 10
): Promise<ActionState<RedditPost[]>> {
  try {
    console.log(`🔍 [GET-TOP-POSTS] Fetching top posts from r/${subreddit}, org: ${organizationId}`);
    if (!organizationId) {
      return { isSuccess: false, message: "Organization ID is required" };
    }

    const endpoint = `/r/${subreddit}/top?t=${timeframe}&limit=${limit}&raw_json=1`;
    const response = await makeRedditApiGet(organizationId, endpoint);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("❌ [GET-TOP-POSTS] Reddit API error:", response.status, errorBody);
      return { isSuccess: false, message: `Failed to fetch top posts: ${response.status}` };
    }

    const data = await response.json();
    const posts = data.data.children.map(
      (child: any) => child.data as RedditPost
    );

    console.log(`✅ [GET-TOP-POSTS] Found ${posts.length} top posts`);
    return { isSuccess: true, message: "Top posts retrieved", data: posts };

  } catch (error) {
    console.error("❌ [GET-TOP-POSTS] Error:", error);
    return { 
        isSuccess: false, 
        message: `Failed to fetch top posts: ${error instanceof Error ? error.message : "Unknown error"}` 
    };
  }
}

export async function getRedditUserInfoAction(
  organizationId: string
): Promise<ActionState<RedditUser>> {
  try {
    console.log(`🔍 [GET-USER-INFO] Fetching Reddit user info for org: ${organizationId}`);
    if (!organizationId) {
      return { isSuccess: false, message: "Organization ID is required" };
    }

    const response = await makeRedditApiGet(organizationId, "/api/v1/me");

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("❌ [GET-USER-INFO] Reddit API error:", response.status, errorBody);
      return { isSuccess: false, message: `Failed to fetch user info: ${response.status}` };
    }

    const userInfo = (await response.json()) as RedditUser;
    console.log(`✅ [GET-USER-INFO] User info retrieved: ${userInfo.name}`);
    return { isSuccess: true, message: "User info retrieved", data: userInfo };

  } catch (error) {
    console.error("❌ [GET-USER-INFO] Error:", error);
    return { 
        isSuccess: false, 
        message: `Failed to fetch user info: ${error instanceof Error ? error.message : "Unknown error"}` 
    };
  }
}

export async function getPostCommentsAction(
  organizationId: string,
  subreddit: string,
  postId: string
): Promise<ActionState<any[]>> {
  try {
    console.log(
      `🔍 [GET-POST-COMMENTS] Fetching comments for post ${postId} in r/${subreddit}, org: ${organizationId}`
    );
    if (!organizationId) {
      return { isSuccess: false, message: "Organization ID is required" };
    }

    const endpoint = `/r/${subreddit}/comments/${postId}.json?raw_json=1`;
    const response = await makeRedditApiGet(organizationId, endpoint);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("❌ [GET-POST-COMMENTS] Reddit API error:", response.status, errorBody);
      return { isSuccess: false, message: `Failed to fetch comments: ${response.status}` };
    }

    const data = await response.json();
    const comments = data[1]?.data?.children || [];

    console.log(`✅ [GET-POST-COMMENTS] Found ${comments.length} comments`);
    return { isSuccess: true, message: "Comments retrieved", data: comments };

  } catch (error) {
    console.error("❌ [GET-POST-COMMENTS] Error:", error);
    return { 
        isSuccess: false, 
        message: `Failed to fetch comments: ${error instanceof Error ? error.message : "Unknown error"}` 
    };
  }
}

export async function submitRedditPostAction(
  organizationId: string,
  subreddit: string,
  title: string,
  text: string
): Promise<ActionState<{ id: string; url: string }>> {
  try {
    console.log(`🔧 [SUBMIT-POST-WARMUP] Submitting post to r/${subreddit}, org: ${organizationId}`);
    if (!organizationId) {
      return { isSuccess: false, message: "Organization ID is required" };
    }

    const body = {
      api_type: "json",
      kind: "self",
      sr: subreddit,
      title: title,
      text: text
    };

    const response = await makeRedditApiPost(organizationId, "/api/submit", body);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("❌ [SUBMIT-POST-WARMUP] Reddit API error:", response.status, errorBody);
      return { isSuccess: false, message: `Failed to submit post: ${response.status} - ${errorBody}` };
    }

    const data = await response.json();
    if (data.json?.errors?.length > 0) {
      console.error("❌ [SUBMIT-POST-WARMUP] Reddit API errors:", data.json.errors);
      return {
        isSuccess: false,
        message: data.json.errors[0]?.[1] || "Failed to submit post due to API error"
      };
    }

    const postData = data.json?.data;
    if (!postData || !postData.id || !postData.url) {
      console.error("❌ [SUBMIT-POST-WARMUP] No post data in response:", data);
      return { isSuccess: false, message: "No post data returned from API" };
    }

    console.log(`✅ [SUBMIT-POST-WARMUP] Post submitted successfully: ${postData.url}`);
    return {
      isSuccess: true,
      message: "Post submitted successfully",
      data: { id: postData.id, url: postData.url }
    };

  } catch (error) {
    console.error("❌ [SUBMIT-POST-WARMUP] Error:", error);
    return { 
        isSuccess: false, 
        message: `Failed to submit post: ${error instanceof Error ? error.message : "Unknown error"}` 
    };
  }
}

export async function submitRedditCommentAction(
  organizationId: string,
  parentFullname: string,
  text: string
): Promise<ActionState<{ id: string }>> {
  try {
    console.log(`🔧 [SUBMIT-COMMENT-WARMUP] Submitting comment to ${parentFullname}, org: ${organizationId}`);
    if (!organizationId) {
      return { isSuccess: false, message: "Organization ID is required" };
    }
    
    const body = {
      api_type: "json",
      thing_id: parentFullname,
      text: text
    };

    const commentBody = {
        api_type: "json",
        parent: parentFullname,
        text: text
    };

    const response = await makeRedditApiPost(organizationId, "/api/comment", commentBody);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("❌ [SUBMIT-COMMENT-WARMUP] Reddit API error:", response.status, errorBody);
      return { isSuccess: false, message: `Failed to submit comment: ${response.status} - ${errorBody}` };
    }

    const data = await response.json();
    if (data.json?.errors?.length > 0) {
      console.error("❌ [SUBMIT-COMMENT-WARMUP] Reddit API errors:", data.json.errors);
      return {
        isSuccess: false,
        message: data.json.errors[0]?.[1] || "Failed to submit comment due to API error"
      };
    }

    const commentData = data.json?.data?.things?.[0]?.data;
    if (!commentData || !commentData.id) {
      console.error("❌ [SUBMIT-COMMENT-WARMUP] No comment data in response:", data);
      return { isSuccess: false, message: "No comment data returned from API" };
    }

    console.log(
      `✅ [SUBMIT-COMMENT-WARMUP] Comment submitted successfully: ${commentData.id}`
    );
    return {
      isSuccess: true,
      message: "Comment submitted successfully",
      data: { id: commentData.id }
    };

  } catch (error) {
    console.error("❌ [SUBMIT-COMMENT-WARMUP] Error:", error);
    return { 
        isSuccess: false, 
        message: `Failed to submit comment: ${error instanceof Error ? error.message : "Unknown error"}` 
    };
  }
}
