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
  websiteContent: string,
  existingComments?: string[]
): Promise<ActionState<ThreeTierCommentResult>> {
  try {
    console.log(
      `🤖 Critically scoring thread and generating 3-tier comments for: "${threadTitle.slice(0, 50)}..."`
    )

    // Log the full context being sent
    console.log(
      "🔍🔍🔍 [SCORING-PROMPT] ========== FULL PROMPT START =========="
    )
    console.log("🔍🔍🔍 [SCORING-PROMPT] Timestamp:", new Date().toISOString())
    console.log("🔍🔍🔍 [SCORING-PROMPT] Thread Title:", threadTitle)
    console.log("🔍🔍🔍 [SCORING-PROMPT] Subreddit:", subreddit)
    console.log(
      "🔍🔍🔍 [SCORING-PROMPT] Thread Content Length:",
      threadContent.length
    )
    console.log(
      "🔍🔍🔍 [SCORING-PROMPT] Website Content Length:",
      websiteContent.length
    )
    console.log(
      "🔍🔍🔍 [SCORING-PROMPT] Existing Comments Count:",
      existingComments?.length || 0
    )
    console.log("🔍🔍🔍 [SCORING-PROMPT] ========== WEBSITE CONTENT ==========")
    console.log(websiteContent)
    console.log("🔍🔍🔍 [SCORING-PROMPT] ========== THREAD CONTENT ==========")
    console.log(threadContent)
    if (existingComments && existingComments.length > 0) {
      console.log("🔍🔍🔍 [SCORING-PROMPT] ========== EXISTING COMMENTS ==========")
      existingComments.slice(0, 3).forEach((comment, i) => {
        console.log(`Comment ${i + 1}:`, comment)
      })
    }

    const prompt = `You are a lead qualification expert for Reddit threads. Evaluate how likely the person behind this thread is a potential customer based on their post.

REDDIT THREAD:
Subreddit: r/${subreddit}
Title: "${threadTitle}"
Content: "${threadContent}"

PRODUCT/SOLUTION CONTEXT:
This person was found when searching for keywords related to our solution. We want to gauge if they are a potential customer for a company with this context:

${websiteContent}

${existingComments && existingComments.length > 0 ? `\nEXISTING COMMENTS IN THIS THREAD (reference these naturally in your response):
${existingComments.slice(0, 5).map((comment, i) => `Comment ${i + 1}: "${comment}"`).join("\n\n")}

IMPORTANT: The comment numbers above are just for your reference. When mentioning these comments in your response, NEVER say "comment1" or "comment3". Instead, reference them naturally like "some people mentioned [tool]" or "i saw folks talking about [topic]".` : ""}

IMPORTANT: People rarely directly ask for solutions. Read between the lines and look for indirect signals like:
- Expressing frustration or challenges
- Asking if others experience similar issues
- Describing workarounds they're using
- Sharing related experiences or pain points
- Engaging with related topics or discussions

Score this thread from 0-100 based on:
- How closely they match the ideal customer profile described in the business context
- How clearly they express a problem or need (directly or indirectly)
- How likely they would be interested in a solution
- Whether they seem to be actively looking for solutions
- Their apparent frustration/pain level with the current situation

Return a precise number between 0-100. Use this scale as a general guide:
90-100 = Perfect lead (clearly expressing need, actively looking for solutions)
70-89 = Strong lead (clear problem/need expression)
40-69 = Moderate potential (showing some signs of the problem)
10-39 = Weak signal (tangentially related)
0-9 = Not a potential customer

If the score is 40 or above, generate three authentic Reddit comments as someone who has tried multiple solutions:

1. MICRO COMMENT (5-15 words): super quick casual mention
   ${existingComments && existingComments.length > 0 ? `- Reference something another commenter said if it flows naturally` : ""}

2. MEDIUM COMMENT (30-80 words): casual story with genuine pros/cons:
   - start with "hey" or "tbh" or similar
   ${existingComments && existingComments.length > 0 ? `- Reference 1-2 other comments naturally like:
     * "yeah i saw that too about X, and honestly..."
     * "agree with what people are saying about Y, though in my experience..."
     * "adding to what was mentioned earlier about Z..."` : ""}
   - mention 2-3 solutions with balanced pros/cons
   - keep it concise and genuinely helpful
   - focus on solving their problem, not selling

3. VERBOSE COMMENT (300-500 words): Focus on being GENUINELY HELPFUL:

   OPENING (1-2 sentences):
   - Quick acknowledgment of their post
   ${existingComments && existingComments.length > 0 ? `- Brief reference to existing discussion if relevant` : ""}
   
   RELEVANT EXPERIENCE (2-3 sentences):
   - Share ONLY directly relevant experience
   - Be specific but concise
   - No elaborate backstories
   
   SOLUTION COMPARISON (main content):
   - Compare 2-3 solutions with BALANCED pros/cons
   - Include specific, actionable details
   - Mention real limitations and downsides
   - No obvious bias toward any solution
   
   HELPFUL CONCLUSION (1-2 sentences):
   - Offer to answer specific questions
   - End with "hope this helps" or similar
   
   AUTHENTICITY REQUIREMENTS:
   - Focus on genuinely helpful information
   - Share relevant experience concisely
   - Discuss solutions with balanced pros/cons
   - Avoid elaborate backstories or excessive detail
   - No obvious bias despite mentioning our solution
   - Include real downsides for ALL options
   - Keep it conversational but not overly casual

CRITICAL STYLE RULES:
- write everything in lowercase (no capitals at all)
- be casual but not excessively so
- include 1 small spelling mistake in longer comments only
- present genuine pros and cons for all options
- write like someone genuinely trying to help
- avoid marketing language completely
- NEVER USE HYPHENS (-) anywhere in comments
- Write compound words as one word (ecommerce, builtin) or separate words (e commerce, built in)
- Reference brands casually without full names (just "notion" not "Notion App")
${existingComments && existingComments.length > 0 ? "- Reference other comments naturally to show you're part of the conversation" : ""}

CRITICAL: You MUST mention 2-3 different solutions in medium/verbose comments:
1. A FREE/CHEAP tool (be specific about limitations)
2. Our solution from the business context (be honest about pros AND cons, mention at least one real downside)
3. Another alternative (optional for medium comments, required for verbose)

Present all options with EQUAL detail and enthusiasm. The goal is to be helpful, not to sell.

Return as JSON with score, reasoning, and all three comments (or empty strings if score < 40).`

    // Log the full prompt being sent
    console.log(
      "🔍🔍🔍 [SCORING-PROMPT] ========== FULL PROMPT TEXT =========="
    )
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
    console.log(
      "🔍🔍🔍 [SCORING-RESULT] Micro Comment Length:",
      result.microComment.length
    )
    console.log(
      "🔍🔍🔍 [SCORING-RESULT] Medium Comment Length:",
      result.mediumComment.length
    )
    console.log(
      "🔍🔍🔍 [SCORING-RESULT] Verbose Comment Length:",
      result.verboseComment.length
    )
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
    existingComments?: string[]
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
        websiteContent,
        thread.existingComments
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
  postUrl?: string, // Add optional postUrl parameter
  existingMicroComment?: string,
  existingMediumComment?: string,
  existingVerboseComment?: string
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
    console.log("🎨 [TONE-REGENERATE] Existing Micro:", existingMicroComment)
    console.log("🎨 [TONE-REGENERATE] Existing Medium:", existingMediumComment)
    console.log("🎨 [TONE-REGENERATE] Existing Verbose:", existingVerboseComment)

    // Check for verbatim lowercase instruction
    if (
      toneInstruction.toLowerCase().includes("verbatim") &&
      toneInstruction.toLowerCase().includes("lowercase")
    ) {
      console.log(
        "🎨 [TONE-REGENERATE] Detected verbatim lowercase instruction. Converting existing comments."
      )
      return {
        isSuccess: true,
        message: "Comments converted to lowercase verbatim.",
        data: {
          microComment: existingMicroComment?.toLowerCase() || "",
          mediumComment: existingMediumComment?.toLowerCase() || "",
          verboseComment: existingVerboseComment?.toLowerCase() || ""
        }
      }
    }

    // Check if tone instruction is extremely long (likely contains full examples)
    const isVeryLongInstruction = toneInstruction.length > 2000
    if (isVeryLongInstruction) {
      console.log(
        "🎨 [TONE-REGENERATE] Detected very long tone instruction (" + toneInstruction.length + " chars). Will use simplified approach."
      )
    }

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
        // maxTokens: 300 // Removed token limit
      })

      toneAnalysis = toneResult.text
      console.log("✅ [TONE-REGENERATE] Tone analysis complete")
    }

    const systemPrompt = `You are a Reddit comment generator. Your job is to create natural, authentic comments that match the community's style.

Business Context: ${websiteContent.substring(0, 1000)}

${toneAnalysis ? `\nCommunity Tone Analysis:\n${toneAnalysis}\n` : ""}

USER'S TONE INSTRUCTION: ${toneInstruction}

CRITICAL STYLE RULES (apply these unless user's tone instruction says otherwise):
- write everything in lowercase (no capitals)
- be casual but not excessively so
- include 1 small spelling mistake in longer comments only
- present genuine pros and cons for all options
- write like someone genuinely trying to help
- avoid marketing language completely
- NEVER USE HYPHENS (-) anywhere in comments
- Write compound words as one word (ecommerce, builtin) or separate words (e commerce, built in)

IMPORTANT: You must return your response as valid JSON with this exact structure:
{
  "microComment": "your micro comment here",
  "mediumComment": "your medium comment here",
  "verboseComment": "your verbose comment here"
}

Do not include any text before or after the JSON object.`

    let userPrompt = ""
    
    // If tone instruction is very long, extract key patterns from it
    if (isVeryLongInstruction) {
      console.log("🎨 [TONE-REGENERATE] Extracting key patterns from long instruction...")
      
      // Extract key patterns from the tone instruction
      const hasVerboseExample = toneInstruction.includes("hey man!") && toneInstruction.includes("so for a little background:")
      const hasMicroExample = toneInstruction.includes("just saw your post") || toneInstruction.includes("assume you've figure")
      
      userPrompt = `Thread Title: ${threadTitle}
Thread Content: ${threadContent}
Subreddit: r/${subreddit}

${existingComments.length > 0 ? `\nExample comments from this thread:\n${existingComments.slice(0, 3).join("\n---\n")}` : ""}

The user has provided a very detailed tone instruction with examples. Based on their instruction, generate three comments:

1. Micro Comment (5-15 words):
${hasMicroExample ? "- Follow the casual, helpful style from their example" : "- Super brief and casual"}
- Mention trying different solutions
- All lowercase, casual tone

2. Medium Comment (30-80 words):
- Start casually ("hey man", "tbh", etc)
- Mention 3 solutions: free tool, our solution (${websiteContent.substring(0, 100)}...), premium tool
- Include honest pros/cons for each
- 1 spelling mistake
- All lowercase

3. Verbose Comment (800-1200 words):
${hasVerboseExample ? `Follow the EXACT structure from their example:
- Opening: "hey man!" + acknowledge time + intent to help
- Background: "so for a little background:" + 7 years experience + failures
- Main lesson: time vs money tradeoff
- Detailed paths with numbered examples
- Scenarios for different users
- TL;DR conclusion` : `Standard verbose structure with personal story`}
- All lowercase
- 2-3 line breaks between sections
- Casual abbreviations (bc, w/, lmk)
- 1-2 spelling mistakes
- No hyphens

Return ONLY a JSON object with microComment, mediumComment, and verboseComment fields.`
    } else {
      // Original prompt for normal tone instructions
      userPrompt = `Thread Title: ${threadTitle}
Thread Content: ${threadContent}
Subreddit: r/${subreddit}

${existingComments.length > 0 ? `\nExample comments from this thread:\n${existingComments.slice(0, 3).join("\n---\n")}` : ""}

Generate three comments following the tone instruction and style rules:
1. Micro (5-15 words): super quick casual mention
2. Medium (30-80 words): helpful but natural, mention 2-3 solutions with balanced pros/cons
3. Verbose (300-500 words) following this structure:
   
   OPENING (1-2 sentences):
   - Quick acknowledgment of their post
   
   RELEVANT EXPERIENCE (2-3 sentences):
   - Share ONLY directly relevant experience
   - Be specific but concise
   - No elaborate backstories
   
   SOLUTION COMPARISON (main content):
   - Compare 2-3 solutions with BALANCED pros/cons
   - Include specific, actionable details
   - Mention real limitations and downsides
   - No obvious bias toward any solution
   
   HELPFUL CONCLUSION (1-2 sentences):
   - Offer to answer specific questions
   - End with "hope this helps" or similar
   
   AUTHENTICITY REQUIREMENTS:
   - Focus on genuinely helpful information
   - Share relevant experience concisely
   - Discuss solutions with balanced pros/cons
   - Avoid elaborate backstories or excessive detail
   - No obvious bias despite mentioning our solution
   - Include real downsides for ALL options
   - Keep it conversational but not overly casual

For each comment, mention:
- A free/cheap solution (with honest limitations)
- Our solution (with honest pros AND cons, mention at least one real downside)
- Another alternative (optional for medium, required for verbose)

Present all options with EQUAL detail and enthusiasm. The goal is to be helpful, not to sell.

Return as JSON:
{
  "microComment": "comment text",
  "mediumComment": "comment text",
  "verboseComment": "comment text"
}`
    }

    console.log("🎨 [TONE-REGENERATE] Generating comments with custom tone...")
    const result = await generateText({
      model: openai("o3-mini"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.8,
      // maxTokens: 3000 // Removed token limit - no restrictions
      providerOptions: {
        openai: { reasoningEffort: "medium" }
      }
    })

    // Parse the response
    const text = result.text.trim()
    console.log("🎨 [TONE-REGENERATE] Raw response length:", text.length)
    console.log("🎨 [TONE-REGENERATE] First 200 chars:", text.substring(0, 200))
    
    // Try to find JSON in the response
    let parsed: any
    
    // First try: Look for JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0])
        console.log("✅ [TONE-REGENERATE] Successfully parsed JSON from response")
      } catch (parseError) {
        console.error("❌ [TONE-REGENERATE] Failed to parse JSON:", parseError)
        console.log("❌ [TONE-REGENERATE] Attempted to parse:", jsonMatch[0].substring(0, 200))
      }
    }
    
    // Second try: Look for code block with JSON
    if (!parsed) {
      const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
      if (codeBlockMatch) {
        try {
          parsed = JSON.parse(codeBlockMatch[1])
          console.log("✅ [TONE-REGENERATE] Successfully parsed JSON from code block")
        } catch (parseError) {
          console.error("❌ [TONE-REGENERATE] Failed to parse JSON from code block:", parseError)
        }
      }
    }
    
    // Third try: If still no JSON, try to extract comments manually
    if (!parsed) {
      console.log("⚠️ [TONE-REGENERATE] No JSON found, attempting manual extraction")
      
      // Try to extract comments using markers
      const microMatch = text.match(/microComment["\s:]+([^"]*?)(?:"|$)/i)
      const mediumMatch = text.match(/mediumComment["\s:]+([^"]*?)(?:"|$)/i)
      const verboseMatch = text.match(/verboseComment["\s:]+([^"]*?)(?:"|$)/i)
      
      if (microMatch || mediumMatch || verboseMatch) {
        parsed = {
          microComment: microMatch?.[1] || existingMicroComment || "",
          mediumComment: mediumMatch?.[1] || existingMediumComment || "",
          verboseComment: verboseMatch?.[1] || existingVerboseComment || ""
        }
        console.log("✅ [TONE-REGENERATE] Manually extracted comments from response")
      } else {
        // Last resort: return existing comments
        console.error("❌ [TONE-REGENERATE] Could not extract any comments from response")
        console.log("❌ [TONE-REGENERATE] Full response:", text)
        
        return {
          isSuccess: false,
          message: "Failed to parse AI response. The tone instruction might be too complex. Try simplifying it."
        }
      }
    }
    
    // Validate parsed data
    if (!parsed.microComment && !parsed.mediumComment && !parsed.verboseComment) {
      console.error("❌ [TONE-REGENERATE] Parsed object has no comments")
      return {
        isSuccess: false,
        message: "AI response did not contain any comments. Try a simpler tone instruction."
      }
    }

    console.log(
      "✅ [TONE-REGENERATE] Successfully regenerated comments with custom tone"
    )
    console.log("✅ [TONE-REGENERATE] Micro length:", parsed.microComment?.length || 0)
    console.log("✅ [TONE-REGENERATE] Medium length:", parsed.mediumComment?.length || 0)
    console.log("✅ [TONE-REGENERATE] Verbose length:", parsed.verboseComment?.length || 0)

    return {
      isSuccess: true,
      message: "Comments regenerated with custom tone",
      data: {
        microComment: parsed.microComment || "",
        mediumComment: parsed.mediumComment || "",
        verboseComment: parsed.verboseComment || ""
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

REPLY YOU'RE RESPONDING TO:
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
- write everything in lowercase (no capitals)
- be super casual and conversational
- include 1 small spelling mistake if the reply is longer than 2 sentences
- don't oversell or push anything
- if they're thanking you, accept graciously like "no worries man, glad it helped"
- if they have questions, answer helpfully with specific details
- if they're skeptical, acknowledge their concerns honestly
- keep it brief unless they specifically asked for more details
- use casual reddit language like "tbh", "ngl", "lmk"
- never use marketing speak or superlatives
- be honest about any downsides if they ask
- NEVER mention their username - just respond naturally to what they said

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
  campaignKeywords: string[],
  campaignWebsiteContent?: string,
  existingComments?: string[],
  campaignName?: string
): Promise<
  ActionState<{
    score: number
    reasoning: string
    microComment: string
    mediumComment: string
    verboseComment: string
    derivedSpecificKeywords?: string[]
  }>
> {
  try {
    console.log(
      "🤖 [OPENAI-PERSONALIZED] Starting personalized scoring and comment generation"
    )
    console.log("🤖 [OPENAI-PERSONALIZED] Thread title:", threadTitle)
    console.log("🤖 [OPENAI-PERSONALIZED] Subreddit:", subreddit)
    console.log("🤖 [OPENAI-PERSONALIZED] Organization ID:", organizationId)
    console.log("🤖 [OPENAI-PERSONALIZED] Campaign Keywords:", campaignKeywords.join(", "))
    console.log(
      "🤖 [OPENAI-PERSONALIZED] Existing comments provided:",
      existingComments?.length || 0
    )
    console.log("🤖 [OPENAI-PERSONALIZED] Campaign name:", campaignName)

    // Get organization data for personalization
    const { getOrganizationByIdAction } = await import(
      "@/actions/db/organizations-actions"
    )
    const {
      getKnowledgeBaseByOrganizationIdAction,
      getVoiceSettingsByOrganizationIdAction
    } = await import("@/actions/db/personalization-actions")

    const orgResult = await getOrganizationByIdAction(organizationId)
    if (!orgResult.isSuccess || !orgResult.data) {
      console.error("❌ [OPENAI-PERSONALIZED] Failed to get organization")
      return { isSuccess: false, message: "Failed to get organization" }
    }

    const organization = orgResult.data
    const businessWebsiteUrl = organization.website || ""
    
    console.log(
      "🔍🔍🔍 [OPENAI-PERSONALIZED] Organization name:",
      organization.name
    )
    console.log(
      "🔍🔍🔍 [OPENAI-PERSONALIZED] Campaign name:",
      campaignName
    )
    
    // Get knowledge base for brand name override
    const knowledgeBaseResult =
      await getKnowledgeBaseByOrganizationIdAction(organizationId)
    let knowledgeBaseContent = ""
    let brandNameToUse = ""
    
    console.log(
      "🔍🔍🔍 [OPENAI-PERSONALIZED] Knowledge base fetch result:",
      knowledgeBaseResult.isSuccess ? "SUCCESS" : "FAILED"
    )
    console.log(
      "🔍🔍🔍 [OPENAI-PERSONALIZED] Knowledge base data exists:",
      !!knowledgeBaseResult.data
    )
    
    if (knowledgeBaseResult.isSuccess && knowledgeBaseResult.data) {
      const kb = knowledgeBaseResult.data
      
      console.log(
        "🔍🔍🔍 [OPENAI-PERSONALIZED] Knowledge base brandNameOverride:",
        kb.brandNameOverride
      )
      console.log(
        "🔍🔍🔍 [OPENAI-PERSONALIZED] Knowledge base ID:",
        kb.id
      )
      
      // Use brand name override if available, otherwise use organization name from settings
      brandNameToUse = kb.brandNameOverride || organization.name || campaignName || "our solution"
      // Always convert to lowercase for natural Reddit style
      brandNameToUse = brandNameToUse.toLowerCase()
      
      console.log(
        "🔍🔍🔍 [OPENAI-PERSONALIZED] Final brand name decision:",
        brandNameToUse
      )
      
      // Combine all knowledge base content
      const contentParts = []
      
      // Add custom information (manually typed info)
      if (kb.customInformation) {
        contentParts.push(kb.customInformation)
      }
      
      // Add summary if available
      if (kb.summary) {
        contentParts.push(kb.summary)
      }
      
      // Add key facts if available
      if (kb.keyFacts && kb.keyFacts.length > 0) {
        contentParts.push(`Key facts: ${kb.keyFacts.join(", ")}`)
      }
      
      knowledgeBaseContent = contentParts.join("\n\n")
      
      console.log(
        "✅ [OPENAI-PERSONALIZED] Found knowledge base for organization with content length:",
        knowledgeBaseContent.length
      )
      console.log(
        "✅ [OPENAI-PERSONALIZED] Brand name to use:",
        brandNameToUse
      )
    } else {
      // No knowledge base, use organization name from settings
      brandNameToUse = (organization.name || campaignName || "our solution").toLowerCase()
      console.log(
        "⚠️ [OPENAI-PERSONALIZED] No knowledge base found, using organization name from settings:",
        brandNameToUse
      )
      console.log(
        "⚠️ [OPENAI-PERSONALIZED] Fallback order: organization.name=",
        organization.name,
        ", campaignName=",
        campaignName
      )
    }

    // Get voice settings for the organization
    const voiceSettingsResult =
      await getVoiceSettingsByOrganizationIdAction(organizationId)
    let voicePrompt = ""
    if (voiceSettingsResult.isSuccess && voiceSettingsResult.data) {
      voicePrompt = voiceSettingsResult.data.generatedPrompt || ""
      console.log(
        "✅ [OPENAI-PERSONALIZED] Found voice settings for organization"
      )
    }

    // Prioritize campaign-specific content, then knowledge base, then organization website
    let primaryBusinessContent =
      campaignWebsiteContent || knowledgeBaseContent || ""
    let contentSource = campaignWebsiteContent
      ? "campaign"
      : knowledgeBaseContent
        ? "knowledge_base"
        : "organization_website"

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
      console.log(`✅ [OPENAI-PERSONALIZED] Using ${contentSource} content`)
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
        // maxTokens: 300 // Removed token limit
      })

      toneAnalysis = toneResult.text
      console.log(
        "✅ [OPENAI-PERSONALIZED] Tone analysis complete:",
        toneAnalysis
      )
    }

    // Log the full context being sent
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== FULL CONTEXT START =========="
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Timestamp:",
      new Date().toISOString()
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Thread Title:",
      threadTitle
    )
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Subreddit:", subreddit)
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Thread Content Length:",
      threadContent.length
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Business Name:",
      brandNameToUse
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Content Source:",
      contentSource
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Business Content Length:",
      primaryBusinessContent.length
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Voice Prompt Length:",
      voicePrompt.length
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Tone Analysis Length:",
      toneAnalysis.length
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Existing Comments Count:",
      existingComments?.length || 0
    )

    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== BUSINESS CONTENT =========="
    )
    console.log(primaryBusinessContent)

    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== VOICE PROMPT =========="
    )
    console.log(voicePrompt || "No voice prompt configured")

    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== TONE ANALYSIS =========="
    )
    console.log(toneAnalysis || "No tone analysis performed")

    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== THREAD CONTENT =========="
    )
    console.log(threadContent)

    if (existingComments && existingComments.length > 0) {
      console.log(
        "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== EXAMPLE COMMENTS =========="
      )
      existingComments.slice(0, 3).forEach((comment, i) => {
        console.log(`Comment ${i + 1}:`, comment)
      })
    }

    console.log(
      "🤖 [OPENAI-PERSONALIZED] Organization website:",
      businessWebsiteUrl
    )
    console.log(
      "🤖 [OPENAI-PERSONALIZED] Campaign website content provided:",
      !!campaignWebsiteContent
    )

    const systemPrompt = `You are a lead qualification expert for Reddit threads. Your job is to:
1. Score how likely the person behind the thread is a potential customer
2. Generate natural, authentic Reddit comments if they are a good lead
3. Identify highly specific keyword phrases from the thread that align with the campaign's focus

PRODUCT/SOLUTION CONTEXT:
${primaryBusinessContent ? primaryBusinessContent : "The business offers general solutions."}

IDEAL CUSTOMER PROFILE (ICP):
Based on the campaign keywords "${campaignKeywords.join(", ")}", we are targeting people who are looking for solutions related to these topics.

${voicePrompt ? `\nVOICE INSTRUCTIONS:\n${voicePrompt}\n` : ""}

${toneAnalysis ? `\nCOMMUNITY TONE ANALYSIS:\n${toneAnalysis}\n` : ""}

IMPORTANT: People rarely directly ask for solutions. Read between the lines and look for indirect signals like:
- Expressing frustration or challenges
- Asking if others experience similar issues
- Describing workarounds they're using
- Sharing related experiences or pain points
- Engaging with related topics or discussions

CRITICAL STYLE RULES:
- write everything in lowercase (no capitals at all)
- be casual but not excessively so
- include 1 small spelling mistake in longer comments only
- present genuine pros and cons for all options
- write like someone genuinely trying to help
- avoid marketing language completely
- REFERENCE OTHER COMMENTS IN THE THREAD NATURALLY (see examples below)
- NEVER USE HYPHENS (-) anywhere in comments
- Write compound words as one word (ecommerce, builtin) or separate words (e commerce, built in)
- Reference brands casually without full names (just "notion" not "Notion App")

Return as JSON:
{
  "score": number,
  "reasoning": "brief explanation of the score",
  "microComment": "comment text" (or empty string if score < 40),
  "mediumComment": "comment text" (or empty string if score < 40),
  "verboseComment": "comment text" (or empty string if score < 40),
  "derivedSpecificKeywords": ["phrase 1", "phrase 2", ...] (empty array if score < 40 or no specific phrases found)
}`

    const userPrompt = `Thread: "${threadTitle}"
Content: "${threadContent}"
Subreddit: r/${subreddit}

This person was found when searching for "${campaignKeywords.join(", ")}". We want to gauge if they are a potential customer for ${brandNameToUse}.

${existingComments && existingComments.length > 0 ? `\nEXISTING COMMENTS IN THIS THREAD (reference these naturally in your response):
${existingComments.slice(0, 5).map((comment, i) => `Comment ${i + 1}: "${comment}"`).join("\n\n")}` : ""}

IMPORTANT: The comment numbers above are just for your reference. When mentioning these comments in your response, NEVER say "comment1" or "comment3". Instead, reference them naturally like "some people mentioned [tool]" or "i saw folks talking about [topic]".

Score this thread from 0-100 based on:
- How closely they match the ICP description
- How clearly they express a problem or need related to ${campaignKeywords.join(", ")} (directly or indirectly)
- How likely they would be interested in a solution
- Whether they seem to be actively looking for solutions
- Their apparent frustration/pain level with the current situation

Return a precise number between 0-100. Use this scale as a general guide:
90-100 = Perfect lead (clearly expressing need, actively looking for solutions)
70-89 = Strong lead (clear problem/need expression)
40-69 = Moderate potential (showing some signs of the problem)
10-39 = Weak signal (tangentially related)
0-9 = Not a potential customer

If the score is 40 or above, generate three comments:

1. Micro (5-15 words): super quick casual mention
   ${existingComments && existingComments.length > 0 ? "- Reference something another commenter said briefly if natural" : ""}
   - Mention trying different solutions
   - All lowercase, casual tone

2. Medium (30-80 words): casual story with genuine pros/cons:
   - start with "hey" or "tbh" or similar
   ${existingComments && existingComments.length > 0 ? `- Reference 1-2 other comments naturally like:
     * "yeah i saw that too about X, and honestly..."
     * "agree with what people are saying about Y, though in my experience..."
     * "adding to what was mentioned earlier about Z..."` : ""}
   - mention 2-3 solutions with balanced pros/cons
   - keep it concise and genuinely helpful
   - focus on solving their problem, not selling

3. Verbose (300-500 words): Focus on being GENUINELY HELPFUL:

   OPENING (1-2 sentences):
   - Quick acknowledgment of their post
   ${existingComments && existingComments.length > 0 ? `- Brief reference to existing discussion if relevant` : ""}
   
   RELEVANT EXPERIENCE (2-3 sentences):
   - Share ONLY directly relevant experience
   - Be specific but concise
   - No elaborate backstories
   
   SOLUTION COMPARISON (main content):
   - Compare 2-3 solutions with BALANCED pros/cons
   - Include specific, actionable details
   - Mention real limitations and downsides
   - No obvious bias toward any solution
   
   HELPFUL CONCLUSION (1-2 sentences):
   - Offer to answer specific questions
   - End with "hope this helps" or similar
   
   AUTHENTICITY REQUIREMENTS:
   - Focus on genuinely helpful information
   - Share relevant experience concisely
   - Discuss solutions with balanced pros/cons
   - Avoid elaborate backstories or excessive detail
   - No obvious bias despite mentioning our solution
   - Include real downsides for ALL options
   - Keep it conversational but not overly casual

For each comment, mention:
- A free/cheap solution (with honest limitations)
- Our solution (with honest pros AND cons, mention at least one real downside)
- Another alternative (optional for medium, required for verbose)

Present all options with EQUAL detail and enthusiasm. The goal is to be helpful, not to sell.

Also, identify and list 3-5 specific keyword phrases (3-5 words each) from the thread itself that are highly relevant to the business and the campaign's focus keywords (${campaignKeywords.join(", ")}). These phrases should capture the core problem or specific interest expressed by the Reddit user.

Return as JSON:
{
  "score": number,
  "reasoning": "brief explanation of the score",
  "microComment": "comment text" (or empty string if score < 40),
  "mediumComment": "comment text" (or empty string if score < 40),
  "verboseComment": "comment text" (or empty string if score < 40),
  "derivedSpecificKeywords": ["phrase 1", "phrase 2", ...] (empty array if score < 40 or no specific phrases found)
}`

    // Log the full prompts being sent
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== SYSTEM PROMPT =========="
    )
    console.log(systemPrompt)
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== USER PROMPT =========="
    )
    console.log(userPrompt)
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== PROMPT END =========="
    )
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Model: o3-mini")
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Temperature: 0.7")
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Max Tokens: 1500")

    console.log("🤖 [OPENAI-PERSONALIZED] Generating personalized comments...")
    const result = await generateText({
      model: openai("o3-mini"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      // maxTokens: 1500 // Removed token limit
      providerOptions: {
        openai: { reasoningEffort: "medium" }
      }
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
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] ========== AI RESPONSE =========="
    )
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Score:", parsed.score)
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Reasoning:",
      parsed.reasoning
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Micro Comment Length:",
      parsed.microComment.length
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Micro Comment:",
      parsed.microComment
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Medium Comment Length:",
      parsed.mediumComment.length
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Medium Comment:",
      parsed.mediumComment
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Verbose Comment Length:",
      parsed.verboseComment.length
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Verbose Comment:",
      parsed.verboseComment
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Derived Specific Keywords:",
      parsed.derivedSpecificKeywords
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] ========== RESPONSE END =========="
    )

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
        verboseComment: parsed.verboseComment,
        derivedSpecificKeywords: parsed.derivedSpecificKeywords || [] // Ensure it's an array
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
