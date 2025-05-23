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

    const strategicPrompt = `Analyze this business website and generate highly specific Reddit keywords for organic lead generation.

WEBSITE CONTENT:
Title: ${websiteTitle}
Content: ${websiteContent.slice(0, 8000)}

${data.refinement ? `\nADDITIONAL CONTEXT/REFINEMENT: ${data.refinement}` : ''}

STRATEGIC ANALYSIS REQUIRED:

1. TARGET CUSTOMER ANALYSIS:
   - Who specifically needs this service/product?
   - What is their exact job title, role, or situation?
   - What specific pain point keeps them up at night?
   - Where are they in their journey (just starting, stuck, comparing options)?

2. UNIQUE VALUE PROPOSITION:
   - What makes this business different from competitors?
   - What specific outcome do they deliver?
   - What's their unique approach or methodology?

3. REDDIT BEHAVIOR ANALYSIS:
   - What specific questions would the target customer ask on Reddit?
   - What subreddits would they browse when facing this pain?
   - How would they phrase their requests for help?
   - What comparison posts would they create?

4. ORGANIC COMMENTING OPPORTUNITIES:
   Generate keywords that represent posts where the business owner could:
   - Share genuine experience and expertise
   - Mention their business as ONE option among several
   - Provide value without being salesy
   - Sound like a helpful user, not a vendor

KEYWORD REQUIREMENTS:
- 8-12 highly specific search phrases
- Focus on solution-seeking, not just problems
- Include comparison requests ("X vs Y")
- Include specific "where to find" or "how to hire" queries
- Target posts asking for recommendations
- Use natural Reddit language (casual, not corporate)
- Each keyword should represent a post this business could authentically comment on

FORMAT EXAMPLES FOR TECH/SOFTWARE BUSINESSES:
✅ GOOD: "where to hire AI developers for startups"
✅ GOOD: "best platforms to find machine learning engineers"
✅ GOOD: "freelance developers vs development agencies comparison"
✅ GOOD: "how to find developers who understand AI integration"

❌ BAD: "need help with software development" (too generic)
❌ BAD: "software development services" (not a Reddit question)
❌ BAD: "AI development company recommendations" (too corporate)

Return response in this exact JSON format:
{
  "idealCustomerProfile": "Detailed 2-3 sentence description of the exact target customer",
  "uniqueValueProposition": "1-2 sentences describing what makes this business unique",
  "targetPainPoints": ["specific pain point 1", "specific pain point 2", "specific pain point 3"],
  "keywords": ["specific keyword 1", "specific keyword 2", "etc..."]
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

      if (!parsedResult.idealCustomerProfile) {
        console.log("🔍 [KEYWORDS-ACTION] Missing ideal customer profile")
        throw new Error("Invalid response format: idealCustomerProfile missing")
      }

      console.log("🔍 [KEYWORDS-ACTION] Valid strategic response format detected")
      console.log("🔍 [KEYWORDS-ACTION] Keywords found:", parsedResult.keywords)
      console.log("🔍 [KEYWORDS-ACTION] Keywords length:", parsedResult.keywords.length)
      console.log("🔍 [KEYWORDS-ACTION] ICP:", parsedResult.idealCustomerProfile)
      console.log("🔍 [KEYWORDS-ACTION] UVP:", parsedResult.uniqueValueProposition)
      console.log("🔍 [KEYWORDS-ACTION] Pain points:", parsedResult.targetPainPoints)

      const successResult = {
        isSuccess: true as const,
        message: "Strategic keywords generated successfully with o3-mini",
        data: {
          keywords: parsedResult.keywords,
          idealCustomerProfile: parsedResult.idealCustomerProfile || "",
          uniqueValueProposition: parsedResult.uniqueValueProposition || "",
          targetPainPoints: parsedResult.targetPainPoints || []
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