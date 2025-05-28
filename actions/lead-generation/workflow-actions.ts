/*
<ai_context>
Contains the main workflow orchestrator for the Reddit lead generation process.
Coordinates Firecrawl, Google Search, Reddit API, and OpenAI integrations.
</ai_context>
*/

"use server"

import { ActionState, WorkflowStepResult, WorkflowProgress } from "@/types"
import {
  updateCampaignAction,
  getCampaignByIdAction
} from "@/actions/db/campaign-actions"
import { scrapeWebsiteAction } from "@/actions/integrations/firecrawl/website-scraping-actions"
import { searchMultipleKeywordsAction } from "@/actions/integrations/google/google-search-actions"
import { fetchMultipleRedditThreadsAction } from "@/actions/integrations/reddit/reddit-actions"
import { batchScoreThreadsWithThreeTierCommentsAction } from "@/actions/integrations/openai/openai-actions"
import {
  LEAD_COLLECTIONS,
  CreateSearchResultData,
  CreateRedditThreadData,
  CreateGeneratedCommentData,
  RedditThreadDocument
} from "@/db/schema"
import { db } from "@/db/db"
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  writeBatch,
  Timestamp,
  query,
  where,
  limit,
  getDocs
} from "firebase/firestore"
import { removeUndefinedValues } from "@/lib/firebase-utils"
import { createGeneratedCommentAction } from "@/actions/db/lead-generation-actions"
import { scoreThreadAndGenerateThreeTierCommentsAction } from "@/actions/integrations/openai/openai-actions"
import {
  createLeadGenerationProgressAction,
  updateLeadGenerationProgressAction
} from "@/actions/db/lead-generation-progress-actions"
import { LEAD_GENERATION_STAGES } from "@/types"
import { getKnowledgeBaseByOrganizationIdAction } from "@/actions/db/personalization-actions"
import { getVoiceSettingsByOrganizationIdAction } from "@/actions/db/personalization-actions"
import { loggers } from "@/lib/logger"
import { updateGeneratedCommentAction } from "@/actions/db/lead-generation-actions"
import { 
  upsertRedditThreadAction,
  updateThreadInteractionAction,
  recordThreadInteractionAction
} from "@/actions/db/reddit-threads-actions"

const logger = loggers.leadGen

export async function runFullLeadGenerationWorkflowAction(
  campaignId: string
): Promise<ActionState<WorkflowProgress>> {
  // Call the new function with no keyword limits (will process all keywords)
  return runLeadGenerationWorkflowWithLimitsAction(campaignId, {})
}

export async function runLeadGenerationWorkflowWithLimitsAction(
  campaignId: string,
  keywordLimits: Record<string, number> = {}
): Promise<ActionState<WorkflowProgress>> {
  console.log("🚀🚀🚀 [WORKFLOW] ========== START WORKFLOW ==========")
  console.log("🚀🚀🚀 [WORKFLOW] Campaign ID:", campaignId)
  console.log("🚀🚀🚀 [WORKFLOW] Keyword limits:", JSON.stringify(keywordLimits, null, 2))
  console.log("🚀🚀🚀 [WORKFLOW] Number of keywords:", Object.keys(keywordLimits).length)
  console.log("🚀🚀🚀 [WORKFLOW] Total threads to find:", Object.values(keywordLimits).reduce((a, b) => a + b, 0))
  
  const progress: WorkflowProgress = {
    currentStep: "Starting workflow",
    totalSteps: 6,
    completedSteps: 0,
    results: [],
    isComplete: false
  }

  try {
    // Create progress tracking
    logger.info(`🚀 Creating progress tracking for campaign: ${campaignId}`)
    console.log("🚀🚀🚀 [WORKFLOW] Creating progress tracking...")
    
    await createLeadGenerationProgressAction(campaignId)
    
    console.log("🚀🚀🚀 [WORKFLOW] Progress tracking created, updating status...")
    
    await updateLeadGenerationProgressAction(campaignId, {
      status: "in_progress",
      currentStage: "Initializing",
      stageUpdate: {
        stageName: "Initializing",
        status: "in_progress",
        message: "Starting lead generation workflow"
      },
      totalProgress: 5
    })

    console.log("🚀🚀🚀 [WORKFLOW] Progress status updated to in_progress")

    // Step 1: Get campaign details
    progress.currentStep = "Loading campaign"
    logger.info(
      `🚀 Starting lead generation workflow for campaign: ${campaignId}`
    )
    logger.info(`🚀 Keyword limits:`, keywordLimits)
    
    console.log("🚀🚀🚀 [WORKFLOW] Fetching campaign details...")

    const campaignResult = await getCampaignByIdAction(campaignId)
    
    console.log("🚀🚀🚀 [WORKFLOW] Campaign fetch result:", {
      isSuccess: campaignResult.isSuccess,
      message: campaignResult.message,
      hasData: !!campaignResult.data,
      campaignName: campaignResult.data?.name,
      keywords: campaignResult.data?.keywords
    })
    
    if (!campaignResult.isSuccess) {
      console.log("🚀🚀🚀 [WORKFLOW] ❌ Failed to fetch campaign")
      progress.error = campaignResult.message
      await updateLeadGenerationProgressAction(campaignId, {
        status: "error",
        error: campaignResult.message
      })
      return { isSuccess: false, message: campaignResult.message }
    }

    const campaign = campaignResult.data
    await updateCampaignAction(campaignId, { status: "running" })

    // Get organization for personalization
    const organizationId = campaign.organizationId
    if (!organizationId) {
      logger.error("❌ [WORKFLOW] Campaign has no organizationId")
      await updateLeadGenerationProgressAction(campaignId, {
        status: "error",
        error: "Campaign is not associated with an organization"
      })
      return {
        isSuccess: false,
        message: "Campaign is not associated with an organization"
      }
    }
    
    logger.info(`🏢 [WORKFLOW] Using organization: ${organizationId}`)

    // Determine which keywords to process
    const keywordsToProcess =
      Object.keys(keywordLimits).length > 0
        ? campaign.keywords.filter(
            k => keywordLimits[k] && keywordLimits[k] > 0
          )
        : campaign.keywords

    console.log("🚀🚀🚀 [WORKFLOW] Keyword filtering:", {
      campaignKeywords: campaign.keywords,
      keywordLimitsKeys: Object.keys(keywordLimits),
      keywordsToProcess,
      keywordLimitsProvided: Object.keys(keywordLimits).length > 0
    })

    if (keywordsToProcess.length === 0) {
      console.log("🚀🚀🚀 [WORKFLOW] ❌ No keywords to process!")
      console.log("🚀🚀🚀 [WORKFLOW] Campaign keywords:", campaign.keywords)
      console.log("🚀🚀🚀 [WORKFLOW] Keyword limits:", keywordLimits)
      
      // Check if the keywords in limits match campaign keywords
      const missingKeywords = Object.keys(keywordLimits).filter(
        k => !campaign.keywords.includes(k)
      )
      if (missingKeywords.length > 0) {
        console.log("🚀🚀🚀 [WORKFLOW] ⚠️ Keywords in limits not found in campaign:", missingKeywords)
      }
    }

    progress.results.push({
      step: "Load Campaign",
      success: true,
      message: `Campaign "${campaign.name}" loaded successfully`,
      data: {
        campaignName: campaign.name,
        allKeywords: campaign.keywords,
        keywordsToProcess,
        keywordLimits
      }
    })
    progress.completedSteps++

    await updateLeadGenerationProgressAction(campaignId, {
      stageUpdate: {
        stageName: "Initializing",
        status: "completed",
        message: "Campaign loaded successfully"
      },
      totalProgress: 10
    })

    // Step 2: Analyze business and prepare content
    await updateLeadGenerationProgressAction(campaignId, {
      currentStage: "Analyzing Business",
      stageUpdate: {
        stageName: "Analyzing Business",
        status: "in_progress",
        message: "Understanding your business"
      },
      totalProgress: 15
    })

    progress.currentStep = "Preparing business content"
    logger.info(`🔥 Step 2: Preparing business content`)
    logger.info(`🔥 Campaign has website: ${!!campaign.website}`)
    logger.info(
      `🔥 Campaign has businessDescription: ${!!campaign.businessDescription}`
    )

    let websiteContent = campaign.websiteContent
    let skipScraping = false

    // Check if campaign has a website
    if (campaign.website) {
      logger.info(`🔥 Campaign has website: ${campaign.website}`)

      // Update progress for scraping
      await updateLeadGenerationProgressAction(campaignId, {
        stageUpdate: {
          stageName: "Analyzing Business",
          status: "completed"
        },
        currentStage: "Scraping Website",
        totalProgress: 20
      })

      await updateLeadGenerationProgressAction(campaignId, {
        stageUpdate: {
          stageName: "Scraping Website",
          status: "in_progress",
          message: `Analyzing ${campaign.website}`
        }
      })

      // Check if we already have recent website content (less than 24 hours old)
      if (websiteContent && campaign.updatedAt) {
        // Handle serialized updatedAt as ISO string
        const lastUpdate = new Date(campaign.updatedAt)
        const now = new Date()
        const hoursSinceUpdate =
          (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

        if (hoursSinceUpdate < 24) {
          logger.info(
            `🔥 Using cached website content (${Math.round(hoursSinceUpdate)}h old)`
          )
          skipScraping = true
        } else {
          logger.info(
            `🔥 Website content is ${Math.round(hoursSinceUpdate)}h old, re-scraping...`
          )
        }
      }

      if (!skipScraping) {
        logger.info(`🔥 Scraping website: ${campaign.website}`)
        const scrapeResult = await scrapeWebsiteAction(campaign.website)
        if (!scrapeResult.isSuccess) {
          progress.results.push({
            step: "Scrape Website",
            success: false,
            message: scrapeResult.message
          })
          await updateCampaignAction(campaignId, { status: "error" })
          await updateLeadGenerationProgressAction(campaignId, {
            status: "error",
            error: scrapeResult.message,
            stageUpdate: {
              stageName: "Scraping Website",
              status: "error",
              message: scrapeResult.message
            }
          })
          progress.error = scrapeResult.message
          return {
            isSuccess: false,
            message: `Website scraping failed: ${scrapeResult.message}`
          }
        }

        // Update campaign with fresh website content
        websiteContent = scrapeResult.data.content
        await updateCampaignAction(campaignId, {
          websiteContent: websiteContent
        })

        progress.results.push({
          step: "Prepare Business Content",
          success: true,
          message: `Website scraped: ${scrapeResult.data.content.length} characters`,
          data: {
            source: "website",
            title: scrapeResult.data.title,
            contentLength: scrapeResult.data.content.length
          }
        })

        await updateLeadGenerationProgressAction(campaignId, {
          stageUpdate: {
            stageName: "Scraping Website",
            status: "completed",
            message: "Website content analyzed"
          },
          totalProgress: 25
        })
      } else {
        progress.results.push({
          step: "Prepare Business Content",
          success: true,
          message: `Using cached website content: ${websiteContent?.length || 0} characters`,
          data: {
            source: "website",
            cached: true,
            contentLength: websiteContent?.length || 0
          }
        })

        await updateLeadGenerationProgressAction(campaignId, {
          stageUpdate: {
            stageName: "Scraping Website",
            status: "completed",
            message: "Using cached content"
          },
          totalProgress: 25
        })
      }
    } else if (campaign.businessDescription) {
      // Use business description as content if no website
      logger.info(`🔥 No website provided, using business description`)
      websiteContent = campaign.businessDescription

      // Save business description as websiteContent for consistency
      await updateCampaignAction(campaignId, {
        websiteContent: websiteContent
      })

      progress.results.push({
        step: "Prepare Business Content",
        success: true,
        message: `Using business description: ${websiteContent.length} characters`,
        data: {
          source: "businessDescription",
          contentLength: websiteContent.length
        }
      })

      await updateLeadGenerationProgressAction(campaignId, {
        stageUpdate: {
          stageName: "Analyzing Business",
          status: "completed",
          message: "Business description analyzed"
        },
        totalProgress: 25
      })
    }

    // Ensure we have content before proceeding
    if (!websiteContent) {
      progress.results.push({
        step: "Prepare Business Content",
        success: false,
        message: "No website or business description available"
      })
      await updateCampaignAction(campaignId, { status: "error" })
      await updateLeadGenerationProgressAction(campaignId, {
        status: "error",
        error: "No website or business description available"
      })
      progress.error = "No website or business description available"
      return {
        isSuccess: false,
        message: "No website or business description available"
      }
    }

    progress.completedSteps++

    // Step 3: Search for Reddit threads
    await updateLeadGenerationProgressAction(campaignId, {
      currentStage: "Searching Reddit",
      stageUpdate: {
        stageName: "Searching Reddit",
        status: "in_progress",
        message: `Searching for ${keywordsToProcess.length} keywords`
      },
      totalProgress: 30
    })

    progress.currentStep = "Searching Reddit threads"
    logger.info(
      `🔍 Step 3: Searching for Reddit threads with ${keywordsToProcess.length} keywords`
    )

    // Search with limits per keyword
    const searchPromises = keywordsToProcess.map(async keyword => {
      const limit = keywordLimits[keyword] || 10 // Default to 10 if no limit specified
      logger.info(`🔍 Searching for keyword "${keyword}" with limit: ${limit}`)

      const { searchRedditThreadsAction } = await import(
        "@/actions/integrations/google/google-search-actions"
      )
      return searchRedditThreadsAction(keyword, limit)
    })

    const searchResults = await Promise.all(searchPromises)

    // Combine all search results
    const allSearchResults: any[] = []
    searchResults.forEach((result: any, index: number) => {
      if (result.isSuccess) {
        const keyword = keywordsToProcess[index]
        result.data.forEach((searchResult: any) => {
          allSearchResults.push({
            campaignId,
            keyword,
            redditUrl: searchResult.link,
            threadId: searchResult.threadId,
            title: searchResult.title,
            snippet: searchResult.snippet,
            position: searchResult.position
          })
        })
      }
    })

    // Batch save search results
    const batch = writeBatch(db)
    for (const searchData of allSearchResults) {
      const searchRef = doc(collection(db, LEAD_COLLECTIONS.SEARCH_RESULTS))
      const searchDoc = removeUndefinedValues({
        id: searchRef.id,
        ...searchData,
        processed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      batch.set(searchRef, searchDoc)
    }
    await batch.commit()

    await updateCampaignAction(campaignId, {
      totalSearchResults: allSearchResults.length
    })

    progress.results.push({
      step: "Search Reddit",
      success: true,
      message: `Found ${allSearchResults.length} Reddit threads`,
      data: {
        totalResults: allSearchResults.length,
        keywordsProcessed: keywordsToProcess.length,
        resultsPerKeyword: keywordsToProcess.map((k, i) => ({
          keyword: k,
          count: searchResults[i]?.isSuccess ? searchResults[i].data.length : 0
        }))
      }
    })
    progress.completedSteps++

    await updateLeadGenerationProgressAction(campaignId, {
      stageUpdate: {
        stageName: "Searching Reddit",
        status: "completed",
        message: `Found ${allSearchResults.length} threads`
      },
      totalProgress: 40
    })

    // Step 4 & 5 Combined: Fetch Reddit threads and process them individually
    await updateLeadGenerationProgressAction(campaignId, {
      currentStage: "Retrieving Threads",
      stageUpdate: {
        stageName: "Retrieving Threads",
        status: "in_progress",
        message: "Fetching thread details"
      },
      totalProgress: 45
    })

    progress.currentStep = "Fetching and processing Reddit threads"
    logger.info(
      `📖 Step 4&5: Fetching and processing ${allSearchResults.length} Reddit threads individually`
    )

    const threadsToFetch = allSearchResults
      .filter(result => result.threadId)
      .map(result => ({
        threadId: result.threadId!,
        subreddit: result.redditUrl.match(/\/r\/([^\/]+)\//)?.[1],
        keyword: result.keyword
      }));

    let fetchedThreadsData: any[] = [];
    if (threadsToFetch.length > 0) {
      const fetchThreadsResult = await fetchMultipleRedditThreadsAction(
        organizationId,
        threadsToFetch.map(t => ({ threadId: t.threadId, subreddit: t.subreddit }))
      );

      if (fetchThreadsResult.isSuccess && fetchThreadsResult.data) {
        fetchedThreadsData = fetchThreadsResult.data.map(fetchedThread => {
          const originalThreadInfo = threadsToFetch.find(t => t.threadId === fetchedThread.id);
          return {
            ...fetchedThread,
            keyword: originalThreadInfo?.keyword || "unknown"
          };
        });

        logger.info(`📖 [WORKFLOW] Successfully fetched ${fetchedThreadsData.length} of ${threadsToFetch.length} threads.`);
        if (fetchedThreadsData.length < threadsToFetch.length) {
          logger.warn(`📖 [WORKFLOW] Some threads failed to fetch: ${fetchThreadsResult.message}`);
          await updateLeadGenerationProgressAction(campaignId, {
            stageUpdate: {
              stageName: "Retrieving Threads",
              status: "completed",
              message: `Fetched ${fetchedThreadsData.length}/${threadsToFetch.length} threads. Some failed.`
            }
          });
        }
      } else {
        logger.error(
          `❌ [WORKFLOW] Failed to fetch any Reddit threads: ${fetchThreadsResult.message}`
        );
        progress.results.push({
          step: "Fetch Reddit Threads",
          success: false,
          message: `Failed to fetch any Reddit threads: ${fetchThreadsResult.message}`
        });
        await updateCampaignAction(campaignId, { status: "error" });
        await updateLeadGenerationProgressAction(campaignId, {
          status: "error",
          error: `Failed to fetch any Reddit threads: ${fetchThreadsResult.message}`,
          stageUpdate: {
            stageName: "Retrieving Threads",
            status: "error",
            message: fetchThreadsResult.message
          }
        });
        return {
          isSuccess: false,
          message: `Failed to fetch Reddit threads: ${fetchThreadsResult.message}`
        };
      }
    } else {
      logger.info("📖 [WORKFLOW] No valid thread IDs found from search results to fetch.");
    }

    progress.results.push({
      step: "Fetch Reddit Threads",
      success: true,
      message: `Attempted to fetch ${threadsToFetch.length} threads. Successfully fetched ${fetchedThreadsData.length}.`,
      data: { fetchedCount: fetchedThreadsData.length, attemptedCount: threadsToFetch.length }
    });
    progress.completedSteps++;

    await updateLeadGenerationProgressAction(campaignId, {
      stageUpdate: {
        stageName: "Retrieving Threads",
        status: "completed",
        message: `Processed ${threadsToFetch.length} search results. Fetched details for ${fetchedThreadsData.length} threads.`
      },
      totalProgress: 50 
    });

    const validFetchedThreads = fetchedThreadsData.filter(
      thread => thread && thread.content
    );

    logger.info(`🤖 [WORKFLOW] Analyzing ${validFetchedThreads.length} valid threads with content.`);

    let generatedCommentsCount = 0;
    let totalScore = 0;

    if (validFetchedThreads.length > 0) {
      await updateLeadGenerationProgressAction(campaignId, {
        currentStage: "Analyzing Relevance",
        stageUpdate: {
          stageName: "Analyzing Relevance",
          status: "in_progress", 
          message: `Analyzing ${validFetchedThreads.length} threads...`,
          progress: 0
        },
        totalProgress: 55 
      });

      let threadsProcessedForScoring = 0;
      for (const apiThread of validFetchedThreads) {
        threadsProcessedForScoring++;
        const scoringStageProgress = Math.round((threadsProcessedForScoring / validFetchedThreads.length) * 100);
        await updateLeadGenerationProgressAction(campaignId, {
          stageUpdate: {
            stageName: "Analyzing Relevance",
            status: "in_progress",
            message: `Analyzing thread ${threadsProcessedForScoring} of ${validFetchedThreads.length}: ${apiThread.title.substring(0,30)}...`,
            progress: scoringStageProgress
          }
        });
        
        logger.info(
          `🤖 [WORKFLOW] Scoring thread ${threadsProcessedForScoring}/${validFetchedThreads.length}: ${apiThread.id} - ${apiThread.title.substring(0, 30)}...`
        );

        let existingComments: string[] = []
        try {
          const { fetchRedditCommentsAction } = await import(
            "@/actions/integrations/reddit/reddit-actions"
          )
          const commentsResult = await fetchRedditCommentsAction(
            organizationId,
            apiThread.id,
            apiThread.subreddit,
            "best",
            10 
          )
          if (commentsResult.isSuccess && commentsResult.data.length > 0) {
            existingComments = commentsResult.data
              .filter(c => c.body && c.body !== "[deleted]" && c.body !== "[removed]")
              .map(c => c.body)
              .slice(0, 5) 
          }
        } catch (commentError) {
          logger.warn(`⚠️ [WORKFLOW] Failed to fetch comments for thread ${apiThread.id}: ${commentError}`);
        }

        const { scoreThreadAndGeneratePersonalizedCommentsAction } = await import(
          "@/actions/integrations/openai/openai-actions"
        );

        const scoringResult =
          await scoreThreadAndGeneratePersonalizedCommentsAction(
            apiThread.title,
            apiThread.content,
            apiThread.subreddit,
            organizationId, 
            campaign.keywords, 
            websiteContent, 
            existingComments, 
            campaign.name, 
            apiThread.createdUtc
          );

        if (scoringResult.isSuccess) {
          const scoringData = scoringResult.data
          logger.info(
            `✅ [WORKFLOW] AI Scoring complete - Score: ${scoringData.score}/100`
          )
          logger.info(`📝 [WORKFLOW] Reasoning: ${scoringData.reasoning}`)

          // Update shared thread with relevance score
          console.log("🧵 [WORKFLOW] Updating shared thread with relevance score...")
          await upsertRedditThreadAction({
            ...apiThread,
            relevanceScore: scoringData.score,
            reasoning: scoringData.reasoning
          })

          // Update progress for generating
          const generatingProgress =
            70 + (threadsProcessedForScoring / validFetchedThreads.length) * 20
          await updateLeadGenerationProgressAction(campaignId, {
            stageUpdate: {
              stageName: "Generating Comments",
              status: "in_progress",
              message: `Generated ${generatedCommentsCount + 1} personalized comments`,
              progress: (threadsProcessedForScoring / validFetchedThreads.length) * 100
            },
            totalProgress: Math.round(generatingProgress)
          })

          // Prepare comment data with keyword tracking
          const postCreatedAtValue = apiThread.createdUtc
            ? Timestamp.fromDate(new Date(apiThread.createdUtc * 1000))
            : undefined
          logger.info(
            `💾 [WORKFLOW] Extracted post creation timestamp: ${apiThread.createdUtc}, Firestore Timestamp: ${postCreatedAtValue?.toDate()?.toISOString() || "undefined"}`
          )

          const commentPayload: CreateGeneratedCommentData = {
            campaignId,
            organizationId,
            redditThreadId: apiThread.id,
            threadId: apiThread.id,
            postUrl: apiThread.url,
            postTitle: apiThread.title,
            postAuthor: apiThread.author,
            postContentSnippet: apiThread.content.substring(0, 200),
            postContent: apiThread.content,
            relevanceScore: scoringData.score,
            reasoning: scoringData.reasoning,
            microComment: scoringData.microComment,
            mediumComment: scoringData.mediumComment,
            verboseComment: scoringData.verboseComment,
            status: "new",
            keyword: apiThread.keyword,
            postScore: apiThread.score,
            postCreatedAt: postCreatedAtValue
          }

          logger.info(`💾 [WORKFLOW] Saving generated comment to Firestore...`)
          logger.info(
            `💾 [WORKFLOW] With keyword: ${apiThread.keyword}, score: ${apiThread.score}`
          )
          const saveCommentResult =
            await createGeneratedCommentAction(commentPayload)

          if (saveCommentResult.isSuccess) {
            generatedCommentsCount++
            totalScore += scoringData.score
            logger.info(
              `✅ [WORKFLOW] Comment saved successfully for thread: "${apiThread.title}"`
            )
            logger.info(
              `✅ [WORKFLOW] Total comments generated so far: ${generatedCommentsCount}`
            )

            // Update shared thread to mark it as having a comment
            console.log("🧵 [WORKFLOW] Marking thread as having a comment...")
            await updateThreadInteractionAction(apiThread.id, {
              hasComment: true,
              commentId: saveCommentResult.data.id
            })

            // Record the interaction
            await recordThreadInteractionAction({
              organizationId,
              threadId: apiThread.id,
              userId: campaign.userId,
              type: "comment",
              details: {
                commentId: saveCommentResult.data.id,
                status: "generated"
              }
            })

            // Update campaign progress
            await updateCampaignAction(campaignId, {
              totalThreadsAnalyzed: threadsProcessedForScoring,
              totalCommentsGenerated: generatedCommentsCount
            })
          } else {
            logger.error(
              `❌ [WORKFLOW] Failed to save comment: ${saveCommentResult.message}`
            )
          }
        } else {
          logger.error(
            `❌ [WORKFLOW] Failed to score thread: ${scoringResult.message}`
          )
        }
      }

      // Complete the generating comments stage
      await updateLeadGenerationProgressAction(campaignId, {
        stageUpdate: {
          stageName: "Generating Comments",
          status: "completed",
          message: `Generated ${generatedCommentsCount} comments`
        },
        totalProgress: 90
      })

      // Finalize results
      await updateLeadGenerationProgressAction(campaignId, {
        currentStage: "Finalizing Results",
        stageUpdate: {
          stageName: "Finalizing Results",
          status: "in_progress",
          message: "Preparing your results"
        },
        totalProgress: 95
      })

      // Update campaign with final counts
      await updateCampaignAction(campaignId, {
        totalCommentsGenerated: generatedCommentsCount,
        status: generatedCommentsCount > 0 ? "completed" : "error"
      })

      progress.results.push({
        step: "Score and Generate Comments",
        success: generatedCommentsCount > 0,
        message: `Generated ${generatedCommentsCount} comments individually`,
        data: {
          commentsGenerated: generatedCommentsCount,
          averageScore:
            generatedCommentsCount > 0
              ? totalScore / generatedCommentsCount
              : 0
        }
      })
      progress.completedSteps++

      // Step 6: Workflow complete
      progress.currentStep = "Workflow complete"
      progress.isComplete = true
      progress.completedSteps++

      progress.results.push({
        step: "Workflow Complete",
        success: true,
        message: "Lead generation workflow completed successfully",
        data: {
          totalSearchResults: allSearchResults.length,
          totalThreadsAnalyzed: threadsProcessedForScoring,
          totalCommentsGenerated: generatedCommentsCount,
          keywordLimits:
            Object.keys(keywordLimits).length > 0
              ? keywordLimits
              : "All keywords processed"
        }
      })

      // Complete progress tracking
      await updateLeadGenerationProgressAction(campaignId, {
        status: "completed",
        stageUpdate: {
          stageName: "Finalizing Results",
          status: "completed",
          message: "Lead generation complete!"
        },
        totalProgress: 100,
        results: {
          totalThreadsFound: allSearchResults.length,
          totalThreadsAnalyzed: threadsProcessedForScoring,
          totalCommentsGenerated: generatedCommentsCount,
          averageRelevanceScore:
            generatedCommentsCount > 0
              ? Math.round(totalScore / generatedCommentsCount)
              : 0
        }
      })

      logger.info(`✅ Workflow completed for campaign: ${campaignId}`)

      return {
        isSuccess: true,
        message: "Lead generation workflow completed successfully",
        data: progress
      }
    } else {
      // If no valid threads were fetched, update progress and return a specific message
      logger.info("📖 [WORKFLOW] No valid threads with content found for comment generation.");
      await updateLeadGenerationProgressAction(campaignId, {
        stageUpdate: {
          stageName: "Analyzing Relevance",
          status: "completed",
          message: "No valid threads found for analysis."
        },
        currentStage: "Generating Comments",
        totalProgress: 70
      });
      await updateLeadGenerationProgressAction(campaignId, {
        stageUpdate: {
          stageName: "Generating Comments",
          status: "completed",
          message: "No comments to generate."
        },
        totalProgress: 90
      });
      
      // Complete the workflow with 0 comments
      await updateLeadGenerationProgressAction(campaignId, {
        currentStage: "Finalizing Results",
        stageUpdate: {
          stageName: "Finalizing Results",
          status: "completed",
          message: "No comments generated - no valid threads found"
        },
        totalProgress: 100,
        status: "completed"
      });

      await updateCampaignAction(campaignId, {
        totalCommentsGenerated: 0,
        status: "completed"
      });

      progress.currentStep = "Workflow complete"
      progress.isComplete = true
      progress.completedSteps++

      progress.results.push({
        step: "Workflow Complete",
        success: true,
        message: "Lead generation workflow completed - no valid threads found for comment generation",
        data: {
          totalSearchResults: allSearchResults.length,
          totalThreadsAnalyzed: 0,
          totalCommentsGenerated: 0,
          keywordLimits: Object.keys(keywordLimits).length > 0 ? keywordLimits : "All keywords processed"
        }
      });

      return {
        isSuccess: true,
        message: "Lead generation workflow completed - no valid threads found for comment generation",
        data: progress
      };
    }
  } catch (error) {
    logger.error("Error in lead generation workflow:", error)
    await updateCampaignAction(campaignId, { status: "error" })
    await updateLeadGenerationProgressAction(campaignId, {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    })

    progress.error = error instanceof Error ? error.message : "Unknown error"
    progress.results.push({
      step: progress.currentStep,
      success: false,
      message: progress.error
    })

    return {
      isSuccess: false,
      message: `Workflow failed: ${progress.error}`
    }
  }
}

export async function testAllIntegrationsAction(): Promise<
  ActionState<{ [key: string]: boolean }>
> {
  try {
    logger.info("🧪 Testing all API integrations...")

    const results: { [key: string]: boolean } = {}

    // Test Firecrawl
    try {
      const { testFirecrawlConnectionAction } = await import(
        "@/actions/integrations/firecrawl/firecrawl-actions"
      )
      const firecrawlTest = await testFirecrawlConnectionAction()
      results.firecrawl = firecrawlTest.isSuccess
    } catch {
      results.firecrawl = false
    }

    // Test Google Search
    try {
      const { testGoogleSearchConnectionAction } = await import(
        "@/actions/integrations/google/google-search-actions"
      )
      const googleTest = await testGoogleSearchConnectionAction()
      results.googleSearch = googleTest.isSuccess
    } catch {
      results.googleSearch = false
    }

    // Test Reddit - skip for now since it requires organizationId
    // Test Reddit with a mock organization ID for integration testing
    try {
      const { testRedditConnectionAction } = await import(
        "@/actions/integrations/reddit/reddit-actions"
      )
      // Use a test organization ID or skip if not available
      const testOrgId = process.env.TEST_ORGANIZATION_ID
      if (testOrgId) {
        const redditTest = await testRedditConnectionAction(testOrgId)
        results.reddit = redditTest.isSuccess
      } else {
        // Skip Reddit test if no test org ID is configured
        results.reddit = true
        logger.info("⚠️ Skipping Reddit test - no TEST_ORGANIZATION_ID configured")
      }
    } catch {
      results.reddit = false
    }

    // Test OpenAI
    try {
      const { testOpenAIConnectionAction } = await import(
        "@/actions/integrations/openai/openai-actions"
      )
      const openaiTest = await testOpenAIConnectionAction()
      results.openai = openaiTest.isSuccess
    } catch {
      results.openai = false
    }

    const allWorking = Object.values(results).every(Boolean)

    if (allWorking) {
      return {
        isSuccess: true,
        message: "All integrations working",
        data: results
      }
    } else {
      return {
        isSuccess: false,
        message: "Some integrations failed"
      }
    }
  } catch (error) {
    logger.error("Error testing integrations:", error)
    return {
      isSuccess: false,
      message: `Integration test failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function stopLeadGenerationWorkflowAction(
  campaignId: string
): Promise<ActionState<void>> {
  try {
    logger.info(`🛑 Stopping workflow for campaign: ${campaignId}`)

    // Update campaign status
    await updateCampaignAction(campaignId, { status: "paused" })

    // Update progress tracking
    await updateLeadGenerationProgressAction(campaignId, {
      status: "completed",
      currentStage: "Stopped by user"
    })

    return {
      isSuccess: true,
      message: "Workflow stopped successfully",
      data: undefined
    }
  } catch (error) {
    logger.error("Error stopping workflow:", error)
    return {
      isSuccess: false,
      message: `Failed to stop workflow: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function regenerateAllCommentsForCampaignAction(
  campaignId: string
): Promise<ActionState<{ regeneratedCount: number }>> {
  try {
    logger.info(`🔄 Starting regeneration of all comments for campaign: ${campaignId}`)
    console.log("🔄 [REGENERATE-ALL] Starting regeneration for campaign:", campaignId)

    // Get campaign details
    const campaignResult = await getCampaignByIdAction(campaignId)
    if (!campaignResult.isSuccess || !campaignResult.data) {
      return {
        isSuccess: false,
        message: "Failed to get campaign details"
      }
    }

    const campaign = campaignResult.data
    const organizationId = campaign.organizationId
    
    if (!organizationId) {
      return {
        isSuccess: false,
        message: "Campaign is not associated with an organization"
      }
    }

    // Get website content
    const websiteContent = campaign.websiteContent
    if (!websiteContent) {
      return {
        isSuccess: false,
        message: "No website content available for campaign"
      }
    }

    console.log("🔄 [REGENERATE-ALL] Campaign details:", {
      name: campaign.name,
      organizationId,
      websiteContentLength: websiteContent.length
    })

    // Get all existing comments for this campaign
    const { getGeneratedCommentsByCampaignAction } = await import(
      "@/actions/db/lead-generation-actions"
    )
    
    const commentsResult = await getGeneratedCommentsByCampaignAction(campaignId)
    if (!commentsResult.isSuccess || !commentsResult.data) {
      return {
        isSuccess: false,
        message: "Failed to get existing comments"
      }
    }

    const existingComments = commentsResult.data
    console.log("🔄 [REGENERATE-ALL] Found", existingComments.length, "comments to regenerate")

    // Get personalization data
    const knowledgeBaseResult = await getKnowledgeBaseByOrganizationIdAction(organizationId)
    let brandNameToUse = campaign.name
    
    if (knowledgeBaseResult.isSuccess && knowledgeBaseResult.data) {
      const kb = knowledgeBaseResult.data
      brandNameToUse = kb.brandNameOverride || campaign.name || "our solution"
      brandNameToUse = brandNameToUse.toLowerCase()
      console.log("🔄 [REGENERATE-ALL] Using brand name:", brandNameToUse)
    }

    // Process comments in batches to avoid overwhelming the API
    const batchSize = 5
    let regeneratedCount = 0
    let errors = 0

    for (let i = 0; i < existingComments.length; i += batchSize) {
      const batch = existingComments.slice(i, i + batchSize)
      console.log(`🔄 [REGENERATE-ALL] Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(existingComments.length / batchSize)}`)

      const regeneratePromises = batch.map(async (comment) => {
        try {
          // Get the Reddit thread data
          const threadQuery = query(
            collection(db, LEAD_COLLECTIONS.REDDIT_THREADS),
            where("threadId", "==", comment.threadId),
            limit(1)
          )
          const threadSnapshot = await getDocs(threadQuery)

          if (threadSnapshot.empty) {
            console.warn(`🔄 [REGENERATE-ALL] No thread found for comment ${comment.id}`)
            return null
          }

          const threadData = threadSnapshot.docs[0].data() as RedditThreadDocument

          // Fetch existing comments from Reddit for context
          let existingRedditComments: string[] = []
          try {
            const { fetchRedditCommentsAction } = await import(
              "@/actions/integrations/reddit/reddit-actions"
            )
            const commentsResult = await fetchRedditCommentsAction(
              organizationId,
              comment.threadId,
              threadData.subreddit,
              "best",
              10
            )
            if (commentsResult.isSuccess && commentsResult.data.length > 0) {
              existingRedditComments = commentsResult.data
                .filter(c => c.body && c.body !== "[deleted]" && c.body !== "[removed]")
                .map(c => c.body)
                .slice(0, 5)
            }
          } catch (error) {
            console.warn("🔄 [REGENERATE-ALL] Failed to fetch Reddit comments:", error)
          }

          // Extract post creation timestamp
          let postCreatedUtc: number | undefined
          if (comment.postCreatedAt) {
            // Convert Firestore Timestamp to Unix timestamp in seconds
            const timestamp = comment.postCreatedAt as any
            if (timestamp && timestamp.seconds) {
              postCreatedUtc = timestamp.seconds
            } else if (timestamp && timestamp.toDate) {
              postCreatedUtc = Math.floor(timestamp.toDate().getTime() / 1000)
            }
          }
          
          console.log("🔄 [REGENERATE-ALL] Post created UTC:", postCreatedUtc)

          // Use the new personalized scoring and comment generation
          const { scoreThreadAndGeneratePersonalizedCommentsAction } = await import(
            "@/actions/integrations/openai/openai-actions"
          )

          const result = await scoreThreadAndGeneratePersonalizedCommentsAction(
            threadData.title,
            threadData.content,
            threadData.subreddit,
            organizationId,
            campaign.keywords,
            websiteContent,
            existingRedditComments,
            brandNameToUse,
            postCreatedUtc
          )

          if (result.isSuccess) {
            // Update the comment in the database
            await updateGeneratedCommentAction(comment.id, {
              relevanceScore: result.data.score,
              reasoning: result.data.reasoning,
              microComment: result.data.microComment,
              mediumComment: result.data.mediumComment,
              verboseComment: result.data.verboseComment
            })

            console.log(`✅ [REGENERATE-ALL] Regenerated comment ${comment.id} with score ${result.data.score}`)
            return true
          } else {
            console.error(`❌ [REGENERATE-ALL] Failed to regenerate comment ${comment.id}:`, result.message)
            return false
          }
        } catch (error) {
          console.error(`❌ [REGENERATE-ALL] Error regenerating comment ${comment.id}:`, error)
          return false
        }
      })

      const results = await Promise.all(regeneratePromises)
      regeneratedCount += results.filter(r => r === true).length
      errors += results.filter(r => r === false).length

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < existingComments.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    console.log(`🔄 [REGENERATE-ALL] Regeneration complete. Success: ${regeneratedCount}, Errors: ${errors}`)

    return {
      isSuccess: true,
      message: `Successfully regenerated ${regeneratedCount} comments${errors > 0 ? ` (${errors} failed)` : ''}`,
      data: { regeneratedCount }
    }
  } catch (error) {
    logger.error("Error regenerating all comments:", error)
    console.error("❌ [REGENERATE-ALL] Fatal error:", error)
    return {
      isSuccess: false,
      message: `Failed to regenerate comments: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}
