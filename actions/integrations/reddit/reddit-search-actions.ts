"use server"

import { ActionState, SearchOptions, RedditPost } from "@/types"
import { getCurrentOrganizationTokens } from "./reddit-auth-helpers"

export async function searchRedditAction(
  organizationId: string,
  query: string,
  options: SearchOptions = {}
): Promise<ActionState<RedditPost[]>> {
  try {
    console.log("🔍 [REDDIT-SEARCH] Starting search")
    console.log("🔍 [REDDIT-SEARCH] Organization ID:", organizationId)
    console.log("🔍 [REDDIT-SEARCH] Query:", query)
    console.log("🔍 [REDDIT-SEARCH] Options:", options)

    // Get the organization's Reddit tokens
    const tokensResult = await getCurrentOrganizationTokens(organizationId)
    if (!tokensResult.isSuccess || !tokensResult.data) {
      console.error("❌ [REDDIT-SEARCH] Failed to get Reddit tokens")
      return { isSuccess: false, message: "Reddit authentication required for this organization" }
    }

    const { accessToken } = tokensResult.data
    console.log("✅ [REDDIT-SEARCH] Got access token")

    // Build search parameters
    const params = new URLSearchParams({
      q: query,
      sort: options.sort || "relevance",
      t: options.time || "all",
      limit: (options.limit || 25).toString(),
      restrict_sr: options.subreddit ? "true" : "false",
      type: "link", // Only search for posts, not comments
      raw_json: "1" // Get unescaped content
    })

    // Build the URL
    const baseUrl = options.subreddit
      ? `https://oauth.reddit.com/r/${options.subreddit}/search`
      : "https://oauth.reddit.com/search"
    const url = `${baseUrl}?${params}`

    console.log("🔍 [REDDIT-SEARCH] Request URL:", url)

    // Make the request
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "Leadify/1.0"
      }
    })

    if (!response.ok) {
      console.error(
        "❌ [REDDIT-SEARCH] API error:",
        response.status,
        response.statusText
      )
      const errorText = await response.text()
      console.error("❌ [REDDIT-SEARCH] Error details:", errorText)
      return {
        isSuccess: false,
        message: `Reddit API error: ${response.status} ${response.statusText}`
      }
    }

    const data = await response.json()
    console.log(
      "✅ [REDDIT-SEARCH] Got response with",
      data.data.children.length,
      "posts"
    )

    // Transform the posts
    const posts: RedditPost[] = data.data.children.map((child: any) => ({
      id: child.data.id,
      title: child.data.title,
      selftext: child.data.selftext || "",
      author: child.data.author,
      subreddit: child.data.subreddit,
      url: child.data.url,
      permalink: `https://reddit.com${child.data.permalink}`,
      score: child.data.score,
      num_comments: child.data.num_comments,
      created_utc: child.data.created_utc,
      link_flair_text: child.data.link_flair_text,
      over_18: child.data.over_18 || false,
      spoiler: child.data.spoiler || false,
      locked: child.data.locked || false,
      stickied: child.data.stickied || false,
      is_self: child.data.is_self || true,
      domain: child.data.domain,
      thumbnail: child.data.thumbnail,
      preview: child.data.preview
    }))

    console.log("✅ [REDDIT-SEARCH] Search completed successfully")
    console.log("🔍 [REDDIT-SEARCH] Sample post:", posts[0])

    return {
      isSuccess: true,
      message: "Search completed successfully",
      data: posts
    }
  } catch (error) {
    console.error("❌ [REDDIT-SEARCH] Error:", error)
    return {
      isSuccess: false,
      message:
        error instanceof Error ? error.message : "Failed to search Reddit"
    }
  }
}

export async function searchRedditUsersAction(
  organizationId: string,
  keyword: string,
  options: {
    subreddit?: string
    sort?: "relevance" | "hot" | "top" | "new" | "comments"
    time?: "hour" | "day" | "week" | "month" | "year" | "all"
    limit?: number
  } = {}
): Promise<ActionState<RedditPost[]>> {
  console.log("🔍 [SEARCH-REDDIT-USERS] Searching for users with keyword:", keyword)
  console.log("🔍 [SEARCH-REDDIT-USERS] Options:", options)
  
  try {
    // Use the existing searchRedditAction but focus on getting unique users
    const searchResult = await searchRedditAction(organizationId, keyword, options)
    
    if (!searchResult.isSuccess) {
      return searchResult
    }
    
    // Filter out deleted/removed posts and ensure we have author info
    const validPosts = searchResult.data.filter(post => 
      post.author && 
      post.author !== "[deleted]" && 
      post.author !== "[removed]" &&
      post.author !== "AutoModerator"
    )
    
    console.log("🔍 [SEARCH-REDDIT-USERS] Found", validPosts.length, "posts with valid authors")
    
    return {
      isSuccess: true,
      message: `Found ${validPosts.length} posts from users`,
      data: validPosts
    }
  } catch (error) {
    console.error("🔍 [SEARCH-REDDIT-USERS] ❌ Error:", error)
    return {
      isSuccess: false,
      message: `Failed to search Reddit users: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}
