"use server"

import { ActionState } from "@/types"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = "https://api.openai.com/v1"

interface SentimentAnalysisResult {
  sentiment: "positive" | "negative" | "neutral"
  confidence: number // 0-100
  reasoning: string
  emotionalTone?: string // angry, excited, disappointed, grateful, etc.
  urgencyLevel?: "low" | "medium" | "high"
  actionRequired?: boolean // Whether this requires immediate attention
}

/**
 * Analyzes the sentiment of a Reddit comment or reply
 * Determines if the sentiment is positive, negative, or neutral
 * Also provides context about urgency and action requirements
 */
export async function analyzeSentimentAction(
  text: string,
  context?: {
    author?: string
    originalComment?: string // The comment they're replying to
    subreddit?: string
  }
): Promise<ActionState<SentimentAnalysisResult>> {
  console.log("🧠 [SENTIMENT-ANALYSIS] Starting sentiment analysis")
  console.log("🧠 [SENTIMENT-ANALYSIS] Text length:", text.length)
  console.log("🧠 [SENTIMENT-ANALYSIS] Author:", context?.author || "unknown")
  console.log("🧠 [SENTIMENT-ANALYSIS] Subreddit:", context?.subreddit || "unknown")

  try {
    if (!OPENAI_API_KEY) {
      console.error("🧠 [SENTIMENT-ANALYSIS] OpenAI API key not found")
      return {
        isSuccess: false,
        message: "OpenAI API key not configured"
      }
    }

    if (!text || text.trim().length === 0) {
      return {
        isSuccess: true,
        message: "Empty text provided",
        data: {
          sentiment: "neutral",
          confidence: 0,
          reasoning: "No text provided for analysis",
          actionRequired: false
        }
      }
    }

    const analysisPrompt = `
Analyze the sentiment and emotional context of this Reddit comment/reply.

COMMENT TEXT:
"${text}"

${context?.author ? `AUTHOR: u/${context.author}` : ""}
${context?.subreddit ? `SUBREDDIT: r/${context.subreddit}` : ""}
${context?.originalComment ? `\nTHEY ARE REPLYING TO:\n"${context.originalComment}"\n` : ""}

Please analyze:

1. SENTIMENT: positive, negative, or neutral
   - Positive: Grateful, satisfied, happy, excited, supportive
   - Negative: Angry, frustrated, disappointed, critical, hostile
   - Neutral: Informational, factual, neither positive nor negative

2. CONFIDENCE: How confident are you in this sentiment assessment? (0-100)
   - 90-100: Very clear emotional indicators
   - 70-89: Good emotional indicators with some context
   - 50-69: Moderate confidence, some ambiguity
   - Below 50: Unclear or very subtle sentiment

3. EMOTIONAL TONE: More specific emotional descriptor
   - Examples: grateful, frustrated, excited, disappointed, angry, curious, supportive, critical

4. URGENCY LEVEL: How urgently does this need attention?
   - High: Angry customer, complaint, urgent problem
   - Medium: Question, concern, moderate issue
   - Low: General comment, praise, casual interaction

5. ACTION REQUIRED: Does this require immediate business attention?
   - True: Complaints, urgent questions, negative feedback about services
   - False: General comments, praise, casual discussion

Consider:
- Reddit context and communication style
- Business implications of the sentiment
- Whether this affects customer relationships
- The actual content meaning, not just emotional words

Respond in JSON format:
{
  "sentiment": "positive|negative|neutral",
  "confidence": <0-100>,
  "reasoning": "detailed explanation of the sentiment analysis",
  "emotionalTone": "specific emotional descriptor",
  "urgencyLevel": "low|medium|high",
  "actionRequired": boolean
}
`

    console.log("🧠 [SENTIMENT-ANALYSIS] Sending analysis request to OpenAI")

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert sentiment analysis specialist who understands Reddit communication patterns and business contexts. You excel at identifying emotional tone, urgency levels, and business implications from customer feedback and social media interactions."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent analysis
        max_tokens: 500
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("🧠 [SENTIMENT-ANALYSIS] OpenAI API error:", errorText)
      return {
        isSuccess: false,
        message: `OpenAI API error: ${response.status} - ${errorText}`
      }
    }

    const data = await response.json()
    const analysisContent = data.choices[0]?.message?.content

    if (!analysisContent) {
      console.error("🧠 [SENTIMENT-ANALYSIS] No analysis content received")
      return {
        isSuccess: false,
        message: "No analysis content received from OpenAI"
      }
    }

    let result: SentimentAnalysisResult
    try {
      // Clean the response by removing markdown code blocks if present
      const cleanedContent = analysisContent
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      
      const parsedResult = JSON.parse(cleanedContent)
      result = {
        sentiment: parsedResult.sentiment || "neutral",
        confidence: Math.min(100, Math.max(0, parsedResult.confidence || 0)),
        reasoning: parsedResult.reasoning || "No reasoning provided",
        emotionalTone: parsedResult.emotionalTone,
        urgencyLevel: parsedResult.urgencyLevel || "low",
        actionRequired: parsedResult.actionRequired || false
      }
    } catch (parseError) {
      console.error("🧠 [SENTIMENT-ANALYSIS] Failed to parse analysis:", parseError)
      console.error("🧠 [SENTIMENT-ANALYSIS] Raw content:", analysisContent)
      
      // Fallback to basic sentiment detection
      const lowerText = text.toLowerCase()
      const positiveWords = ["thanks", "thank you", "great", "awesome", "helpful", "love", "amazing", "perfect"]
      const negativeWords = ["hate", "terrible", "awful", "bad", "worst", "disappointed", "angry", "frustrated"]
      
      const hasPositive = positiveWords.some(word => lowerText.includes(word))
      const hasNegative = negativeWords.some(word => lowerText.includes(word))
      
      let fallbackSentiment: "positive" | "negative" | "neutral" = "neutral"
      if (hasPositive && !hasNegative) fallbackSentiment = "positive"
      else if (hasNegative && !hasPositive) fallbackSentiment = "negative"
      
      result = {
        sentiment: fallbackSentiment,
        confidence: 30,
        reasoning: "Failed to parse AI analysis, using basic keyword matching as fallback",
        actionRequired: hasNegative
      }
    }

    console.log("🧠 [SENTIMENT-ANALYSIS] Analysis completed successfully")
    console.log("🧠 [SENTIMENT-ANALYSIS] Sentiment:", result.sentiment)
    console.log("🧠 [SENTIMENT-ANALYSIS] Confidence:", result.confidence)
    console.log("🧠 [SENTIMENT-ANALYSIS] Action Required:", result.actionRequired)

    return {
      isSuccess: true,
      message: "Sentiment analysis completed successfully",
      data: result
    }
  } catch (error) {
    console.error("🧠 [SENTIMENT-ANALYSIS] Error in sentiment analysis:", error)
    return {
      isSuccess: false,
      message: `Failed to analyze sentiment: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

/**
 * Analyzes sentiment for multiple texts in batch
 * More efficient for processing multiple replies at once
 */
export async function analyzeBatchSentimentAction(
  items: Array<{
    id: string
    text: string
    context?: {
      author?: string
      originalComment?: string
      subreddit?: string
    }
  }>
): Promise<ActionState<Array<{ id: string; sentiment: SentimentAnalysisResult }>>> {
  console.log("🧠 [BATCH-SENTIMENT] Starting batch sentiment analysis")
  console.log("🧠 [BATCH-SENTIMENT] Items to analyze:", items.length)

  try {
    const results: Array<{ id: string; sentiment: SentimentAnalysisResult }> = []
    
    // Process in smaller batches to avoid API limits
    const batchSize = 5
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      
      console.log(`🧠 [BATCH-SENTIMENT] Processing batch ${Math.floor(i / batchSize) + 1}`)
      
      const batchPromises = batch.map(async item => {
        const result = await analyzeSentimentAction(item.text, item.context)
        return {
          id: item.id,
          sentiment: result.isSuccess ? result.data : {
            sentiment: "neutral" as const,
            confidence: 0,
            reasoning: result.message,
            actionRequired: false
          }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log("🧠 [BATCH-SENTIMENT] Batch analysis completed successfully")
    
    return {
      isSuccess: true,
      message: `Analyzed sentiment for ${results.length} items`,
      data: results
    }
  } catch (error) {
    console.error("🧠 [BATCH-SENTIMENT] Error in batch sentiment analysis:", error)
    return {
      isSuccess: false,
      message: `Failed to analyze batch sentiment: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 