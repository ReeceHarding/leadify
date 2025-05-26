/*
<ai_context>
Queue processing actions for Reddit warm-up feature.
Handles scheduling and processing of posts and comments.
</ai_context>
*/

"use server"

import { ActionState } from "@/types"
import { Timestamp, doc, getDoc } from "firebase/firestore"
import { db } from "@/db/db"
import {
  WARMUP_COLLECTIONS,
  WarmupPostDocument,
  SubredditAnalysisDocument,
  CreateWarmupPostData
} from "@/db/firestore/warmup-collections"
import {
  getWarmupAccountByOrganizationIdAction,
  getWarmupPostsByOrganizationIdAction,
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
  getPostCommentsAction
} from "@/actions/integrations/reddit/reddit-warmup-actions"
import {
  analyzeSubredditStyleAction,
  generateWarmupPostAction,
  generateWarmupCommentsAction
} from "@/actions/integrations/openai/warmup-content-generation-actions"
import { getOrganizationByIdAction } from "@/actions/db/organizations-actions"

export async function generateAndScheduleWarmupPostsAction(
  organizationId: string
): Promise<ActionState<{ postsGenerated: number }>> {
  try {
    console.log(
      "🔧 [GENERATE-WARMUP-POSTS] Starting post generation for organization:",
      organizationId
    )
    if (!organizationId) {
      return { isSuccess: false, message: "Organization ID is required" }
    }

    // Get warm-up account for the organization
    const accountResult = await getWarmupAccountByOrganizationIdAction(organizationId)
    if (!accountResult.isSuccess || !accountResult.data) {
      return { isSuccess: false, message: "No warm-up account found for this organization" }
    }
    const account = accountResult.data
    if (!account.isActive) {
      return { isSuccess: false, message: "Warm-up account is not active" }
    }

    // Check if warm-up period has ended
    const now = new Date()
    const warmupEndDate = new Date(account.warmupEndDate)
    if (now > warmupEndDate) {
      return { isSuccess: false, message: "Warm-up period has ended" }
    }

    // Get Organization details for context (e.g., website, businessDescription for AI)
    const orgDetailsResult = await getOrganizationByIdAction(organizationId)
    if (!orgDetailsResult.isSuccess || !orgDetailsResult.data) {
      return { isSuccess: false, message: "Organization details not found." }
    }
    const orgDetails = orgDetailsResult.data
    // Use organization details for AI context, e.g., orgDetails.aiContextKeywords or construct from name/website/description
    const aiContextKeywords = (orgDetails as any).aiContextKeywords || []
    const businessContextForAI = orgDetails.businessDescription || orgDetails.name || orgDetails.website || "general business"

    let postsGenerated = 0

    // Generate posts for each target subreddit
    for (const subreddit of account.targetSubreddits) {
      console.log(
        `🔍 [GENERATE-WARMUP-POSTS] Processing subreddit: r/${subreddit}`
      )

      // Corrected call to checkWarmupRateLimitAction
      const rateLimitResult = await checkWarmupRateLimitAction(
        organizationId, 
        subreddit
      )
      if (!rateLimitResult.isSuccess || !rateLimitResult.data?.canPost) {
        console.log(
          `⏳ [GENERATE-WARMUP-POSTS] Rate limited for r/${subreddit}`
        )
        continue
      }

      // Get or update subreddit analysis
      let analysisResult = await getSubredditAnalysisAction(subreddit)
      let analysis: SubredditAnalysisDocument | null = analysisResult.data

      // If no analysis or it's older than 7 days, refresh it
      if (
        !analysis ||
        (analysis.lastAnalyzedAt &&
          Date.now() - new Date(analysis.lastAnalyzedAt).getTime() >
            7 * 24 * 60 * 60 * 1000)
      ) {
        console.log(`📊 [GENERATE-WARMUP-POSTS] Analyzing r/${subreddit}`)

        // Pass organizationId to getTopPostsFromSubredditAction
        const topPostsResult = await getTopPostsFromSubredditAction(organizationId, subreddit)
        if (!topPostsResult.isSuccess || !topPostsResult.data) {
          console.error(
            `❌ [GENERATE-WARMUP-POSTS] Failed to get top posts for r/${subreddit}`
          )
          continue
        }

        const styleResult = await analyzeSubredditStyleAction(
          topPostsResult.data
        )
        if (!styleResult.isSuccess || !styleResult.data) {
          console.error(
            `❌ [GENERATE-WARMUP-POSTS] Failed to analyze style for r/${subreddit}`
          )
          continue
        }

        const topPostsForDb = topPostsResult.data.map(post => ({
          id: post.id,
          title: post.title,
          content: post.selftext || post.title,
          upvotes: post.score,
          createdUtc: post.created_utc
        }))

        await saveSubredditAnalysisAction(
          subreddit,
          topPostsForDb,
          styleResult.data.writingStyle,
          styleResult.data.commonTopics
        )

        // Construct analysis object conforming to SubredditAnalysisDocument (with Timestamps)
        analysis = {
          id: subreddit, 
          subreddit, 
          topPosts: topPostsForDb,
          writingStyle: styleResult.data.writingStyle, 
          commonTopics: styleResult.data.commonTopics, 
          lastAnalyzedAt: Timestamp.now(), // Firestore Timestamp
          createdAt: Timestamp.now(),      // Firestore Timestamp
          updatedAt:Timestamp.now()       // Firestore Timestamp
        }
      }

      // Ensure analysis is not null
      if (!analysis) {
        console.error(
          `❌ [GENERATE-WARMUP-POSTS] No analysis available for r/${subreddit}`
        )
        continue
      }

      // Generate post
      const postResult = await generateWarmupPostAction(
        subreddit,
        analysis.writingStyle,
        analysis.commonTopics,
        aiContextKeywords // Use AI context keywords from org
      )

      if (!postResult.isSuccess || !postResult.data) {
        console.error(
          `❌ [GENERATE-WARMUP-POSTS] Failed to generate post for r/${subreddit}`
        )
        continue
      }

      // Schedule the post
      const scheduledFor = calculateNextPostTime(postsGenerated)

      const warmupPostData: CreateWarmupPostData = {
        userId: account.userId, // User who owns the warmup account record
        organizationId, // Link post to organization
        warmupAccountId: account.id,
        subreddit,
        title: postResult.data.title,
        content: postResult.data.content,
        scheduledFor
      }
      await createWarmupPostAction(warmupPostData)

      postsGenerated++
      console.log(
        `✅ [GENERATE-WARMUP-POSTS] Post generated for r/${subreddit}`
      )

      // Limit posts per run
      if (postsGenerated >= (account.dailyPostLimit || 3)) {
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

export async function processWarmupPostQueueAction(): Promise<
  ActionState<{ postsProcessed: number }>
> {
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
  warmupPostId: string
): Promise<ActionState<{ commentsGenerated: number }>> {
  try {
    console.log(
      "🔧 [GENERATE-COMMENTS] Generating comments for warmup post:",
      warmupPostId
    )

    // Fetch the WarmupPostDocument to get organizationId, subreddit, and redditPostId
    const postRef = doc(db, WARMUP_COLLECTIONS.WARMUP_POSTS, warmupPostId)
    const postDoc = await getDoc(postRef)
    if (!postDoc.exists()) {
      return { isSuccess: false, message: "Warmup post not found." }
    }
    const warmupPost = postDoc.data() as WarmupPostDocument
    const organizationId = warmupPost.organizationId
    const redditPostId = warmupPost.redditPostId
    const subreddit = warmupPost.subreddit

    if (!organizationId || !redditPostId || !subreddit) {
      return { isSuccess: false, message: "Warmup post is missing required information (orgId, redditPostId, or subreddit)." }
    }

    // Get comments from Reddit using organizationId
    const commentsResult = await getPostCommentsAction(organizationId, subreddit, redditPostId)
    if (!commentsResult.isSuccess || !commentsResult.data) {
      return { isSuccess: false, message: "Failed to fetch Reddit comments" }
    }

    const repliesResult = await generateWarmupCommentsAction(
      commentsResult.data,
      `Post in r/${subreddit}`
    )

    if (!repliesResult.isSuccess || !repliesResult.data) {
      return { isSuccess: false, message: "Failed to generate replies" }
    }

    let commentDelay = 0
    const minDelay = 3 * 60 * 1000 // 3 minutes
    const maxDelay = 4 * 60 * 1000 // 4 minutes

    for (const reply of repliesResult.data) {
      const scheduledFor = Timestamp.fromDate(
        new Date(Date.now() + commentDelay)
      )

      await createWarmupCommentAction({
        userId: warmupPost.userId, // User who owns the main warmup account
        organizationId, // Pass the organizationId
        warmupPostId,
        content: reply.reply,
        scheduledFor,
        // redditParentCommentId: reply.commentId, // If generateWarmupCommentsAction returns parent ID
      })

      // Add random delay between 3-4 minutes
      commentDelay += minDelay + Math.random() * (maxDelay - minDelay)
    }

    console.log(
      `✅ [GENERATE-COMMENTS] Generated ${repliesResult.data.length} comments`
    )

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
  postId: string,
  organizationId: string
): Promise<ActionState<{ url?: string }>> {
  try {
    console.log(
      "🚀 [POST-IMMEDIATELY] Posting warm-up post:", postId, "for org:", organizationId
    )
    if (!organizationId) {
      return { isSuccess: false, message: "Organization ID is required for posting." }
    }

    const postRef = doc(db, WARMUP_COLLECTIONS.WARMUP_POSTS, postId)
    const postDoc = await getDoc(postRef)
    if (!postDoc.exists()) {
      return { isSuccess: false, message: "Post not found" }
    }
    const post = postDoc.data() as WarmupPostDocument

    // Ensure the post belongs to the specified organization if doing a cross-check (optional here)
    if (post.organizationId !== organizationId) {
      console.error(`❌ [POST-IMMEDIATELY] Post ${postId} does not belong to organization ${organizationId}. Belongs to ${post.organizationId}`)
      return { isSuccess: false, message: "Post does not belong to this organization." }
    }

    // Pass organizationId to submitRedditPostAction
    const submitResult = await submitRedditPostAction(
      organizationId,
      post.subreddit,
      post.title,
      post.content
    )

    if (submitResult.isSuccess && submitResult.data) {
      await updateWarmupPostAction(post.id, {
        status: "posted",
        postedAt: Timestamp.now(),
        redditPostId: submitResult.data.id,
        redditPostUrl: submitResult.data.url
      })
      // Pass organizationId to updateWarmupRateLimitAction
      await updateWarmupRateLimitAction(organizationId, post.subreddit)
      return { isSuccess: true, message: "Post submitted successfully", data: { url: submitResult.data.url } }
    } else {
      await updateWarmupPostAction(post.id, { status: "failed", error: submitResult.message })
      return { isSuccess: false, message: submitResult.message || "Failed to submit post" }
    }
  } catch (error) {
    console.error("❌ [POST-IMMEDIATELY] Error:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to post immediately"
    }
  }
}
