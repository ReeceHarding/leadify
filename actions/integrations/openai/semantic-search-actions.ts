"use server"

import { ActionState } from "@/types"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = "https://api.openai.com/v1"

interface SemanticMatchResult {
  isMatch: boolean
  confidence: number
  reasoning: string
  relevanceScore: number
}

interface ContentItem {
  id: string
  title?: string
  content?: string
  author?: string
  subreddit?: string
  keyword?: string
  [key: string]: any
}

interface SemanticFilterResult {
  matchedItems: ContentItem[]
  totalMatches: number
  averageConfidence: number
  searchInsights: {
    interpretedQuery: string
    searchIntent: string
    suggestedRefinements: string[]
  }
}

export async function semanticMatchAction(
  searchQuery: string,
  targetContent: string,
  context?: string
): Promise<ActionState<SemanticMatchResult>> {
  console.log("🔍 [SEMANTIC-MATCH] Starting semantic matching")
  console.log("🔍 [SEMANTIC-MATCH] Query:", searchQuery)
  console.log("🔍 [SEMANTIC-MATCH] Target content length:", targetContent.length)

  try {
    if (!OPENAI_API_KEY) {
      console.error("🔍 [SEMANTIC-MATCH] OpenAI API key not found")
      return {
        isSuccess: false,
        message: "OpenAI API key not configured"
      }
    }

    const semanticPrompt = `Analyze if the target content semantically matches the search query.

SEARCH QUERY: "${searchQuery}"
TARGET CONTENT: "${targetContent}"
${context ? `CONTEXT: ${context}` : ""}

Determine if the target content is semantically related to the search query. Consider:

1. DIRECT MATCHES: Exact words or phrases
2. SEMANTIC SIMILARITY: Related concepts, synonyms, similar meanings
3. CONTEXTUAL RELEVANCE: Content that addresses the same topic or need
4. INTENT MATCHING: Content that would satisfy the searcher's likely intent

For example:
- Query "software development" should match content about "building apps", "coding", "programming"
- Query "marketing help" should match content about "customer acquisition", "brand building", "growth"
- Query "startup funding" should match content about "raising capital", "investors", "Series A"

Rate the match quality:
- 90-100: Perfect semantic match, highly relevant
- 70-89: Strong semantic match, clearly related
- 50-69: Moderate match, somewhat related
- 30-49: Weak match, tangentially related
- 0-29: No meaningful match

Return JSON format:
{
  "isMatch": <true if relevanceScore >= 50>,
  "confidence": <1-100 how confident you are in this assessment>,
  "reasoning": "detailed explanation of why this is or isn't a match",
  "relevanceScore": <0-100 how relevant the content is to the query>
}`

    console.log("🔍 [SEMANTIC-MATCH] Sending analysis request to OpenAI")

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
            content: "You are an expert at semantic analysis and understanding the relationship between search queries and content. You excel at identifying when content matches the intent behind a search, even when the exact words are different."
          },
          {
            role: "user",
            content: semanticPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("🔍 [SEMANTIC-MATCH] OpenAI API error:", errorText)
      return {
        isSuccess: false,
        message: `OpenAI API error: ${response.status} - ${errorText}`
      }
    }

    const data = await response.json()
    const analysisContent = data.choices[0]?.message?.content

    if (!analysisContent) {
      console.error("🔍 [SEMANTIC-MATCH] No analysis content received")
      return {
        isSuccess: false,
        message: "No analysis content received from OpenAI"
      }
    }

    let result: SemanticMatchResult
    try {
      const parsedResult = JSON.parse(analysisContent)
      result = {
        isMatch: parsedResult.isMatch || false,
        confidence: parsedResult.confidence || 0,
        reasoning: parsedResult.reasoning || "No reasoning provided",
        relevanceScore: parsedResult.relevanceScore || 0
      }
    } catch (parseError) {
      console.error("🔍 [SEMANTIC-MATCH] Failed to parse analysis:", parseError)
      console.error("🔍 [SEMANTIC-MATCH] Raw content:", analysisContent)
      
      // Fallback to basic string matching
      const basicMatch = targetContent.toLowerCase().includes(searchQuery.toLowerCase())
      result = {
        isMatch: basicMatch,
        confidence: 30,
        reasoning: "Failed to parse semantic analysis, using basic string matching",
        relevanceScore: basicMatch ? 60 : 20
      }
    }

    console.log("🔍 [SEMANTIC-MATCH] Analysis completed successfully")
    console.log("🔍 [SEMANTIC-MATCH] Is Match:", result.isMatch)
    console.log("🔍 [SEMANTIC-MATCH] Confidence:", result.confidence)
    console.log("🔍 [SEMANTIC-MATCH] Relevance Score:", result.relevanceScore)

    return {
      isSuccess: true,
      message: "Semantic matching completed successfully",
      data: result
    }
  } catch (error) {
    console.error("🔍 [SEMANTIC-MATCH] Error in semantic matching:", error)
    return {
      isSuccess: false,
      message: `Failed to perform semantic matching: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function semanticFilterAction(
  searchQuery: string,
  items: ContentItem[],
  options: {
    minRelevanceScore?: number
    maxResults?: number
    includeInsights?: boolean
  } = {}
): Promise<ActionState<SemanticFilterResult>> {
  console.log("🔍 [SEMANTIC-FILTER] Starting semantic filtering")
  console.log("🔍 [SEMANTIC-FILTER] Query:", searchQuery)
  console.log("🔍 [SEMANTIC-FILTER] Items to filter:", items.length)
  console.log("🔍 [SEMANTIC-FILTER] Options:", options)

  try {
    if (!searchQuery.trim()) {
      // Return all items if no search query
      return {
        isSuccess: true,
        message: "No search query provided, returning all items",
        data: {
          matchedItems: items,
          totalMatches: items.length,
          averageConfidence: 100,
          searchInsights: {
            interpretedQuery: "",
            searchIntent: "No search performed",
            suggestedRefinements: []
          }
        }
      }
    }

    const minScore = options.minRelevanceScore || 50
    const maxResults = options.maxResults || items.length
    const includeInsights = options.includeInsights !== false

    const matchedItems: (ContentItem & { semanticScore?: number; semanticReasoning?: string })[] = []
    let totalConfidence = 0
    let processedCount = 0

    // Process items in batches to avoid overwhelming the API
    const batchSize = 10
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      
      for (const item of batch) {
        // Create searchable content from the item
        const searchableContent = [
          item.title,
          item.content,
          item.author,
          item.subreddit,
          item.keyword
        ].filter(Boolean).join(" ")

        if (!searchableContent.trim()) {
          continue
        }

        const matchResult = await semanticMatchAction(
          searchQuery,
          searchableContent,
          `Item from ${item.subreddit || 'unknown source'}`
        )

        if (matchResult.isSuccess) {
          const match = matchResult.data
          totalConfidence += match.confidence
          processedCount++

          if (match.relevanceScore >= minScore) {
            matchedItems.push({
              ...item,
              semanticScore: match.relevanceScore,
              semanticReasoning: match.reasoning
            })
          }
        }

        // Add small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Sort by semantic score (highest first)
    matchedItems.sort((a, b) => (b.semanticScore || 0) - (a.semanticScore || 0))

    // Limit results if requested
    const finalResults = matchedItems.slice(0, maxResults)

    // Generate search insights if requested
    let searchInsights = {
      interpretedQuery: searchQuery,
      searchIntent: "User search",
      suggestedRefinements: [] as string[]
    }

    if (includeInsights && finalResults.length > 0) {
      console.log("🔍 [SEMANTIC-FILTER] Generating search insights...")
      
      const insightsPrompt = `Analyze this search query and results to provide insights.

SEARCH QUERY: "${searchQuery}"
RESULTS FOUND: ${finalResults.length}
SAMPLE RESULTS: ${finalResults.slice(0, 3).map(item => item.title || item.content?.substring(0, 100)).join(" | ")}

Provide insights about:
1. INTERPRETED QUERY: What the user is likely looking for
2. SEARCH INTENT: What they're trying to accomplish
3. SUGGESTED REFINEMENTS: 3-5 more specific search terms that might help

Return JSON format:
{
  "interpretedQuery": "what the user is actually looking for",
  "searchIntent": "what they're trying to accomplish",
  "suggestedRefinements": ["refinement1", "refinement2", "refinement3"]
}`

      const insightsResponse = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
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
              content: "You are an expert at understanding search intent and providing helpful search refinements."
            },
            {
              role: "user",
              content: insightsPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 300
        })
      })

      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json()
        const insightsContent = insightsData.choices[0]?.message?.content

        if (insightsContent) {
          try {
            const parsedInsights = JSON.parse(insightsContent)
            searchInsights = {
              interpretedQuery: parsedInsights.interpretedQuery || searchQuery,
              searchIntent: parsedInsights.searchIntent || "User search",
              suggestedRefinements: parsedInsights.suggestedRefinements || []
            }
          } catch (parseError) {
            console.warn("🔍 [SEMANTIC-FILTER] Failed to parse insights, using defaults")
          }
        }
      }
    }

    const averageConfidence = processedCount > 0 ? totalConfidence / processedCount : 0

    console.log("🔍 [SEMANTIC-FILTER] Filtering completed successfully")
    console.log("🔍 [SEMANTIC-FILTER] Total matches:", finalResults.length)
    console.log("🔍 [SEMANTIC-FILTER] Average confidence:", averageConfidence)

    return {
      isSuccess: true,
      message: "Semantic filtering completed successfully",
      data: {
        matchedItems: finalResults,
        totalMatches: finalResults.length,
        averageConfidence: Math.round(averageConfidence),
        searchInsights
      }
    }
  } catch (error) {
    console.error("🔍 [SEMANTIC-FILTER] Error in semantic filtering:", error)
    return {
      isSuccess: false,
      message: `Failed to perform semantic filtering: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function batchSemanticMatchAction(
  searchQuery: string,
  contentItems: { id: string; content: string; context?: string }[],
  options: {
    minRelevanceScore?: number
    batchSize?: number
  } = {}
): Promise<ActionState<{ id: string; match: SemanticMatchResult }[]>> {
  console.log("🔍 [BATCH-SEMANTIC] Starting batch semantic matching")
  console.log("🔍 [BATCH-SEMANTIC] Query:", searchQuery)
  console.log("🔍 [BATCH-SEMANTIC] Items:", contentItems.length)

  try {
    const batchSize = options.batchSize || 5
    const minScore = options.minRelevanceScore || 0
    const results: { id: string; match: SemanticMatchResult }[] = []

    // Process in batches to manage API rate limits
    for (let i = 0; i < contentItems.length; i += batchSize) {
      const batch = contentItems.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (item) => {
        const matchResult = await semanticMatchAction(
          searchQuery,
          item.content,
          item.context
        )
        
        if (matchResult.isSuccess && matchResult.data.relevanceScore >= minScore) {
          return { id: item.id, match: matchResult.data }
        }
        return null
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults.filter(Boolean) as { id: string; match: SemanticMatchResult }[])

      // Add delay between batches
      if (i + batchSize < contentItems.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log("🔍 [BATCH-SEMANTIC] Batch processing completed")
    console.log("🔍 [BATCH-SEMANTIC] Matches found:", results.length)

    return {
      isSuccess: true,
      message: "Batch semantic matching completed successfully",
      data: results
    }
  } catch (error) {
    console.error("🔍 [BATCH-SEMANTIC] Error in batch semantic matching:", error)
    return {
      isSuccess: false,
      message: `Failed to perform batch semantic matching: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 