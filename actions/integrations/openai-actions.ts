/*
<ai_context>
Contains server actions for OpenAI o3-mini API integration to critically score Reddit threads and generate three-tier comments.
</ai_context>
*/

"use server"

import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { ActionState } from "@/types"

// Schema for thread scoring and comment generation
const ThreadAnalysisSchema = z.object({
  score: z.number().min(1).max(100),
  reasoning: z.string(),
  microComment: z.string(),
  mediumComment: z.string(),
  verboseComment: z.string()
})

export interface ThreeTierCommentResult {
  score: number // 1-100
  reasoning: string
  microComment: string // Ultra-brief helpful advice (5-15 words)
  mediumComment: string // Balanced response with good detail (30-80 words)
  verboseComment: string // Comprehensive, valuable advice (100-200 words)
}

export async function scoreThreadAndGenerateThreeTierCommentsAction(
  threadTitle: string,
  threadContent: string,
  subreddit: string,
  websiteContent: string
): Promise<ActionState<ThreeTierCommentResult>> {
  try {
    console.log(
      `🤖 Critically scoring thread and generating 3-tier comments for: "${threadTitle.slice(0, 50)}..."`
    )

    const prompt = `You are a genuine Reddit user who has personally dealt with the problem being discussed and has tried many solutions. You want to help others by sharing what worked for you.

COMPANY CONTEXT (Your current solution - Gauntlet AI):
${websiteContent.slice(0, 2000)}

REDDIT THREAD:
Subreddit: r/${subreddit}
Title: ${threadTitle}
Content: ${threadContent.slice(0, 2000)}

CRITICAL SCORING (1-100) - BE HARSH:
- 90-100: Thread directly asks for exactly what Gauntlet AI offers (rare)
- 70-89: Thread problem strongly aligns, your experience would be genuinely valuable
- 50-69: Some relevance but would feel forced or salesy to comment
- 30-49: Weak connection, commenting would be obvious self-promotion  
- 1-29: No relevant connection, would be spam to comment

GENERATE 3 COMMENT LENGTH OPTIONS (only for scores 70+, authentic, helpful, non-salesy):

IF SCORE IS 70+, GENERATE ALL THREE in this natural format:
1. MICRO COMMENT: Ultra-brief helpful tip based on your experience (5-15 words)
2. MEDIUM COMMENT: Share your experience trying different solutions:
   - Start with empathy ("I've been there..." or "I struggled with this too...")
   - Mention a free option you tried (what worked/didn't work)
   - Mention Gauntlet AI as the medium option that worked for you (be specific about why)
   - Mention a premium/enterprise alternative for completeness
   - End with encouragement or offer to help
   (30-80 words total, conversational tone)
3. VERBOSE COMMENT: Comprehensive advice sharing your full journey:
   - Open with strong empathy and understanding
   - Detail your struggle with the problem
   - List solutions you tried with honest pros/cons:
     * Free option (GitHub tools, open source, etc.)
     * Gauntlet AI (what specifically helped you)
     * Premium option (for those with bigger budgets)
   - Share specific results or improvements you saw
   - Offer to answer questions or share more details
   (100-200 words, genuinely helpful tone)

IF SCORE IS BELOW 70:
1. MICRO COMMENT: Generic brief advice (5-15 words)
2. MEDIUM COMMENT: "Not recommended - low relevance score"
3. VERBOSE COMMENT: "Not recommended - low relevance score"

CRITICAL RULES:
- Write like a real person sharing their experience, not a salesperson
- Never use marketing language or superlatives
- Be honest about pros/cons of each option
- Focus on being helpful first, mentioning products second
- Use Reddit-appropriate casual language
- Never pressure or push any specific solution

PRIORITIZE AUTHENTICITY AND VALUE. Most threads should score 30-60 unless they're perfect matches.`

    const { object } = await generateObject({
      model: openai("o3-mini"),
      schema: ThreadAnalysisSchema,
      prompt,
      providerOptions: {
        openai: { reasoningEffort: "medium" }
      }
    })

    const result: ThreeTierCommentResult = {
      score: Math.max(1, Math.min(100, object.score)),
      reasoning: object.reasoning,
      microComment: object.microComment,
      mediumComment: object.mediumComment,
      verboseComment: object.verboseComment
    }

    console.log(
      `✅ Thread critically scored: ${result.score}/100 - ${result.reasoning.slice(0, 50)}...`
    )

    return {
      isSuccess: true,
      message: "Thread scored and three-tier comments generated successfully",
      data: result
    }
  } catch (error) {
    console.error("Error scoring thread and generating comments:", error)
    return {
      isSuccess: false,
      message: `Failed to score thread: ${error instanceof Error ? error.message : "Unknown error"}`
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

    console.log(
      `🤖 Batch scoring ${threads.length} threads with critical analysis...`
    )

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
        console.error(
          `Failed to score thread "${thread.threadTitle}":`,
          result.message
        )
      }

      // Add delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 3000)) // 3 second delay for o3-mini
    }

    const successCount = results.length
    const errorCount = errors.length

    console.log(
      `📊 Critical scoring complete: ${successCount} succeeded, ${errorCount} failed`
    )
    console.log(
      `📊 Average score: ${(results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1)}/100`
    )

    return {
      isSuccess: true,
      message: `Critically scored ${successCount} threads successfully, ${errorCount} failed`,
      data: results
    }
  } catch (error) {
    console.error("Error in batch scoring:", error)
    return {
      isSuccess: false,
      message: `Failed to batch score threads: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function testOpenAIConnectionAction(): Promise<
  ActionState<{ status: string }>
> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        isSuccess: false,
        message: "OpenAI API key not configured"
      }
    }

    // Test with o3-mini
    const { object } = await generateObject({
      model: openai("o3-mini"),
      schema: z.object({
        message: z.string()
      }),
      prompt: 'Say "Hello from o3-mini"',
      providerOptions: {
        openai: { reasoningEffort: "low" }
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
      message: `OpenAI o3-mini connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

// Legacy functions for backward compatibility
export async function scoreThreadRelevanceAndGenerateCommentAction(
  threadTitle: string,
  threadContent: string,
  subreddit: string,
  websiteContent: string
): Promise<
  ActionState<{ score: number; reasoning: string; generatedComment: string }>
> {
  const result = await scoreThreadAndGenerateThreeTierCommentsAction(
    threadTitle,
    threadContent,
    subreddit,
    websiteContent
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
): Promise<
  ActionState<
    Array<{ score: number; reasoning: string; generatedComment: string }>
  >
> {
  const result = await batchScoreThreadsWithThreeTierCommentsAction(
    threads,
    websiteContent
  )

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

export async function regenerateCommentsWithToneAction(
  threadTitle: string,
  threadContent: string,
  subreddit: string,
  websiteContent: string,
  toneInstruction: string
): Promise<ActionState<ThreeTierCommentResult>> {
  try {
    console.log(
      `🤖 Regenerating comments with custom tone for: "${threadTitle.slice(0, 50)}..."`
    )
    console.log(`🎨 Tone instruction: ${toneInstruction}`)

    const prompt = `You are a genuine Reddit user who has personally dealt with the problem being discussed and has tried many solutions. You want to help others by sharing what worked for you.

IMPORTANT TONE INSTRUCTION FROM USER: ${toneInstruction}

COMPANY CONTEXT (Your current solution - Gauntlet AI):
${websiteContent.slice(0, 2000)}

REDDIT THREAD:
Subreddit: r/${subreddit}
Title: ${threadTitle}
Content: ${threadContent.slice(0, 2000)}

CRITICAL SCORING (1-100) - BE HARSH:
- 90-100: Thread directly asks for exactly what Gauntlet AI offers (rare)
- 70-89: Thread problem strongly aligns, your experience would be genuinely valuable
- 50-69: Some relevance but would feel forced or salesy to comment
- 30-49: Weak connection, commenting would be obvious self-promotion  
- 1-29: No relevant connection, would be spam to comment

GENERATE 3 COMMENT LENGTH OPTIONS following the TONE INSTRUCTION above:

IF SCORE IS 70+, GENERATE ALL THREE in this natural format:
1. MICRO COMMENT: Ultra-brief helpful tip based on your experience (5-15 words)
2. MEDIUM COMMENT: Share your experience trying different solutions:
   - Start with empathy ("I've been there..." or "I struggled with this too...")
   - Mention a free option you tried (what worked/didn't work)
   - Mention Gauntlet AI as the medium option that worked for you (be specific about why)
   - Mention a premium/enterprise alternative for completeness
   - End with encouragement or offer to help
   (30-80 words total, conversational tone)
3. VERBOSE COMMENT: Comprehensive advice sharing your full journey:
   - Open with strong empathy and understanding
   - Detail your struggle with the problem
   - List solutions you tried with honest pros/cons:
     * Free option (GitHub tools, open source, etc.)
     * Gauntlet AI (what specifically helped you)
     * Premium option (for those with bigger budgets)
   - Share specific results or improvements you saw
   - Offer to answer questions or share more details
   (100-200 words, genuinely helpful tone)

IF SCORE IS BELOW 70:
1. MICRO COMMENT: Generic brief advice (5-15 words)
2. MEDIUM COMMENT: "Not recommended - low relevance score"
3. VERBOSE COMMENT: "Not recommended - low relevance score"

CRITICAL RULES:
- FOLLOW THE TONE INSTRUCTION PROVIDED
- Write like a real person sharing their experience, not a salesperson
- Never use marketing language or superlatives
- Be honest about pros/cons of each option
- Focus on being helpful first, mentioning products second
- Use Reddit-appropriate casual language
- Never pressure or push any specific solution

PRIORITIZE AUTHENTICITY AND VALUE. Most threads should score 30-60 unless they're perfect matches.`

    const { object } = await generateObject({
      model: openai("o3-mini"),
      schema: ThreadAnalysisSchema,
      prompt,
      providerOptions: {
        openai: { reasoningEffort: "medium" }
      }
    })

    const result: ThreeTierCommentResult = {
      score: Math.max(1, Math.min(100, object.score)),
      reasoning: object.reasoning,
      microComment: object.microComment,
      mediumComment: object.mediumComment,
      verboseComment: object.verboseComment
    }

    console.log(
      `✅ Comments regenerated with custom tone: ${result.score}/100`
    )

    return {
      isSuccess: true,
      message: "Comments regenerated with custom tone successfully",
      data: result
    }
  } catch (error) {
    console.error("Error regenerating comments with tone:", error)
    return {
      isSuccess: false,
      message: `Failed to regenerate comments: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}
