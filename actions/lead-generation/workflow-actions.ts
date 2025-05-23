/*
<ai_context>
Contains the main workflow orchestrator for the Reddit lead generation process.
Coordinates Firecrawl, Google Search, Reddit API, and OpenAI integrations.
</ai_context>
*/

"use server"

import { ActionState } from "@/types"
import { updateCampaignAction, getCampaignByIdAction } from "@/actions/db/campaign-actions"
import { scrapeWebsiteAction } from "@/actions/integrations/firecrawl-actions"
import { searchMultipleKeywordsAction } from "@/actions/integrations/google-search-actions"
import { fetchMultipleRedditThreadsAction } from "@/actions/integrations/reddit-actions"
import { batchScoreThreadsAction } from "@/actions/integrations/openai-actions"
import { 
  LEAD_COLLECTIONS,
  CreateSearchResultData,
  CreateRedditThreadData,
  CreateGeneratedCommentData
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
    console.log(`🚀 Starting lead generation workflow for campaign: ${campaignId}`)
    
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
    
    const scrapeResult = await scrapeWebsiteAction(campaign.website)
    if (!scrapeResult.isSuccess) {
      progress.results.push({
        step: "Scrape Website",
        success: false,
        message: scrapeResult.message
      })
      await updateCampaignAction(campaignId, { status: "error" })
      progress.error = scrapeResult.message
      return { isSuccess: false, message: `Website scraping failed: ${scrapeResult.message}` }
    }

    // Update campaign with website content
    await updateCampaignAction(campaignId, { 
      websiteContent: scrapeResult.data.content 
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
    progress.completedSteps++

    // Step 3: Search for Reddit threads
    progress.currentStep = "Searching Reddit threads"
    console.log(`🔍 Step 3: Searching for Reddit threads with ${campaign.keywords.length} keywords`)
    
    const searchResult = await searchMultipleKeywordsAction(campaign.keywords, 10)
    if (!searchResult.isSuccess) {
      progress.results.push({
        step: "Search Reddit",
        success: false,
        message: searchResult.message
      })
      await updateCampaignAction(campaignId, { status: "error" })
      progress.error = searchResult.message
      return { isSuccess: false, message: `Reddit search failed: ${searchResult.message}` }
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

    // Step 4: Fetch Reddit thread content
    progress.currentStep = "Fetching Reddit content"
    console.log(`📖 Step 4: Fetching content for ${allSearchResults.length} Reddit threads`)
    
    const threadsToFetch = allSearchResults
      .filter(result => result.threadId)
      .map(result => ({
        threadId: result.threadId!,
        subreddit: result.redditUrl.match(/\/r\/([^\/]+)\//)?.[1]
      }))

    const fetchResult = await fetchMultipleRedditThreadsAction(threadsToFetch)
    if (!fetchResult.isSuccess) {
      progress.results.push({
        step: "Fetch Reddit Content",
        success: false,
        message: fetchResult.message
      })
      // Continue with partial data rather than failing completely
    }

    // Save Reddit thread data to database
    const redditThreads = fetchResult.data || []
    const threadBatch = writeBatch(db)
    
    for (const thread of redditThreads) {
      const threadRef = doc(collection(db, LEAD_COLLECTIONS.REDDIT_THREADS))
      const searchResult = allSearchResults.find(sr => sr.threadId === thread.id)
      
      if (searchResult) {
        const threadDoc = removeUndefinedValues({
          id: threadRef.id,
          campaignId,
          searchResultId: "unknown", // We'd need to track this better in production
          threadId: thread.id,
          subreddit: thread.subreddit,
          title: thread.title,
          content: thread.content,
          author: thread.author,
          score: thread.score,
          numComments: thread.numComments,
          url: thread.url,
          processed: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
        threadBatch.set(threadRef, threadDoc)
      }
    }
    await threadBatch.commit()

    await updateCampaignAction(campaignId, { 
      totalThreadsAnalyzed: redditThreads.length 
    })

    progress.results.push({
      step: "Fetch Reddit Content",
      success: true,
      message: `Fetched ${redditThreads.length} Reddit threads`,
      data: { 
        threadsFound: redditThreads.length,
        totalAttempted: threadsToFetch.length
      }
    })
    progress.completedSteps++

    // Step 5: Score threads and generate comments
    progress.currentStep = "Scoring and generating comments"
    console.log(`🤖 Step 5: Scoring threads and generating comments for ${redditThreads.length} threads`)
    
    const threadsForScoring = redditThreads.map(thread => ({
      threadTitle: thread.title,
      threadContent: thread.content,
      subreddit: thread.subreddit
    }))

    const scoringResult = await batchScoreThreadsAction(threadsForScoring, scrapeResult.data.content)
    if (!scoringResult.isSuccess) {
      progress.results.push({
        step: "Score and Generate Comments",
        success: false,
        message: scoringResult.message
      })
      await updateCampaignAction(campaignId, { status: "error" })
      progress.error = scoringResult.message
      return { isSuccess: false, message: `Comment generation failed: ${scoringResult.message}` }
    }

    // Save generated comments to database
    const commentBatch = writeBatch(db)
    const scoringResults = scoringResult.data || []
    
    for (let i = 0; i < scoringResults.length && i < redditThreads.length; i++) {
      const scoring = scoringResults[i]
      const thread = redditThreads[i]
      
      const commentRef = doc(collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS))
      const commentDoc = removeUndefinedValues({
        id: commentRef.id,
        campaignId,
        redditThreadId: "unknown", // Would need better tracking
        threadId: thread.id,
        relevanceScore: scoring.score,
        generatedComment: scoring.generatedComment,
        reasoning: scoring.reasoning,
        approved: false,
        used: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      commentBatch.set(commentRef, commentDoc)
    }
    await commentBatch.commit()

    await updateCampaignAction(campaignId, { 
      totalCommentsGenerated: scoringResults.length,
      status: "completed"
    })

    progress.results.push({
      step: "Score and Generate Comments",
      success: true,
      message: `Generated ${scoringResults.length} comments`,
      data: { 
        commentsGenerated: scoringResults.length,
        averageScore: scoringResults.reduce((sum, r) => sum + r.score, 0) / scoringResults.length
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
        totalThreadsAnalyzed: redditThreads.length,
        totalCommentsGenerated: scoringResults.length
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
    
    progress.error = error instanceof Error ? error.message : 'Unknown error'
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

export async function testAllIntegrationsAction(): Promise<ActionState<{ [key: string]: boolean }>> {
  try {
    console.log("🧪 Testing all API integrations...")
    
    const results: { [key: string]: boolean } = {}
    
    // Test Firecrawl
    try {
      const { testFirecrawlConnectionAction } = await import("@/actions/integrations/firecrawl-actions")
      const firecrawlTest = await testFirecrawlConnectionAction()
      results.firecrawl = firecrawlTest.isSuccess
    } catch {
      results.firecrawl = false
    }

    // Test Google Search
    try {
      const { testGoogleSearchConnectionAction } = await import("@/actions/integrations/google-search-actions")
      const googleTest = await testGoogleSearchConnectionAction()
      results.googleSearch = googleTest.isSuccess
    } catch {
      results.googleSearch = false
    }

    // Test Reddit
    try {
      const { testRedditConnectionAction } = await import("@/actions/integrations/reddit-actions")
      const redditTest = await testRedditConnectionAction()
      results.reddit = redditTest.isSuccess
    } catch {
      results.reddit = false
    }

    // Test OpenAI
    try {
      const { testOpenAIConnectionAction } = await import("@/actions/integrations/openai-actions")
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
      message: `Integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
} 