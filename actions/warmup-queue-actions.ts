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
import { getKnowledgeBaseByOrganizationIdAction } from "@/actions/db/personalization-actions"

const logger = {
  info: (message: string, data?: any) => {
    console.log(`ℹ️ ${message}`, data || "")
  },
  error: (message: string, error?: any) => {
    console.error(`❌ ${message}`, error || "")
  }
}

export async function generateAndScheduleWarmupPostsAction(
  organizationId: string
): Promise<ActionState<{ postsGenerated: number }>> {
  try {
    console.log("🔥🔥🔥 [WARMUP-QUEUE] Starting generateAndScheduleWarmupPostsAction")
    console.log("🔥🔥🔥 [WARMUP-QUEUE] Organization ID:", organizationId)
    
    // Get warmup account
    const warmupResult = await getWarmupAccountByOrganizationIdAction(organizationId)
    
    console.log("🔍 [WARMUP-QUEUE] Warmup account result:", {
      isSuccess: warmupResult.isSuccess,
      hasData: !!warmupResult.data,
      accountId: warmupResult.data?.id,
      isActive: warmupResult.data?.isActive,
      targetSubreddits: warmupResult.data?.targetSubreddits,
      message: warmupResult.message
    })
    
    if (!warmupResult.isSuccess || !warmupResult.data) {
      console.log("⚠️ [WARMUP-QUEUE] No warmup account found")
      return { isSuccess: false, message: "No warmup account found" }
    }

    const warmupAccount = warmupResult.data
    
    if (!warmupAccount.isActive) {
      console.log("⚠️ [WARMUP-QUEUE] Warmup account is not active")
      return { isSuccess: false, message: "Warmup account is not active" }
    }

    if (warmupAccount.targetSubreddits.length === 0) {
      console.log("⚠️ [WARMUP-QUEUE] No target subreddits configured")
      return { isSuccess: false, message: "No target subreddits configured" }
    }

    // Check rate limit - pass organizationId and subreddit
    console.log("🔍 [WARMUP-QUEUE] Checking rate limit")
    const rateLimitResult = await checkWarmupRateLimitAction(organizationId, "")
    
    console.log("🔍 [WARMUP-QUEUE] Rate limit result:", {
      isSuccess: rateLimitResult.isSuccess,
      hasData: !!rateLimitResult.data,
      canPost: rateLimitResult.data?.canPost,
      message: rateLimitResult.message
    })
    
    if (!rateLimitResult.isSuccess || !rateLimitResult.data || !rateLimitResult.data.canPost) {
      console.log("⚠️ [WARMUP-QUEUE] Cannot post due to rate limit")
      return { isSuccess: false, message: "Rate limit reached" }
    }

    // Get knowledge base
    console.log("🔍 [WARMUP-QUEUE] Getting knowledge base")
    const kbResult = await getKnowledgeBaseByOrganizationIdAction(organizationId)
    
    console.log("🔍 [WARMUP-QUEUE] Knowledge base result:", {
      isSuccess: kbResult.isSuccess,
      hasData: !!kbResult.data,
      hasSummary: !!kbResult.data?.summary,
      message: kbResult.message
    })
    
    if (!kbResult.isSuccess || !kbResult.data) {
      console.log("⚠️ [WARMUP-QUEUE] No knowledge base found")
      return { isSuccess: false, message: "No knowledge base found" }
    }

    // Get organization details
    const orgResult = await getOrganizationByIdAction(organizationId)
    if (!orgResult.isSuccess || !orgResult.data) {
      console.log("⚠️ [WARMUP-QUEUE] No organization found")
      return { isSuccess: false, message: "No organization found" }
    }

    // Generate posts
    const postsToGenerate = Math.min(3, warmupAccount.dailyPostLimit) // Generate up to 3 posts at a time
    console.log("🤖 [WARMUP-QUEUE] Generating posts:", postsToGenerate)
    
    let postsGenerated = 0

    for (let i = 0; i < postsToGenerate; i++) {
      // Select random subreddit
      const subreddit = warmupAccount.targetSubreddits[
        Math.floor(Math.random() * warmupAccount.targetSubreddits.length)
      ]
      
      console.log(`🎯 [WARMUP-QUEUE] Generating post ${i + 1}/${postsToGenerate} for r/${subreddit}`)

      // Get subreddit analysis
      const analysisResult = await getSubredditAnalysisAction(subreddit)
      let analysis = analysisResult.isSuccess ? analysisResult.data : null

      // If no analysis or it's old, create new one
      if (!analysis) {
        console.log(`📊 [WARMUP-QUEUE] Analyzing subreddit r/${subreddit}`)
        
        const topPostsResult = await getTopPostsFromSubredditAction(organizationId, subreddit)
        if (!topPostsResult.isSuccess || !topPostsResult.data) {
          console.log(`⚠️ [WARMUP-QUEUE] Failed to get top posts for r/${subreddit}`)
          continue
        }

        const styleResult = await analyzeSubredditStyleAction(topPostsResult.data)
        if (!styleResult.isSuccess || !styleResult.data) {
          console.log(`⚠️ [WARMUP-QUEUE] Failed to analyze style for r/${subreddit}`)
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

        analysis = {
          id: subreddit,
          subreddit,
          topPosts: topPostsForDb,
          writingStyle: styleResult.data.writingStyle,
          commonTopics: styleResult.data.commonTopics,
          lastAnalyzedAt: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        }
      }

      // Generate post content
      const aiContextKeywords = (orgResult.data as any).aiContextKeywords || []
      const postResult = await generateWarmupPostAction(
        subreddit,
        analysis.writingStyle,
        analysis.commonTopics,
        aiContextKeywords
      )
      
      console.log(`🤖 [WARMUP-QUEUE] Content generation result for post ${i + 1}:`, {
        isSuccess: postResult.isSuccess,
        hasData: !!postResult.data,
        title: postResult.data?.title?.substring(0, 50) + "...",
        message: postResult.message
      })

      if (!postResult.isSuccess || !postResult.data) {
        console.log(`⚠️ [WARMUP-QUEUE] Failed to generate content for post ${i + 1}`)
        continue
      }

      // Create warmup post
      const createResult = await createWarmupPostAction({
        userId: warmupAccount.userId,
        organizationId,
        warmupAccountId: warmupAccount.id,
        subreddit,
        title: postResult.data.title,
        content: postResult.data.content,
        scheduledFor: Timestamp.now() // Use Firestore Timestamp
      })
      
      console.log(`📝 [WARMUP-QUEUE] Create post result for post ${i + 1}:`, {
        isSuccess: createResult.isSuccess,
        hasData: !!createResult.data,
        postId: createResult.data?.id,
        message: createResult.message
      })

      if (createResult.isSuccess) {
        postsGenerated++
        console.log(`✅ [WARMUP-QUEUE] Post ${i + 1} created successfully`)
      } else {
        console.log(`❌ [WARMUP-QUEUE] Failed to create post ${i + 1}`)
      }
    }

    // Update rate limit
    if (postsGenerated > 0) {
      console.log("📊 [WARMUP-QUEUE] Updating rate limit, posts generated:", postsGenerated)
      await updateWarmupRateLimitAction(organizationId, postsGenerated.toString())
    }

    console.log("✅ [WARMUP-QUEUE] Completed generateAndScheduleWarmupPostsAction:", {
      postsGenerated,
      success: postsGenerated > 0
    })

    if (postsGenerated > 0) {
      return {
        isSuccess: true,
        message: `Generated ${postsGenerated} warmup posts`,
        data: { postsGenerated }
      }
    } else {
      return {
        isSuccess: false,
        message: "Failed to generate any posts"
      }
    }
  } catch (error) {
    console.error("❌ [WARMUP-QUEUE] Error in generateAndScheduleWarmupPostsAction:", error)
    return { isSuccess: false, message: "Failed to generate warmup posts" }
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
      
      if (account.warmupEndDate.toMillis() < now.toMillis()) {
        console.log(`Warmup period ended for account ${account.id}. Setting to completed.`);
        await updateWarmupAccountAction(account.id, { status: "completed", isActive: false });
        continue;
      }

      const today = new Date().toISOString().split('T')[0];
      const lastActivityDate = account.lastActivityAt ? account.lastActivityAt.toDate().toISOString().split('T')[0] : null;
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
      const dailyCommentLimit = Math.max(1, Math.floor((account.dailyPostLimit || 3) / 2)); // Example: half of post limit, min 1
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
): Promise<ActionState<{ url: string }>> {
  try {
    console.log("🔥🔥🔥 [WARMUP-QUEUE] Starting postWarmupImmediatelyAction")
    console.log("🔥🔥🔥 [WARMUP-QUEUE] Post ID:", postId)
    console.log("🔥🔥🔥 [WARMUP-QUEUE] Organization ID:", organizationId)
    
    // Get the post
    const posts = await getWarmupPostsByOrganizationIdAction(organizationId)
    
    console.log("🔍 [WARMUP-QUEUE] Posts result:", {
      isSuccess: posts.isSuccess,
      hasData: !!posts.data,
      postCount: posts.data?.length || 0,
      message: posts.message
    })
    
    if (!posts.isSuccess || !posts.data) {
      console.log("⚠️ [WARMUP-QUEUE] Failed to get posts")
      return { isSuccess: false, message: "Failed to get posts" }
    }

    const post = posts.data.find(p => p.id === postId)
    
    console.log("🔍 [WARMUP-QUEUE] Found post:", {
      found: !!post,
      postId: post?.id,
      status: post?.status,
      subreddit: post?.subreddit,
      title: post?.title?.substring(0, 50) + "..."
    })
    
    if (!post) {
      console.log("⚠️ [WARMUP-QUEUE] Post not found")
      return { isSuccess: false, message: "Post not found" }
    }

    if (post.status === "posted") {
      console.log("⚠️ [WARMUP-QUEUE] Post already posted")
      return { isSuccess: false, message: "Post already posted" }
    }

    // Submit to Reddit
    console.log("🚀 [WARMUP-QUEUE] Submitting to Reddit")
    const submitResult = await submitRedditPostAction(
      organizationId,
      post.subreddit,
      post.title,
      post.content
    )
    
    console.log("🚀 [WARMUP-QUEUE] Submit result:", {
      isSuccess: submitResult.isSuccess,
      hasData: !!submitResult.data,
      url: submitResult.data?.url,
      postId: submitResult.data?.id,
      message: submitResult.message
    })

    if (!submitResult.isSuccess || !submitResult.data) {
      console.log("❌ [WARMUP-QUEUE] Failed to submit to Reddit:", submitResult.message)
      return { isSuccess: false, message: submitResult.message || "Failed to submit post" }
    }

    // Update post status
    console.log("📝 [WARMUP-QUEUE] Updating post status")
    const updateResult = await updateWarmupPostAction(postId, {
      status: "posted",
      postedAt: Timestamp.now(),
      redditPostId: submitResult.data.id,
      redditPostUrl: submitResult.data.url
    })
    
    console.log("📝 [WARMUP-QUEUE] Update result:", {
      isSuccess: updateResult.isSuccess,
      hasData: !!updateResult.data,
      message: updateResult.message
    })

    if (!updateResult.isSuccess) {
      console.log("⚠️ [WARMUP-QUEUE] Failed to update post status but post was submitted")
    }

    console.log("✅ [WARMUP-QUEUE] Post submitted successfully:", submitResult.data.url)

    return {
      isSuccess: true,
      message: "Post submitted successfully",
      data: { url: submitResult.data.url }
    }
  } catch (error) {
    console.error("❌ [WARMUP-QUEUE] Error in postWarmupImmediatelyAction:", error)
    return { isSuccess: false, message: "Failed to post immediately" }
  }
}

