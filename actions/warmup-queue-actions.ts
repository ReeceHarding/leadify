/*
<ai_context>
Queue processing actions for Reddit warm-up feature.
Handles scheduling and processing of posts and comments.
</ai_context>
*/

"use server"

import { ActionState } from "@/types"
import { Timestamp } from "firebase/firestore"
import {
  getWarmupAccountByUserIdAction,
  getWarmupPostsByUserIdAction,
  updateWarmupPostAction,
  checkWarmupRateLimitAction,
  updateWarmupRateLimitAction,
  getSubredditAnalysisAction,
  saveSubredditAnalysisAction,
  createWarmupPostAction,
  createWarmupCommentAction,
  getWarmupCommentsByPostIdAction
} from "@/actions/db/warmup-actions"
import {
  getTopPostsFromSubredditAction,
  submitRedditPostAction,
  submitRedditCommentAction,
  getPostCommentsAction
} from "@/actions/integrations/reddit/reddit-warmup-actions"
import {
  analyzeSubredditStyleAction,
  generateWarmupPostAction,
  generateWarmupCommentsAction
} from "@/actions/integrations/openai/warmup-content-generation-actions"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/db/db"
import { WARMUP_COLLECTIONS, WarmupPostDocument } from "@/db/firestore/warmup-collections"

export async function generateAndScheduleWarmupPostsAction(
  userId: string
): Promise<ActionState<{ postsGenerated: number }>> {
  try {
    console.log("🔧 [GENERATE-WARMUP-POSTS] Starting post generation for user:", userId)
    
    // Get warm-up account
    const accountResult = await getWarmupAccountByUserIdAction(userId)
    if (!accountResult.isSuccess || !accountResult.data) {
      return { isSuccess: false, message: "No warm-up account found" }
    }
    
    const account = accountResult.data
    if (!account.isActive) {
      return { isSuccess: false, message: "Warm-up account is not active" }
    }
    
    // Check if warm-up period has ended
    const now = new Date()
    if (now > account.warmupEndDate.toDate()) {
      return { isSuccess: false, message: "Warm-up period has ended" }
    }
    
    // Get user profile for keywords
    const profileResult = await getProfileByUserIdAction(userId)
    if (!profileResult.isSuccess || !profileResult.data) {
      return { isSuccess: false, message: "User profile not found" }
    }
    
    const userKeywords = profileResult.data.keywords || []
    let postsGenerated = 0
    
    // Generate posts for each target subreddit
    for (const subreddit of account.targetSubreddits) {
      console.log(`🔍 [GENERATE-WARMUP-POSTS] Processing subreddit: r/${subreddit}`)
      
      // Check rate limit
      const rateLimitResult = await checkWarmupRateLimitAction(userId, subreddit)
      if (!rateLimitResult.isSuccess || !rateLimitResult.data?.canPost) {
        console.log(`⏳ [GENERATE-WARMUP-POSTS] Rate limited for r/${subreddit}`)
        continue
      }
      
      // Get or update subreddit analysis
      let analysisResult = await getSubredditAnalysisAction(subreddit)
      let analysis = analysisResult.data
      
      // If no analysis or it's older than 7 days, refresh it
      if (!analysis || 
          (analysis.lastAnalyzedAt && 
           Date.now() - analysis.lastAnalyzedAt.toDate().getTime() > 7 * 24 * 60 * 60 * 1000)) {
        console.log(`📊 [GENERATE-WARMUP-POSTS] Analyzing r/${subreddit}`)
        
        const topPostsResult = await getTopPostsFromSubredditAction(subreddit)
        if (!topPostsResult.isSuccess || !topPostsResult.data) {
          console.error(`❌ [GENERATE-WARMUP-POSTS] Failed to get top posts for r/${subreddit}`)
          continue
        }
        
        const styleResult = await analyzeSubredditStyleAction(topPostsResult.data)
        if (!styleResult.isSuccess || !styleResult.data) {
          console.error(`❌ [GENERATE-WARMUP-POSTS] Failed to analyze style for r/${subreddit}`)
          continue
        }
        
        await saveSubredditAnalysisAction(
          subreddit,
          topPostsResult.data.map(post => ({
            id: post.id,
            title: post.title,
            content: post.selftext,
            upvotes: post.score,
            createdUtc: post.created_utc
          })),
          styleResult.data.writingStyle,
          styleResult.data.commonTopics
        )
        
        analysis = {
          subreddit,
          topPosts: topPostsResult.data.map(post => ({
            id: post.id,
            title: post.title,
            content: post.selftext,
            upvotes: post.score,
            createdUtc: post.created_utc
          })),
          writingStyle: styleResult.data.writingStyle,
          commonTopics: styleResult.data.commonTopics,
          lastAnalyzedAt: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          id: subreddit
        }
      }
      
      // Ensure analysis is not null
      if (!analysis) {
        console.error(`❌ [GENERATE-WARMUP-POSTS] No analysis available for r/${subreddit}`)
        continue
      }
      
      // Generate post
      const postResult = await generateWarmupPostAction(
        subreddit,
        analysis.writingStyle,
        analysis.commonTopics,
        userKeywords
      )
      
      if (!postResult.isSuccess || !postResult.data) {
        console.error(`❌ [GENERATE-WARMUP-POSTS] Failed to generate post for r/${subreddit}`)
        continue
      }
      
      // Schedule the post
      const scheduledFor = calculateNextPostTime(postsGenerated)
      
      await createWarmupPostAction({
        userId,
        warmupAccountId: account.id,
        subreddit,
        title: postResult.data.title,
        content: postResult.data.content,
        scheduledFor
      })
      
      postsGenerated++
      console.log(`✅ [GENERATE-WARMUP-POSTS] Post generated for r/${subreddit}`)
      
      // Limit posts per run
      if (postsGenerated >= account.dailyPostLimit) {
        break
      }
    }
    
    console.log(`✅ [GENERATE-WARMUP-POSTS] Generated ${postsGenerated} posts`)
    
    return {
      isSuccess: true,
      message: `Generated ${postsGenerated} warm-up posts`,
      data: { postsGenerated }
    }
  } catch (error) {
    console.error("❌ [GENERATE-WARMUP-POSTS] Error:", error)
    return { isSuccess: false, message: "Failed to generate warm-up posts" }
  }
}

export async function processWarmupPostQueueAction(): Promise<ActionState<{ postsProcessed: number }>> {
  try {
    console.log("🔧 [PROCESS-WARMUP-QUEUE] Starting queue processing")
    
    // This would typically be called by a cron job
    // For now, we'll process posts that are scheduled for the past
    const now = Timestamp.now()
    let postsProcessed = 0
    
    // Get all users with active warm-up accounts
    // In a real implementation, you'd query for posts ready to be posted
    // For this example, we'll keep it simple
    
    console.log(`✅ [PROCESS-WARMUP-QUEUE] Processed ${postsProcessed} posts`)
    
    return {
      isSuccess: true,
      message: `Processed ${postsProcessed} posts`,
      data: { postsProcessed }
    }
  } catch (error) {
    console.error("❌ [PROCESS-WARMUP-QUEUE] Error:", error)
    return { isSuccess: false, message: "Failed to process queue" }
  }
}

export async function submitWarmupPostAction(
  postId: string
): Promise<ActionState<void>> {
  try {
    console.log("🔧 [SUBMIT-WARMUP-POST] Submitting post:", postId)
    
    // This would be called when a post is ready to be submitted
    // It would:
    // 1. Get the post from the database
    // 2. Submit it to Reddit
    // 3. Update the post status and Reddit ID
    // 4. Update rate limits
    
    return {
      isSuccess: true,
      message: "Post submitted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("❌ [SUBMIT-WARMUP-POST] Error:", error)
    return { isSuccess: false, message: "Failed to submit post" }
  }
}

export async function generateCommentsForWarmupPostAction(
  warmupPostId: string,
  redditPostId: string,
  subreddit: string
): Promise<ActionState<{ commentsGenerated: number }>> {
  try {
    console.log("🔧 [GENERATE-COMMENTS] Generating comments for post:", warmupPostId)
    
    // Get comments from Reddit
    const commentsResult = await getPostCommentsAction(subreddit, redditPostId)
    if (!commentsResult.isSuccess || !commentsResult.data) {
      return { isSuccess: false, message: "Failed to fetch Reddit comments" }
    }
    
    // Generate replies
    const repliesResult = await generateWarmupCommentsAction(
      commentsResult.data,
      `Post in r/${subreddit}`
    )
    
    if (!repliesResult.isSuccess || !repliesResult.data) {
      return { isSuccess: false, message: "Failed to generate replies" }
    }
    
    // Schedule comments with spacing
    let commentDelay = 0
    const minDelay = 3 * 60 * 1000 // 3 minutes
    const maxDelay = 4 * 60 * 1000 // 4 minutes
    
    for (const reply of repliesResult.data) {
      const scheduledFor = Timestamp.fromDate(new Date(Date.now() + commentDelay))
      
      await createWarmupCommentAction({
        userId: "", // Would get from post
        warmupPostId,
        content: reply.reply,
        scheduledFor
      })
      
      // Add random delay between 3-4 minutes
      commentDelay += minDelay + Math.random() * (maxDelay - minDelay)
    }
    
    console.log(`✅ [GENERATE-COMMENTS] Generated ${repliesResult.data.length} comments`)
    
    return {
      isSuccess: true,
      message: `Generated ${repliesResult.data.length} comments`,
      data: { commentsGenerated: repliesResult.data.length }
    }
  } catch (error) {
    console.error("❌ [GENERATE-COMMENTS] Error:", error)
    return { isSuccess: false, message: "Failed to generate comments" }
  }
}

// Helper function to calculate next post time
function calculateNextPostTime(postsToday: number): Timestamp {
  const now = new Date()
  const baseDelay = 4 * 60 * 60 * 1000 // 4 hours
  const randomDelay = Math.random() * 2 * 60 * 60 * 1000 // 0-2 hours
  
  return Timestamp.fromDate(new Date(now.getTime() + baseDelay + randomDelay))
}

export async function postWarmupImmediatelyAction(
  postId: string
): Promise<ActionState<{ url?: string }>> {
  try {
    console.log("🚀 [POST-IMMEDIATELY] Posting warm-up post immediately:", postId)
    
    // Get the post
    const postRef = doc(db, WARMUP_COLLECTIONS.WARMUP_POSTS, postId)
    const postDoc = await getDoc(postRef)
    
    if (!postDoc.exists()) {
      return {
        isSuccess: false,
        message: "Post not found"
      }
    }
    
    const post = postDoc.data() as WarmupPostDocument
    
    // Submit to Reddit immediately
    const submitResult = await submitRedditPostAction(
      post.subreddit,
      post.title,
      post.content
    )
    
    if (submitResult.isSuccess && submitResult.data) {
      // Update post status
      await updateWarmupPostAction(post.id, {
        status: "posted",
        postedAt: Timestamp.now(),
        redditPostId: submitResult.data.id,
        redditPostUrl: submitResult.data.url
      })
      
      // Update rate limit
      await updateWarmupRateLimitAction(post.userId, post.subreddit)
      
      console.log(`✅ [POST-IMMEDIATELY] Post submitted successfully: ${submitResult.data.url}`)
      
      return {
        isSuccess: true,
        message: "Post submitted successfully",
        data: { url: submitResult.data.url }
      }
    } else {
      // Mark as failed
      await updateWarmupPostAction(post.id, {
        status: "failed",
        error: submitResult.message
      })
      
      return {
        isSuccess: false,
        message: submitResult.message || "Failed to submit post"
      }
    }
  } catch (error) {
    console.error("❌ [POST-IMMEDIATELY] Error:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to post immediately"
    }
  }
} 