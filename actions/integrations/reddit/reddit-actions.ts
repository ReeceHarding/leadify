/*
<ai_context>
Contains server actions for Reddit API integration using OAuth2 authentication to fetch thread content.
</ai_context>
*/

"use server"

import { ActionState, RedditThreadData, RedditComment } from "@/types"
import { makeRedditApiGet, makeRedditApiPost } from "./reddit-auth-helpers"

export async function fetchRedditThreadAction(
  organizationId: string,
  threadId: string,
  subreddit?: string
): Promise<ActionState<RedditThreadData>> {
  console.log("📖📖📖 [FETCH-THREAD] ========== FETCH START ==========")
  console.log("📖📖📖 [FETCH-THREAD] Timestamp:", new Date().toISOString())
  console.log("📖📖📖 [FETCH-THREAD] Organization ID:", organizationId)
  console.log("📖📖📖 [FETCH-THREAD] Thread ID:", threadId)
  console.log("📖📖📖 [FETCH-THREAD] Subreddit:", subreddit || "not specified")

  if (!organizationId) {
    console.error("📖📖📖 [FETCH-THREAD] ❌ Organization ID is required.")
    return { isSuccess: false, message: "Organization ID is required" }
  }

  try {
    const endpoint = subreddit
      ? `/r/${subreddit}/comments/${threadId}.json?raw_json=1`
      : `/comments/${threadId}.json?raw_json=1`
    console.log("📖📖📖 [FETCH-THREAD] Endpoint:", endpoint)

    console.log("📖📖📖 [FETCH-THREAD] Making Reddit API call via helper...")
    const response = await makeRedditApiGet(organizationId, endpoint)
    console.log("📖📖📖 [FETCH-THREAD] API call completed via helper")
    console.log(
      "📖📖📖 [FETCH-THREAD] Response status:",
      response.status,
      response.statusText
    )

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("📖📖📖 [FETCH-THREAD] ❌ API call failed:", response.status, errorBody);
      if (response.status === 401) {
        return { isSuccess: false, message: "Reddit authentication error for the organization. Please reconnect." };
      }
      if (response.status === 403 || response.status === 404) {
         return { isSuccess: false, message: `Reddit thread not found or access denied: ${threadId}` };
      }
      return { isSuccess: false, message: `Reddit API error: ${response.status} - ${errorBody}` };
    }
    
    const data = await response.json();

    const postData = data[0]?.data?.children?.[0]?.data
    if (!postData) {
      console.log("📖📖📖 [FETCH-THREAD] ❌ No post data found")
      return {
        isSuccess: false,
        message: `Reddit thread not found or invalid structure: ${threadId}`
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
    
    console.log("📖📖📖 [FETCH-THREAD] ✅ Thread data constructed successfully")
    return {
      isSuccess: true,
      message: "Reddit thread fetched successfully",
      data: threadData
    }
  } catch (error) {
    console.log("📖📖📖 [FETCH-THREAD] ❌ Exception caught", error)
    return {
        isSuccess: false,
        message: `Failed to fetch Reddit thread: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function fetchRedditCommentsAction(
  organizationId: string,
  threadId: string,
  subreddit: string,
  sort: "best" | "top" | "new" | "controversial" | "old" = "best",
  limit: number = 100
): Promise<ActionState<RedditComment[]>> {
  console.log(`💬 [FETCH-COMMENTS] Fetching comments for thread ${threadId} in r/${subreddit}, org: ${organizationId}`);
  
  if (!organizationId) {
    return { isSuccess: false, message: "Organization ID is required" };
  }

  try {
    const endpoint = `/r/${subreddit}/comments/${threadId}.json?sort=${sort}&limit=${limit}&raw_json=1`;
    const response = await makeRedditApiGet(organizationId, endpoint);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ [FETCH-COMMENTS] API call failed: ${response.status}`, errorBody);
      return { isSuccess: false, message: `Failed to fetch comments: ${response.status} - ${errorBody}` };
    }

    const data = await response.json();
    const commentsData = data[1]?.data?.children;

    if (!Array.isArray(commentsData)) {
      console.log("💬 [FETCH-COMMENTS] No comments data found or invalid structure");
      return { isSuccess: true, message: "No comments found", data: [] };
    }

    const parseComment = (
      commentData: any,
      depth: number = 0
    ): RedditComment | null => {
      if (!commentData || commentData.kind !== "t1") return null;
      const c = commentData.data;
      const parsed: RedditComment = {
        id: c.id,
        author: c.author || "[deleted]",
        body: c.body || "[deleted]",
        score: c.score || 0,
        created_utc: c.created_utc || 0,
        is_submitter: c.is_submitter || false,
        depth: depth,
        replies: [],
      };
      if (c.replies && c.replies.data && c.replies.data.children) {
        parsed.replies = c.replies.data.children
          .map((reply: any) => parseComment(reply, depth + 1))
          .filter((reply: RedditComment | null) => reply !== null) as RedditComment[];
      }
      return parsed;
    };

    const comments: RedditComment[] = commentsData
      .map((commentHolder: any) => parseComment(commentHolder))
      .filter((comment: RedditComment | null) => comment !== null) as RedditComment[];

    console.log(`💬 [FETCH-COMMENTS] Successfully fetched ${comments.length} comments.`);
    return { isSuccess: true, message: "Comments fetched successfully", data: comments };

  } catch (error) {
    console.error("💬 [FETCH-COMMENTS] Error:", error);
    return { 
        isSuccess: false, 
        message: `Failed to fetch comments: ${error instanceof Error ? error.message : "Unknown error"}` 
    };
  }
}

export async function fetchMultipleRedditThreadsAction(
  organizationId: string,
  threadIds: { threadId: string; subreddit?: string }[]
): Promise<ActionState<RedditThreadData[]>> {
  console.log(
    `批量获取 ${threadIds.length} 个 Reddit 帖子，组织ID: ${organizationId}`
  )
  if (!organizationId) {
    return { isSuccess: false, message: "Organization ID is required" };
  }
  try {
    const results: RedditThreadData[] = []
    const errors: string[] = []

    for (const { threadId, subreddit } of threadIds) {
      // Pass organizationId to fetchRedditThreadAction
      const result = await fetchRedditThreadAction(
        organizationId,
        threadId,
        subreddit
      )
      if (result.isSuccess) {
        results.push(result.data)
      } else {
        errors.push(
          `Failed to fetch thread ${threadId}${subreddit ? ` in r/${subreddit}` : ""}: ${result.message}`
        )
      }
      // Optional: Add a small delay between fetches if hitting rate limits
      // await new Promise(resolve => setTimeout(resolve, 200)); 
    }

    if (errors.length > 0) {
      console.warn(
        `部分帖子获取失败: ${errors.join("; ")}`,
        errors
      )
    }

    return {
      isSuccess: true,
      message: `成功获取 ${results.length} 个帖子，失败 ${errors.length} 个`,
      data: results
    }
  } catch (error) {
    console.error("批量获取 Reddit 帖子时出错:", error)
    return {
      isSuccess: false,
      message: `批量获取帖子失败: ${error instanceof Error ? error.message : "未知错误"}`
    }
  }
}

export async function testRedditConnectionAction(
  organizationId: string
): Promise<ActionState<{ status: string }>> {
  console.log(
    `🧪 [TEST-REDDIT-CONNECTION] Testing Reddit connection for organization: ${organizationId}`
  )
  if (!organizationId) {
    return { isSuccess: false, message: "Organization ID is required" };
  }
  try {
    // Test by fetching user info using the new helper
    const response = await makeRedditApiGet(organizationId, "/api/v1/me")
    
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(
            `🧪 [TEST-REDDIT-CONNECTION] API call failed: ${response.status}`, 
            errorBody
        );
        return { isSuccess: false, message: `Failed to connect to Reddit: ${response.status}` };
    }
    const data = await response.json();

    return {
      isSuccess: true,
      message: "Reddit API connection successful",
      data: { status: `connected_as_${data.name}` }
    }
  } catch (error) {
    console.error("🧪 [TEST-REDDIT-CONNECTION] Error testing Reddit connection:", error)
    return {
      isSuccess: false,
      message: `Reddit connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function getSubredditInfoAction(
  organizationId: string,
  subredditName: string
): Promise<
  ActionState<{ name: string; description: string; subscribers: number }>
> {
  console.log(
    `ℹ️ [GET-SUBREDDIT-INFO] Fetching info for r/${subredditName}, org: ${organizationId}`
  )
  if (!organizationId) {
    return { isSuccess: false, message: "Organization ID is required" };
  }
  try {
    const endpoint = `/r/${subredditName}/about.json`;
    const response = await makeRedditApiGet(organizationId, endpoint);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `❌ [GET-SUBREDDIT-INFO] API call failed for r/${subredditName}: ${response.status}`,
        errorBody
      );
      return { isSuccess: false, message: `Failed to get subreddit info: ${response.status}` };
    }
    const data = await response.json();

    const subredditData = data.data;
    if (!subredditData) {
      return { isSuccess: false, message: "Invalid data structure for subreddit info" };
    }

    return {
      isSuccess: true,
      message: "Subreddit info retrieved successfully",
      data: {
        name: subredditData.display_name,
        description: subredditData.public_description || subredditData.title || "",
        subscribers: subredditData.subscribers || 0
      }
    };
  } catch (error) {
    console.error(`❌ [GET-SUBREDDIT-INFO] Error fetching info for r/${subredditName}:`, error);
    return {
      isSuccess: false,
      message: `Failed to get subreddit info: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

export async function fetchRedditCommentRepliesAction(
  organizationId: string,
  commentUrl: string
): Promise<ActionState<RedditComment[]>> {
  console.log(`💬 [FETCH-REPLIES] Fetching replies for comment: ${commentUrl}, org: ${organizationId}`);
  if (!organizationId) {
    return { isSuccess: false, message: "Organization ID is required" };
  }

  // Extract subreddit, threadId, commentId from the URL
  const match = commentUrl.match(/\/r\/([^\/]+)\/comments\/([^\/]+)\/[^\/]*\/([^\/]+)/);
  if (!match || match.length < 4) {
    return { isSuccess: false, message: "Invalid comment URL format" };
  }
  const [, subreddit, threadId, commentId] = match;
  console.log(`💬 [FETCH-REPLIES] Extracted: r/${subreddit}, thread: ${threadId}, comment: ${commentId}`);

  try {
    const endpoint = `/r/${subreddit}/comments/${threadId}/_/${commentId}.json?sort=top&raw_json=1`; // Fetch top replies
    const response = await makeRedditApiGet(organizationId, endpoint);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ [FETCH-REPLIES] API call failed: ${response.status}`, errorBody);
      return { isSuccess: false, message: `Failed to fetch replies: ${response.status} - ${errorBody}` };
    }
    const data = await response.json();

    // The target comment's replies are usually in the second part of the response data[1]
    // and under the target comment itself if it's listed.
    // This parsing might need to be more robust depending on Reddit's exact structure for this endpoint.
    let repliesData: any[] = [];
    
    const findTargetCommentAndItsReplies = (items: any[]): any[] => {
        for (const item of items) {
            if (item.kind === 't1' && item.data.id === commentId) {
                return item.data.replies?.data?.children || [];
            }
            if (item.data.replies?.data?.children) {
                const foundReplies = findTargetCommentAndItsReplies(item.data.replies.data.children);
                if (foundReplies.length > 0) return foundReplies;
            }
        }
        return [];
    }

    if (Array.isArray(data) && data.length > 1 && data[1]?.data?.children) {
        repliesData = findTargetCommentAndItsReplies(data[1].data.children);
    } else if (Array.isArray(data) && data.length > 0 && data[0]?.data?.children) {
        // Sometimes the structure might vary, check the first element too
        repliesData = findTargetCommentAndItsReplies(data[0].data.children);
    }
    
    if (!repliesData || repliesData.length === 0) {
      console.log("💬 [FETCH-REPLIES] No replies data found or invalid structure");
      return { isSuccess: true, message: "No replies found", data: [] };
    }

    const parseComment = (
      commentDataNode: any,
      depth: number = 0
    ): RedditComment | null => {
      if (!commentDataNode || commentDataNode.kind !== "t1") return null;
      const c = commentDataNode.data;
      const parsed: RedditComment = {
        id: c.id,
        author: c.author || "[deleted]",
        body: c.body || "[deleted]",
        score: c.score || 0,
        created_utc: c.created_utc || 0,
        is_submitter: c.is_submitter || false,
        depth: depth,
        replies: [],
      };
      if (c.replies && c.replies.data && c.replies.data.children) {
        parsed.replies = c.replies.data.children
          .map((reply: any) => parseComment(reply, depth + 1))
          .filter((reply: RedditComment | null) => reply !== null) as RedditComment[];
      }
      return parsed;
    };

    const comments: RedditComment[] = repliesData
      .map((replyNode: any) => parseComment(replyNode))
      .filter((comment: RedditComment | null) => comment !== null) as RedditComment[];

    console.log(`💬 [FETCH-REPLIES] Successfully fetched ${comments.length} replies.`);
    return { isSuccess: true, message: "Replies fetched successfully", data: comments };

  } catch (error) {
    console.error("💬 [FETCH-REPLIES] Error:", error);
    return { 
        isSuccess: false, 
        message: `Failed to fetch replies: ${error instanceof Error ? error.message : "Unknown error"}` 
    };
  }
}

export async function submitPostAction(
  organizationId: string,
  subreddit: string,
  title: string,
  text: string
): Promise<ActionState<{ id: string; url: string }>> {
  console.log(
    `📤 [SUBMIT-POST] Submitting post to r/${subreddit}, org: ${organizationId}`
  );
  if (!organizationId) {
    return { isSuccess: false, message: "Organization ID is required" };
  }
  try {
    const body = {
      sr: subreddit,
      title: title,
      text: text,
      kind: "self", // for text posts
      api_type: "json"
    };
    console.log("📤 [SUBMIT-POST] Sending request with body:", body);
    
    const response = await makeRedditApiPost(organizationId, "/api/submit", body);
    
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`❌ [SUBMIT-POST] API call failed: ${response.status}`, errorBody);
        return { isSuccess: false, message: `Failed to submit post: ${response.status} - ${errorBody}` };
    }
    const result = await response.json();

    console.log(
      "📥 [SUBMIT-POST] Raw API Result from makeRedditApiPost:",
      result
    );

    const postData = result?.json?.data?.things?.[0]?.data;
    if (!postData || !postData.id || !postData.url) {
      console.error(
        "❌ [SUBMIT-POST] Invalid response structure after submitting post:",
        postData
      );
      return {
        isSuccess: false,
        message: "Failed to submit post: Invalid API response structure"
      };
    }

    console.log(
      `✅ [SUBMIT-POST] Post submitted successfully: ${postData.id}, URL: ${postData.url}`
    );
    return {
      isSuccess: true,
      message: "Post submitted successfully",
      data: { id: postData.id, url: postData.url }
    };
  } catch (error) {
    console.error("❌ [SUBMIT-POST] Error submitting post:", error);
    return {
      isSuccess: false,
      message: `Failed to submit post: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

export async function submitCommentAction(
  organizationId: string,
  parentId: string, 
  text: string
): Promise<ActionState<{ id: string; parentId: string }>> {
  console.log(
    `📤 [SUBMIT-COMMENT] Submitting comment to ${parentId}, org: ${organizationId}`
  );
   if (!organizationId) {
    return { isSuccess: false, message: "Organization ID is required" };
  }
  try {
    const body = {
      parent: parentId,
      text: text,
      api_type: "json"
    };
    console.log("📤 [SUBMIT-COMMENT] Sending request with body:", body);
    
    const response = await makeRedditApiPost(organizationId, "/api/comment", body);
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`❌ [SUBMIT-COMMENT] API call failed: ${response.status}`, errorBody);
        return { isSuccess: false, message: `Failed to submit comment: ${response.status} - ${errorBody}` };
    }
    const result = await response.json();

    console.log(
      "📥 [SUBMIT-COMMENT] Raw API Result from makeRedditApiPost:",
      result
    );

    const commentData = result?.json?.data?.things?.[0]?.data;
    if (!commentData || !commentData.id) {
      console.error(
        "❌ [SUBMIT-COMMENT] Invalid response structure after submitting comment:",
        commentData
      );
      return {
        isSuccess: false,
        message: "Failed to submit comment: Invalid API response structure"
      };
    }

    console.log(
      `✅ [SUBMIT-COMMENT] Comment submitted successfully: ${commentData.id}`
    );
    return {
      isSuccess: true,
      message: "Comment submitted successfully",
      data: { id: commentData.id, parentId: parentId } // parentId is what we sent
    };
  } catch (error) {
    console.error("❌ [SUBMIT-COMMENT] Error submitting comment:", error);
    return {
      isSuccess: false,
      message: `Failed to submit comment: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

export async function getRedditUserInfoAction(
    organizationId: string
): Promise<ActionState<{ name: string; karma: number }>> {
  console.log(`ℹ️ [GET-REDDIT-USER-INFO] Fetching user info for org: ${organizationId}`);
  if (!organizationId) {
    return { isSuccess: false, message: "Organization ID is required" };
  }
  try {
    const response = await makeRedditApiGet(organizationId, "/api/v1/me");
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`❌ [GET-REDDIT-USER-INFO] API call failed: ${response.status}`, errorBody);
        return { isSuccess: false, message: `Failed to fetch Reddit user info: ${response.status} - ${errorBody}` };
    }
    const data = await response.json();
    
    console.log("ℹ️ [GET-REDDIT-USER-INFO] Raw data from /api/v1/me:", data);

    if (!data || !data.name) {
      return { isSuccess: false, message: "Invalid user info structure from Reddit" };
    }

    return {
      isSuccess: true,
      message: "Reddit user info retrieved successfully",
      data: { name: data.name, karma: data.total_karma || data.link_karma + data.comment_karma || 0 }
    };
  } catch (error) {
    console.error("❌ [GET-REDDIT-USER-INFO] Error fetching user info:", error);
    return {
      isSuccess: false,
      message: `Failed to fetch user info: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

