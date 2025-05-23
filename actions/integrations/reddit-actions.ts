/*
<ai_context>
Contains server actions for Reddit API integration using snoowrap to fetch thread content.
</ai_context>
*/

"use server"

import Snoowrap from "snoowrap"
import { ActionState } from "@/types"

// Lazy initialization of Reddit client
let redditClient: Snoowrap | null = null

async function getRedditClient(): Promise<Snoowrap> {
  if (!redditClient) {
    if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET || !process.env.REDDIT_USER_AGENT) {
      throw new Error("Reddit API credentials not configured")
    }

    // Use Application-Only authentication for read-only access
    redditClient = await Snoowrap.fromApplicationOnlyAuth({
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET,
      userAgent: process.env.REDDIT_USER_AGENT,
      grantType: 'client_credentials'
    })
    
    // Configure rate limiting to be respectful
    redditClient.config({
      requestDelay: 1000, // 1 second between requests
      warnings: true
    })
  }
  
  return redditClient
}

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

export async function fetchRedditThreadAction(
  threadId: string,
  subreddit?: string
): Promise<ActionState<RedditThreadData>> {
  try {
    const reddit = await getRedditClient()
    
    console.log(`📖 Fetching Reddit thread: ${threadId} from r/${subreddit || 'unknown'}`)
    
    // Fetch the submission with proper typing
    const submission = await (reddit.getSubmission(threadId) as any).fetch()
    
    const threadData: RedditThreadData = {
      id: submission.id,
      title: submission.title,
      content: submission.selftext || submission.title, // Use selftext or fall back to title
      author: submission.author?.name || '[deleted]',
      subreddit: submission.subreddit?.display_name || 'unknown',
      score: submission.score || 0,
      numComments: submission.num_comments || 0,
      url: `https://reddit.com${submission.permalink}`,
      created: submission.created_utc || 0,
      selfText: submission.selftext,
      isVideo: submission.is_video || false,
      isImage: submission.post_hint === 'image',
      domain: submission.domain || ''
    }
    
    console.log(`✅ Reddit thread fetched: "${threadData.title}" (${threadData.content.length} chars)`)
    
    return {
      isSuccess: true,
      message: "Reddit thread fetched successfully",
      data: threadData
    }
  } catch (error) {
    console.error("Error fetching Reddit thread:", error)
    
    // Handle specific Reddit API errors
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        return { 
          isSuccess: false, 
          message: `Reddit thread not found: ${threadId}` 
        }
      }
      if (error.message.includes('403')) {
        return { 
          isSuccess: false, 
          message: `Access denied to Reddit thread: ${threadId}` 
        }
      }
      if (error.message.includes('429')) {
        return { 
          isSuccess: false, 
          message: "Reddit API rate limit exceeded, please try again later" 
        }
      }
    }
    
    return { 
      isSuccess: false, 
      message: `Failed to fetch Reddit thread: ${error instanceof Error ? error.message : 'Unknown error'}` 
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
      message: `Failed to fetch multiple Reddit threads: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

export async function testRedditConnectionAction(): Promise<ActionState<{ status: string }>> {
  try {
    if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET || !process.env.REDDIT_USER_AGENT) {
      return { 
        isSuccess: false, 
        message: "Reddit API credentials not configured" 
      }
    }

    const reddit = await getRedditClient()
    
    // Test by fetching a well-known subreddit with proper typing
    const testSubreddit = await (reddit.getSubreddit('test') as any).fetch()
    
    return {
      isSuccess: true,
      message: "Reddit API connection test successful",
      data: { status: "connected" }
    }
  } catch (error) {
    console.error("Error testing Reddit connection:", error)
    return { 
      isSuccess: false, 
      message: `Reddit connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

export async function getSubredditInfoAction(
  subredditName: string
): Promise<ActionState<{ name: string; description: string; subscribers: number }>> {
  try {
    const reddit = await getRedditClient()
    
    const subreddit = await (reddit.getSubreddit(subredditName) as any).fetch()
    
    return {
      isSuccess: true,
      message: "Subreddit info retrieved successfully",
      data: {
        name: subreddit.display_name || subredditName,
        description: subreddit.public_description || '',
        subscribers: subreddit.subscribers || 0
      }
    }
  } catch (error) {
    console.error("Error getting subreddit info:", error)
    return { 
      isSuccess: false, 
      message: `Failed to get subreddit info: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
} 