/*
<ai_context>
Contains server actions for OpenAI API integration to score Reddit threads and generate comments.
</ai_context>
*/

"use server"

import OpenAI from "openai"
import { ActionState } from "@/types"

// Lazy initialization of OpenAI client
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured")
    }

    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  
  return openaiClient
}

export interface RelevanceScoreResult {
  score: number // 1-100
  reasoning: string
  generatedComment: string
}

export async function scoreThreadRelevanceAndGenerateCommentAction(
  threadTitle: string,
  threadContent: string,
  subreddit: string,
  websiteContent: string
): Promise<ActionState<RelevanceScoreResult>> {
  try {
    const openai = getOpenAIClient()
    
    console.log(`🤖 Scoring thread relevance and generating comment for: "${threadTitle.slice(0, 50)}..."`)
    
    const prompt = `You are an expert at analyzing Reddit threads for lead generation opportunities. 

WEBSITE CONTENT (the company's homepage):
${websiteContent.slice(0, 3000)} // Limit to avoid token limits

REDDIT THREAD:
Subreddit: r/${subreddit}
Title: ${threadTitle}
Content: ${threadContent.slice(0, 2000)} // Limit to avoid token limits

TASK:
1. Score this Reddit thread from 1-100 on how relevant it is for the company to mention they're the CEO and personally recommend reaching out for help.
2. Generate a helpful, authentic comment that the CEO could post.

SCORING CRITERIA (1-100):
- 90-100: Perfect match - thread is directly asking for the company's services
- 70-89: High relevance - thread problem aligns well with company's solutions
- 50-69: Medium relevance - some connection but not ideal
- 30-49: Low relevance - weak connection
- 1-29: Not relevant - no clear connection

COMMENT REQUIREMENTS:
- Sound authentic and helpful, not salesy
- Mention being a CEO naturally in context
- Offer genuine value/help
- Include a soft call-to-action to reach out
- Keep it conversational and Reddit-appropriate
- Maximum 300 words

Please respond with a JSON object with this exact structure:
{
  "score": [number from 1-100],
  "reasoning": "[explain your scoring decision in 2-3 sentences]",
  "generatedComment": "[the comment text]"
}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      return {
        isSuccess: false,
        message: "No response from OpenAI"
      }
    }

    // Parse the JSON response
    let result: RelevanceScoreResult
    try {
      const parsed = JSON.parse(responseText)
      result = {
        score: Math.max(1, Math.min(100, Number(parsed.score) || 1)),
        reasoning: parsed.reasoning || "No reasoning provided",
        generatedComment: parsed.generatedComment || "No comment generated"
      }
    } catch (parseError) {
      // If JSON parsing fails, try to extract manually
      const scoreMatch = responseText.match(/"score":\s*(\d+)/i)
      const reasoningMatch = responseText.match(/"reasoning":\s*"([^"]+)"/i)
      const commentMatch = responseText.match(/"generatedComment":\s*"([^"]+)"/i)
      
      result = {
        score: scoreMatch ? Math.max(1, Math.min(100, Number(scoreMatch[1]))) : 1,
        reasoning: reasoningMatch ? reasoningMatch[1] : "Could not parse reasoning",
        generatedComment: commentMatch ? commentMatch[1] : "Could not parse comment"
      }
    }

    console.log(`✅ Thread scored: ${result.score}/100 - ${result.reasoning.slice(0, 50)}...`)
    
    return {
      isSuccess: true,
      message: "Thread scored and comment generated successfully",
      data: result
    }
  } catch (error) {
    console.error("Error scoring thread and generating comment:", error)
    return { 
      isSuccess: false, 
      message: `Failed to score thread: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

export async function batchScoreThreadsAction(
  threads: Array<{
    threadTitle: string
    threadContent: string
    subreddit: string
  }>,
  websiteContent: string
): Promise<ActionState<RelevanceScoreResult[]>> {
  try {
    const results: RelevanceScoreResult[] = []
    const errors: string[] = []
    
    console.log(`🤖 Batch scoring ${threads.length} threads...`)
    
    for (const thread of threads) {
      const result = await scoreThreadRelevanceAndGenerateCommentAction(
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
      await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay for OpenAI
    }
    
    const successCount = results.length
    const errorCount = errors.length
    
    return {
      isSuccess: true,
      message: `Scored ${successCount} threads successfully, ${errorCount} failed`,
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

    const openai = getOpenAIClient()
    
    // Test with a simple completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Say hello world" }],
      max_tokens: 10
    })

    if (completion.choices[0]?.message?.content) {
      return {
        isSuccess: true,
        message: "OpenAI API connection test successful",
        data: { status: "connected" }
      }
    } else {
      return {
        isSuccess: false,
        message: "OpenAI API test failed - no response"
      }
    }
  } catch (error) {
    console.error("Error testing OpenAI connection:", error)
    return { 
      isSuccess: false, 
      message: `OpenAI connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

export async function improveCommentAction(
  originalComment: string,
  feedback: string
): Promise<ActionState<{ improvedComment: string }>> {
  try {
    const openai = getOpenAIClient()
    
    const prompt = `Please improve this Reddit comment based on the feedback provided:

ORIGINAL COMMENT:
${originalComment}

FEEDBACK:
${feedback}

Please provide an improved version that addresses the feedback while maintaining the authentic, helpful tone. Keep it Reddit-appropriate and under 300 words.

Return only the improved comment text, no additional explanation.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500
    })

    const improvedComment = completion.choices[0]?.message?.content?.trim()
    if (!improvedComment) {
      return {
        isSuccess: false,
        message: "No improved comment generated"
      }
    }

    return {
      isSuccess: true,
      message: "Comment improved successfully",
      data: { improvedComment }
    }
  } catch (error) {
    console.error("Error improving comment:", error)
    return { 
      isSuccess: false, 
      message: `Failed to improve comment: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
} 