/*
<ai_context>
Contains server actions for OpenAI o3-mini API integration to critically score Reddit threads and generate three-tier comments.
</ai_context>
*/

"use server"

import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { ActionState } from "@/types"

// Schema for thread scoring and comment generation
const ThreadAnalysisSchema = z.object({
  score: z.number().min(1).max(100),
  reasoning: z.string(),
  freeComment: z.string(),
  mediumComment: z.string(), 
  premiumComment: z.string()
})

export interface ThreeTierCommentResult {
  score: number // 1-100
  reasoning: string
  freeComment: string      // Generic helpful comment
  mediumComment: string    // Subtle mention of Gauntlet AI
  premiumComment: string   // Natural integration of Gauntlet AI
}

export async function scoreThreadAndGenerateThreeTierCommentsAction(
  threadTitle: string,
  threadContent: string,
  subreddit: string,
  websiteContent: string
): Promise<ActionState<ThreeTierCommentResult>> {
  try {
    console.log(`🤖 Critically scoring thread and generating 3-tier comments for: "${threadTitle.slice(0, 50)}..."`)
    
    const prompt = `You are an extremely critical expert at analyzing Reddit threads for authentic lead generation opportunities.

COMPANY CONTEXT (Gauntlet AI from website):
${websiteContent.slice(0, 2000)}

REDDIT THREAD:
Subreddit: r/${subreddit}
Title: ${threadTitle}
Content: ${threadContent.slice(0, 2000)}

CRITICAL SCORING (1-100) - BE HARSH:
- 90-100: Thread directly asks for exactly what Gauntlet AI offers (rare)
- 70-89: Thread problem strongly aligns, CEO input would be genuinely valuable
- 50-69: Some relevance but would feel forced or salesy to comment
- 30-49: Weak connection, commenting would be obvious self-promotion  
- 1-29: No relevant connection, would be spam to comment

GENERATE 3 COMMENT TIERS (ULTRA-SHORT, authentic, helpful, non-salesy):

1. FREE COMMENT: Ultra-minimal helpful advice (1-10 words IDEAL, max 15 words)
2. MEDIUM COMMENT: Minimal advice with subtle CEO mention (1-10 words IDEAL, max 15 words)
3. PREMIUM COMMENT: Brief advice mentioning Gauntlet AI naturally (1-10 words IDEAL, max 20 words)

ALL COMMENTS MUST BE:
- EXTREMELY MINIMAL (1-10 words is PERFECT)
- Sound authentic and genuinely helpful
- Reddit-appropriate (casual, not corporate)
- Provide real value despite extreme brevity
- Never pushy or salesy
- Get straight to the core point
- If score is below 50, make comments very generic with minimal/no company mention

PRIORITIZE EXTREME BREVITY - EVERY WORD MUST COUNT. Most threads should score 30-60 unless they're perfect matches.`

    const { object } = await generateObject({
      model: openai('o3-mini'),
      schema: ThreadAnalysisSchema,
      prompt,
      providerOptions: {
        openai: { reasoningEffort: 'medium' }
      }
    })

    const result: ThreeTierCommentResult = {
      score: Math.max(1, Math.min(100, object.score)),
      reasoning: object.reasoning,
      freeComment: object.freeComment,
      mediumComment: object.mediumComment,
      premiumComment: object.premiumComment
    }

    console.log(`✅ Thread critically scored: ${result.score}/100 - ${result.reasoning.slice(0, 50)}...`)
    
    return {
      isSuccess: true,
      message: "Thread scored and three-tier comments generated successfully",
      data: result
    }
  } catch (error) {
    console.error("Error scoring thread and generating comments:", error)
    return { 
      isSuccess: false, 
      message: `Failed to score thread: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

export async function batchScoreThreadsWithThreeTierCommentsAction(
  threads: Array<{
    threadTitle: string
    threadContent: string
    subreddit: string
  }>,
  websiteContent: string
): Promise<ActionState<ThreeTierCommentResult[]>> {
  try {
    const results: ThreeTierCommentResult[] = []
    const errors: string[] = []
    
    console.log(`🤖 Batch scoring ${threads.length} threads with critical analysis...`)
    
    for (const thread of threads) {
      const result = await scoreThreadAndGenerateThreeTierCommentsAction(
        thread.threadTitle,
        thread.threadContent,
        thread.subreddit,
        websiteContent
      )
      
      if (result.isSuccess) {
        results.push(result.data)
      } else {
        errors.push(`${thread.threadTitle.slice(0, 30)}: ${result.message}`)
        console.error(`Failed to score thread "${thread.threadTitle}":`, result.message)
      }
      
      // Add delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 3000)) // 3 second delay for o3-mini
    }
    
    const successCount = results.length
    const errorCount = errors.length
    
    console.log(`📊 Critical scoring complete: ${successCount} succeeded, ${errorCount} failed`)
    console.log(`📊 Average score: ${(results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1)}/100`)
    
    return {
      isSuccess: true,
      message: `Critically scored ${successCount} threads successfully, ${errorCount} failed`,
      data: results
    }
  } catch (error) {
    console.error("Error in batch scoring:", error)
    return { 
      isSuccess: false, 
      message: `Failed to batch score threads: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

export async function testOpenAIConnectionAction(): Promise<ActionState<{ status: string }>> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { 
        isSuccess: false, 
        message: "OpenAI API key not configured" 
      }
    }

    // Test with o3-mini
    const { object } = await generateObject({
      model: openai('o3-mini'),
      schema: z.object({
        message: z.string()
      }),
      prompt: 'Say "Hello from o3-mini"',
      providerOptions: {
        openai: { reasoningEffort: 'low' }
      }
    })

    if (object.message) {
      return {
        isSuccess: true,
        message: "OpenAI o3-mini API connection test successful",
        data: { status: "connected" }
      }
    } else {
      return {
        isSuccess: false,
        message: "OpenAI o3-mini API test failed - no response"
      }
    }
  } catch (error) {
    console.error("Error testing OpenAI o3-mini connection:", error)
    return { 
      isSuccess: false, 
      message: `OpenAI o3-mini connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

// Legacy functions for backward compatibility
export async function scoreThreadRelevanceAndGenerateCommentAction(
  threadTitle: string,
  threadContent: string,
  subreddit: string,
  websiteContent: string
): Promise<ActionState<{ score: number; reasoning: string; generatedComment: string }>> {
  const result = await scoreThreadAndGenerateThreeTierCommentsAction(
    threadTitle, threadContent, subreddit, websiteContent
  )
  
  if (result.isSuccess) {
    return {
      isSuccess: true,
      message: result.message,
      data: {
        score: result.data.score,
        reasoning: result.data.reasoning,
        generatedComment: result.data.mediumComment // Use medium tier as default
      }
    }
  }
  
  return result as any
}

export async function batchScoreThreadsAction(
  threads: Array<{
    threadTitle: string
    threadContent: string
    subreddit: string
  }>,
  websiteContent: string
): Promise<ActionState<Array<{ score: number; reasoning: string; generatedComment: string }>>> {
  const result = await batchScoreThreadsWithThreeTierCommentsAction(threads, websiteContent)
  
  if (result.isSuccess) {
    return {
      isSuccess: true,
      message: result.message,
      data: result.data.map(r => ({
        score: r.score,
        reasoning: r.reasoning,
        generatedComment: r.mediumComment // Use medium tier as default
      }))
    }
  }
  
  return result as any
} 