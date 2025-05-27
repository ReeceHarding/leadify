/*
<ai_context>
Contains server actions for OpenAI API interactions including comment generation and thread analysis.
</ai_context>
*/

"use server"

import { generateObject, generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import {
  ActionState,
  ThreeTierCommentResult,
  ReplyGenerationResult,
  InformationCombiningResult
} from "@/types"

import { scrapeWebsiteAction } from "@/actions/integrations/firecrawl/website-scraping-actions"
import OpenAI from "openai"


// Schema for thread scoring and comment generation
const ThreadAnalysisSchema = z.object({
  score: z.number().min(1).max(100),
  reasoning: z.string(),
  microComment: z.string(),
  mediumComment: z.string(),
  verboseComment: z.string()
})

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

    // Log the full context being sent
    console.log("🔍🔍🔍 [SCORING-PROMPT] ========== FULL PROMPT START ==========")
    console.log("🔍🔍🔍 [SCORING-PROMPT] Timestamp:", new Date().toISOString())
    console.log("🔍🔍🔍 [SCORING-PROMPT] Thread Title:", threadTitle)
    console.log("🔍🔍🔍 [SCORING-PROMPT] Subreddit:", subreddit)
    console.log("🔍🔍🔍 [SCORING-PROMPT] Thread Content Length:", threadContent.length)
    console.log("🔍🔍🔍 [SCORING-PROMPT] Website Content Length:", websiteContent.length)
    console.log("🔍🔍🔍 [SCORING-PROMPT] ========== WEBSITE CONTENT ==========")
    console.log(websiteContent.slice(0, 2000))
    console.log("🔍🔍🔍 [SCORING-PROMPT] ========== THREAD CONTENT ==========")
    console.log(threadContent.slice(0, 2000))

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
- NEVER USE HYPHENS (-) anywhere in your comments

PRIORITIZE AUTHENTICITY AND VALUE. Most threads should score 30-60 unless they're perfect matches.`

    // Log the full prompt being sent
    console.log("🔍🔍🔍 [SCORING-PROMPT] ========== FULL PROMPT TEXT ==========")
    console.log(prompt)
    console.log("🔍🔍🔍 [SCORING-PROMPT] ========== PROMPT END ==========")
    console.log("🔍🔍🔍 [SCORING-PROMPT] Model: o3-mini")
    console.log("🔍🔍🔍 [SCORING-PROMPT] Reasoning Effort: medium")

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

    // Log the AI response
    console.log("🔍🔍🔍 [SCORING-RESULT] ========== AI RESPONSE ==========")
    console.log("🔍🔍🔍 [SCORING-RESULT] Score:", result.score)
    console.log("🔍🔍🔍 [SCORING-RESULT] Reasoning:", result.reasoning)
    console.log("🔍🔍🔍 [SCORING-RESULT] Micro Comment Length:", result.microComment.length)
    console.log("🔍🔍🔍 [SCORING-RESULT] Medium Comment Length:", result.mediumComment.length)
    console.log("🔍🔍🔍 [SCORING-RESULT] Verbose Comment Length:", result.verboseComment.length)
    console.log("🔍🔍🔍 [SCORING-RESULT] ========== RESPONSE END ==========")

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
  toneInstruction: string,
  organizationId: string,
  postUrl?: string // Add optional postUrl parameter
): Promise<
  ActionState<{
    microComment: string
    mediumComment: string
    verboseComment: string
  }>
> {
  try {
    console.log("🎨 [TONE-REGENERATE] Starting tone-based regeneration")
    console.log("🎨 [TONE-REGENERATE] Tone instruction:", toneInstruction)

    // Try to fetch existing comments if we have a post URL
    let existingComments: string[] = []
    if (postUrl) {
      console.log(
        "🎨 [TONE-REGENERATE] Fetching existing comments from post..."
      )

      // Extract thread ID from URL
      const threadIdMatch = postUrl.match(/\/comments\/([a-zA-Z0-9]+)/)
      if (threadIdMatch) {
        const threadId = threadIdMatch[1]
        const { fetchRedditCommentsAction } = await import(
          "@/actions/integrations/reddit/reddit-actions"
        )

        const commentsResult = await fetchRedditCommentsAction(
          organizationId,
          threadId,
          subreddit,
          "best",
          10
        )

        if (commentsResult.isSuccess && commentsResult.data.length > 0) {
          existingComments = commentsResult.data
            .filter(
              comment =>
                comment.body &&
                comment.body !== "[deleted]" &&
                comment.body !== "[removed]"
            )
            .map(comment => comment.body)
            .slice(0, 10)
          console.log(
            `✅ [TONE-REGENERATE] Fetched ${existingComments.length} comments for tone analysis`
          )
        }
      }
    }

    // Analyze existing comments for tone if available
    let toneAnalysis = ""
    if (existingComments.length > 0) {
      console.log(
        "🔍 [TONE-REGENERATE] Analyzing existing comments for tone..."
      )

      const tonePrompt = `Analyze these Reddit comments and describe the tone, style, and language patterns:

${existingComments.join("\n\n---\n\n")}

Provide a brief analysis of:
1. Overall tone (casual, formal, humorous, etc.)
2. Common language patterns (slang, abbreviations, etc.)
3. Typical comment length
4. Grammar style (perfect vs casual)
5. How people give recommendations`

      const toneResult = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: tonePrompt,
        temperature: 0.3,
        maxTokens: 300
      })

      toneAnalysis = toneResult.text
      console.log("✅ [TONE-REGENERATE] Tone analysis complete")
    }

    const systemPrompt = `You are a Reddit comment generator. Your job is to create natural, authentic comments that match the community's style.

Business Context: ${websiteContent.substring(0, 1000)}

${toneAnalysis ? `\nCommunity Tone Analysis:\n${toneAnalysis}\n` : ""}

USER'S TONE INSTRUCTION: ${toneInstruction}

CRITICAL RULES:
- Follow the user's tone instruction above all else
- Match the casual tone and style of Reddit
- Use imperfect grammar if appropriate
- Never sound like a marketing bot
- Be genuinely helpful first
- Keep it conversational and authentic
- NEVER USE HYPHENS (-) anywhere in your comments`

    const userPrompt = `Thread Title: ${threadTitle}
Thread Content: ${threadContent}
Subreddit: r/${subreddit}

${existingComments.length > 0 ? `\nExample comments from this thread:\n${existingComments.slice(0, 3).join("\n---\n")}` : ""}

Generate three comments following the tone instruction:
1. Micro (1-2 sentences, super casual)
2. Medium (3-4 sentences, helpful but natural)
3. Verbose (5-7 sentences, detailed but still authentic)

Return as JSON:
{
  "microComment": "comment text",
  "mediumComment": "comment text",
  "verboseComment": "comment text"
}`

    console.log("🎨 [TONE-REGENERATE] Generating comments with custom tone...")
    const result = await generateText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.8, // Higher temperature for more creative variation
      maxTokens: 1200
    })

    // Parse the response
    const text = result.text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from response")
    }

    const parsed = JSON.parse(jsonMatch[0])
    console.log(
      "✅ [TONE-REGENERATE] Successfully regenerated comments with custom tone"
    )

    return {
      isSuccess: true,
      message: "Comments regenerated with custom tone",
      data: {
        microComment: parsed.microComment,
        mediumComment: parsed.mediumComment,
        verboseComment: parsed.verboseComment
      }
    }
  } catch (error) {
    console.error("❌ [TONE-REGENERATE] Error:", error)
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
  organizationId: string,
  campaignWebsiteContent?: string,
  existingComments?: string[]
): Promise<
  ActionState<{
    score: number
    reasoning: string
    microComment: string
    mediumComment: string
    verboseComment: string
  }>
> {
  try {
    console.log(
      "🤖 [OPENAI-PERSONALIZED] Starting personalized scoring and comment generation"
    )
    console.log("🤖 [OPENAI-PERSONALIZED] Thread title:", threadTitle)
    console.log("🤖 [OPENAI-PERSONALIZED] Subreddit:", subreddit)
    console.log("🤖 [OPENAI-PERSONALIZED] Organization ID:", organizationId)
    console.log(
      "🤖 [OPENAI-PERSONALIZED] Existing comments provided:",
      existingComments?.length || 0
    )

    // Get organization data for personalization
    const { getOrganizationByIdAction } = await import("@/actions/db/organizations-actions")
    const { getKnowledgeBaseByOrganizationIdAction, getVoiceSettingsByOrganizationIdAction } = await import("@/actions/db/personalization-actions")
    
    const orgResult = await getOrganizationByIdAction(organizationId)
    if (!orgResult.isSuccess || !orgResult.data) {
      console.error("❌ [OPENAI-PERSONALIZED] Failed to get organization")
      return { isSuccess: false, message: "Failed to get organization" }
    }

    const organization = orgResult.data
    const businessWebsiteUrl = organization.website || ""
    const businessName = organization.name || "our solution"

    console.log(
      "🤖 [OPENAI-PERSONALIZED] Business name from organization:",
      businessName
    )
    console.log(
      "🤖 [OPENAI-PERSONALIZED] Organization website:",
      businessWebsiteUrl
    )
    console.log(
      "🤖 [OPENAI-PERSONALIZED] Campaign website content provided:",
      !!campaignWebsiteContent
    )

    // Get knowledge base for the organization
    const knowledgeBaseResult = await getKnowledgeBaseByOrganizationIdAction(organizationId)
    let knowledgeBaseSummary = ""
    if (knowledgeBaseResult.isSuccess && knowledgeBaseResult.data) {
      knowledgeBaseSummary = knowledgeBaseResult.data.summary || ""
      console.log("✅ [OPENAI-PERSONALIZED] Found knowledge base for organization")
    }

    // Get voice settings for the organization
    const voiceSettingsResult = await getVoiceSettingsByOrganizationIdAction(organizationId)
    let voicePrompt = ""
    if (voiceSettingsResult.isSuccess && voiceSettingsResult.data) {
      voicePrompt = voiceSettingsResult.data.generatedPrompt || ""
      console.log("✅ [OPENAI-PERSONALIZED] Found voice settings for organization")
    }

    // Prioritize campaign-specific content, then knowledge base, then organization website
    let primaryBusinessContent = campaignWebsiteContent || knowledgeBaseSummary || ""
    let contentSource = campaignWebsiteContent ? "campaign" : (knowledgeBaseSummary ? "knowledge_base" : "organization_website")

    if (!primaryBusinessContent && businessWebsiteUrl) {
      console.log(
        "🌐 [OPENAI-PERSONALIZED] No campaign content or knowledge base, scraping organization website:",
        businessWebsiteUrl
      )
      const scrapeResult = await scrapeWebsiteAction(businessWebsiteUrl)
      if (scrapeResult.isSuccess) {
        primaryBusinessContent = scrapeResult.data.content
        contentSource = "organization_scraped"
        console.log(
          "✅ [OPENAI-PERSONALIZED] Organization website scraped successfully"
        )
      } else {
        console.warn(
          "⚠️ [OPENAI-PERSONALIZED] Failed to scrape organization website"
        )
      }
    } else if (primaryBusinessContent) {
      console.log(
        `✅ [OPENAI-PERSONALIZED] Using ${contentSource} content`
      )
    }

    if (!primaryBusinessContent) {
      console.warn(
        "⚠️ [OPENAI-PERSONALIZED] No business content available for AI. Using generic approach."
      )
      // Potentially, we could have a very generic prompt here or return an error/low score.
      // For now, we'll proceed, and the AI will have less context.
    }

    // Analyze existing comments for tone and style
    let toneAnalysis = ""
    if (existingComments && existingComments.length > 0) {
      console.log(
        "🔍 [OPENAI-PERSONALIZED] Analyzing existing comments for tone..."
      )

      const tonePrompt = `Analyze these Reddit comments and describe the tone, style, and language patterns:

${existingComments.slice(0, 10).join("\n\n---\n\n")}

Provide a brief analysis of:
1. Overall tone (casual, formal, humorous, etc.)
2. Common language patterns (slang, abbreviations, etc.)
3. Typical comment length
4. Grammar style (perfect vs casual)
5. How people give recommendations`

      const toneResult = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: tonePrompt,
        temperature: 0.3,
        maxTokens: 300
      })

      toneAnalysis = toneResult.text
      console.log(
        "✅ [OPENAI-PERSONALIZED] Tone analysis complete:",
        toneAnalysis
      )
    }

    // Log the full context being sent
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== FULL CONTEXT START ==========")
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Timestamp:", new Date().toISOString())
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Thread Title:", threadTitle)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Subreddit:", subreddit)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Thread Content Length:", threadContent.length)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Business Name:", businessName)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Content Source:", contentSource)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Business Content Length:", primaryBusinessContent.length)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Voice Prompt Length:", voicePrompt.length)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Tone Analysis Length:", toneAnalysis.length)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Existing Comments Count:", existingComments?.length || 0)
    
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== BUSINESS CONTENT ==========")
    console.log(primaryBusinessContent.substring(0, 1500))
    
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== VOICE PROMPT ==========")
    console.log(voicePrompt || "No voice prompt configured")
    
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== TONE ANALYSIS ==========")
    console.log(toneAnalysis || "No tone analysis performed")
    
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== THREAD CONTENT ==========")
    console.log(threadContent.slice(0, 2000))
    
    if (existingComments && existingComments.length > 0) {
      console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== EXAMPLE COMMENTS ==========")
      existingComments.slice(0, 3).forEach((comment, i) => {
        console.log(`Comment ${i + 1}:`, comment)
      })
    }

    const systemPrompt = `You are a Reddit comment analyzer and generator. Your job is to:
1. Score how relevant a Reddit thread is for promoting ${businessName}
2. Generate natural, authentic Reddit comments that match the community's style

${primaryBusinessContent ? `Business Context: ${primaryBusinessContent.substring(0, 1500)}` : "The business offers general solutions."}

${voicePrompt ? `\nVoice Instructions:\n${voicePrompt}\n` : ""}

${toneAnalysis ? `\nCommunity Tone Analysis:\n${toneAnalysis}\n` : ""}

CRITICAL COMMENT STRUCTURE:
You are someone who has been in the same situation as the OP and has tried multiple solutions. You should:
1. Show empathy - you've been there
2. Share that you've tried 3 different approaches:
   - A FREE option (what worked/didn't work about it)
   - A REASONABLE option (which happens to be ${businessName} - share specific benefits)
   - A PREMIUM option (acknowledge it's good but maybe overkill for most)
3. Present all options neutrally without pushing any particular one
4. Be genuinely helpful - you're sharing your experience, not selling

CRITICAL RULES FOR COMMENTS:
- Match the casual tone and style of the subreddit
- Use imperfect grammar if that's the norm
- Include typos or casual language if appropriate
- Never sound like a marketing bot
- Be genuinely helpful first, mention the business naturally
- Use Reddit-style formatting and language
- Keep it conversational and authentic
- NEVER USE HYPHENS (-) anywhere in your comments
- Present all three options fairly - don't oversell any one solution`

    const userPrompt = `Thread Title: ${threadTitle}
Thread Content: ${threadContent}
Subreddit: r/${subreddit}

${existingComments && existingComments.length > 0 ? `\nExample comments from this thread:\n${existingComments.slice(0, 5).join("\n---\n")}` : ""}

Score this thread (0-100) for relevance to ${businessName} and generate three comments following the structure of someone who has tried multiple solutions:

1. Micro (1-2 sentences): Quick mention that you've tried a few things and ${businessName} worked well
2. Medium (3-4 sentences): Brief story - tried free option (name it), then ${businessName} (what specifically helped), also aware of premium option
3. Verbose (5-7 sentences): Full journey - your struggle, the free tool you tried first (pros/cons), how you found ${businessName} and what made it work for you, mention of premium alternative for completeness, offer to help

Remember: Write like someone genuinely sharing their experience. You're not a salesperson, you're a fellow redditor who found something that worked.

Return as JSON:
{
  "score": number,
  "reasoning": "why this score",
  "microComment": "comment text",
  "mediumComment": "comment text",
  "verboseComment": "comment text"
}`

    // Log the full prompts being sent
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== SYSTEM PROMPT ==========")
    console.log(systemPrompt)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== USER PROMPT ==========")
    console.log(userPrompt)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== PROMPT END ==========")
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Model: gpt-4o")
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Temperature: 0.7")
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Max Tokens: 1500")

    console.log("🤖 [OPENAI-PERSONALIZED] Generating personalized comments...")
    const result = await generateText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxTokens: 1500
    })

    console.log("🤖 [OPENAI-PERSONALIZED] Raw response received")

    // Parse the response
    const text = result.text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from response")
    }

    const parsed = JSON.parse(jsonMatch[0])
    
    // Log the AI response
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] ========== AI RESPONSE ==========")
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Score:", parsed.score)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Reasoning:", parsed.reasoning)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Micro Comment Length:", parsed.microComment.length)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Micro Comment:", parsed.microComment)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Medium Comment Length:", parsed.mediumComment.length)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Medium Comment:", parsed.mediumComment)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Verbose Comment Length:", parsed.verboseComment.length)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Verbose Comment:", parsed.verboseComment)
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] ========== RESPONSE END ==========")
    
    console.log("✅ [OPENAI-PERSONALIZED] Successfully parsed response")
    console.log("📊 [OPENAI-PERSONALIZED] Score:", parsed.score)

    return {
      isSuccess: true,
      message: "Thread scored and personalized comments generated",
      data: {
        score: parsed.score,
        reasoning: parsed.reasoning,
        microComment: parsed.microComment,
        mediumComment: parsed.mediumComment,
        verboseComment: parsed.verboseComment
      }
    }
  } catch (error) {
    console.error("❌ [OPENAI-PERSONALIZED] Error:", error)
    return {
      isSuccess: false,
      message: `Failed to score thread: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

// Schema for information combining
const InformationCombiningSchema = z.object({
  combinedInformation: z.string()
})

export async function combineInformationAction(
  oldInformation: string,
  newInformation: string
): Promise<ActionState<InformationCombiningResult>> {
  try {
    console.log("🤖 [INFO-COMBINE] Starting combineInformationAction")
    console.log("🤖 [INFO-COMBINE] Old info length:", oldInformation.length)
    console.log("🤖 [INFO-COMBINE] New info length:", newInformation.length)

    const prompt = `You are an expert at combining and organizing business information. Your task is to intelligently merge old and new information about a business.

OLD INFORMATION:
${oldInformation}

NEW INFORMATION TO ADD:
${newInformation}

YOUR TASK:
Combine the old and new information into a comprehensive, well-organized description. Follow these guidelines:

1. MERGE COMPLEMENTARY INFORMATION: If both pieces contain similar information, combine them intelligently
2. PRESERVE UNIQUE DETAILS: Keep all unique details from both sources
3. RESOLVE CONFLICTS: If there are contradictions, prioritize the newer information but note important differences
4. ORGANIZE LOGICALLY: Structure the combined information in a logical flow
5. REMOVE REDUNDANCY: Eliminate duplicate information while preserving nuance
6. MAINTAIN COMPLETENESS: Ensure no important details are lost

The result should be a comprehensive, well-written description that incorporates the best of both sources.

IMPORTANT: Return only the combined information text, no additional commentary or formatting.`

    const { object } = await generateObject({
      model: openai("o3-mini"),
      schema: InformationCombiningSchema,
      prompt,
      providerOptions: {
        openai: { reasoningEffort: "medium" }
      }
    })

    console.log("✅ [INFO-COMBINE] Information combined successfully")
    console.log(
      "✅ [INFO-COMBINE] Combined length:",
      object.combinedInformation.length
    )

    return {
      isSuccess: true,
      message: "Information combined successfully",
      data: {
        combinedInformation: object.combinedInformation
      }
    }
  } catch (error) {
    console.error("❌ [INFO-COMBINE] Error combining information:", error)
    return {
      isSuccess: false,
      message: `Failed to combine information: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}
