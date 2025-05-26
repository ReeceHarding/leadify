/*
<ai_context>
Queue processing actions for Reddit warm-up feature.
Handles scheduling and processing of posts and comments.
</ai_context>
*/

"use server"

import { ActionState } from "@/types"
import { Timestamp, doc, getDoc, collection, query, where, getDocs, limit, orderBy } from "firebase/firestore"
import { db } from "@/db/db"
import {
  WARMUP_COLLECTIONS,
  WarmupPostDocument,
  SubredditAnalysisDocument,
  CreateWarmupPostData,
  CreateWarmupCommentData,
  WarmupAccountDocument,
  WarmupCommentDocument
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
  getWarmupCommentsByPostIdAction,
  updateWarmupAccountAction,
  getWarmupAccountsByStatusAction,
  getQueuedWarmupPostsByAccountIdAction,
  getQueuedWarmupCommentsByWarmupPostIdAction,
  updateWarmupCommentAction
} from "@/actions/db/warmup-actions"
import {
  getTopPostsFromSubredditAction,
  submitRedditPostAction,
  getPostCommentsAction,
  submitRedditCommentAction
} from "@/actions/integrations/reddit/reddit-warmup-actions"
import {
  analyzeSubredditStyleAction,
  generateWarmupPostAction,
  generateWarmupCommentsAction
} from "@/actions/integrations/openai/warmup-content-generation-actions"
import { getOrganizationByIdAction } from "@/actions/db/organizations-actions"
import { getCurrentOrganizationTokens } from "@/actions/integrations/reddit/reddit-auth-helpers"

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
      let analysis: SubredditAnalysisDocument | null = null
      if (analysisResult.isSuccess) {
        analysis = analysisResult.data as (SubredditAnalysisDocument | null)
      }

      // Check if analysis needs refresh
      let needsRefresh = !analysis
      if (analysis && analysis.lastAnalyzedAt) {
        const lastAnalyzedMillis = (analysis.lastAnalyzedAt as Timestamp).toMillis()
        if ((Timestamp.now().toMillis() - lastAnalyzedMillis) > 7 * 24 * 60 * 60 * 1000) {
          needsRefresh = true
        }
      }

      if (needsRefresh) {
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
          `❌ [GENERATE-WARMUP-POSTS] No analysis available for r/${subreddit} after attempting refresh.`
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
  ActionState<{ postsProcessed: number; commentsProcessed: number; errors: number }>
> {
  console.log("🔧 [PROCESS-WARMUP-QUEUE] Starting organization-aware queue processing");
  let postsProcessed = 0;
  let commentsProcessed = 0;
  let errorCount = 0;
  const now = Timestamp.now();

  try {
    const accountsResult = await getWarmupAccountsByStatusAction("active");
    if (!accountsResult.isSuccess || !accountsResult.data) {
      console.error("❌ [PROCESS-WARMUP-QUEUE] Could not fetch active warmup accounts:", accountsResult.message);
      return { isSuccess: false, message: "Could not fetch active warmup accounts" };
    }
    const activeWarmupAccounts = accountsResult.data;
    console.log(`Found ${activeWarmupAccounts.length} active warmup accounts to process.`);

    for (const account of activeWarmupAccounts) {
      const organizationId = account.organizationId;
      console.log(`Processing account ${account.id} for organization ${organizationId}`);

      const tokenCheck = await getCurrentOrganizationTokens(organizationId);
      if (!tokenCheck.isSuccess || !tokenCheck.data.accessToken) {
        console.warn(`Skipping account ${account.id}: Reddit not connected for organization ${organizationId}`);
        await updateWarmupAccountAction(account.id, { status: "paused", error: "Reddit connection issue", lastActivityAt: Timestamp.now() });
        errorCount++;
        continue;
      }
      if (tokenCheck.data.username !== account.redditUsername) {
          console.warn(`Reddit username mismatch for account ${account.id}. Expected ${account.redditUsername}, got ${tokenCheck.data.username}. Pausing.`);
          await updateWarmupAccountAction(account.id, { status: "paused", error: "Reddit username mismatch" });
          errorCount++;
          continue;
      }
      
      if (new Date(account.warmupEndDate).getTime() < now.toMillis()) {
        console.log(`Warmup period ended for account ${account.id}. Setting to completed.`);
        await updateWarmupAccountAction(account.id, { status: "completed", isActive: false });
        continue;
      }

      const today = new Date().toISOString().split('T')[0];
      const lastActivityDate = account.lastActivityAt ? new Date(account.lastActivityAt).toISOString().split('T')[0] : null;
      let postsToday = account.postsToday || 0;
      let commentsToday = account.commentsToday || 0;
      if (lastActivityDate !== today) {
        postsToday = 0;
        commentsToday = 0;
      }

      // 1. Process Posts
      let postsAttemptedThisCycle = 0;
      if (postsToday < (account.dailyPostLimit || 3)) {
        const queuedPostsResult = await getQueuedWarmupPostsByAccountIdAction(account.id);
        if (queuedPostsResult.isSuccess && queuedPostsResult.data) {
          const duePosts = queuedPostsResult.data.filter(p => p.scheduledFor && new Date(p.scheduledFor).getTime() <= now.toMillis());
          
          for (const post of duePosts) {
            if (postsToday >= (account.dailyPostLimit || 3) || postsAttemptedThisCycle >= (account.dailyPostLimit || 3) ) break;
            postsAttemptedThisCycle++;

            const rateLimitResult = await checkWarmupRateLimitAction(organizationId, post.subreddit);
            if (rateLimitResult.isSuccess && rateLimitResult.data?.canPost) {
              console.log(`Attempting to post: ${post.title} to r/${post.subreddit} for org ${organizationId}`);
              const submitResult = await submitRedditPostAction(organizationId, post.subreddit, post.title, post.content);
              if (submitResult.isSuccess && submitResult.data) {
                await updateWarmupPostAction(post.id, {
                  status: "posted", redditPostId: submitResult.data.id,
                  redditPostUrl: submitResult.data.url, postedAt: Timestamp.now()
                });
                await updateWarmupRateLimitAction(organizationId, post.subreddit);
                postsToday++; postsProcessed++;
              } else {
                await updateWarmupPostAction(post.id, { status: "failed", error: submitResult.message });
                errorCount++; console.error(`Failed to post ${post.id}: ${submitResult.message}`);
              }
            } else {
              console.log(`Rate limited for r/${post.subreddit}, skipping post ${post.id}. Next attempt: ${rateLimitResult.data?.nextPostTime}`);
            }
          }
        }
      }
      
      // 2. Process Comments
      let commentsAttemptedThisCycle = 0;
      const dailyCommentLimit = account.dailyCommentLimit ? Math.max(1, Math.floor(account.dailyPostLimit / 2)) : 2; // Example: half of post limit, min 1
      if (commentsToday < dailyCommentLimit) {
        const recentPostsQuery = query(
            collection(db, WARMUP_COLLECTIONS.WARMUP_POSTS),
            where("warmupAccountId", "==", account.id),
            where("status", "==", "posted"),
            orderBy("postedAt", "desc"),
            limit(5) 
        );
        const recentPostsSnapshot = await getDocs(recentPostsQuery);
        for (const postDoc of recentPostsSnapshot.docs) {
            if (commentsToday >= dailyCommentLimit || commentsAttemptedThisCycle >= dailyCommentLimit) break;
            const warmupPost = postDoc.data() as WarmupPostDocument;
            if (!warmupPost.redditPostId) continue; // Can only comment on posts that have a Reddit ID

            const queuedCommentsResult = await getQueuedWarmupCommentsByWarmupPostIdAction(warmupPost.id);
            if (queuedCommentsResult.isSuccess && queuedCommentsResult.data) {
                const dueComments = queuedCommentsResult.data.filter(c => c.scheduledFor && new Date(c.scheduledFor).getTime() <= now.toMillis());
                for (const comment of dueComments) {
                    if (commentsToday >= dailyCommentLimit || commentsAttemptedThisCycle >= dailyCommentLimit) break;
                    commentsAttemptedThisCycle++;
                    
                    const parentToReplyTo = comment.redditParentCommentId || warmupPost.redditPostId; // Reply to comment or post
                    if (parentToReplyTo) { 
                        console.log(`Attempting to comment on ${parentToReplyTo} for org ${organizationId}`);
                        const submitCommentResult = await submitRedditCommentAction(organizationId, parentToReplyTo, comment.content);
                        if (submitCommentResult.isSuccess && submitCommentResult.data) {
                            await updateWarmupCommentAction(comment.id, { status: "posted", redditCommentId: submitCommentResult.data.id, postedAt: Timestamp.now() });
                            commentsToday++; commentsProcessed++;
                        } else {
                            await updateWarmupCommentAction(comment.id, { status: "failed", error: submitCommentResult.message });
                            errorCount++; console.error(`Failed to submit comment ${comment.id}: ${submitCommentResult.message}`);
                        }
                    } else {
                        console.warn(`Skipping comment ${comment.id} - missing redditParentCommentId and no fallback to post ID implicitly.`);
                         await updateWarmupCommentAction(comment.id, { status: "failed", error: "Missing parent ID for reply." });
                         errorCount++;
                    }
                }
            }
        }
      }

      await updateWarmupAccountAction(account.id, {
        postsToday: postsToday, commentsToday: commentsToday, lastActivityAt: Timestamp.now(),
        totalPostsMade: (account.totalPostsMade || 0) + (postsToday - (account.postsToday || 0) ), 
        totalCommentsMade: (account.totalCommentsMade || 0) + (commentsToday - (account.commentsToday || 0) )
      });
    }

    console.log(`✅ [PROCESS-WARMUP-QUEUE] Finished. Posts: ${postsProcessed}, Comments: ${commentsProcessed}, Errors: ${errorCount}`);
    return {
      isSuccess: true,
      message: `Queue processed. Posts: ${postsProcessed}, Comments: ${commentsProcessed}, Errors: ${errorCount}`,
      data: { postsProcessed, commentsProcessed, errors: errorCount },
    };
  } catch (error) {
    console.error("❌ [PROCESS-WARMUP-QUEUE] Error:", error);
    return { 
        isSuccess: false, 
        message: `Failed to process queue: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
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

      const commentData: CreateWarmupCommentData = {
        userId: warmupPost.userId,
        organizationId,
        warmupPostId,
        content: reply.reply,
        scheduledFor,
        redditParentCommentId: reply.commentId,
      }
      await createWarmupCommentAction(commentData)

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
