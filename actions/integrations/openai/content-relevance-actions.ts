"use server"

import { ActionState } from "@/types"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = "https://api.openai.com/v1"

interface ContentRelevanceScore {
  contentId: string
  relevanceScore: number
  semanticMatch: boolean
  intentMatch: boolean
  contextualRelevance: number
  topicalAlignment: number
  reasoning: string
  matchedConcepts: string[]
  suggestedImprovements?: string[]
}

interface ContentItem {
  id: string
  title?: string
  content: string
  author?: string
  source?: string
  metadata?: Record<string, any>
}

interface SearchContext {
  userIntent?: string
  domain?: string
  targetAudience?: string
  businessGoals?: string[]
  excludeTopics?: string[]
}

export async function analyzeContentRelevanceAction(
  searchQuery: string,
  contentItems: ContentItem[],
  context?: SearchContext
): Promise<ActionState<ContentRelevanceScore[]>> {
  console.log("🎯 [CONTENT-RELEVANCE] Starting content relevance analysis")
  console.log("🎯 [CONTENT-RELEVANCE] Search query:", searchQuery)
  console.log("🎯 [CONTENT-RELEVANCE] Content items:", contentItems.length)
  console.log("🎯 [CONTENT-RELEVANCE] Context:", context)

  try {
    if (!OPENAI_API_KEY) {
      console.error("🎯 [CONTENT-RELEVANCE] OpenAI API key not found")
      return {
        isSuccess: false,
        message: "OpenAI API key not configured"
      }
    }

    if (contentItems.length === 0) {
      return {
        isSuccess: true,
        message: "No content items to analyze",
        data: []
      }
    }

    // Process content in batches to avoid overwhelming the API
    const batchSize = 5
    const results: ContentRelevanceScore[] = []

    for (let i = 0; i < contentItems.length; i += batchSize) {
      const batch = contentItems.slice(i, i + batchSize)
      
      const analysisPrompt = `Analyze the relevance of these content items to the search query and context.

SEARCH QUERY: "${searchQuery}"

CONTEXT:
${context?.userIntent ? `- User Intent: ${context.userIntent}` : ""}
${context?.domain ? `- Domain: ${context.domain}` : ""}
${context?.targetAudience ? `- Target Audience: ${context.targetAudience}` : ""}
${context?.businessGoals ? `- Business Goals: ${context.businessGoals.join(", ")}` : ""}
${context?.excludeTopics ? `- Exclude Topics: ${context.excludeTopics.join(", ")}` : ""}

CONTENT ITEMS TO ANALYZE:
${batch.map((item, index) => `
ITEM ${index + 1} (ID: ${item.id}):
Title: ${item.title || "No title"}
Content: ${item.content.substring(0, 500)}${item.content.length > 500 ? "..." : ""}
Author: ${item.author || "Unknown"}
Source: ${item.source || "Unknown"}
`).join("\n")}

For each content item, analyze and score:

1. RELEVANCE SCORE (0-100): Overall relevance to the search query
   - Consider semantic similarity, not just keyword matching
   - Factor in context and user intent
   - Higher scores for content that directly addresses the query

2. SEMANTIC MATCH (true/false): Does the content semantically relate to the query?
   - True if concepts, themes, or meanings align
   - Consider synonyms, related topics, and conceptual connections

3. INTENT MATCH (true/false): Does the content match the user's likely intent?
   - Consider what the user is trying to accomplish
   - Match informational, transactional, or navigational intent

4. CONTEXTUAL RELEVANCE (0-100): How well does it fit the provided context?
   - Consider domain, audience, and business goals
   - Penalize content that conflicts with exclude topics

5. TOPICAL ALIGNMENT (0-100): How well does it align with the topic area?
   - Consider subject matter expertise and depth
   - Reward comprehensive, authoritative content

6. REASONING: Explain the scoring and analysis

7. MATCHED CONCEPTS: Key concepts/themes that connect to the query

8. SUGGESTED IMPROVEMENTS: How could the content be more relevant (optional)

Return JSON array format:
[
  {
    "contentId": "item_id",
    "relevanceScore": 85,
    "semanticMatch": true,
    "intentMatch": true,
    "contextualRelevance": 90,
    "topicalAlignment": 80,
    "reasoning": "detailed explanation of the analysis",
    "matchedConcepts": ["concept1", "concept2", "concept3"],
    "suggestedImprovements": ["improvement1", "improvement2"]
  }
]`

      console.log(`🎯 [CONTENT-RELEVANCE] Analyzing batch ${Math.floor(i / batchSize) + 1}`)

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
              content: "You are an expert content analyst and search relevance specialist. You excel at understanding user intent, semantic relationships, and contextual relevance. Your analysis helps improve content discovery and matching by going beyond simple keyword matching to understand meaning and intent."
            },
            {
              role: "user",
              content: analysisPrompt
            }
          ],
          temperature: 0.2,
          max_tokens: 2000
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("🎯 [CONTENT-RELEVANCE] OpenAI API error:", errorText)
        continue // Skip this batch and continue with others
      }

      const data = await response.json()
      const analysisContent = data.choices[0]?.message?.content

      if (!analysisContent) {
        console.warn("🎯 [CONTENT-RELEVANCE] No analysis content received for batch")
        continue
      }

      try {
        const batchResults = JSON.parse(analysisContent)
        
        // Validate and normalize the results
        const normalizedResults = batchResults.map((result: any) => ({
          contentId: result.contentId || "",
          relevanceScore: Math.max(0, Math.min(100, result.relevanceScore || 0)),
          semanticMatch: Boolean(result.semanticMatch),
          intentMatch: Boolean(result.intentMatch),
          contextualRelevance: Math.max(0, Math.min(100, result.contextualRelevance || 0)),
          topicalAlignment: Math.max(0, Math.min(100, result.topicalAlignment || 0)),
          reasoning: result.reasoning || "No reasoning provided",
          matchedConcepts: Array.isArray(result.matchedConcepts) ? result.matchedConcepts : [],
          suggestedImprovements: Array.isArray(result.suggestedImprovements) ? result.suggestedImprovements : undefined
        }))

        results.push(...normalizedResults)
      } catch (parseError) {
        console.error("🎯 [CONTENT-RELEVANCE] Failed to parse batch results:", parseError)
        
        // Fallback scoring for this batch
        const fallbackResults = batch.map(item => ({
          contentId: item.id,
          relevanceScore: 50,
          semanticMatch: false,
          intentMatch: false,
          contextualRelevance: 50,
          topicalAlignment: 50,
          reasoning: "Failed to parse detailed analysis, using default scores",
          matchedConcepts: [],
          suggestedImprovements: undefined
        }))
        
        results.push(...fallbackResults)
      }

      // Add delay between batches to respect rate limits
      if (i + batchSize < contentItems.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log("🎯 [CONTENT-RELEVANCE] Analysis completed successfully")
    console.log("🎯 [CONTENT-RELEVANCE] Results:", results.length)

    return {
      isSuccess: true,
      message: "Content relevance analysis completed successfully",
      data: results
    }
  } catch (error) {
    console.error("🎯 [CONTENT-RELEVANCE] Error in content relevance analysis:", error)
    return {
      isSuccess: false,
      message: `Failed to analyze content relevance: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function rankContentByRelevanceAction(
  searchQuery: string,
  contentItems: ContentItem[],
  options: {
    minRelevanceScore?: number
    maxResults?: number
    prioritizeIntent?: boolean
    context?: SearchContext
  } = {}
): Promise<ActionState<{
  rankedContent: (ContentItem & { relevanceData: ContentRelevanceScore })[]
  totalAnalyzed: number
  averageRelevance: number
  insights: {
    topConcepts: string[]
    contentGaps: string[]
    recommendations: string[]
  }
}>> {
  console.log("🎯 [CONTENT-RANKING] Starting content ranking by relevance")
  console.log("🎯 [CONTENT-RANKING] Options:", options)

  try {
    // First, analyze content relevance
    const analysisResult = await analyzeContentRelevanceAction(
      searchQuery,
      contentItems,
      options.context
    )

    if (!analysisResult.isSuccess) {
      return {
        isSuccess: false,
        message: analysisResult.message
      }
    }

    const relevanceScores = analysisResult.data
    const minScore = options.minRelevanceScore || 30
    const maxResults = options.maxResults || contentItems.length
    const prioritizeIntent = options.prioritizeIntent || false

    // Filter by minimum relevance score
    const filteredScores = relevanceScores.filter(score => score.relevanceScore >= minScore)

    // Sort by relevance criteria
    const sortedScores = filteredScores.sort((a, b) => {
      if (prioritizeIntent) {
        // Prioritize intent match, then relevance score
        if (a.intentMatch && !b.intentMatch) return -1
        if (!a.intentMatch && b.intentMatch) return 1
        return b.relevanceScore - a.relevanceScore
      } else {
        // Sort by overall relevance score
        return b.relevanceScore - a.relevanceScore
      }
    })

    // Limit results
    const topScores = sortedScores.slice(0, maxResults)

    // Combine content items with their relevance data
    const rankedContent = topScores.map(score => {
      const contentItem = contentItems.find(item => item.id === score.contentId)
      return {
        ...contentItem!,
        relevanceData: score
      }
    }).filter(Boolean)

    // Calculate insights
    const averageRelevance = topScores.length > 0 
      ? topScores.reduce((sum, score) => sum + score.relevanceScore, 0) / topScores.length 
      : 0

    // Extract top concepts
    const allConcepts = topScores.flatMap(score => score.matchedConcepts)
    const conceptCounts = allConcepts.reduce((acc, concept) => {
      acc[concept] = (acc[concept] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const topConcepts = Object.entries(conceptCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([concept]) => concept)

    // Generate content gaps and recommendations
    const contentGaps: string[] = []
    const recommendations: string[] = []

    if (averageRelevance < 50) {
      contentGaps.push("Low overall content relevance to search query")
      recommendations.push("Consider creating more targeted content that directly addresses the search intent")
    }

    const intentMatchCount = topScores.filter(score => score.intentMatch).length
    if (intentMatchCount < topScores.length * 0.5) {
      contentGaps.push("Many results don't match user intent")
      recommendations.push("Focus on understanding and addressing user intent in content creation")
    }

    const semanticMatchCount = topScores.filter(score => score.semanticMatch).length
    if (semanticMatchCount < topScores.length * 0.7) {
      contentGaps.push("Limited semantic relationship to search query")
      recommendations.push("Expand content to cover related concepts and semantic variations")
    }

    if (topConcepts.length < 3) {
      contentGaps.push("Limited conceptual diversity in content")
      recommendations.push("Create content covering a broader range of related topics")
    }

    console.log("🎯 [CONTENT-RANKING] Ranking completed successfully")
    console.log("🎯 [CONTENT-RANKING] Ranked items:", rankedContent.length)
    console.log("🎯 [CONTENT-RANKING] Average relevance:", averageRelevance)

    return {
      isSuccess: true,
      message: "Content ranking completed successfully",
      data: {
        rankedContent,
        totalAnalyzed: contentItems.length,
        averageRelevance: Math.round(averageRelevance),
        insights: {
          topConcepts,
          contentGaps,
          recommendations
        }
      }
    }
  } catch (error) {
    console.error("🎯 [CONTENT-RANKING] Error in content ranking:", error)
    return {
      isSuccess: false,
      message: `Failed to rank content by relevance: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function generateContentSuggestionsAction(
  searchQuery: string,
  existingContent: ContentItem[],
  context?: SearchContext
): Promise<ActionState<{
  suggestedTopics: string[]
  contentGaps: string[]
  improvementAreas: string[]
  targetKeywords: string[]
  contentFormats: string[]
}>> {
  console.log("🎯 [CONTENT-SUGGESTIONS] Generating content suggestions")
  console.log("🎯 [CONTENT-SUGGESTIONS] Search query:", searchQuery)
  console.log("🎯 [CONTENT-SUGGESTIONS] Existing content:", existingContent.length)

  try {
    if (!OPENAI_API_KEY) {
      return {
        isSuccess: false,
        message: "OpenAI API key not configured"
      }
    }

    const suggestionsPrompt = `Analyze the search query and existing content to suggest improvements and new content opportunities.

SEARCH QUERY: "${searchQuery}"

CONTEXT:
${context?.userIntent ? `- User Intent: ${context.userIntent}` : ""}
${context?.domain ? `- Domain: ${context.domain}` : ""}
${context?.targetAudience ? `- Target Audience: ${context.targetAudience}` : ""}
${context?.businessGoals ? `- Business Goals: ${context.businessGoals.join(", ")}` : ""}

EXISTING CONTENT ANALYSIS:
${existingContent.length > 0 ? existingContent.slice(0, 10).map((item, index) => `
Content ${index + 1}:
- Title: ${item.title || "No title"}
- Content Preview: ${item.content.substring(0, 200)}...
- Source: ${item.source || "Unknown"}
`).join("\n") : "No existing content provided"}

Based on this analysis, provide recommendations for:

1. SUGGESTED TOPICS: New content topics that would improve relevance to the search query
   - Focus on topics that address user intent
   - Consider semantic variations and related concepts
   - Identify trending or high-value topics in the domain

2. CONTENT GAPS: Areas where existing content is lacking or missing
   - Topics not covered by existing content
   - Depth or quality issues in current content
   - Missing perspectives or use cases

3. IMPROVEMENT AREAS: How existing content could be enhanced
   - Ways to make content more relevant to the search query
   - Structural or formatting improvements
   - Additional information or perspectives to include

4. TARGET KEYWORDS: Keywords and phrases to focus on
   - Primary keywords related to the search query
   - Long-tail variations and semantic keywords
   - Intent-based keyword opportunities

5. CONTENT FORMATS: Recommended content formats and structures
   - Best formats for the target audience and intent
   - Interactive or multimedia opportunities
   - Content organization and presentation suggestions

Return JSON format:
{
  "suggestedTopics": ["topic1", "topic2", "topic3"],
  "contentGaps": ["gap1", "gap2", "gap3"],
  "improvementAreas": ["improvement1", "improvement2", "improvement3"],
  "targetKeywords": ["keyword1", "keyword2", "keyword3"],
  "contentFormats": ["format1", "format2", "format3"]
}`

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
            content: "You are an expert content strategist and SEO specialist. You excel at analyzing content gaps, understanding user intent, and providing actionable recommendations for content improvement and creation. Your suggestions are practical, data-driven, and focused on improving relevance and user satisfaction."
          },
          {
            role: "user",
            content: suggestionsPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("🎯 [CONTENT-SUGGESTIONS] OpenAI API error:", errorText)
      return {
        isSuccess: false,
        message: `OpenAI API error: ${response.status} - ${errorText}`
      }
    }

    const data = await response.json()
    const suggestionsContent = data.choices[0]?.message?.content

    if (!suggestionsContent) {
      return {
        isSuccess: false,
        message: "No suggestions content received from OpenAI"
      }
    }

    let result
    try {
      const parsedResult = JSON.parse(suggestionsContent)
      result = {
        suggestedTopics: Array.isArray(parsedResult.suggestedTopics) ? parsedResult.suggestedTopics : [],
        contentGaps: Array.isArray(parsedResult.contentGaps) ? parsedResult.contentGaps : [],
        improvementAreas: Array.isArray(parsedResult.improvementAreas) ? parsedResult.improvementAreas : [],
        targetKeywords: Array.isArray(parsedResult.targetKeywords) ? parsedResult.targetKeywords : [],
        contentFormats: Array.isArray(parsedResult.contentFormats) ? parsedResult.contentFormats : []
      }
    } catch (parseError) {
      console.error("🎯 [CONTENT-SUGGESTIONS] Failed to parse suggestions:", parseError)
      
      // Fallback suggestions
      result = {
        suggestedTopics: ["Create comprehensive guides", "Develop case studies", "Add FAQ sections"],
        contentGaps: ["Missing beginner-friendly content", "Lack of practical examples", "No troubleshooting guides"],
        improvementAreas: ["Add more detailed explanations", "Include visual aids", "Improve content structure"],
        targetKeywords: [searchQuery, `${searchQuery} guide`, `how to ${searchQuery}`],
        contentFormats: ["Step-by-step guides", "Video tutorials", "Interactive demos"]
      }
    }

    console.log("🎯 [CONTENT-SUGGESTIONS] Suggestions generated successfully")
    
    return {
      isSuccess: true,
      message: "Content suggestions generated successfully",
      data: result
    }
  } catch (error) {
    console.error("🎯 [CONTENT-SUGGESTIONS] Error generating suggestions:", error)
    return {
      isSuccess: false,
      message: `Failed to generate content suggestions: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 