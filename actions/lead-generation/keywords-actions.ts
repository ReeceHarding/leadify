"use server"

import { ActionState } from "@/types"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { scrapeWebsiteAction } from "@/actions/integrations/firecrawl-actions"

interface GenerateKeywordsData {
  website: string
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

export async function generateKeywordsAction(
  data: GenerateKeywordsData
): Promise<ActionState<KeywordsResult>> {
  console.log(
    "🔍 [KEYWORDS-ACTION] generateKeywordsAction called with o3-mini (natural search terms)"
  )
  console.log("🔍 [KEYWORDS-ACTION] Input data:", data)
  console.log("🔍 [KEYWORDS-ACTION] Website:", data.website)
  console.log("🔍 [KEYWORDS-ACTION] Refinement:", data.refinement)

  try {
    if (!data.website) {
      console.log("🔍 [KEYWORDS-ACTION] No website provided, returning error")
      return { isSuccess: false, message: "Website URL is required" }
    }

    // Step 1: Scrape the website to get actual content
    console.log("🔍 [KEYWORDS-ACTION] Scraping website content...")
    const scrapeResult = await scrapeWebsiteAction(data.website)

    if (!scrapeResult.isSuccess) {
      console.error(
        "🔍 [KEYWORDS-ACTION] Website scraping failed:",
        scrapeResult.message
      )
      return {
        isSuccess: false,
        message: `Failed to analyze website: ${scrapeResult.message}`
      }
    }

    const websiteContent = scrapeResult.data.content
    const websiteTitle = scrapeResult.data.title
    console.log("🔍 [KEYWORDS-ACTION] Website scraped successfully")
    console.log("🔍 [KEYWORDS-ACTION] Content length:", websiteContent.length)
    console.log("🔍 [KEYWORDS-ACTION] Website title:", websiteTitle)

    // Step 2: Build natural search terms prompt for o3-mini
    console.log(
      "🔍 [KEYWORDS-ACTION] Building natural search terms prompt for o3-mini"
    )

    const naturalSearchPrompt = `You will be given a website homepage. Your task is to generate simple, natural search terms that people use when asking for recommendations or help on Reddit.

WEBSITE: ${websiteTitle || "This business"}

WEBSITE CONTENT:
${websiteContent.slice(0, 4000)}

${data.refinement ? `\nFOCUS AREA: ${data.refinement}` : ""}

Your Process:
1. Analyze the website to understand what core problem it solves (ignore marketing speak)
2. Think about when someone would naturally ask strangers for recommendations about this problem
3. Generate search terms that capture these organic request moments

What You're Looking For:
Search terms that find posts where people are:
- Asking "where can I find..."
- Seeking "recommendations for..."
- Looking for "best [service/product] for..."
- Requesting "help finding..."
- Asking "anyone know of..."

Examples:
- where to find developers
- recommendations for wedding venues in the caribbean
- best accounting software for small business
- help finding freelance designers
- anyone know good meal delivery services

Key Points:
- Focus on the underlying need, not the company's marketing language
- Think like someone posting on Reddit would naturally phrase their request
- Keep terms simple and conversational
- Each term should find posts you could organically comment on to mention this business without feeling salesy
- For example: "tips for planning a wedding" = BAD (can't naturally recommend venue)
- "recommendations for wedding venues in caribbean" = GOOD (can naturally mention venue)

Generate 10-15 search terms based on the website provided.

Return response in this exact JSON format:
{
  "coreProblem": "The main problem this business solves",
  "customerGroups": ["primary customer type", "secondary customer type"],
  "keywords": ["search term 1", "search term 2", "search term 3", "etc..."]
}`

    console.log(
      "🔍 [KEYWORDS-ACTION] Calling o3-mini with natural search terms prompt"
    )
    console.log(
      "🔍 [KEYWORDS-ACTION] Prompt length:",
      naturalSearchPrompt.length
    )

    const result = await generateText({
      model: openai("o3-mini"),
      prompt: naturalSearchPrompt,
      temperature: 0.2, // Low temperature for consistent, natural search terms
      providerOptions: {
        openai: {
          reasoningEffort: "low" // Simple task, doesn't need complex reasoning
        }
      }
    })

    console.log("🔍 [KEYWORDS-ACTION] o3-mini response received")
    console.log("🔍 [KEYWORDS-ACTION] Raw response text:", result.text)
    console.log("🔍 [KEYWORDS-ACTION] Response length:", result.text.length)

    try {
      console.log("🔍 [KEYWORDS-ACTION] Attempting to parse JSON response")

      // Clean the response text to handle markdown-wrapped JSON
      let cleanText = result.text.trim()

      // Remove markdown code blocks if present
      if (cleanText.startsWith("```json")) {
        console.log(
          "🔍 [KEYWORDS-ACTION] Detected markdown-wrapped JSON, cleaning..."
        )
        cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "")
      } else if (cleanText.startsWith("```")) {
        console.log(
          "🔍 [KEYWORDS-ACTION] Detected generic markdown code block, cleaning..."
        )
        cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "")
      }

      console.log("🔍 [KEYWORDS-ACTION] Cleaned text:", cleanText)

      const parsedResult = JSON.parse(cleanText)
      console.log("🔍 [KEYWORDS-ACTION] Parsed result:", parsedResult)

      // Validate the response structure
      if (!parsedResult.keywords || !Array.isArray(parsedResult.keywords)) {
        console.log(
          "🔍 [KEYWORDS-ACTION] Invalid response format - keywords not found or not array"
        )
        throw new Error(
          "Invalid response format: keywords missing or not array"
        )
      }

      if (!parsedResult.coreProblem) {
        console.log("🔍 [KEYWORDS-ACTION] Missing core problem")
        throw new Error("Invalid response format: coreProblem missing")
      }

      console.log(
        "🔍 [KEYWORDS-ACTION] Valid natural search terms response format detected"
      )
      console.log(
        "🔍 [KEYWORDS-ACTION] Search terms found:",
        parsedResult.keywords
      )
      console.log(
        "🔍 [KEYWORDS-ACTION] Search terms length:",
        parsedResult.keywords.length
      )
      console.log(
        "🔍 [KEYWORDS-ACTION] Core problem:",
        parsedResult.coreProblem
      )
      console.log(
        "🔍 [KEYWORDS-ACTION] Customer groups:",
        parsedResult.customerGroups
      )

      const successResult = {
        isSuccess: true as const,
        message: "Natural search terms generated successfully with o3-mini",
        data: {
          keywords: parsedResult.keywords,
          coreProblem: parsedResult.coreProblem || "",
          customerGroups: parsedResult.customerGroups || [],
          // Keep backwards compatibility for existing components
          idealCustomerProfile: `Targeting: ${(parsedResult.customerGroups || []).join(", ")}`,
          uniqueValueProposition: parsedResult.coreProblem || "",
          targetPainPoints: parsedResult.customerGroups || []
        }
      }

      console.log(
        "🔍 [KEYWORDS-ACTION] Returning natural search terms success result:",
        successResult
      )
      return successResult
    } catch (parseError) {
      console.log("🔍 [KEYWORDS-ACTION] JSON parsing failed:", parseError)
      console.log("🔍 [KEYWORDS-ACTION] Attempting fallback keyword extraction")

      // Fallback: extract keywords from text if JSON parsing fails
      const keywords = extractKeywordsFromText(result.text)
      console.log("🔍 [KEYWORDS-ACTION] Fallback keywords extracted:", keywords)
      console.log(
        "🔍 [KEYWORDS-ACTION] Fallback keywords length:",
        keywords.length
      )

      const fallbackResult = {
        isSuccess: true as const,
        message: "Keywords generated successfully (fallback mode)",
        data: {
          keywords,
          coreProblem: "Determined from website content (fallback)",
          customerGroups: ["General customers"],
          // Keep backwards compatibility
          idealCustomerProfile: "Generated from website analysis (fallback)",
          uniqueValueProposition: "Determined from website content",
          targetPainPoints: ["Analysis completed in fallback mode"]
        }
      }

      console.log(
        "🔍 [KEYWORDS-ACTION] Returning fallback result:",
        fallbackResult
      )
      return fallbackResult
    }
  } catch (error) {
    console.error(
      "🔍 [KEYWORDS-ACTION] Error generating natural search terms:",
      error
    )
    console.error("🔍 [KEYWORDS-ACTION] Error stack:", (error as Error)?.stack)
    return {
      isSuccess: false,
      message: "Failed to generate natural search terms"
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

  // If no keywords found, return some natural search term defaults
  if (keywords.length === 0) {
    console.log(
      "🔍 [KEYWORDS-ACTION] No keywords found, using natural search term defaults"
    )
    const defaults = [
      "where to find reliable services",
      "recommendations for local businesses",
      "best providers in my area",
      "anyone know good companies for",
      "help finding quality services"
    ]
    console.log(
      "🔍 [KEYWORDS-ACTION] Natural search term default keywords:",
      defaults
    )
    return defaults
  }

  const finalKeywords = keywords.slice(0, 15) // Limit to 15 search terms as requested
  console.log(
    "🔍 [KEYWORDS-ACTION] Final natural search terms (limited to 15):",
    finalKeywords
  )
  return finalKeywords
}
