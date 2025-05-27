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
}: GenerateKeywordsData): Promise<ActionState<KeywordsResult>> {
  try {
    console.log("🔍 [KEYWORDS] Generating keywords")
    console.log("🔍 [KEYWORDS] Website:", website || "None")
    console.log(
      "🔍 [KEYWORDS] Business Description:",
      businessDescription ? "Provided" : "None"
    )
    console.log("🔍 [KEYWORDS] Refinement:", refinement)

    const businessInfo = businessDescription
      ? `Business Description: ${businessDescription}`
      : website
        ? `Website: ${website}`
        : "No business information provided"
        
    const requestedCount = refinement?.match(/Generate (?:exactly )?(\d+) (?:diverse )?keywords/i)
      ? parseInt(refinement.match(/Generate (?:exactly )?(\d+) (?:diverse )?keywords/i)![1])
      : 10;

    const prompt = `You are a Reddit keyword and business strategy expert. 
Analyze the following business information:
${businessInfo}

Additional instructions or refinement: ${refinement}

Tasks:
1. Identify the core problem the business solves.
2. Describe the primary customer groups.
3. Define the Ideal Customer Profile (ICP).
4. State the Unique Value Proposition (UVP).
5. List key Target Pain Points the business addresses.
6. Generate ${requestedCount} specific Google search queries that will find Reddit posts from people who need this business's services.

IMPORTANT: Create search queries using quotes and OR operators to find people actively looking to hire or seeking recommendations.

For example, if the business is a coding agency, generate queries like:
- "need a developer" OR "looking for developer" OR "hiring developer"
- "need MVP built" OR "need app built" OR "looking for technical co-founder"
- "recommend development agency" OR "best coding agency" OR "freelance developer needed"

Each query should:
- Use quotes around key phrases to find exact matches
- Use OR operators to combine related phrases
- Focus on buying intent and hiring signals
- Target people who are actively seeking solutions, not just discussing the topic

Return ONLY a JSON object with the following structure, no other text:
{
  "keywords": ["query 1", "query 2", ...],
  "coreProblem": "The core problem solved...",
  "customerGroups": ["Group A", "Group B", ...],
  "idealCustomerProfile": "Detailed ICP...",
  "uniqueValueProposition": "The UVP is...",
  "targetPainPoints": ["Pain point 1", "Pain point 2", ...]
}
Ensure the keywords array contains exactly ${requestedCount} search queries.`

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      system:
        "You are a Reddit keyword and business strategy expert. Return only valid JSON objects adhering to the specified schema.",
      prompt: prompt,
      temperature: 0.5,
      maxTokens: 1500
    })

    const response = result.text
    if (!response) {
      throw new Error("No response from OpenAI")
    }

    let parsedResponse: KeywordsResult
    try {
      const rawParsed = JSON.parse(response);
      if (!rawParsed.keywords || !Array.isArray(rawParsed.keywords)) {
        throw new Error("Keywords array is missing or not an array in AI response.")
      }
      parsedResponse = rawParsed as KeywordsResult;
      
      if (parsedResponse.keywords.length > requestedCount) {
        parsedResponse.keywords = parsedResponse.keywords.slice(0, requestedCount);
      }
      while (parsedResponse.keywords.length < requestedCount && parsedResponse.keywords.length > 0) {
        parsedResponse.keywords.push(parsedResponse.keywords[parsedResponse.keywords.length - 1] + " variation"); 
      }
      if (parsedResponse.keywords.length === 0 && requestedCount > 0) {
          parsedResponse.keywords = [`${businessDescription || website || 'general search'} help`];
          while(parsedResponse.keywords.length < requestedCount) parsedResponse.keywords.push(`${parsedResponse.keywords[0]} ${parsedResponse.keywords.length+1}`) 
      }

    } catch (parseError) {
      console.error("🔍 [KEYWORDS] Failed to parse AI response:", response, parseError)
      throw new Error("Invalid response format from AI. Could not parse strategic insights and keywords.")
    }

    console.log(`🔍 [KEYWORDS] Generated ${parsedResponse.keywords.length} keywords and strategic insights.`)

    return {
      isSuccess: true,
      message: "Keywords and strategic insights generated successfully",
      data: parsedResponse
    }
  } catch (error) {
    console.error("🔍 [KEYWORDS] Error:", error)
    return {
      isSuccess: false,
      message:
        error instanceof Error ? error.message : "Failed to generate keywords and insights"
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
