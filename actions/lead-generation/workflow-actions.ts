/*
<ai_context>
Contains the main workflow orchestrator for the Reddit lead generation process.
Coordinates Firecrawl, Google Search, Reddit API, and OpenAI integrations.
</ai_context>
*/

"use server"

import { ActionState } from "@/types"
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
  Timestamp
} from "firebase/firestore"
import { removeUndefinedValues } from "@/lib/firebase-utils"
import { createGeneratedCommentAction } from "@/actions/db/lead-generation-actions"
import { scoreThreadAndGenerateThreeTierCommentsAction } from "@/actions/integrations/openai/openai-actions"

export interface WorkflowStepResult {
  step: string
  success: boolean
  message: string
  data?: any
}

export interface WorkflowProgress {
  currentStep: string
  totalSteps: number
  completedSteps: number
  results: WorkflowStepResult[]
  isComplete: boolean
  error?: string
}

export async function runFullLeadGenerationWorkflowAction(
  campaignId: string
): Promise<ActionState<WorkflowProgress>> {
  // Call the new function with no keyword limits (will process all keywords)
  return runLeadGenerationWorkflowWithLimitsAction(campaignId, {});
}

export async function runLeadGenerationWorkflowWithLimitsAction(
  campaignId: string,
  keywordLimits: Record<string, number> = {}
): Promise<ActionState<WorkflowProgress>> {
  const progress: WorkflowProgress = {
    currentStep: "Starting workflow",
    totalSteps: 6,
    completedSteps: 0,
    results: [],
    isComplete: false
  }

  try {
    // Step 1: Get campaign details
    progress.currentStep = "Loading campaign"
    console.log(
      `🚀 Starting lead generation workflow for campaign: ${campaignId}`
    )
    console.log(`🚀 Keyword limits:`, keywordLimits)

    const campaignResult = await getCampaignByIdAction(campaignId)
    if (!campaignResult.isSuccess) {
      progress.error = campaignResult.message
      return { isSuccess: false, message: campaignResult.message }
    }

    const campaign = campaignResult.data
    await updateCampaignAction(campaignId, { status: "running" })

    // Determine which keywords to process
    const keywordsToProcess = Object.keys(keywordLimits).length > 0 
      ? campaign.keywords.filter(k => keywordLimits[k] && keywordLimits[k] > 0)
      : campaign.keywords;

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

    // Step 2: Scrape website content OR use business description
    progress.currentStep = "Preparing business content"
    console.log(`🔥 Step 2: Preparing business content`)
    console.log(`🔥 Campaign has website: ${!!campaign.website}`)
    console.log(`🔥 Campaign has businessDescription: ${!!campaign.businessDescription}`)

    let websiteContent = campaign.websiteContent
    let skipScraping = false

    // Check if campaign has a website
    if (campaign.website) {
      console.log(`🔥 Campaign has website: ${campaign.website}`)
      
      // Check if we already have recent website content (less than 24 hours old)
      if (websiteContent && campaign.updatedAt) {
        // Handle serialized updatedAt as ISO string
        const lastUpdate = new Date(campaign.updatedAt)
        const now = new Date()
        const hoursSinceUpdate =
          (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

        if (hoursSinceUpdate < 24) {
          console.log(
            `🔥 Using cached website content (${Math.round(hoursSinceUpdate)}h old)`
          )
          skipScraping = true
        } else {
          console.log(
            `🔥 Website content is ${Math.round(hoursSinceUpdate)}h old, re-scraping...`
          )
        }
      }

      if (!skipScraping) {
        console.log(`🔥 Scraping website: ${campaign.website}`)
        const scrapeResult = await scrapeWebsiteAction(campaign.website)
        if (!scrapeResult.isSuccess) {
          progress.results.push({
            step: "Scrape Website",
            success: false,
            message: scrapeResult.message
          })
          await updateCampaignAction(campaignId, { status: "error" })
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
      }
    } else if (campaign.businessDescription) {
      // Use business description as content if no website
      console.log(`🔥 No website provided, using business description`)
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
    }

    // Ensure we have content before proceeding
    if (!websiteContent) {
      progress.results.push({
        step: "Prepare Business Content",
        success: false,
        message: "No website or business description available"
      })
      await updateCampaignAction(campaignId, { status: "error" })
      progress.error = "No website or business description available"
      return { isSuccess: false, message: "No website or business description available" }
    }

    progress.completedSteps++

    // Step 3: Search for Reddit threads
    progress.currentStep = "Searching Reddit threads"
    console.log(
      `🔍 Step 3: Searching for Reddit threads with ${keywordsToProcess.length} keywords`
    )

    // Search with limits per keyword
    const searchPromises = keywordsToProcess.map(async (keyword) => {
      const limit = keywordLimits[keyword] || 10; // Default to 10 if no limit specified
      console.log(`🔍 Searching for keyword "${keyword}" with limit: ${limit}`);
      
      const { searchRedditThreadsAction } = await import("@/actions/integrations/google/google-search-actions");
      return searchRedditThreadsAction(keyword, limit);
    });

    const searchResults = await Promise.all(searchPromises);
    
    // Combine all search results
    const allSearchResults: any[] = [];
    searchResults.forEach((result: any, index: number) => {
      if (result.isSuccess) {
        const keyword = keywordsToProcess[index];
        result.data.forEach((searchResult: any) => {
          allSearchResults.push({
            campaignId,
            keyword,
            redditUrl: searchResult.link,
            threadId: searchResult.threadId,
            title: searchResult.title,
            snippet: searchResult.snippet,
            position: searchResult.position
          });
        });
      }
    });

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

    // Step 4 & 5 Combined: Fetch Reddit threads and process them individually
    progress.currentStep = "Fetching and processing Reddit threads"
    console.log(
      `📖 Step 4&5: Fetching and processing ${allSearchResults.length} Reddit threads individually`
    )

    const threadsToFetch = allSearchResults
      .filter(result => result.threadId)
      .map(result => ({
        threadId: result.threadId!,
        subreddit: result.redditUrl.match(/\/r\/([^\/]+)\//)?.[1],
        keyword: result.keyword, // Track which keyword led to this thread
        searchResultId: result.redditUrl // Use URL as temporary ID
      }))

    let commentsGeneratedCount = 0
    let totalScoreSum = 0
    let threadsProcessed = 0

    // Process threads one by one
    for (const threadToFetch of threadsToFetch) {
      try {
        console.log(`\n🔍 [WORKFLOW] Processing thread ${threadsProcessed + 1}/${threadsToFetch.length}`)
        console.log(`🔍 [WORKFLOW] Thread ID: ${threadToFetch.threadId}, Subreddit: ${threadToFetch.subreddit || 'unknown'}, Keyword: ${threadToFetch.keyword}`)
        
        // Fetch individual thread
        const { fetchRedditThreadAction } = await import("@/actions/integrations/reddit/reddit-actions")
        const fetchResult = await fetchRedditThreadAction(threadToFetch.threadId, threadToFetch.subreddit)
        
        if (!fetchResult.isSuccess) {
          console.error(`❌ [WORKFLOW] Failed to fetch thread ${threadToFetch.threadId}: ${fetchResult.message}`)
          continue
        }

        const apiThread = fetchResult.data
        console.log(`✅ [WORKFLOW] Fetched thread: "${apiThread.title}" by u/${apiThread.author}, Score: ${apiThread.score}`)

        // Fetch comments from the thread to analyze tone
        console.log(`💬 [WORKFLOW] Fetching comments from thread for tone analysis...`)
        const { fetchRedditCommentsAction } = await import("@/actions/integrations/reddit/reddit-actions")
        const commentsResult = await fetchRedditCommentsAction(
          threadToFetch.threadId,
          threadToFetch.subreddit || apiThread.subreddit,
          "best",
          10 // Get top 10 comments for tone analysis
        )
        
        let existingComments: string[] = []
        if (commentsResult.isSuccess && commentsResult.data.length > 0) {
          existingComments = commentsResult.data
            .filter(comment => comment.body && comment.body !== "[deleted]" && comment.body !== "[removed]")
            .map(comment => comment.body)
            .slice(0, 10) // Take up to 10 comments
          console.log(`✅ [WORKFLOW] Fetched ${existingComments.length} comments for tone analysis`)
        } else {
          console.log(`⚠️ [WORKFLOW] No comments fetched for tone analysis`)
        }

        // Save thread to Firestore
        const threadRef = doc(collection(db, LEAD_COLLECTIONS.REDDIT_THREADS))
        const threadDocData = {
          id: threadRef.id,
          campaignId,
          searchResultId: threadToFetch.searchResultId,
          threadId: apiThread.id,
          subreddit: apiThread.subreddit,
          title: apiThread.title,
          content: apiThread.content,
          author: apiThread.author,
          score: apiThread.score,
          numComments: apiThread.numComments,
          url: apiThread.url,
          processed: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        
        console.log(`💾 [WORKFLOW] Saving thread to Firestore with ID: ${threadRef.id}`)
        await setDoc(threadRef, removeUndefinedValues(threadDocData))
        console.log(`✅ [WORKFLOW] Thread saved to Firestore`)

        // Immediately score and generate comment with tone analysis
        console.log(`🤖 [WORKFLOW] Starting AI scoring for thread: "${apiThread.title}"`)
        const { scoreThreadAndGeneratePersonalizedCommentsAction } = await import("@/actions/integrations/openai/openai-actions")
        const scoringResult = await scoreThreadAndGeneratePersonalizedCommentsAction(
          apiThread.title,
          apiThread.content,
          apiThread.subreddit,
          campaign.userId, // Pass userId for personalization
          existingComments // Pass existing comments for tone matching
        )

        if (scoringResult.isSuccess) {
          const scoringData = scoringResult.data
          console.log(`✅ [WORKFLOW] AI Scoring complete - Score: ${scoringData.score}/100`)
          console.log(`📝 [WORKFLOW] Reasoning: ${scoringData.reasoning}`)
          
          // Prepare comment data with keyword tracking
          const commentPayload: CreateGeneratedCommentData = {
            campaignId,
            redditThreadId: threadRef.id,
            threadId: apiThread.id,
            postUrl: apiThread.url,
            postTitle: apiThread.title,
            postAuthor: apiThread.author,
            postContentSnippet: apiThread.content.substring(0, 200),
            relevanceScore: scoringData.score,
            reasoning: scoringData.reasoning,
            microComment: scoringData.microComment,
            mediumComment: scoringData.mediumComment,
            verboseComment: scoringData.verboseComment,
            status: "new",
            keyword: threadToFetch.keyword, // Track which keyword found this
                          postScore: apiThread.score, // Track Reddit post score
              postCreatedAt: apiThread.created ? Timestamp.fromDate(new Date(apiThread.created * 1000)) : undefined // Convert Unix timestamp to Firestore Timestamp
          }

          console.log(`💾 [WORKFLOW] Saving generated comment to Firestore...`)
          console.log(`💾 [WORKFLOW] With keyword: ${threadToFetch.keyword}, score: ${apiThread.score}`)
          const saveCommentResult = await createGeneratedCommentAction(commentPayload)
          
          if (saveCommentResult.isSuccess) {
            commentsGeneratedCount++
            totalScoreSum += scoringData.score
            console.log(`✅ [WORKFLOW] Comment saved successfully for thread: "${apiThread.title}"`)
            console.log(`✅ [WORKFLOW] Total comments generated so far: ${commentsGeneratedCount}`)
            
            // Update campaign progress
            await updateCampaignAction(campaignId, {
              totalThreadsAnalyzed: threadsProcessed + 1,
              totalCommentsGenerated: commentsGeneratedCount
            })
          } else {
            console.error(`❌ [WORKFLOW] Failed to save comment: ${saveCommentResult.message}`)
          }
        } else {
          console.error(`❌ [WORKFLOW] Failed to score thread: ${scoringResult.message}`)
        }

        threadsProcessed++
        progress.currentStep = `Processing threads (${threadsProcessed}/${threadsToFetch.length})`
        
        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`❌ [WORKFLOW] Error processing thread ${threadToFetch.threadId}:`, error)
      }
    }

    // Update campaign with final counts
    await updateCampaignAction(campaignId, {
      totalCommentsGenerated: commentsGeneratedCount,
      status: commentsGeneratedCount > 0 ? "completed" : "error"
    })

    progress.results.push({
      step: "Score and Generate Comments",
      success: commentsGeneratedCount > 0,
      message: `Generated ${commentsGeneratedCount} comments individually`,
      data: {
        commentsGenerated: commentsGeneratedCount,
        averageScore: commentsGeneratedCount > 0 ? totalScoreSum / commentsGeneratedCount : 0
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
        totalThreadsAnalyzed: threadsProcessed,
        totalCommentsGenerated: commentsGeneratedCount,
        keywordLimits: Object.keys(keywordLimits).length > 0 ? keywordLimits : "All keywords processed"
      }
    })

    console.log(`✅ Workflow completed for campaign: ${campaignId}`)

    return {
      isSuccess: true,
      message: "Lead generation workflow completed successfully",
      data: progress
    }
  } catch (error) {
    console.error("Error in lead generation workflow:", error)
    await updateCampaignAction(campaignId, { status: "error" })

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
    console.log("🧪 Testing all API integrations...")

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

    // Test Reddit
    try {
      const { testRedditConnectionAction } = await import(
        "@/actions/integrations/reddit/reddit-actions"
      )
      const redditTest = await testRedditConnectionAction()
      results.reddit = redditTest.isSuccess
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
    console.error("Error testing integrations:", error)
    return {
      isSuccess: false,
      message: `Integration test failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}
