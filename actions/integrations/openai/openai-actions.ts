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
import { generateAuthenticVoicePromptAction } from "@/actions/integrations/openai/authentic-voice-generation-actions"
import { analyzeThreadIndustryAndExpertiseAction } from "@/actions/integrations/openai/industry-analysis-actions"
import OpenAI from "openai"

// Schema for thread scoring and comment generation
const ThreadAnalysisSchema = z.object({
  score: z.number().min(1).max(100),
  reasoning: z.string(),
  microComment: z.string(),
  mediumComment: z.string(),
  verboseComment: z.string(),
  derivedSpecificKeywords: z.array(z.string()).optional()
})

// Helper function to extract JSON from text
function extractJsonFromText(text: string): any | null {
  console.log("🔍 [EXTRACT-JSON] Attempting to extract JSON from text...");
  console.log("🔍 [EXTRACT-JSON] Raw text received (first 500 chars):", text.slice(0, 500) + (text.length > 500 ? "..." : ""));

  // Attempt 1: Direct parsing
  try {
    console.log("🔍 [EXTRACT-JSON] Attempt 1: Direct parsing...");
    const parsed = JSON.parse(text);
    console.log("✅ [EXTRACT-JSON] Attempt 1: Direct parsing successful.");
    return parsed;
  } catch (e) {
    console.warn("⚠️ [EXTRACT-JSON] Attempt 1: Direct parsing failed. Error:", e instanceof Error ? e.message : String(e));
  }

  // Attempt 2: Markdown code block (```json ... ```)
  try {
    console.log("🔍 [EXTRACT-JSON] Attempt 2: Markdown code block (json)...");
    const jsonMarkdownMatch = text.match(/```json\\n([\\s\\S]*?)\\n```/);
    if (jsonMarkdownMatch && jsonMarkdownMatch[1]) {
      const extracted = jsonMarkdownMatch[1];
      console.log("🔍 [EXTRACT-JSON] Attempt 2: Extracted from json markdown:", extracted.slice(0, 200) + (extracted.length > 200 ? "..." : ""));
      const parsed = JSON.parse(extracted);
      console.log("✅ [EXTRACT-JSON] Attempt 2: Markdown (json) parsing successful.");
      return parsed;
    }
    console.log("ℹ️ [EXTRACT-JSON] Attempt 2: No json markdown block found.");
  } catch (e) {
    console.warn("⚠️ [EXTRACT-JSON] Attempt 2: Markdown (json) parsing failed. Error:", e instanceof Error ? e.message : String(e));
  }

  // Attempt 3: Markdown code block (``` ... ```)
  try {
    console.log("🔍 [EXTRACT-JSON] Attempt 3: Markdown code block (generic)...");
    const genericMarkdownMatch = text.match(/```\\n([\\s\\S]*?)\\n```/);
    if (genericMarkdownMatch && genericMarkdownMatch[1]) {
      const extracted = genericMarkdownMatch[1];
      console.log("🔍 [EXTRACT-JSON] Attempt 3: Extracted from generic markdown:", extracted.slice(0, 200) + (extracted.length > 200 ? "..." : ""));
      const parsed = JSON.parse(extracted);
      console.log("✅ [EXTRACT-JSON] Attempt 3: Markdown (generic) parsing successful.");
      return parsed;
    }
    console.log("ℹ️ [EXTRACT-JSON] Attempt 3: No generic markdown block found.");
  } catch (e) {
    console.warn("⚠️ [EXTRACT-JSON] Attempt 3: Markdown (generic) parsing failed. Error:", e instanceof Error ? e.message : String(e));
  }
  
  // Attempt 4: General JSON object regex (handles cases where it might not be perfectly formatted but is still a JSON object)
  try {
    console.log("🔍 [EXTRACT-JSON] Attempt 4: General JSON object regex...");
    // Adjusted regex to be less greedy and capture the outermost valid JSON structure.
    const generalJsonMatch = text.match(/\{\s*["']score["']\s*:\s*\d+[\s\S]*?\}/);
    if (generalJsonMatch && generalJsonMatch[0]) {
      const extracted = generalJsonMatch[0];
      console.log("🔍 [EXTRACT-JSON] Attempt 4: Extracted with general regex:", extracted.slice(0, 200) + (extracted.length > 200 ? "..." : ""));
      const parsed = JSON.parse(extracted);
      console.log("✅ [EXTRACT-JSON] Attempt 4: General regex parsing successful.");
      return parsed;
    }
    console.log("ℹ️ [EXTRACT-JSON] Attempt 4: No general JSON object found with regex.");
  } catch (e) {
    console.warn("⚠️ [EXTRACT-JSON] Attempt 4: General regex parsing failed. Error:", e instanceof Error ? e.message : String(e));
  }

  console.error("❌ [EXTRACT-JSON] All attempts to extract JSON failed.");
  return null;
}

export async function scoreThreadAndGenerateThreeTierCommentsAction(
  threadTitle: string,
  threadContent: string,
  subreddit: string,
  websiteContent: string,
  existingComments?: string[],
  organizationId?: string // Add optional organizationId parameter
): Promise<ActionState<ThreeTierCommentResult>> {
  try {
    console.log(
      `🤖 Critically scoring thread (simple prompt) and generating 3-tier comments for: "${threadTitle.slice(0, 50)}..."`
    )

    let actualWebsiteContent = websiteContent;
    // Try to use organization name if brandName wasn't part of websiteContent passed in
    if (organizationId && !websiteContent.toLowerCase().includes("brand name:")) {
        const { getOrganizationByIdAction } = await import("@/actions/db/organizations-actions");
        const orgResult = await getOrganizationByIdAction(organizationId);
        if (orgResult.isSuccess && orgResult.data?.name) {
            actualWebsiteContent = `Brand Name: ${orgResult.data.name.toLowerCase()}\\n\\n${websiteContent}`;
            console.log(`ℹ️ [SIMPLE-SCORING] Prepended organization name as brand to websiteContent.`);
        }
    }


    // Log the full context being sent
    console.log(
      "🔍🔍🔍 [SIMPLE-SCORING-PROMPT] ========== FULL PROMPT START =========="
    )
    console.log("🔍🔍🔍 [SIMPLE-SCORING-PROMPT] Timestamp:", new Date().toISOString())
    console.log("🔍🔍🔍 [SIMPLE-SCORING-PROMPT] Thread Title:", threadTitle)
    console.log("🔍🔍🔍 [SIMPLE-SCORING-PROMPT] Subreddit:", subreddit)
    console.log(
      "🔍🔍🔍 [SIMPLE-SCORING-PROMPT] Thread Content Length:",
      threadContent.length
    )
    console.log(
      "🔍🔍🔍 [SIMPLE-SCORING-PROMPT] Website Content Length:",
      actualWebsiteContent.length
    )
    console.log(
      "🔍🔍🔍 [SIMPLE-SCORING-PROMPT] Existing Comments Count:",
      existingComments?.length || 0
    )
    console.log("🔍🔍🔍 [SIMPLE-SCORING-PROMPT] ========== WEBSITE CONTENT ==========")
    console.log(actualWebsiteContent.slice(0, 500) + (actualWebsiteContent.length > 500 ? "..." : ""))
    console.log("🔍🔍🔍 [SIMPLE-SCORING-PROMPT] ========== THREAD CONTENT ==========")
    console.log(threadContent.slice(0,500) + (threadContent.length > 500 ? "..." : ""))
    if (existingComments && existingComments.length > 0) {
      console.log("🔍🔍🔍 [SIMPLE-SCORING-PROMPT] ========== EXISTING COMMENTS ==========")
      existingComments.slice(0, 3).forEach((comment, i) => {
        console.log(`Comment ${i + 1}:`, comment.slice(0,200) + (comment.length > 200 ? "..." : ""))
      })
    }

    const prompt = `You are a real person who loves helping others and gets genuinely excited about solving problems! You\'re browsing Reddit and found someone who needs help with something you actually know about.

REDDIT THREAD:
Subreddit: r/${subreddit}
Title: "${threadTitle}"
Content: "${threadContent}"

YOUR BACKGROUND & EXPERIENCE (use this to inform your comments):
${actualWebsiteContent}

${existingComments && existingComments.length > 0 ? `\\nWHAT OTHERS HAVE ALREADY SAID:
${existingComments.slice(0, 5).map((comment, i) => `${i + 1}. "${comment}"`).join("\\n\\n")}` : ""}

CRITICAL WRITING RULE - NEVER USE HYPHENS:
- Write "co founder" not "co-founder"
- Write "self serve" not "self-serve"
- Write "long term" not "long-term"
- Write "third party" not "third-party"
- Write "real time" not "real-time"
- Write "full stack" not "full-stack"
- NEVER use hyphens (-) anywhere in your comments

HOW TO THINK ABOUT THIS:

1. CONNECT WITH THEIR SITUATION LIKE A REAL PERSON
- What problem are they actually trying to solve?
- What constraints did they mention (budget, timeline, team, experience)?
- What's their context? (industry, business stage, what they've tried)
- How does this connect to your own experience?
- What would you personally want to know if you were in their shoes?

2. READ THE ROOM LIKE A HUMAN
- What has the conversation covered already?
- What are people missing or getting wrong?
- What signals show they're really struggling or frustrated?
- How can you add value without repeating what others said?

3. SHARE YOUR REAL EXPERIENCE WITH GENUINE ENTHUSIASM
- What similar challenges have you personally faced?
- What solutions have you actually tried?
- What worked well? What was a disaster? Why?
- How can your real experience genuinely help them?
- Show you actually care about helping them figure this out!

SCORING: How well can you actually help? (1-100)
- 90-100: This is exactly what you do! You've solved this exact problem
- 70-89: Strong match - you have clear relevant experience to share
- 50-69: Some relevant insights, but not your main expertise
- Below 50: Not enough real experience to comment authentically

COMMENT GENERATION (if score is 70+):
Write like you're genuinely excited to help someone figure this out!

1. MICRO COMMENT (5-15 words): 
   - Quick, genuine reaction showing you care
   - Natural offer to help: "happy to chat about this!"
   - Sound like a real person, not a bot
   - Examples: "oh man i've been there! happy to share what worked"
   - Examples: "this is exactly what i do! feel free to message me"
   - NEVER use hyphens

2. MEDIUM COMMENT (30-80 words):
   - Connect to their specific situation personally
   - Share a brief insight from your experience
   - Mention 2-3 approaches you know work
   - Be honest about trade offs
   - Natural offer to help more: "feel free to message me"
   - Sound like you're texting a friend who asked for advice
   - NEVER use hyphens

3. VERBOSE COMMENT (300-500 words):
   Write like you're genuinely excited to help them think through this!
   
   Natural flow (don't be formal or structured):
   - Start with genuine excitement: "I would love to chat about this!"
   - Share how you relate to their challenge personally
   - Ask the key questions they need to think about (specific to their situation)
   - Present 3-4 real options based on your experience
   - Be honest about pros/cons, costs, timelines
   - Reference what others have said (build on the conversation)
   - Explain WHY each option fits their specific constraints
   - End with genuine enthusiasm: "Sounds like a fun project!" or "I'd love to chat more!"
   - NEVER use hyphens anywhere
   
WRITE LIKE A REAL HUMAN WHO LOVES HELPING:
- Use contractions: "I'd love to", "you'll need", "it's challenging"
- Show personality: "I love this type of challenge!"
- Be conversational: "honestly", "basically", "actually"
- Share real experiences: "we used X and it worked great" or "tried Y and it was a disaster"
- Admit limitations: "this can be tricky if you don't have..."
- Use natural enthusiasm: "this is exactly what I do!"
- Make it personal: "feel free to message me if you want to bounce ideas"
- Show genuine excitement about helping: "omg this gets me excited"
- Use casual language: "tbh", "ngl", "lmk"

CRITICAL REMINDERS:
- Write like you're texting a friend who asked for advice
- Show genuine excitement about helping
- Share real experiences, not generic advice
- Be honest about challenges and limitations
- Focus on helping them think through their decision
- Avoid all corporate/marketing language
- Sound like a real human being who's passionate about helping
- NEVER USE HYPHENS - write compound words as separate words or one word

Return JSON:
{
  "score": <number 1-100>,
  "reasoning": "<why you can genuinely help with their specific situation>",
  "microComment": "<authentic excited reaction>",
  "mediumComment": "<helpful personal insight>",
  "verboseComment": "<comprehensive help with genuine enthusiasm>"
}`

    console.log(
      "🔍🔍🔍 [SIMPLE-SCORING-PROMPT] ========== FULL PROMPT TEXT (first 1000 chars) =========="
    )
    console.log(prompt.slice(0,1000) + (prompt.length > 1000 ? "..." : ""))
    console.log("🔍🔍🔍 [SIMPLE-SCORING-PROMPT] ========== PROMPT END ==========")
    console.log("🔍🔍🔍 [SIMPLE-SCORING-PROMPT] Model: o3-mini")

    const { text: aiResponseText } = await generateText({
      model: openai("o3-mini"),
      prompt,
    });

    console.log("🤖 [SIMPLE-SCORING] Raw AI Response Text (first 500 chars):", aiResponseText.slice(0,500) + (aiResponseText.length > 500 ? "..." : ""));

    const extractedObject = extractJsonFromText(aiResponseText);

    if (!extractedObject) {
      console.error("❌ [SIMPLE-SCORING] Failed to extract JSON from AI response. Raw text:", aiResponseText);
      return {
        isSuccess: false,
        message: "Failed to extract valid JSON from AI response. The response format was not recognized."
      };
    }
    
    // Validate against a schema that doesn't require derivedSpecificKeywords for this simpler action
    const SimpleThreadAnalysisSchema = ThreadAnalysisSchema.omit({ derivedSpecificKeywords: true });
    const validationResult = SimpleThreadAnalysisSchema.safeParse(extractedObject);


    if (!validationResult.success) {
      console.error("❌ [SIMPLE-SCORING] OpenAI response failed validation:", validationResult.error.errors);
      console.error("❌ [SIMPLE-SCORING] Invalid object:", extractedObject);
      return {
        isSuccess: false,
        message: `OpenAI response validation failed: ${validationResult.error.errors.map(e => e.message).join(', ')}`
      };
    }

    const object = validationResult.data;

    const result: ThreeTierCommentResult = {
      score: Math.max(1, Math.min(100, object.score)),
      reasoning: object.reasoning,
      microComment: object.microComment,
      mediumComment: object.mediumComment,
      verboseComment: object.verboseComment
      // derivedSpecificKeywords is not expected from this simpler action
    }

    console.log("🔍🔍🔍 [SIMPLE-SCORING-RESULT] ========== AI RESPONSE ==========")
    console.log("🔍🔍🔍 [SIMPLE-SCORING-RESULT] Score:", result.score)
    console.log("🔍🔍🔍 [SIMPLE-SCORING-RESULT] Reasoning:", result.reasoning.slice(0,100) + "...")
    console.log(
      "🔍🔍🔍 [SIMPLE-SCORING-RESULT] Micro Comment Length:",
      result.microComment.length
    )
    console.log(
      "🔍🔍🔍 [SIMPLE-SCORING-RESULT] Medium Comment Length:",
      result.mediumComment.length
    )
    console.log(
      "🔍🔍🔍 [SIMPLE-SCORING-RESULT] Verbose Comment Length:",
      result.verboseComment.length
    )
    console.log("🔍🔍🔍 [SIMPLE-SCORING-RESULT] ========== RESPONSE END ==========")

    console.log(
      `✅ Thread (simple prompt) critically scored: ${result.score}/100 - ${result.reasoning.slice(0, 50)}...`
    )

    return {
      isSuccess: true,
      message: "Thread scored and three-tier comments generated successfully (simple prompt)",
      data: result
    }
  } catch (error) {
    console.error("Error scoring thread (simple prompt) and generating comments:", error)
    return {
      isSuccess: false,
      message: `Failed to score thread (simple prompt): ${error instanceof Error ? error.message : "Unknown error"}`
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

    // Get knowledge base content to enhance website content
    let enhancedWebsiteContent = websiteContent
    let brandNameToUse = ""
    
    console.log("🎨 [TONE-REGENERATE] Fetching knowledge base for organization...")
    const { getKnowledgeBaseByOrganizationIdAction } = await import(
      "@/actions/db/personalization-actions"
    )
    
    const knowledgeBaseResult = await getKnowledgeBaseByOrganizationIdAction(organizationId)
    
    if (knowledgeBaseResult.isSuccess && knowledgeBaseResult.data) {
      const kb = knowledgeBaseResult.data
      console.log("✅ [TONE-REGENERATE] Found knowledge base for organization")
      
      // Get brand name
      brandNameToUse = kb.brandNameOverride || "our solution"
      brandNameToUse = brandNameToUse.toLowerCase()
      
      // Build comprehensive knowledge base content
      const contentParts = []
      
      // Add brand information
      if (brandNameToUse) {
        contentParts.push(`Brand Name: ${brandNameToUse}`)
      }
      
      // Add website URL if available
      if (kb.websiteUrl) {
        contentParts.push(`Website: ${kb.websiteUrl}`)
      }
      
      // Add custom information (manually typed info)
      if (kb.customInformation) {
        contentParts.push("Business Information:")
        contentParts.push(kb.customInformation)
      }
      
      // Add summary if available
      if (kb.summary) {
        contentParts.push("Summary:")
        contentParts.push(kb.summary)
      }
      
      // Add key facts if available
      if (kb.keyFacts && kb.keyFacts.length > 0) {
        contentParts.push("Key Facts:")
        contentParts.push(kb.keyFacts.join("\n- "))
      }
      
      // Add scraped pages info if available
      if (kb.scrapedPages && kb.scrapedPages.length > 0) {
        contentParts.push(`Additional Pages Analyzed: ${kb.scrapedPages.join(", ")}`)
      }
      
      const knowledgeBaseContent = contentParts.join("\n\n")
      
      // Combine knowledge base with provided website content
      if (knowledgeBaseContent) {
        enhancedWebsiteContent = websiteContent 
          ? `${knowledgeBaseContent}\n\n${websiteContent}`
          : knowledgeBaseContent
      }
      
      console.log("✅ [TONE-REGENERATE] Enhanced content with knowledge base, total length:", enhancedWebsiteContent.length)
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

    const systemPrompt = `You are a real person who loves helping others and gets genuinely excited about solving problems! You're browsing Reddit and found someone who needs help with something you actually know about.

Context about you: ${enhancedWebsiteContent.substring(0, 1000)}

${toneAnalysis ? `\nCommunity style: ${toneAnalysis}\n` : ""}

USER'S TONE REQUEST: ${toneInstruction}

CRITICAL WRITING RULE - NEVER USE HYPHENS:
- Write "co founder" not "co-founder"
- Write "self serve" not "self-serve"
- Write "long term" not "long-term"
- Write "third party" not "third-party"
- Write "real time" not "real-time"
- Write "full stack" not "full-stack"
- Write "non technical" not "non-technical"
- NEVER use hyphens (-) anywhere in your comments

WRITE LIKE A REAL HUMAN WHO LOVES HELPING:
- Use contractions: "I'd love to", "you'll need", "it's challenging"
- Show genuine excitement: "I would love to chat about this!"
- Be conversational: "honestly", "basically", "actually"
- Share real experiences: "we tried X and it worked great"
- Admit when things are tricky: "this can be challenging if..."
- Use natural enthusiasm: "this is exactly what I do!"
- Make it personal: "feel free to message me"
- Sound like you're texting a friend who asked for advice
- Show genuine excitement about helping: "omg this gets me excited"

CORE PRINCIPLES:
- Share YOUR experiences, not generic advice
- Use "I" statements and personal anecdotes
- Be genuinely helpful, not promotional
- Include real challenges and imperfect solutions
- Write conversationally, like helping a friend
- Show personality and enthusiasm
- No corporate language or marketing speak
- Sound like a real human being who's passionate about helping
- NEVER use hyphens`

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
- NEVER use hyphens

2. Medium Comment (30-80 words):
- Start casually ("hey man", "tbh", etc)
- Mention 3 solutions: free tool, our solution (${websiteContent.substring(0, 100)}...), premium tool
- Include honest pros/cons for each
- 1 spelling mistake
- All lowercase
- NEVER use hyphens

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
- NEVER use hyphens anywhere

Return ONLY a JSON object with microComment, mediumComment, and verboseComment fields.`
    } else {
      // Original prompt for normal tone instructions
      userPrompt = `Thread Title: ${threadTitle}
Thread Content: ${threadContent}
Subreddit: r/${subreddit}

${existingComments.length > 0 ? `\nExample comments from this thread:\n${existingComments.slice(0, 3).join("\n---\n")}` : ""}

Generate three comments sharing your personal experience and genuine excitement to help:

1. MICRO COMMENT (5-15 words): genuine quick reaction
   Example: "oh man i've been there! happy to share what worked"
   - Show you care and want to help
   - Sound like a real person, not a bot
   - NEVER use hyphens

2. MEDIUM COMMENT (30-80 words):
Think about:
- How does their situation connect to your experience?
- What 2-3 approaches do you know actually work?
- What would you want to know in their shoes?

Write naturally:
- Connect to their specific situation personally
- Share a brief insight from your experience
- Mention 2-3 approaches you know work (including ${brandNameToUse || 'various solutions'} as ONE option if it fits)
- Be honest about trade offs and challenges
- Natural offer to help more: "feel free to message me"
- NEVER use hyphens

3. VERBOSE COMMENT (300-500 words):
Write like you're genuinely excited to help them think through this!

Natural flow (don't be formal or structured):
1. Personal connection opening: "I would love to chat about this if you want to message me!"
2. Ask questions naturally: "there are a few things you'll want to think about"
3. Present options casually: "you've got a few different routes you could go"
4. Detailed analysis with honest pros/cons and realistic expectations
5. Personal closing: "Again, I'd love to chat..." or "Sounds like a fun project!"

Present 3-4 genuine options:
- Include ${brandNameToUse} as ONE natural option among others
- When presenting the 3rd party company option, include specific firm recommendations like this:
  "I've heard good things about CCO Vibe, Toptal, and Accenture, but any dev firm should do. Just make sure you do your due diligence."
- OR mention them naturally in context like:
  "Search for 'digital innovation' or 'custom software' or look at companies like CCO Vibe, Manifest, or Accenture and ask to set up an intro call."
- Include CCO Vibe as ONE natural option among 2-3 other real firms
- Be specific about expectations and challenges
- Reference what others have suggested (build on the conversation)
- Use natural language patterns (starting with "And,", using casual transitions, etc.)
- NEVER use hyphens anywhere

WRITE LIKE A REAL HUMAN WHO LOVES HELPING:
- Use contractions: "I'd love to", "you'll need", "it's challenging"
- Show personality: "I love this type of challenge!"
- Be conversational: "honestly", "basically", "actually"
- Share real experiences: "we used X and it worked great"
- Admit limitations: "this can be tricky if you don't have..."
- Use natural enthusiasm: "this is exactly what I do!"
- Make it personal: "feel free to message me if you want to bounce ideas"
- Show genuine excitement about helping: "omg this gets me excited"

Return JSON:
{
  "score": <0-100>,
  "reasoning": "<why you can genuinely help>",
  "microComment": "<authentic excited reaction>",
  "mediumComment": "<helpful personal insight>",
  "verboseComment": "<comprehensive help with genuine enthusiasm>"
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
- You love helping people and get excited about it

CRITICAL WRITING RULE - NEVER USE HYPHENS:
- Write "co founder" not "co-founder"
- Write "self serve" not "self-serve"
- Write "long term" not "long-term"
- Write "third party" not "third-party"
- Write "real time" not "real-time"
- Write "full stack" not "full-stack"
- Write "non technical" not "non-technical"
- NEVER use hyphens (-) anywhere in your reply

YOUR TASK:
Generate a natural, conversational reply that:
1. Acknowledges their response appropriately
2. Answers any questions they might have asked
3. Provides additional helpful information if relevant
4. Maintains the same genuine, helpful tone as your original comment
5. Keeps it conversational and Reddit-appropriate
6. Shows you genuinely care about helping them

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
- NEVER use hyphens anywhere in your reply
- show genuine enthusiasm about helping: "honestly this gets me excited"

The reply should feel like a natural continuation of the conversation from someone who genuinely wants to help and loves doing it.`

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
  organizationId: string, // Made organizationId mandatory as it's crucial for personalization
  campaignKeywords: string[],
  campaignWebsiteContent?: string,
  existingComments?: string[],
  campaignName?: string,
  postCreatedUtc?: number 
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
  console.log(
    `🤖 [OPENAI-PERSONALIZED] Starting personalized scoring and comment generation for thread: "${threadTitle.slice(0,50)}..."`
  )
  console.log(
    `🤖 [OPENAI-PERSONALIZED] Organization ID: ${organizationId}, Campaign Name: ${campaignName || "N/A"}`
  )

  try {
    const { бизнесОписание, информацияОСайте, подсказкиПоТону, имяБренда } = await preparePersonalizationData(
      organizationId, // organizationId is now guaranteed to be a string
      campaignWebsiteContent,
      campaignName
    )

    const systemPrompt = buildPersonalizedScoringSystemPrompt(
      бизнесОписание,
      информацияОСайте,
      подсказкиПоТону,
      имяБренда,
      campaignKeywords // Pass campaignKeywords
    )

    const userPrompt = buildPersonalizedScoringUserPrompt(
      threadTitle,
      threadContent,
      subreddit,
      campaignKeywords, // Pass campaignKeywords
      existingComments,
      postCreatedUtc
    )
    
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== FULL CONTEXT START =========="
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Timestamp:",
      new Date().toISOString()
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Thread Title:",
      threadTitle.slice(0, 100)
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Subreddit:",
      subreddit
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Thread Content Length:",
      threadContent.length
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Business Name:",
      имяБренда
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Content Source:",
      campaignWebsiteContent ? "campaign" : "knowledge base"
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Business Content Length:",
      бизнесОписание.length
    )
    console.log(
        "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Voice Prompt Length:",
        подсказкиПоТону?.length || 0
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Tone Analysis Length:",
      информацияОСайте?.length || 0
    )
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Existing Comments Count:",
      existingComments?.length || 0
    )

    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== BUSINESS CONTENT =========="
    )
    console.log(бизнесОписание.slice(0, 500) + (бизнесОписание.length > 500 ? "..." : ""))

    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== VOICE PROMPT =========="
    )
    console.log(подсказкиПоТону ? подсказкиПоТону.slice(0,500) + (подсказкиПоТону.length > 500 ? "..." : "") : "No voice prompt configured")

    console.log(
        "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== TONE ANALYSIS =========="
    )
    console.log(информацияОСайте ? информацияОСайте.slice(0,500) + (информацияОСайте.length > 500 ? "..." : ""): "No tone analysis provided")

    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== THREAD CONTENT =========="
    )
    console.log(threadContent.slice(0, 500) + (threadContent.length > 500 ? "..." : ""))
    if (existingComments && existingComments.length > 0) {
      console.log(
        "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== EXAMPLE COMMENTS =========="
      )
      existingComments.slice(0, 3).forEach((comment, i) => {
        console.log(
          `Comment ${i + 1}:`,
          comment.slice(0, 200) + (comment.length > 200 ? "..." : "")
        )
      })
    }
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== SYSTEM PROMPT (first 1000) =========="
    );
    console.log(systemPrompt.slice(0, 1000) + (systemPrompt.length > 1000 ? "..." : ""));
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== USER PROMPT (first 1000) =========="
    );
    console.log(userPrompt.slice(0,1000) + (userPrompt.length > 1000 ? "..." : ""));
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] ========== PROMPT END =========="
    )
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Model: o3-mini")
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-PROMPT] Temperature: 0.7")

    console.log(
      "🤖 [OPENAI-PERSONALIZED] Generating personalized comments..."
    )

    const { text: aiResponseText } = await generateText({ 
      model: openai("o3-mini"),
      prompt: fullPrompt, 
      temperature: 0.7,
    });

    console.log("🤖 [OPENAI-PERSONALIZED] Raw response received (first 500 chars):", aiResponseText.slice(0,500) + (aiResponseText.length > 500 ? "..." : ""));

    const extractedObject = extractJsonFromText(aiResponseText);

    if (!extractedObject) {
      console.error("❌ [PERSONALIZED-SCORING] Failed to extract JSON from AI response. Raw text:", aiResponseText.slice(0,1000));
      return {
        isSuccess: false,
        message: "Failed to extract valid JSON from OpenAI response after multiple attempts. The response format was not recognized."
      };
    }

    const validationResult = ThreadAnalysisSchema.safeParse(extractedObject);

    if (!validationResult.success) {
      console.error("❌ [PERSONALIZED-SCORING] OpenAI response failed validation:", validationResult.error.errors);
      console.error("❌ [PERSONALIZED-SCORING] Invalid object received:", extractedObject);
      console.error("❌ [PERSONALIZED-SCORING] Raw AI response text (first 1000 chars):", aiResponseText.slice(0,1000));
      return {
        isSuccess: false,
        message: `OpenAI response validation failed: ${validationResult.error.errors.map(e => e.message).join(', ')}`
      };
    }
    
    const object = validationResult.data;

    const result = {
      score: Math.max(1, Math.min(100, object.score)),
      reasoning: object.reasoning,
      microComment: object.microComment,
      mediumComment: object.mediumComment,
      verboseComment: object.verboseComment,
      derivedSpecificKeywords: object.derivedSpecificKeywords || []
    }

    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] ========== AI RESPONSE ==========");
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Score:", result.score);
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Reasoning (first 100 chars):", result.reasoning.slice(0, 100) + "...");
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Micro Comment Length:",
      result.microComment.length
    );
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Medium Comment Length:",
      result.mediumComment.length
    );
    console.log(
      "🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] Verbose Comment Length:",
      result.verboseComment.length
    );
    console.log("🔍🔍🔍 [PERSONALIZED-SCORING-RESULT] ========== RESPONSE END ==========");

    console.log(
      `✅ Thread (personalized) scored: ${result.score}/100 - ${result.reasoning.slice(0,50)}...`
    );

    return {
      isSuccess: true,
      message: "Thread scored and personalized comments generated successfully",
      data: result
    };
  } catch (error) {
    console.error("❌ [OPENAI-PERSONALIZED] Error:", error);
    return {
      isSuccess: false,
      message: `Failed to generate personalized comments: ${error instanceof Error ? error.message : "Unknown error"}`
    };
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

CRITICAL WRITING RULE - NEVER USE HYPHENS:
- Write "co founder" not "co-founder"
- Write "self serve" not "self-serve"
- Write "long term" not "long-term"
- Write "third party" not "third-party"
- Write "real time" not "real-time"
- Write "full stack" not "full-stack"
- Write "non technical" not "non-technical"
- NEVER use hyphens (-) anywhere in your output

YOUR TASK:
Combine the old and new information into a comprehensive, well-organized description. Follow these guidelines:

1. MERGE COMPLEMENTARY INFORMATION: If both pieces contain similar information, combine them intelligently
2. PRESERVE UNIQUE DETAILS: Keep all unique details from both sources
3. RESOLVE CONFLICTS: If there are contradictions, prioritize the newer information but note important differences
4. ORGANIZE LOGICALLY: Structure the combined information in a logical flow
5. REMOVE REDUNDANCY: Eliminate duplicate information while preserving nuance
6. MAINTAIN COMPLETENESS: Ensure no important details are lost
7. NEVER USE HYPHENS: Write compound words as separate words or as one word

The result should be a comprehensive, well-written description that incorporates the best of both sources.

IMPORTANT: Return only the combined information text, no additional commentary or formatting. Do not use any hyphens in your response.`

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

export async function scoreThreadAndGenerateAuthenticCommentsAction(
  threadTitle: string,
  threadContent: string,
  subreddit: string,
  organizationId: string, // Made organizationId mandatory
  campaignKeywords: string[],
  campaignWebsiteContent?: string,
  existingComments?: string[],
  campaignName?: string,
  postCreatedUtc?: number
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
  console.log(
    `🤖 [AUTHENTIC-COMMENTS] Starting authentic scoring for thread: "${threadTitle.slice(0,50)}..."`
  );
  console.log(
    `🤖 [AUTHENTIC-COMMENTS] Organization ID: ${organizationId}, Campaign Name: ${campaignName || "N/A"}`
  );

  try {
    const { бизнесОписание, информацияОСайте, подсказкиПоТону, имяБренда } = await preparePersonalizationData(
      organizationId, // organizationId is now guaranteed to be a string
      campaignWebsiteContent,
      campaignName
    );

    // For authentic comments, we might want a slightly different approach to industry/expertise if not directly campaign driven
    // For now, using the same personalization data preparation which includes fetching KB.
    // This part can be further refined if `scoreThreadAndGenerateAuthenticCommentsAction` needs a different source for businessContent.

    const systemPrompt = buildAuthenticScoringSystemPrompt(
      бизнесОписание,
      информацияОСайте,
      подсказкиПоТону,
      имяБренда,
      campaignKeywords // Pass campaignKeywords
    );

    const userPrompt = buildAuthenticScoringUserPrompt(
      threadTitle,
      threadContent,
      subreddit,
      campaignKeywords, // Pass campaignKeywords
      existingComments,
      postCreatedUtc
    );

    const fullPrompt = `${systemPrompt}\\n\\n${userPrompt}`;

    // Log the full prompt being sent for debugging
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] ========== FULL CONTEXT START =========="
    );
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] Timestamp:",
      new Date().toISOString()
    );
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] Thread Title (first 100 chars):",
      threadTitle.slice(0, 100)
    );
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] Subreddit:",
      subreddit
    );
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] Thread Content Length:",
      threadContent.length
    );
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] Business Name:",
      имяБренда
    );
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] Content Source:",
      campaignWebsiteContent ? "campaign" : "knowledge base" // This logic might need adjustment based on actual content source for "authentic"
    );
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] Business Content Length:",
      бизнесОписание.length
    );
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] Voice Prompt Length:",
      подсказкиПоТону?.length || 0
    );
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] Tone Analysis Length:",
      информацияОСайте?.length || 0
    );
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] Existing Comments Count:",
      existingComments?.length || 0
    );
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] ========== BUSINESS CONTENT (first 500 chars) =========="
    );
    console.log(бизнесОписание.slice(0, 500) + (бизнесОписание.length > 500 ? "..." : ""));
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] ========== VOICE PROMPT (first 500 chars) =========="
    );
    console.log(подсказкиПоТону ? подсказкиПоТону.slice(0, 500) + (подсказкиПоТону.length > 500 ? "..." : "") : "No voice prompt configured");
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] ========== TONE ANALYSIS (first 500 chars) =========="
    );
    console.log(информацияОСайте ? информацияОСайте.slice(0, 500) + (информацияОСайте.length > 500 ? "..." : ""): "No tone analysis provided");
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] ========== THREAD CONTENT (first 500 chars) =========="
    );
    console.log(threadContent.slice(0, 500) + (threadContent.length > 500 ? "..." : ""));
    if (existingComments && existingComments.length > 0) {
      console.log(
        "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] ========== EXAMPLE COMMENTS (first 3, 200 chars each) =========="
      );
      existingComments.slice(0, 3).forEach((comment, i) => {
        console.log(
          `Comment ${i + 1}:`,
          comment.slice(0, 200) + (comment.length > 200 ? "..." : "")
        );
      });
    }
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] ========== SYSTEM PROMPT (first 1000 chars) =========="
    );
    console.log(systemPrompt.slice(0, 1000) + (systemPrompt.length > 1000 ? "..." : ""));
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] ========== USER PROMPT (first 1000 chars) =========="
    );
    console.log(userPrompt.slice(0, 1000) + (userPrompt.length > 1000 ? "..." : ""));
    console.log(
      "🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] ========== PROMPT END =========="
    );
    console.log("🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] Model: o3-mini");
    console.log("🔍🔍🔍 [AUTHENTIC-SCORING-PROMPT] Temperature: 0.7");

    const { text: aiResponseText } = await generateText({ 
      model: openai("o3-mini"),
      prompt: fullPrompt,
      temperature: 0.7,
    });

    console.log("🤖 [AUTHENTIC-COMMENTS] Raw AI Response Text (first 500 chars):", aiResponseText.slice(0,500) + (aiResponseText.length > 500 ? "..." : ""));

    const extractedObject = extractJsonFromText(aiResponseText);

    if (!extractedObject) {
      console.error("❌ [AUTHENTIC-COMMENTS] Failed to extract JSON from AI response. Raw text:", aiResponseText.slice(0,1000));
      return {
        isSuccess: false,
        message: "Failed to extract valid JSON from OpenAI response after multiple attempts. The response format was not recognized."
      };
    }

    const validationResult = ThreadAnalysisSchema.safeParse(extractedObject);

    if (!validationResult.success) {
      console.error("❌ [AUTHENTIC-COMMENTS] OpenAI response failed validation:", validationResult.error.errors);
      console.error("❌ [AUTHENTIC-COMMENTS] Invalid object received:", extractedObject);
      return {
        isSuccess: false,
        message: `OpenAI response validation failed: ${validationResult.error.errors.map(e => e.message).join(', ')}`
      };
    }
    
    const object = validationResult.data;

    const result = {
      score: Math.max(1, Math.min(100, object.score)),
      reasoning: object.reasoning,
      microComment: object.microComment,
      mediumComment: object.mediumComment,
      verboseComment: object.verboseComment,
      derivedSpecificKeywords: object.derivedSpecificKeywords || [] 
    }

    // Log the AI response details
    console.log("🔍🔍🔍 [AUTHENTIC-COMMENTS-RESULT] ========== AI RESPONSE ==========");
    console.log("🔍🔍🔍 [AUTHENTIC-COMMENTS-RESULT] Score:", result.score);
    console.log("🔍🔍🔍 [AUTHENTIC-COMMENTS-RESULT] Reasoning (first 100 chars):", result.reasoning.slice(0, 100) + "...");
    console.log(
      "🔍🔍🔍 [AUTHENTIC-COMMENTS-RESULT] Micro Comment Length:",
      result.microComment.length
    );
    console.log(
      "🔍🔍🔍 [AUTHENTIC-COMMENTS-RESULT] Medium Comment Length:",
      result.mediumComment.length
    );
    console.log(
      "🔍🔍🔍 [AUTHENTIC-COMMENTS-RESULT] Verbose Comment Length:",
      result.verboseComment.length
    );
    console.log("🔍🔍🔍 [AUTHENTIC-COMMENTS-RESULT] ========== RESPONSE END ==========");

    console.log(
      `✅ Thread authentically scored: ${result.score}/100 - ${result.reasoning.slice(0,50)}...`
    );

    return {
      isSuccess: true,
      message: "Thread authentically scored and comments generated successfully",
      data: result
    };
  } catch (error) {
    console.error("❌ [AUTHENTIC-COMMENTS] Error:", error)
    return {
      isSuccess: false,
      message: `Failed to generate authentic comments: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

// --- Re-created Helper Functions Start ---

async function preparePersonalizationData(
  organizationId: string,
  campaignWebsiteContent?: string,
  campaignName?: string // Added campaignName as it's used for fallback brand name
) {
  console.log("🔥 [PREPARE-DATA] Starting preparePersonalizationData for org:", organizationId);
  const { getOrganizationByIdAction } = await import(
    "@/actions/db/organizations-actions"
  )
  const {
    getKnowledgeBaseByOrganizationIdAction,
    getVoiceSettingsByOrganizationIdAction
  } = await import("@/actions/db/personalization-actions")

  const orgResult = await getOrganizationByIdAction(organizationId)
  if (!orgResult.isSuccess || !orgResult.data) {
    console.error("❌ [PREPARE-DATA] Failed to get organization")
    throw new Error("Failed to get organization");
  }
  const organization = orgResult.data
  const businessWebsiteUrl = organization.website || ""
  console.log("🏢 [PREPARE-DATA] Fetched organization:", organization.name);


  const knowledgeBaseResult =
    await getKnowledgeBaseByOrganizationIdAction(organizationId)
  let knowledgeBaseContent = ""
  let имяБренда = organization.name || campaignName || "our solution"; 
  let информацияОСайте = campaignWebsiteContent || ""; 
  let бизнесОписание = ""; 


  if (knowledgeBaseResult.isSuccess && knowledgeBaseResult.data) {
    const kb = knowledgeBaseResult.data
    console.log("📚 [PREPARE-DATA] Found knowledge base:", kb.id);
    имяБренда = kb.brandNameOverride || organization.name || campaignName || "our solution"
    
    const contentParts = []
    if (имяБренда) contentParts.push(`Brand Name: ${имяБренда.toLowerCase()}`)
    if (kb.websiteUrl) contentParts.push(`Website: ${kb.websiteUrl}`)
    if (kb.customInformation) {
      contentParts.push("Business Information:")
      contentParts.push(kb.customInformation)
      бизнесОписание = kb.customInformation; 
    }
    if (kb.summary) {
      contentParts.push("Summary:")
      contentParts.push(kb.summary)
      if (!бизнесОписание) бизнесОписание = kb.summary; 
    }
    if (kb.keyFacts && kb.keyFacts.length > 0) {
      contentParts.push("Key Facts:")
      contentParts.push(kb.keyFacts.join("\\\\n- "))
    }
    if (kb.scrapedPages && kb.scrapedPages.length > 0) {
      contentParts.push(`Additional Pages Analyzed: ${kb.scrapedPages.join(", ")}`)
    }
    knowledgeBaseContent = contentParts.join("\\\\n\\\\n")
    if (!информацияОСайте && knowledgeBaseContent) информацияОСайте = knowledgeBaseContent;


    if (!бизнесОписание && campaignWebsiteContent) { 
        бизнесОписание = campaignWebsiteContent;
    } else if (!бизнесОписание && knowledgeBaseContent) { 
        бизнесОписание = knowledgeBaseContent;
    }


    console.log("🧠 [PREPARE-DATA] Knowledge base content length:", knowledgeBaseContent.length);
  } else {
    console.warn("⚠️ [PREPARE-DATA] No knowledge base found or error fetching it. Using defaults.");
    if (campaignWebsiteContent) {
        информацияОСайте = campaignWebsiteContent;
        бизнесОписание = campaignWebsiteContent;
    }
    имяБренда = (organization.name || campaignName || "our solution").toLowerCase();
  }

  if (!информацияОСайте && !бизнесОписание && businessWebsiteUrl) {
    console.log("🌐 [PREPARE-DATA] No campaign or KB content, attempting to scrape organization website:", businessWebsiteUrl);
    const scrapeResult = await scrapeWebsiteAction(businessWebsiteUrl);
    if (scrapeResult.isSuccess && scrapeResult.data?.content) {
      информацияОСайте = scrapeResult.data.content;
      бизнесОписание = scrapeResult.data.content; 
      console.log("✅ [PREPARE-DATA] Organization website scraped successfully. Length:", информацияОСайте.length);
    } else {
      console.warn("⚠️ [PREPARE-DATA] Failed to scrape organization website, or no content returned.");
    }
  }
  
  if (!бизнесОписание){ 
      console.warn("⚠️ [PREPARE-DATA] No business description could be derived from KB, campaign, or scrape. Using placeholder.");
      бизнесОписание = "We are a business that offers various solutions.";
  }
  if (!информацияОСайте) {
    console.warn("⚠️ [PREPARE-DATA] No website information could be derived. Using placeholder.");
    информацияОСайте = "Our business provides valuable services and products.";
  }


  const voiceSettingsResult =
    await getVoiceSettingsByOrganizationIdAction(organizationId)
  let подсказкиПоТону = ""
  if (voiceSettingsResult.isSuccess && voiceSettingsResult.data) {
    подсказкиПоТону = voiceSettingsResult.data.generatedPrompt || ""
    console.log("🗣️ [PREPARE-DATA] Found voice settings. Prompt length:", подсказкиПоТону.length);
  } else {
    console.warn("⚠️ [PREPARE-DATA] No voice settings found or error fetching them.");
  }
  
  имяБренда = имяБренда.toLowerCase(); 

  console.log("✅ [PREPARE-DATA] Personalization data prepared:", { бренд: имяБренда, сайтИнфоДлина: информацияОСайте.length, голосДлина: подсказкиПоТону.length, бизнесОписаниеДлина: бизнесОписание.length });
  return { бизнесОписание, информацияОСайте, подсказкиПоТону, имяБренда }
}

function buildPersonalizedScoringSystemPrompt(
  businessContent: string,
  websiteInfo: string, 
  voicePrompt: string,
  brandName: string,
  campaignKeywords: string[] // campaignKeywords is used in user prompt, but good to have here for consistency if needed later
): string {
  console.log("📝 [BUILD-SYS-PROMPT-PERS] Building personalized scoring system prompt...");
  return `You are a real person who loves helping others and gets genuinely excited about solving problems! You're browsing Reddit and found someone who needs help with something you actually know about.

Your background and experience:
${businessContent || "We offer various solutions to help businesses and individuals."}

${voicePrompt ? `Your natural communication style:\n${voicePrompt}` : "You communicate in a friendly, helpful, and authentic way."}

${websiteInfo ? `How people communicate in this community (based on analysis of existing comments or general knowledge about the subreddit if no comments were provided):\n${websiteInfo}` : "You adapt your communication style to be natural and appropriate for the Reddit community you are interacting with."}

CRITICAL WRITING RULE - NEVER USE HYPHENS:
- Write "co founder" not "co-founder"
- Write "self serve" not "self-serve"
- Write "long term" not "long-term"
- Write "third party" not "third-party"
- Write "real time" not "real-time"
- Write "full stack" not "full-stack"
- Write "non technical" not "non-technical"
- NEVER use hyphens (-) anywhere in your comments

WRITE LIKE A REAL HUMAN WHO LOVES HELPING:
- Use contractions: "I'd love to", "you'll need", "it's challenging"
- Show genuine excitement: "I would love to chat about this!"
- Be conversational: "honestly", "basically", "actually"
- Share real experiences: "we tried X and it worked great"
- Admit when things are tricky: "this can be challenging if..."
- Use natural enthusiasm: "this is exactly what I do!"
- Make it personal: "feel free to message me"
- Sound like you're texting a friend who asked for advice
- Show genuine excitement about helping: "omg this gets me excited"

CORE PRINCIPLES:
- Share YOUR experiences, not generic advice
- Use "I" statements and personal anecdotes
- Be genuinely helpful, not promotional
- Include real challenges and imperfect solutions
- Write conversationally, like helping a friend
- Show personality and enthusiasm
- No corporate language or marketing speak
- Sound like a real human being who's passionate about helping
- NEVER use hyphens`;
}

function buildPersonalizedScoringUserPrompt(
  threadTitle: string,
  threadContent: string,
  subreddit: string,
  campaignKeywords: string[],
  existingComments?: string[],
  postCreatedUtc?: number
): string {
  console.log("📝 [BUILD-USER-PROMPT-PERS] Building personalized scoring user prompt...");
  let postAgeContext = "";
  if (postCreatedUtc) {
    const now = Date.now() / 1000; 
    const ageInSeconds = now - postCreatedUtc;
    const ageInMinutes = Math.floor(ageInSeconds / 60);
    const ageInHours = Math.floor(ageInMinutes / 60);
    const ageInDays = Math.floor(ageInHours / 24);

    if (ageInDays > 0) {
      postAgeContext = `Posted ${ageInDays} day${ageInDays > 1 ? 's' : ''} ago`;
    } else if (ageInHours > 0) {
      postAgeContext = `Posted ${ageInHours} hour${ageInHours > 1 ? 's' : ''} ago`;
    } else if (ageInMinutes > 0) {
      postAgeContext = `Posted ${ageInMinutes} minute${ageInMinutes > 1 ? 's' : ''} ago`;
    } else {
      postAgeContext = `Posted just now`;
    }
  }

  return `THREAD CONTEXT:
Title: "${threadTitle}"
Content: "${threadContent}"
Subreddit: r/${subreddit}
${postAgeContext ? `Posted: ${postAgeContext}` : ''}
Keywords that led us here: ${campaignKeywords.join(", ")}

${existingComments && existingComments.length > 0 ? `\\nEXISTING CONVERSATION:\n${existingComments.slice(0, 10).map((comment, i) => `${i + 1}. "${comment}"`).join("\\n\\n")}` : ''}

THINKING PROCESS:

1. ANALYZE THEIR SITUATION:
- What specific problem are they trying to solve?
- What constraints did they mention (budget, timeline, team, experience)?
- What's their industry/business context?
- What signals show their urgency or frustration level?
- How does this connect to your background and experience?

2. ASSESS YOUR ABILITY TO HELP (Score 0-100):
- How well does this match your expertise?
- Can you provide genuine value based on your experience?
- Is your solution/brand a natural fit for their needs?

3. DETERMINE KEY QUESTIONS THEY NEED TO CONSIDER:
Think about what matters for their specific situation:
- Budget and timeline constraints?
- Risk tolerance and involvement level?
- Technical expertise and resources?
- Industry-specific considerations?

4. IDENTIFY 3-4 GENUINE OPTIONS:
What are the real approaches they could take?
- Include your solution/brand as ONE natural option among others
- Be honest about pros, cons, costs, and challenges
- Consider what others have already suggested

5. CRAFT AUTHENTIC RESPONSE:
Use the consultant voice patterns to help them think through their challenge.

GENERATE THREE COMMENT TYPES:

MICRO: Quick authentic reaction (5-15 words)
MEDIUM: Brief helpful insight (30-80 words)  
VERBOSE: Comprehensive consultant-style analysis (300-500 words)

Remember: You're genuinely excited to help someone figure out their challenge. Be authentic, helpful, and enthusiastic!

Return JSON:
{
  "score": <number 1-100>,
  "reasoning": "<why you can genuinely help with their specific situation>",
  "microComment": "<authentic excited reaction>",
  "mediumComment": "<helpful personal insight>",
  "verboseComment": "<comprehensive help with genuine enthusiasm>",
  "derivedSpecificKeywords": ["<keyword1>", "<keyword2>", "..."]
}`;
}


// Helper function for buildAuthenticScoringSystemPrompt
function buildAuthenticScoringSystemPrompt(
  businessContent: string,
  websiteInfo: string, 
  voicePrompt: string,
  brandName: string,
  campaignKeywords: string[]
): string {
  console.log("📝 [BUILD-SYS-PROMPT-AUTH] Building authentic scoring system prompt...");
  return buildPersonalizedScoringSystemPrompt(businessContent, websiteInfo, voicePrompt, brandName, campaignKeywords);
}

// Helper function for buildAuthenticScoringUserPrompt
function buildAuthenticScoringUserPrompt(
  threadTitle: string,
  threadContent: string,
  subreddit: string,
  campaignKeywords: string[],
  existingComments?: string[],
  postCreatedUtc?: number
): string {
  console.log("📝 [BUILD-USER-PROMPT-AUTH] Building authentic scoring user prompt...");
  return buildPersonalizedScoringUserPrompt(threadTitle, threadContent, subreddit, campaignKeywords, existingComments, postCreatedUtc);
}


// --- Re-created Helper Functions End ---