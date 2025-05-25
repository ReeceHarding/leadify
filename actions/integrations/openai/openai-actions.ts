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

WEBSITE CONTENT TO PROMOTE:
${websiteContent.slice(0, 2000)}

REDDIT THREAD:
Subreddit: r/${subreddit}
Title: ${threadTitle}
Content: ${threadContent.slice(0, 2000)}

YOUR TASK:
1. First, analyze the website content to understand:
   - What company/service/product it represents
   - What problem it solves
   - Who their target audience is
   
2. Then critically score how relevant this Reddit thread is to that company/service (1-100)

3. If relevant (70+), generate comments as if you're a genuine user who has used this service

CRITICAL SCORING (1-100) - BE HARSH:
- 90-100: Thread directly asks for exactly what this company offers (rare)
- 70-89: Thread problem strongly aligns, your experience would be genuinely valuable
- 50-69: Some relevance but would feel forced or salesy to comment
- 30-49: Weak connection, commenting would be obvious self-promotion  
- 1-29: No relevant connection, would be spam to comment

GENERATE 3 COMMENT LENGTH OPTIONS (authentic, helpful, non-salesy):

ALWAYS GENERATE ALL THREE in this natural format:
1. MICRO COMMENT: Ultra-brief helpful tip based on your experience (5-15 words)
2. MEDIUM COMMENT: Share your experience trying different solutions:
   - Start with empathy ("I've been there..." or "I struggled with this too...")
   - Mention a free/basic option you tried first (what worked/didn't work)
   - Naturally mention how you found this company/service and what specifically helped
   - Mention a premium/alternative option for completeness
   - End with encouragement or offer to help
   (30-80 words total, conversational tone)
3. VERBOSE COMMENT: Comprehensive advice sharing your full journey:
   - Open with strong empathy and understanding
   - Detail your struggle with the problem
   - List solutions you tried with honest pros/cons:
     * Free/basic option you tried first
     * How you discovered and used this company/service (be specific)
     * Premium alternative for those with different needs
   - Share specific results or improvements you saw
   - Offer to answer questions or share more details
   (100-200 words, genuinely helpful tone)

CRITICAL RULES:
- Extract the company/service name from the website content - DO NOT use "Gauntlet AI"
- Write like a real person sharing their experience, not a salesperson
- Never use marketing language or superlatives
- Be honest about pros/cons of each option
- Focus on being helpful first, mentioning products second
- Use Reddit-appropriate casual language
- Never pressure or push any specific solution
- Keep the company mentions natural and contextual

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

WEBSITE CONTENT TO PROMOTE:
${websiteContent.slice(0, 2000)}

REDDIT THREAD:
Subreddit: r/${subreddit}
Title: ${threadTitle}
Content: ${threadContent.slice(0, 2000)}

YOUR TASK:
1. First, analyze the website content to understand:
   - What company/service/product it represents
   - What problem it solves
   - Who their target audience is
   
2. Then critically score how relevant this Reddit thread is to that company/service (1-100)

3. If relevant (70+), generate comments as if you're a genuine user who has used this service

CRITICAL SCORING (1-100) - BE HARSH:
- 90-100: Thread directly asks for exactly what this company offers (rare)
- 70-89: Thread problem strongly aligns, your experience would be genuinely valuable
- 50-69: Some relevance but would feel forced or salesy to comment
- 30-49: Weak connection, commenting would be obvious self-promotion  
- 1-29: No relevant connection, would be spam to comment

GENERATE 3 COMMENT LENGTH OPTIONS following the TONE INSTRUCTION above:

ALWAYS GENERATE ALL THREE in this natural format:
1. MICRO COMMENT: Ultra-brief helpful tip based on your experience (5-15 words)
2. MEDIUM COMMENT: Share your experience trying different solutions:
   - Start with empathy ("I've been there..." or "I struggled with this too...")
   - Mention a free/basic option you tried first (what worked/didn't work)
   - Naturally mention how you found this company/service and what specifically helped
   - Mention a premium/alternative option for completeness
   - End with encouragement or offer to help
   (30-80 words total, conversational tone)
3. VERBOSE COMMENT: Comprehensive advice sharing your full journey:
   - Open with strong empathy and understanding
   - Detail your struggle with the problem
   - List solutions you tried with honest pros/cons:
     * Free/basic option you tried first
     * How you discovered and used this company/service (be specific)
     * Premium alternative for those with different needs
   - Share specific results or improvements you saw
   - Offer to answer questions or share more details
   (100-200 words, genuinely helpful tone)

CRITICAL RULES:
- FOLLOW THE TONE INSTRUCTION PROVIDED
- Write like a real person sharing their experience, not a salesperson
- Never use marketing language or superlatives
- Be honest about pros/cons of each option
- Focus on being helpful first, mentioning products second
- Use Reddit-appropriate casual language
- Never pressure or push any specific solution
- Keep the company mentions natural and contextual

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

    console.log(`✅ Comments regenerated with custom tone: ${result.score}/100`)

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

// Schema for reply generation
const ReplyGenerationSchema = z.object({
  reply: z.string()
})

export interface ReplyGenerationResult {
  reply: string
}

export async function generateReplyToCommentAction(
  originalComment: string,
  replyToComment: string,
  replyAuthor: string,
  website: string,
  websiteContent: string
): Promise<ActionState<ReplyGenerationResult>> {
  try {
    console.log(`🤖 Generating AI reply to comment from u/${replyAuthor}`)

    const prompt = `You are a genuine Reddit user who previously shared helpful advice in this thread. Someone has replied to your comment and you want to continue the conversation naturally.

YOUR ORIGINAL COMMENT:
${originalComment}

REPLY FROM u/${replyAuthor}:
${replyToComment}

CONTEXT ABOUT YOU:
- You have personal experience with ${website}
- You shared your genuine experience to help others
- You want to continue being helpful without being pushy

YOUR TASK:
Generate a natural, conversational reply that:
1. Acknowledges their response appropriately
2. Answers any questions they might have asked
3. Provides additional helpful information if relevant
4. Maintains the same genuine, helpful tone as your original comment
5. Keeps it conversational and Reddit-appropriate

CRITICAL RULES:
- Be authentic and conversational
- Don't oversell or push anything
- If they're thanking you, accept graciously and offer to help further if needed
- If they have questions, answer helpfully with specific details
- If they're skeptical, acknowledge their concerns honestly
- Keep it brief unless they specifically asked for more details
- Use casual Reddit language (but professional)
- Never use marketing speak or superlatives

The reply should feel like a natural continuation of the conversation from someone who genuinely wants to help.`

    const { object } = await generateObject({
      model: openai("o3-mini"),
      schema: ReplyGenerationSchema,
      prompt,
      providerOptions: {
        openai: { reasoningEffort: "medium" }
      }
    })

    console.log(`✅ Generated reply: ${object.reply.slice(0, 50)}...`)

    return {
      isSuccess: true,
      message: "Reply generated successfully",
      data: {
        reply: object.reply
      }
    }
  } catch (error) {
    console.error("Error generating reply:", error)
    return {
      isSuccess: false,
      message: `Failed to generate reply: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

// NEW: Personalized comment generation using the personalization system
export async function scoreThreadAndGeneratePersonalizedCommentsAction(
  threadTitle: string,
  threadContent: string,
  subreddit: string,
  userId: string
): Promise<ActionState<ThreeTierCommentResult>> {
  try {
    console.log(
      `🎯 [PERSONALIZED] Generating personalized comments for user: ${userId}`
    )
    console.log(`🎯 [PERSONALIZED] Thread: "${threadTitle.slice(0, 50)}..."`)

    // Get user's personalization data
    const { getKnowledgeBaseByUserIdAction, getVoiceSettingsByUserIdAction } =
      await import("@/actions/db/personalization-actions")
    const { getProfileByUserIdAction } = await import(
      "@/actions/db/profiles-actions"
    )

    // Fetch all personalization data
    const [knowledgeBaseResult, voiceSettingsResult, profileResult] =
      await Promise.all([
        getKnowledgeBaseByUserIdAction(userId),
        getVoiceSettingsByUserIdAction(userId),
        getProfileByUserIdAction(userId)
      ])

    console.log(
      `🎯 [PERSONALIZED] Knowledge base found: ${knowledgeBaseResult.isSuccess}`
    )
    console.log(
      `🎯 [PERSONALIZED] Voice settings found: ${voiceSettingsResult.isSuccess}`
    )
    console.log(`🎯 [PERSONALIZED] Profile found: ${profileResult.isSuccess}`)

    // Build personalized context
    let businessContext = ""
    let writingStyle = ""
    let persona = "a genuine user who has experience with this service"

    // Add knowledge base information
    if (knowledgeBaseResult.isSuccess && knowledgeBaseResult.data) {
      const kb = knowledgeBaseResult.data
      businessContext += `BUSINESS INFORMATION:\n`

      if (kb.websiteUrl) {
        businessContext += `Website: ${kb.websiteUrl}\n`
      }

      if (kb.customInformation) {
        businessContext += `Additional Info: ${kb.customInformation}\n`
      }

      if (kb.summary) {
        businessContext += `Summary: ${kb.summary}\n`
      }

      if (kb.scrapedPages && kb.scrapedPages.length > 0) {
        businessContext += `Key Pages: ${kb.scrapedPages.join(", ")}\n`
      }
    }

    // Add profile information as fallback
    if (profileResult.isSuccess && profileResult.data) {
      const profile = profileResult.data
      if (profile.website && !businessContext.includes("Website:")) {
        businessContext += `Website: ${profile.website}\n`
      }
      if (profile.name) {
        businessContext += `Business Name: ${profile.name}\n`
      }
    }

    // Add voice settings
    if (voiceSettingsResult.isSuccess && voiceSettingsResult.data) {
      const voice = voiceSettingsResult.data

      // Set persona based on user's choice
      if (voice.personaType === "ceo") {
        persona =
          "a CEO/founder who built this solution and wants to help others"
      } else if (voice.personaType === "user") {
        persona = "a satisfied customer who had great results with this service"
      } else if (voice.personaType === "subtle") {
        persona = "someone who subtly recommends solutions without being pushy"
      } else if (voice.personaType === "custom" && voice.customPersona) {
        persona = voice.customPersona
      }

      // Build writing style instructions
      const styleElements = []

      // Add manual writing style description first (highest priority)
      if (voice.manualWritingStyleDescription) {
        styleElements.push(voice.manualWritingStyleDescription)
      }

      if (voice.useAllLowercase) styleElements.push("use mostly lowercase text")
      if (voice.useEmojis) styleElements.push("include relevant emojis")
      if (voice.useCasualTone)
        styleElements.push("write in a very casual, conversational tone")
      if (voice.useFirstPerson)
        styleElements.push("write in first person (I, me, my)")

      if (voice.customWritingStyle) {
        styleElements.push(voice.customWritingStyle)
      }

      if (styleElements.length > 0) {
        writingStyle = `WRITING STYLE: ${styleElements.join(", ")}\n`
      }

      // Add generated prompt if available
      if (voice.generatedPrompt) {
        writingStyle += `GENERATED STYLE PROMPT: ${voice.generatedPrompt}\n`
      }
    }

    console.log(
      `🎯 [PERSONALIZED] Business context length: ${businessContext.length}`
    )
    console.log(`🎯 [PERSONALIZED] Writing style: ${writingStyle}`)
    console.log(`🎯 [PERSONALIZED] Persona: ${persona}`)

    const prompt = `You are ${persona}. You want to help others by sharing what worked for you.

${businessContext}

${writingStyle}

REDDIT THREAD:
Subreddit: r/${subreddit}
Title: ${threadTitle}
Content: ${threadContent.slice(0, 2000)}

YOUR TASK:
1. First, analyze the business information to understand:
   - What company/service/product it represents
   - What problem it solves
   - Who their target audience is
   
2. Then critically score how relevant this Reddit thread is to that business (1-100)

3. If relevant (70+), generate comments using your personalized writing style and persona

CRITICAL SCORING (1-100) - BE HARSH:
- 90-100: Thread directly asks for exactly what this business offers (rare)
- 70-89: Thread problem strongly aligns, your experience would be genuinely valuable
- 50-69: Some relevance but would feel forced or salesy to comment
- 30-49: Weak connection, commenting would be obvious self-promotion  
- 1-29: No relevant connection, would be spam to comment

GENERATE 3 COMMENT LENGTH OPTIONS (authentic, helpful, non-salesy):

ALWAYS GENERATE ALL THREE in this natural format:
1. MICRO COMMENT: Ultra-brief helpful tip based on your experience (5-15 words)
2. MEDIUM COMMENT: Share your experience trying different solutions:
   - Start with empathy ("I've been there..." or "I struggled with this too...")
   - Mention a free/basic option you tried first (what worked/didn't work)
   - Naturally mention how you found this business/service and what specifically helped
   - Mention a premium/alternative option for completeness
   - End with encouragement or offer to help
   (30-80 words total, conversational tone)
3. VERBOSE COMMENT: Comprehensive advice sharing your full journey:
   - Open with strong empathy and understanding
   - Detail your struggle with the problem
   - List solutions you tried with honest pros/cons:
     * Free/basic option you tried first
     * How you discovered and used this business/service (be specific)
     * Premium alternative for those with different needs
   - Share specific results or improvements you saw
   - Offer to answer questions or share more details
   (100-200 words, genuinely helpful tone)

CRITICAL RULES:
- FOLLOW YOUR PERSONALIZED WRITING STYLE AND PERSONA EXACTLY
- Write like a real person sharing their experience, not a salesperson
- Never use marketing language or superlatives unless that's your style
- Be honest about pros/cons of each option
- Focus on being helpful first, mentioning products second
- Use Reddit-appropriate language that matches your style
- Never pressure or push any specific solution
- Keep the business mentions natural and contextual
- If you're a CEO/founder, be humble and focus on helping, not selling

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
      `✅ [PERSONALIZED] Thread scored: ${result.score}/100 with personalized style`
    )
    console.log(
      `✅ [PERSONALIZED] Reasoning: ${result.reasoning.slice(0, 100)}...`
    )

    return {
      isSuccess: true,
      message: "Personalized comments generated successfully",
      data: result
    }
  } catch (error) {
    console.error(
      "❌ [PERSONALIZED] Error generating personalized comments:",
      error
    )
    return {
      isSuccess: false,
      message: `Failed to generate personalized comments: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}
