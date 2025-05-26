"use server"

import { ActionState } from "@/types"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { scrapeWebsiteAction } from "@/actions/integrations/firecrawl/website-scraping-actions"

interface GenerateKeywordsData {
  website?: string
  businessDescription?: string
  refinement?: string
}

interface KeywordsResult {
  keywords: string[]
  coreProblem: string
  customerGroups: string[]
  // Backwards compatibility
  idealCustomerProfile: string
  uniqueValueProposition: string
  targetPainPoints: string[]
}

export async function generateKeywordsAction({
  website,
  businessDescription,
  refinement = ""
}: GenerateKeywordsData): Promise<ActionState<{ keywords: string[] }>> {
  try {
    console.log("🔍 [KEYWORDS] Generating keywords")
    console.log("🔍 [KEYWORDS] Website:", website || "None")
    console.log(
      "🔍 [KEYWORDS] Business Description:",
      businessDescription ? "Provided" : "None"
    )
    console.log("🔍 [KEYWORDS] Refinement:", refinement)

    // Extract keyword count from refinement if specified
    const keywordCountMatch = refinement.match(
      /Generate (?:exactly )?(\d+) (?:diverse )?keywords/i
    )
    const requestedCount = keywordCountMatch
      ? parseInt(keywordCountMatch[1])
      : 10

    const businessInfo = businessDescription
      ? `Business Description: ${businessDescription}`
      : website
        ? `Website: ${website}`
        : "No business information provided"

    const prompt = `You are a Reddit keyword expert. Generate search keywords for finding potential customers on Reddit.

${businessInfo}

${refinement ? `Additional instructions: ${refinement}` : ""}

Generate ${requestedCount} specific, targeted keywords that:
1. Are phrases people would actually use when asking for recommendations on Reddit
2. Include both broad and specific terms
3. Focus on problems/needs your business solves
4. Include location-specific terms if relevant

Return ONLY a JSON array of keyword strings, no other text.
Example format: ["keyword 1", "keyword 2", "keyword 3"]

Make sure to generate exactly ${requestedCount} keywords.`

    const result = await generateText({
      model: openai("o3-mini"),
      system:
        "You are a Reddit keyword generation expert. Return only valid JSON arrays.",
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 1000
    })

    const response = result.text
    if (!response) {
      throw new Error("No response from OpenAI")
    }

    // Parse the JSON response
    let keywords: string[]
    try {
      keywords = JSON.parse(response)
      if (!Array.isArray(keywords)) {
        throw new Error("Response is not an array")
      }
    } catch (parseError) {
      console.error("🔍 [KEYWORDS] Failed to parse response:", response)
      throw new Error("Invalid response format from AI")
    }

    // Ensure we have the requested number of keywords
    if (keywords.length > requestedCount) {
      keywords = keywords.slice(0, requestedCount)
    }

    console.log(`🔍 [KEYWORDS] Generated ${keywords.length} keywords`)

    return {
      isSuccess: true,
      message: "Keywords generated successfully",
      data: { keywords }
    }
  } catch (error) {
    console.error("🔍 [KEYWORDS] Error:", error)
    return {
      isSuccess: false,
      message:
        error instanceof Error ? error.message : "Failed to generate keywords"
    }
  }
}

function extractKeywordsFromText(text: string): string[] {
  console.log("🔍 [KEYWORDS-ACTION] extractKeywordsFromText called")
  console.log("🔍 [KEYWORDS-ACTION] Input text:", text)

  // Clean the text to remove markdown if present
  let cleanText = text.trim()
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "")
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "")
  }

  const keywords: string[] = []

  console.log("🔍 [KEYWORDS-ACTION] Processing cleaned text")

  // Try to extract from JSON structure first
  try {
    const jsonMatch = cleanText.match(/"keywords"\s*:\s*\[([\s\S]*?)\]/)
    if (jsonMatch) {
      console.log("🔍 [KEYWORDS-ACTION] Found keywords array in JSON structure")
      const keywordsString = jsonMatch[1]
      const keywordMatches = keywordsString.match(/"([^"]+)"/g)
      if (keywordMatches) {
        keywordMatches.forEach(match => {
          const keyword = match.replace(/"/g, "")
          keywords.push(keyword)
          console.log(
            "🔍 [KEYWORDS-ACTION] Extracted keyword from JSON:",
            keyword
          )
        })
      }
    }
  } catch (error) {
    console.log(
      "🔍 [KEYWORDS-ACTION] JSON extraction failed, trying line-by-line"
    )
  }

  // Fallback to line-by-line extraction if JSON extraction failed
  if (keywords.length === 0) {
    const lines = cleanText.split("\n")
    console.log("🔍 [KEYWORDS-ACTION] Processing", lines.length, "lines")

    for (const line of lines) {
      // Look for lines that start with - or numbers or quotes
      if (
        line.match(/^[-*•]\s*".*"/) ||
        line.match(/^\d+\.\s*".*"/) ||
        line.match(/^\s*".*",?\s*$/)
      ) {
        const match = line.match(/"([^"]+)"/)
        if (match) {
          console.log("🔍 [KEYWORDS-ACTION] Found keyword:", match[1])
          keywords.push(match[1])
        }
      }
    }
  }

  console.log("🔍 [KEYWORDS-ACTION] Extracted keywords:", keywords)

  // If no keywords found, return empty array
  if (keywords.length === 0) {
    console.log("🔍 [KEYWORDS-ACTION] No keywords found in the provided text")
    return []
  }

  const finalKeywords = keywords.slice(0, 10) // Limit to 10 keywords
  console.log("🔍 [KEYWORDS-ACTION] Final keywords:", finalKeywords)
  return finalKeywords
}
