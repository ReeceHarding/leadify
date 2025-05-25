/*
<ai_context>
OpenAI integration for analyzing writing style from Twitter data and generating personalized prompts.
</ai_context>
*/

"use server"

import { ActionState } from "@/types"
import { TwitterTweet } from "@/db/schema"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = "https://api.openai.com/v1"

interface WritingStyleAnalysis {
  writingStyleAnalysis: string
  commonPhrases: string[]
  toneAnalysis: string
  vocabularyLevel: "casual" | "professional" | "mixed"
  averageTweetLength: number
  emojiUsage: boolean
  hashtagUsage: boolean
  generatedPrompt: string
}

export async function analyzeTwitterWritingStyleAction(
  tweets: TwitterTweet[],
  twitterHandle: string
): Promise<ActionState<WritingStyleAnalysis>> {
  console.log("🔥 [WRITING-STYLE-ANALYSIS] Starting analyzeTwitterWritingStyleAction")
  console.log("🔥 [WRITING-STYLE-ANALYSIS] Twitter handle:", twitterHandle)
  console.log("🔥 [WRITING-STYLE-ANALYSIS] Tweets count:", tweets.length)

  try {
    if (!OPENAI_API_KEY) {
      console.error("🔥 [WRITING-STYLE-ANALYSIS] OpenAI API key not found")
      return {
        isSuccess: false,
        message: "OpenAI API key not configured"
      }
    }

    if (tweets.length === 0) {
      console.error("🔥 [WRITING-STYLE-ANALYSIS] No tweets provided")
      return {
        isSuccess: false,
        message: "No tweets provided for analysis"
      }
    }

    // Prepare tweet texts for analysis
    const tweetTexts = tweets.map(tweet => tweet.text).join("\n\n")
    console.log("🔥 [WRITING-STYLE-ANALYSIS] Total text length:", tweetTexts.length)

    // Calculate basic metrics
    const averageTweetLength = tweets.reduce((sum, tweet) => sum + tweet.text.length, 0) / tweets.length
    const emojiUsage = tweets.some(tweet => /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(tweet.text))
    const hashtagUsage = tweets.some(tweet => tweet.text.includes('#'))

    console.log("🔥 [WRITING-STYLE-ANALYSIS] Average tweet length:", averageTweetLength)
    console.log("🔥 [WRITING-STYLE-ANALYSIS] Emoji usage:", emojiUsage)
    console.log("🔥 [WRITING-STYLE-ANALYSIS] Hashtag usage:", hashtagUsage)

    const analysisPrompt = `
Analyze the writing style of the following tweets from @${twitterHandle}. Provide a comprehensive analysis that focuses ONLY on writing style characteristics, NOT content topics.

TWEETS:
${tweetTexts}

Please provide:
1. A detailed writing style analysis (tone, sentence structure, vocabulary choices, punctuation patterns)
2. Common phrases or expressions this person uses
3. Overall tone analysis (professional, casual, friendly, technical, etc.)
4. Vocabulary level assessment (casual, professional, or mixed)

Focus on HOW they write, not WHAT they write about. Avoid mentioning specific topics or content themes.

Respond in JSON format:
{
  "writingStyleAnalysis": "detailed analysis of writing style",
  "commonPhrases": ["phrase1", "phrase2", "phrase3"],
  "toneAnalysis": "overall tone description",
  "vocabularyLevel": "casual|professional|mixed"
}
`

    console.log("🔥 [WRITING-STYLE-ANALYSIS] Sending request to OpenAI")

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert writing style analyst. Focus only on writing style characteristics, not content topics."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("🔥 [WRITING-STYLE-ANALYSIS] OpenAI API error:", errorText)
      return {
        isSuccess: false,
        message: `OpenAI API error: ${response.status} - ${errorText}`
      }
    }

    const data = await response.json()
    console.log("🔥 [WRITING-STYLE-ANALYSIS] OpenAI response received")

    const analysisContent = data.choices[0]?.message?.content
    if (!analysisContent) {
      console.error("🔥 [WRITING-STYLE-ANALYSIS] No content in OpenAI response")
      return {
        isSuccess: false,
        message: "No analysis content received from OpenAI"
      }
    }

    let analysisResult
    try {
      analysisResult = JSON.parse(analysisContent)
    } catch (parseError) {
      console.error("🔥 [WRITING-STYLE-ANALYSIS] Failed to parse OpenAI response:", parseError)
      return {
        isSuccess: false,
        message: "Failed to parse analysis result"
      }
    }

    console.log("🔥 [WRITING-STYLE-ANALYSIS] Analysis completed successfully")

    // Generate writing style prompt
    const generatedPrompt = await generateWritingStylePrompt(analysisResult, emojiUsage, hashtagUsage)

    const result: WritingStyleAnalysis = {
      writingStyleAnalysis: analysisResult.writingStyleAnalysis,
      commonPhrases: analysisResult.commonPhrases || [],
      toneAnalysis: analysisResult.toneAnalysis,
      vocabularyLevel: analysisResult.vocabularyLevel,
      averageTweetLength: Math.round(averageTweetLength),
      emojiUsage,
      hashtagUsage,
      generatedPrompt
    }

    return {
      isSuccess: true,
      message: "Writing style analysis completed successfully",
      data: result
    }
  } catch (error) {
    console.error("🔥 [WRITING-STYLE-ANALYSIS] Error analyzing writing style:", error)
    return {
      isSuccess: false,
      message: `Failed to analyze writing style: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

async function generateWritingStylePrompt(
  analysis: any,
  emojiUsage: boolean,
  hashtagUsage: boolean
): Promise<string> {
  console.log("🔥 [WRITING-STYLE-ANALYSIS] Generating writing style prompt")

  const promptGenerationRequest = `
Based on this writing style analysis, create a concise prompt that can be used to instruct an AI to write in this exact style. Focus ONLY on style characteristics, not content.

ANALYSIS:
- Writing Style: ${analysis.writingStyleAnalysis}
- Common Phrases: ${analysis.commonPhrases?.join(', ') || 'None identified'}
- Tone: ${analysis.toneAnalysis}
- Vocabulary Level: ${analysis.vocabularyLevel}
- Uses Emojis: ${emojiUsage}
- Uses Hashtags: ${hashtagUsage}

Create a prompt that instructs an AI to write in this style. The prompt should be specific about:
- Sentence structure and length
- Tone and voice
- Vocabulary choices
- Punctuation patterns
- Use of emojis/hashtags if applicable
- Common phrases or expressions

Keep it concise but comprehensive. Start with "Write in the following style:"
`

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert at creating writing style prompts. Focus only on style, not content."
          },
          {
            role: "user",
            content: promptGenerationRequest
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      console.error("🔥 [WRITING-STYLE-ANALYSIS] Failed to generate prompt")
      return "Write in a natural, conversational style that matches the user's typical communication patterns."
    }

    const data = await response.json()
    const generatedPrompt = data.choices[0]?.message?.content || "Write in a natural, conversational style that matches the user's typical communication patterns."

    console.log("🔥 [WRITING-STYLE-ANALYSIS] Writing style prompt generated successfully")
    return generatedPrompt
  } catch (error) {
    console.error("🔥 [WRITING-STYLE-ANALYSIS] Error generating prompt:", error)
    return "Write in a natural, conversational style that matches the user's typical communication patterns."
  }
}

export async function generatePersonalizedPromptAction(
  knowledgeBase?: string,
  voiceSettings?: any,
  personaType?: string,
  customPersona?: string
): Promise<ActionState<string>> {
  console.log("🔥 [PERSONALIZED-PROMPT] Starting generatePersonalizedPromptAction")
  console.log("🔥 [PERSONALIZED-PROMPT] Persona type:", personaType)

  try {
    if (!OPENAI_API_KEY) {
      console.error("🔥 [PERSONALIZED-PROMPT] OpenAI API key not found")
      return {
        isSuccess: false,
        message: "OpenAI API key not configured"
      }
    }

    const promptGenerationRequest = `
Create a comprehensive prompt for generating Reddit comments that incorporates the following personalization elements:

KNOWLEDGE BASE:
${knowledgeBase || "No specific knowledge base provided"}

VOICE SETTINGS:
${voiceSettings?.generatedPrompt || "No specific voice settings provided"}

PERSONA TYPE: ${personaType || "general"}
CUSTOM PERSONA: ${customPersona || "None specified"}

Create a prompt that will be used to generate Reddit comments. The prompt should:
1. Incorporate the knowledge base information for factual accuracy
2. Use the specified writing style and voice
3. Adopt the specified persona appropriately
4. Ensure comments feel natural and authentic
5. Avoid being overly promotional or obvious

The prompt should be comprehensive but concise, ready to be used directly for comment generation.
`

    console.log("🔥 [PERSONALIZED-PROMPT] Sending request to OpenAI")

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert at creating personalized prompts for content generation."
          },
          {
            role: "user",
            content: promptGenerationRequest
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("🔥 [PERSONALIZED-PROMPT] OpenAI API error:", errorText)
      return {
        isSuccess: false,
        message: `OpenAI API error: ${response.status} - ${errorText}`
      }
    }

    const data = await response.json()
    const generatedPrompt = data.choices[0]?.message?.content

    if (!generatedPrompt) {
      console.error("🔥 [PERSONALIZED-PROMPT] No prompt generated")
      return {
        isSuccess: false,
        message: "No prompt generated by OpenAI"
      }
    }

    console.log("🔥 [PERSONALIZED-PROMPT] Personalized prompt generated successfully")

    return {
      isSuccess: true,
      message: "Personalized prompt generated successfully",
      data: generatedPrompt
    }
  } catch (error) {
    console.error("🔥 [PERSONALIZED-PROMPT] Error generating personalized prompt:", error)
    return {
      isSuccess: false,
      message: `Failed to generate personalized prompt: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 