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
import { scrapeWebsiteAction } from "@/actions/integrations/firecrawl-actions"
import { searchMultipleKeywordsAction } from "@/actions/integrations/google-search-actions"
import { fetchMultipleRedditThreadsAction } from "@/actions/integrations/reddit-actions"
import { batchScoreThreadsWithThreeTierCommentsAction } from "@/actions/integrations/openai-actions"
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
  writeBatch
} from "firebase/firestore"
import { removeUndefinedValues } from "@/lib/firebase-utils"
import { createGeneratedCommentAction } from "@/actions/db/lead-generation-actions"
import { scoreThreadAndGenerateThreeTierCommentsAction } from "@/actions/integrations/openai-actions"

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

    const campaignResult = await getCampaignByIdAction(campaignId)
    if (!campaignResult.isSuccess) {
      progress.error = campaignResult.message
      return { isSuccess: false, message: campaignResult.message }
    }

    const campaign = campaignResult.data
    await updateCampaignAction(campaignId, { status: "running" })

    progress.results.push({
      step: "Load Campaign",
      success: true,
      message: `Campaign "${campaign.name}" loaded successfully`,
      data: { campaignName: campaign.name, keywords: campaign.keywords }
    })
    progress.completedSteps++

    // Step 2: Scrape website content
    progress.currentStep = "Scraping website"
    console.log(`🔥 Step 2: Scraping website: ${campaign.website}`)

    let websiteContent = campaign.websiteContent
    let skipScraping = false

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
        step: "Scrape Website",
        success: true,
        message: `Website scraped: ${scrapeResult.data.content.length} characters`,
        data: {
          title: scrapeResult.data.title,
          contentLength: scrapeResult.data.content.length
        }
      })
    } else {
      progress.results.push({
        step: "Scrape Website",
        success: true,
        message: `Using cached website content: ${websiteContent?.length || 0} characters`,
        data: {
          cached: true,
          contentLength: websiteContent?.length || 0
        }
      })
    }

    // Ensure we have website content before proceeding
    if (!websiteContent) {
      progress.results.push({
        step: "Scrape Website",
        success: false,
        message: "No website content available"
      })
      await updateCampaignAction(campaignId, { status: "error" })
      progress.error = "No website content available"
      return { isSuccess: false, message: "No website content available" }
    }

    progress.completedSteps++

    // Step 3: Search for Reddit threads
    progress.currentStep = "Searching Reddit threads"
    console.log(
      `🔍 Step 3: Searching for Reddit threads with ${campaign.keywords.length} keywords`
    )

    const searchResult = await searchMultipleKeywordsAction(
      campaign.keywords,
      10
    )
    if (!searchResult.isSuccess) {
      progress.results.push({
        step: "Search Reddit",
        success: false,
        message: searchResult.message
      })
      await updateCampaignAction(campaignId, { status: "error" })
      progress.error = searchResult.message
      return {
        isSuccess: false,
        message: `Reddit search failed: ${searchResult.message}`
      }
    }

    // Save search results to database
    const allSearchResults = searchResult.data.flatMap(keywordResult =>
      keywordResult.results.map(result => ({
        campaignId,
        keyword: keywordResult.keyword,
        redditUrl: result.link,
        threadId: result.threadId,
        title: result.title,
        snippet: result.snippet,
        position: result.position
      }))
    )

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
        keywords: campaign.keywords.length
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
        const { fetchRedditThreadAction } = await import("@/actions/integrations/reddit-actions")
        const fetchResult = await fetchRedditThreadAction(threadToFetch.threadId, threadToFetch.subreddit)
        
        if (!fetchResult.isSuccess) {
          console.error(`❌ [WORKFLOW] Failed to fetch thread ${threadToFetch.threadId}: ${fetchResult.message}`)
          continue
        }

        const apiThread = fetchResult.data
        console.log(`✅ [WORKFLOW] Fetched thread: "${apiThread.title}" by u/${apiThread.author}, Score: ${apiThread.score}`)

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

        // Immediately score and generate comment
        console.log(`🤖 [WORKFLOW] Starting AI scoring for thread: "${apiThread.title}"`)
        const scoringResult = await scoreThreadAndGenerateThreeTierCommentsAction(
          apiThread.title,
          apiThread.content,
          apiThread.subreddit,
          websiteContent
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
            status: "new"
          }
          
          // Add extra fields that will be tracked
          const extendedPayload = {
            ...commentPayload,
            keyword: threadToFetch.keyword, // Track which keyword found this
            postScore: apiThread.score // Track Reddit post score
          }

          console.log(`💾 [WORKFLOW] Saving generated comment to Firestore...`)
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
        totalCommentsGenerated: commentsGeneratedCount
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
        "@/actions/integrations/firecrawl-actions"
      )
      const firecrawlTest = await testFirecrawlConnectionAction()
      results.firecrawl = firecrawlTest.isSuccess
    } catch {
      results.firecrawl = false
    }

    // Test Google Search
    try {
      const { testGoogleSearchConnectionAction } = await import(
        "@/actions/integrations/google-search-actions"
      )
      const googleTest = await testGoogleSearchConnectionAction()
      results.googleSearch = googleTest.isSuccess
    } catch {
      results.googleSearch = false
    }

    // Test Reddit
    try {
      const { testRedditConnectionAction } = await import(
        "@/actions/integrations/reddit-actions"
      )
      const redditTest = await testRedditConnectionAction()
      results.reddit = redditTest.isSuccess
    } catch {
      results.reddit = false
    }

    // Test OpenAI
    try {
      const { testOpenAIConnectionAction } = await import(
        "@/actions/integrations/openai-actions"
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
