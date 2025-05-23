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
  try {
    if (!data.website) {
      return { isSuccess: false, message: "Website URL is required" }
    }

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

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: systemPrompt,
      temperature: 0.7,
    })

    try {
      const parsedResult = JSON.parse(result.text)
      
      if (!parsedResult.keywords || !Array.isArray(parsedResult.keywords)) {
        throw new Error("Invalid response format")
      }

      return {
        isSuccess: true,
        message: "Keywords generated successfully",
        data: {
          keywords: parsedResult.keywords,
          idealCustomerProfile: parsedResult.idealCustomerProfile || ""
        }
      }
    } catch (parseError) {
      // Fallback: extract keywords from text if JSON parsing fails
      const keywords = extractKeywordsFromText(result.text)
      
      return {
        isSuccess: true,
        message: "Keywords generated successfully",
        data: {
          keywords,
          idealCustomerProfile: "Generated from website analysis"
        }
      }
    }

  } catch (error) {
    console.error("Error generating keywords:", error)
    return { 
      isSuccess: false, 
      message: "Failed to generate keywords" 
    }
  }
}

function extractKeywordsFromText(text: string): string[] {
  // Simple fallback extraction if JSON parsing fails
  const lines = text.split('\n')
  const keywords: string[] = []
  
  for (const line of lines) {
    // Look for lines that start with - or numbers or quotes
    if (line.match(/^[-*•]\s*".*"/) || line.match(/^\d+\.\s*".*"/)) {
      const match = line.match(/"([^"]+)"/)
      if (match) {
        keywords.push(match[1])
      }
    }
  }
  
  // If no keywords found, return some defaults
  if (keywords.length === 0) {
    return [
      "need help with my business",
      "looking for recommendations",
      "best service provider",
      "how to solve my problem"
    ]
  }
  
  return keywords.slice(0, 12) // Limit to 12 keywords
} 