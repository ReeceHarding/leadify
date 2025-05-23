"use server"

import { ActionState } from "@/types"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

interface GenerateKeywordsData {
  website: string
  refinement?: string
}

interface KeywordsResult {
  keywords: string[]
  idealCustomerProfile: string
}

export async function generateKeywordsAction(
  data: GenerateKeywordsData
): Promise<ActionState<KeywordsResult>> {
  console.log("🔍 [KEYWORDS-ACTION] generateKeywordsAction called")
  console.log("🔍 [KEYWORDS-ACTION] Input data:", data)
  console.log("🔍 [KEYWORDS-ACTION] Website:", data.website)
  console.log("🔍 [KEYWORDS-ACTION] Refinement:", data.refinement)

  try {
    if (!data.website) {
      console.log("🔍 [KEYWORDS-ACTION] No website provided, returning error")
      return { isSuccess: false, message: "Website URL is required" }
    }

    console.log("🔍 [KEYWORDS-ACTION] Building system prompt")

    // For now, we'll use a placeholder approach
    // In a full implementation, you'd want to scrape the website first
    const systemPrompt = `You are an expert at analyzing businesses and generating Reddit search keywords for lead generation.

Your task is to:
1. Analyze the provided website URL and business
2. Create an ideal customer profile (ICP) 
3. Generate 8-12 specific keywords/phrases that potential customers would search for on Reddit when they have the pain point this business solves

The keywords should be:
- Specific questions or problems customers would type into Reddit search
- Natural language (how people actually search)
- Include location-specific terms if the business is local
- Focus on pain points, not solutions
- Be longer phrases (3-7 words) rather than single words

Return the response in this exact JSON format:
{
  "idealCustomerProfile": "Detailed description of the ideal customer",
  "keywords": ["keyword1", "keyword2", "keyword3", ...]
}

Website: ${data.website}
${data.refinement ? `\nRefinement instructions: ${data.refinement}` : ''}

Example good keywords:
- "where to find reliable freelance developers"
- "how to plan wedding on budget"
- "best accounting software for small business"
- "need help with social media marketing"
- "looking for personal trainer in [city]"`

    console.log("🔍 [KEYWORDS-ACTION] System prompt created, length:", systemPrompt.length)
    console.log("🔍 [KEYWORDS-ACTION] Calling OpenAI generateText")

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: systemPrompt,
      temperature: 0.7,
    })

    console.log("🔍 [KEYWORDS-ACTION] OpenAI response received")
    console.log("🔍 [KEYWORDS-ACTION] Raw response text:", result.text)
    console.log("🔍 [KEYWORDS-ACTION] Response length:", result.text.length)

    try {
      console.log("🔍 [KEYWORDS-ACTION] Attempting to parse JSON response")
      const parsedResult = JSON.parse(result.text)
      console.log("🔍 [KEYWORDS-ACTION] Parsed result:", parsedResult)
      
      if (!parsedResult.keywords || !Array.isArray(parsedResult.keywords)) {
        console.log("🔍 [KEYWORDS-ACTION] Invalid response format - keywords not found or not array")
        console.log("🔍 [KEYWORDS-ACTION] parsedResult.keywords:", parsedResult.keywords)
        console.log("🔍 [KEYWORDS-ACTION] Is array?", Array.isArray(parsedResult.keywords))
        throw new Error("Invalid response format")
      }

      console.log("🔍 [KEYWORDS-ACTION] Valid response format detected")
      console.log("🔍 [KEYWORDS-ACTION] Keywords found:", parsedResult.keywords)
      console.log("🔍 [KEYWORDS-ACTION] Keywords length:", parsedResult.keywords.length)
      console.log("🔍 [KEYWORDS-ACTION] ICP:", parsedResult.idealCustomerProfile)

      const successResult = {
        isSuccess: true as const,
        message: "Keywords generated successfully",
        data: {
          keywords: parsedResult.keywords,
          idealCustomerProfile: parsedResult.idealCustomerProfile || ""
        }
      }

      console.log("🔍 [KEYWORDS-ACTION] Returning success result:", successResult)
      return successResult
    } catch (parseError) {
      console.log("🔍 [KEYWORDS-ACTION] JSON parsing failed:", parseError)
      console.log("🔍 [KEYWORDS-ACTION] Attempting fallback keyword extraction")
      
      // Fallback: extract keywords from text if JSON parsing fails
      const keywords = extractKeywordsFromText(result.text)
      console.log("🔍 [KEYWORDS-ACTION] Fallback keywords extracted:", keywords)
      console.log("🔍 [KEYWORDS-ACTION] Fallback keywords length:", keywords.length)
      
      const fallbackResult = {
        isSuccess: true as const,
        message: "Keywords generated successfully",
        data: {
          keywords,
          idealCustomerProfile: "Generated from website analysis"
        }
      }

      console.log("🔍 [KEYWORDS-ACTION] Returning fallback result:", fallbackResult)
      return fallbackResult
    }

  } catch (error) {
    console.error("🔍 [KEYWORDS-ACTION] Error generating keywords:", error)
    console.error("🔍 [KEYWORDS-ACTION] Error stack:", (error as Error)?.stack)
    return { 
      isSuccess: false, 
      message: "Failed to generate keywords" 
    }
  }
}

function extractKeywordsFromText(text: string): string[] {
  console.log("🔍 [KEYWORDS-ACTION] extractKeywordsFromText called")
  console.log("🔍 [KEYWORDS-ACTION] Input text:", text)

  // Simple fallback extraction if JSON parsing fails
  const lines = text.split('\n')
  const keywords: string[] = []
  
  console.log("🔍 [KEYWORDS-ACTION] Processing", lines.length, "lines")

  for (const line of lines) {
    // Look for lines that start with - or numbers or quotes
    if (line.match(/^[-*•]\s*".*"/) || line.match(/^\d+\.\s*".*"/)) {
      const match = line.match(/"([^"]+)"/)
      if (match) {
        console.log("🔍 [KEYWORDS-ACTION] Found keyword:", match[1])
        keywords.push(match[1])
      }
    }
  }
  
  console.log("🔍 [KEYWORDS-ACTION] Extracted keywords:", keywords)

  // If no keywords found, return some defaults
  if (keywords.length === 0) {
    console.log("🔍 [KEYWORDS-ACTION] No keywords found, using defaults")
    const defaults = [
      "need help with my business",
      "looking for recommendations",
      "best service provider",
      "how to solve my problem"
    ]
    console.log("🔍 [KEYWORDS-ACTION] Default keywords:", defaults)
    return defaults
  }
  
  const finalKeywords = keywords.slice(0, 12) // Limit to 12 keywords
  console.log("🔍 [KEYWORDS-ACTION] Final keywords (limited to 12):", finalKeywords)
  return finalKeywords
} 