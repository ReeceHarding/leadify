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
  console.log("🔍 [KEYWORDS-ACTION] generateKeywordsAction called with o3-mini")
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
      console.error("🔍 [KEYWORDS-ACTION] Website scraping failed:", scrapeResult.message)
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

    // Step 2: Build strategic prompt for o3-mini
    console.log("🔍 [KEYWORDS-ACTION] Building strategic system prompt for o3-mini")

    const strategicPrompt = `You are a strategic lead generation expert. Your job: identify WHO would desperately need this business.

THE ANSWER IS: ${websiteTitle || 'This business'}

WEBSITE CONTENT:
${websiteContent.slice(0, 4000)}

${data.refinement ? `\nCUSTOMER FOCUS: ${data.refinement}` : ''}

🎯 STRATEGIC THINKING PROCESS:

1. What core problem does this business solve?
2. What specific value do they provide?
3. WHO are 5 different groups that would desperately need this solution?

Example: If business offers "large secluded venues"
- Core problem: People need private spaces for important events
- 5 Groups: Weddings, Large families, Yoga groups, Corporate retreats, Meditation retreats
- Generate 2 Reddit questions per group (10 total)

🎯 YOUR TASK:
1. Identify the core problem this business solves
2. Think of 5 distinct customer groups who desperately need this solution
3. For each group, create 2 Reddit questions they would ask
4. Questions should be natural Reddit posts where this business is the perfect answer

⚡ REDDIT QUESTION FORMAT:
- "What's the best [solution] for [specific need]?"
- "Where can I find [solution] for [specific situation]?"
- "Recommendations for [specific use case]?"
- Use casual, real Reddit language

Return response in this exact JSON format:
{
  "coreProblem": "The main problem this business solves",
  "customerGroups": ["group 1", "group 2", "group 3", "group 4", "group 5"],
  "keywords": ["question 1 for group 1", "question 2 for group 1", "question 1 for group 2", "question 2 for group 2", "etc..."]
}`

    console.log("🔍 [KEYWORDS-ACTION] Calling o3-mini with strategic prompt")
    console.log("🔍 [KEYWORDS-ACTION] Prompt length:", strategicPrompt.length)

    const result = await generateText({
      model: openai("o3-mini"),
      prompt: strategicPrompt,
      temperature: 0.3, // Lower temperature for more focused, strategic thinking
      providerOptions: {
        openai: { 
          reasoningEffort: 'medium' // Use medium reasoning for better strategic analysis
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
      if (cleanText.startsWith('```json')) {
        console.log("🔍 [KEYWORDS-ACTION] Detected markdown-wrapped JSON, cleaning...")
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanText.startsWith('```')) {
        console.log("🔍 [KEYWORDS-ACTION] Detected generic markdown code block, cleaning...")
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      console.log("🔍 [KEYWORDS-ACTION] Cleaned text:", cleanText)
      
      const parsedResult = JSON.parse(cleanText)
      console.log("🔍 [KEYWORDS-ACTION] Parsed result:", parsedResult)
      
      // Validate the response structure
      if (!parsedResult.keywords || !Array.isArray(parsedResult.keywords)) {
        console.log("🔍 [KEYWORDS-ACTION] Invalid response format - keywords not found or not array")
        throw new Error("Invalid response format: keywords missing or not array")
      }

      if (!parsedResult.coreProblem) {
        console.log("🔍 [KEYWORDS-ACTION] Missing core problem")
        throw new Error("Invalid response format: coreProblem missing")
      }

      console.log("🔍 [KEYWORDS-ACTION] Valid strategic response format detected")
      console.log("🔍 [KEYWORDS-ACTION] Keywords found:", parsedResult.keywords)
      console.log("🔍 [KEYWORDS-ACTION] Keywords length:", parsedResult.keywords.length)
      console.log("🔍 [KEYWORDS-ACTION] Core problem:", parsedResult.coreProblem)
      console.log("🔍 [KEYWORDS-ACTION] Customer groups:", parsedResult.customerGroups)

      const successResult = {
        isSuccess: true as const,
        message: "Strategic keywords generated successfully with o3-mini",
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

      console.log("🔍 [KEYWORDS-ACTION] Returning strategic success result:", successResult)
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

      console.log("🔍 [KEYWORDS-ACTION] Returning fallback result:", fallbackResult)
      return fallbackResult
    }

  } catch (error) {
    console.error("🔍 [KEYWORDS-ACTION] Error generating strategic keywords:", error)
    console.error("🔍 [KEYWORDS-ACTION] Error stack:", (error as Error)?.stack)
    return { 
      isSuccess: false, 
      message: "Failed to generate strategic keywords" 
    }
  }
}

function extractKeywordsFromText(text: string): string[] {
  console.log("🔍 [KEYWORDS-ACTION] extractKeywordsFromText called")
  console.log("🔍 [KEYWORDS-ACTION] Input text:", text)

  // Clean the text to remove markdown if present
  let cleanText = text.trim()
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '')
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
          const keyword = match.replace(/"/g, '')
          keywords.push(keyword)
          console.log("🔍 [KEYWORDS-ACTION] Extracted keyword from JSON:", keyword)
        })
      }
    }
  } catch (error) {
    console.log("🔍 [KEYWORDS-ACTION] JSON extraction failed, trying line-by-line")
  }

  // Fallback to line-by-line extraction if JSON extraction failed
  if (keywords.length === 0) {
    const lines = cleanText.split('\n')
    console.log("🔍 [KEYWORDS-ACTION] Processing", lines.length, "lines")

    for (const line of lines) {
      // Look for lines that start with - or numbers or quotes
      if (line.match(/^[-*•]\s*".*"/) || line.match(/^\d+\.\s*".*"/) || line.match(/^\s*".*",?\s*$/)) {
        const match = line.match(/"([^"]+)"/)
        if (match) {
          console.log("🔍 [KEYWORDS-ACTION] Found keyword:", match[1])
          keywords.push(match[1])
        }
      }
    }
  }
  
  console.log("🔍 [KEYWORDS-ACTION] Extracted keywords:", keywords)

  // If no keywords found, return some strategic defaults based on common patterns
  if (keywords.length === 0) {
    console.log("🔍 [KEYWORDS-ACTION] No keywords found, using strategic defaults")
    const defaults = [
      "where to hire experts for my business",
      "recommendations for professional services",
      "how to find reliable service providers",
      "comparing different solution providers"
    ]
    console.log("🔍 [KEYWORDS-ACTION] Strategic default keywords:", defaults)
    return defaults
  }
  
  const finalKeywords = keywords.slice(0, 12) // Limit to 12 keywords
  console.log("🔍 [KEYWORDS-ACTION] Final strategic keywords (limited to 12):", finalKeywords)
  return finalKeywords
} 