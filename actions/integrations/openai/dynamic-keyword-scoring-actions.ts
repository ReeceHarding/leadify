"use server"

import { ActionState } from "@/types"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = "https://api.openai.com/v1"

interface KeywordPerformanceScore {
  keyword: string
  overallScore: number
  marketPotential: number
  competitionLevel: number
  conversionLikelihood: number
  brandAlignment: number
  reasoning: string
  recommendations: string[]
  estimatedROI: "high" | "medium" | "low"
  confidenceLevel: number
}

interface KeywordAnalysisContext {
  industry: string
  businessType: string
  targetAudience: string
  brandDescription?: string
  competitorKeywords?: string[]
  currentPerformingKeywords?: string[]
}

export async function analyzeKeywordPerformanceAction(
  keywords: string[],
  context: KeywordAnalysisContext
): Promise<ActionState<KeywordPerformanceScore[]>> {
  console.log("📊 [KEYWORD-SCORING] Starting dynamic keyword performance analysis")
  console.log("📊 [KEYWORD-SCORING] Keywords to analyze:", keywords)
  console.log("📊 [KEYWORD-SCORING] Context:", context)

  try {
    if (!OPENAI_API_KEY) {
      console.error("📊 [KEYWORD-SCORING] OpenAI API key not found")
      return {
        isSuccess: false,
        message: "OpenAI API key not configured"
      }
    }

    const analysisPrompt = `Analyze the performance potential of these keywords for lead generation and business growth.

KEYWORDS TO ANALYZE: ${keywords.join(", ")}

BUSINESS CONTEXT:
- Industry: ${context.industry}
- Business Type: ${context.businessType}
- Target Audience: ${context.targetAudience}
${context.brandDescription ? `- Brand Description: ${context.brandDescription}` : ""}
${context.competitorKeywords ? `- Competitor Keywords: ${context.competitorKeywords.join(", ")}` : ""}
${context.currentPerformingKeywords ? `- Currently Performing Keywords: ${context.currentPerformingKeywords.join(", ")}` : ""}

For each keyword, analyze and score (0-100) these dimensions:

1. MARKET POTENTIAL (0-100): How large is the market for this keyword?
   - High: Large, growing market with many potential customers
   - Medium: Moderate market size with steady demand
   - Low: Niche or declining market

2. COMPETITION LEVEL (0-100): How competitive is this keyword space?
   - High: Many established players, hard to stand out
   - Medium: Moderate competition, opportunities exist
   - Low: Less competitive, easier to gain visibility

3. CONVERSION LIKELIHOOD (0-100): How likely are searchers to convert?
   - High: High-intent searches, ready to buy/engage
   - Medium: Moderate intent, need nurturing
   - Low: Low intent, mostly informational

4. BRAND ALIGNMENT (0-100): How well does this keyword align with the brand?
   - High: Perfect fit with brand values and offerings
   - Medium: Good fit with some alignment
   - Low: Poor fit, doesn't match brand

5. OVERALL SCORE (0-100): Weighted average considering all factors
   - Formula: (Market Potential * 0.3) + (Conversion Likelihood * 0.4) + (Brand Alignment * 0.2) + ((100 - Competition Level) * 0.1)

6. ESTIMATED ROI: Based on the analysis
   - "high": Strong potential for positive ROI
   - "medium": Moderate ROI potential
   - "low": Limited ROI potential

Provide specific, actionable recommendations for each keyword.

Return JSON array format:
[
  {
    "keyword": "keyword name",
    "overallScore": 85,
    "marketPotential": 90,
    "competitionLevel": 70,
    "conversionLikelihood": 85,
    "brandAlignment": 95,
    "reasoning": "detailed explanation of the scores and analysis",
    "recommendations": ["specific actionable recommendation 1", "recommendation 2"],
    "estimatedROI": "high",
    "confidenceLevel": 90
  }
]`

    console.log("📊 [KEYWORD-SCORING] Sending analysis request to OpenAI")

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
            content: "You are an expert marketing analyst and keyword strategist. You excel at evaluating keyword performance potential based on market dynamics, competition analysis, and business alignment. Your analysis is data-driven and provides actionable insights."
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
      console.error("📊 [KEYWORD-SCORING] OpenAI API error:", errorText)
      return {
        isSuccess: false,
        message: `OpenAI API error: ${response.status} - ${errorText}`
      }
    }

    const data = await response.json()
    const analysisContent = data.choices[0]?.message?.content

    if (!analysisContent) {
      console.error("📊 [KEYWORD-SCORING] No analysis content received")
      return {
        isSuccess: false,
        message: "No analysis content received from OpenAI"
      }
    }

    let results: KeywordPerformanceScore[]
    try {
      const parsedResults = JSON.parse(analysisContent)
      
      // Validate and normalize the results
      results = parsedResults.map((result: any) => ({
        keyword: result.keyword || "",
        overallScore: Math.max(0, Math.min(100, result.overallScore || 0)),
        marketPotential: Math.max(0, Math.min(100, result.marketPotential || 0)),
        competitionLevel: Math.max(0, Math.min(100, result.competitionLevel || 0)),
        conversionLikelihood: Math.max(0, Math.min(100, result.conversionLikelihood || 0)),
        brandAlignment: Math.max(0, Math.min(100, result.brandAlignment || 0)),
        reasoning: result.reasoning || "No reasoning provided",
        recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
        estimatedROI: ["high", "medium", "low"].includes(result.estimatedROI) ? result.estimatedROI : "medium",
        confidenceLevel: Math.max(0, Math.min(100, result.confidenceLevel || 50))
      }))
    } catch (parseError) {
      console.error("📊 [KEYWORD-SCORING] Failed to parse analysis:", parseError)
      console.error("📊 [KEYWORD-SCORING] Raw content:", analysisContent)
      
      // Fallback to basic scoring
      results = keywords.map(keyword => ({
        keyword,
        overallScore: 50,
        marketPotential: 50,
        competitionLevel: 50,
        conversionLikelihood: 50,
        brandAlignment: 50,
        reasoning: "Failed to parse detailed analysis, using default scores",
        recommendations: ["Review keyword relevance", "Test performance with small budget"],
        estimatedROI: "medium" as const,
        confidenceLevel: 30
      }))
    }

    console.log("📊 [KEYWORD-SCORING] Analysis completed successfully")
    console.log("📊 [KEYWORD-SCORING] Results:", results.map(r => `${r.keyword}: ${r.overallScore}`))

    return {
      isSuccess: true,
      message: "Keyword performance analysis completed successfully",
      data: results
    }
  } catch (error) {
    console.error("📊 [KEYWORD-SCORING] Error in keyword performance analysis:", error)
    return {
      isSuccess: false,
      message: `Failed to analyze keyword performance: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function optimizeKeywordListAction(
  keywords: string[],
  context: KeywordAnalysisContext,
  options: {
    maxKeywords?: number
    minScore?: number
    prioritizeROI?: boolean
  } = {}
): Promise<ActionState<{
  optimizedKeywords: string[]
  removedKeywords: string[]
  recommendations: string[]
  performanceScores: KeywordPerformanceScore[]
}>> {
  console.log("📊 [KEYWORD-OPTIMIZATION] Starting keyword list optimization")
  console.log("📊 [KEYWORD-OPTIMIZATION] Input keywords:", keywords.length)
  console.log("📊 [KEYWORD-OPTIMIZATION] Options:", options)

  try {
    // First, analyze all keywords
    const analysisResult = await analyzeKeywordPerformanceAction(keywords, context)
    
    if (!analysisResult.isSuccess) {
      return {
        isSuccess: false,
        message: analysisResult.message
      }
    }

    const scores = analysisResult.data
    const maxKeywords = options.maxKeywords || keywords.length
    const minScore = options.minScore || 30
    const prioritizeROI = options.prioritizeROI || false

    // Filter by minimum score
    let filteredScores = scores.filter(score => score.overallScore >= minScore)

    // Sort by priority
    if (prioritizeROI) {
      // Prioritize high ROI keywords
      filteredScores.sort((a, b) => {
        const roiWeight = { high: 3, medium: 2, low: 1 }
        const aWeight = roiWeight[a.estimatedROI] * a.overallScore
        const bWeight = roiWeight[b.estimatedROI] * b.overallScore
        return bWeight - aWeight
      })
    } else {
      // Sort by overall score
      filteredScores.sort((a, b) => b.overallScore - a.overallScore)
    }

    // Limit to max keywords
    const optimizedScores = filteredScores.slice(0, maxKeywords)
    const optimizedKeywords = optimizedScores.map(score => score.keyword)
    const removedKeywords = keywords.filter(keyword => !optimizedKeywords.includes(keyword))

    // Generate optimization recommendations
    const recommendations: string[] = []
    
    if (removedKeywords.length > 0) {
      recommendations.push(`Removed ${removedKeywords.length} underperforming keywords`)
    }
    
    const highROICount = optimizedScores.filter(s => s.estimatedROI === "high").length
    if (highROICount > 0) {
      recommendations.push(`Focus on ${highROICount} high-ROI keywords for maximum impact`)
    }
    
    const lowCompetitionCount = optimizedScores.filter(s => s.competitionLevel < 50).length
    if (lowCompetitionCount > 0) {
      recommendations.push(`Prioritize ${lowCompetitionCount} low-competition keywords for quick wins`)
    }
    
    const highConversionCount = optimizedScores.filter(s => s.conversionLikelihood > 70).length
    if (highConversionCount > 0) {
      recommendations.push(`Target ${highConversionCount} high-conversion keywords for better lead quality`)
    }

    console.log("📊 [KEYWORD-OPTIMIZATION] Optimization completed")
    console.log("📊 [KEYWORD-OPTIMIZATION] Optimized keywords:", optimizedKeywords.length)
    console.log("📊 [KEYWORD-OPTIMIZATION] Removed keywords:", removedKeywords.length)

    return {
      isSuccess: true,
      message: "Keyword list optimization completed successfully",
      data: {
        optimizedKeywords,
        removedKeywords,
        recommendations,
        performanceScores: optimizedScores
      }
    }
  } catch (error) {
    console.error("📊 [KEYWORD-OPTIMIZATION] Error in keyword optimization:", error)
    return {
      isSuccess: false,
      message: `Failed to optimize keyword list: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function predictKeywordTrendsAction(
  keywords: string[],
  context: KeywordAnalysisContext
): Promise<ActionState<{
  keyword: string
  currentTrend: "rising" | "stable" | "declining"
  futureOutlook: "positive" | "neutral" | "negative"
  seasonality: "high" | "medium" | "low"
  reasoning: string
  recommendations: string[]
}[]>> {
  console.log("📊 [KEYWORD-TRENDS] Starting keyword trend prediction")
  console.log("📊 [KEYWORD-TRENDS] Keywords:", keywords)

  try {
    if (!OPENAI_API_KEY) {
      return {
        isSuccess: false,
        message: "OpenAI API key not configured"
      }
    }

    const trendsPrompt = `Analyze the current trends and future outlook for these keywords in the ${context.industry} industry.

KEYWORDS: ${keywords.join(", ")}
INDUSTRY: ${context.industry}
BUSINESS TYPE: ${context.businessType}

For each keyword, analyze:

1. CURRENT TREND: Is this keyword currently rising, stable, or declining in popularity?
2. FUTURE OUTLOOK: What's the 6-12 month outlook for this keyword?
3. SEASONALITY: How much does this keyword fluctuate seasonally?
4. REASONING: Explain the trends and factors influencing them
5. RECOMMENDATIONS: Specific actions to take based on the trends

Consider factors like:
- Industry developments and innovations
- Market maturity and saturation
- Seasonal patterns and cycles
- Economic factors and consumer behavior
- Technology changes and disruptions

Return JSON array format:
[
  {
    "keyword": "keyword name",
    "currentTrend": "rising",
    "futureOutlook": "positive",
    "seasonality": "medium",
    "reasoning": "detailed explanation of trends and factors",
    "recommendations": ["specific recommendation 1", "recommendation 2"]
  }
]`

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
            content: "You are an expert market analyst and trend forecaster. You excel at identifying keyword trends, seasonal patterns, and predicting future market movements based on industry knowledge and market dynamics."
          },
          {
            role: "user",
            content: trendsPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("📊 [KEYWORD-TRENDS] OpenAI API error:", errorText)
      return {
        isSuccess: false,
        message: `OpenAI API error: ${response.status} - ${errorText}`
      }
    }

    const data = await response.json()
    const trendsContent = data.choices[0]?.message?.content

    if (!trendsContent) {
      return {
        isSuccess: false,
        message: "No trends analysis received from OpenAI"
      }
    }

    let results
    try {
      const parsedResults = JSON.parse(trendsContent)
      results = parsedResults.map((result: any) => ({
        keyword: result.keyword || "",
        currentTrend: ["rising", "stable", "declining"].includes(result.currentTrend) ? result.currentTrend : "stable",
        futureOutlook: ["positive", "neutral", "negative"].includes(result.futureOutlook) ? result.futureOutlook : "neutral",
        seasonality: ["high", "medium", "low"].includes(result.seasonality) ? result.seasonality : "medium",
        reasoning: result.reasoning || "No reasoning provided",
        recommendations: Array.isArray(result.recommendations) ? result.recommendations : []
      }))
    } catch (parseError) {
      console.error("📊 [KEYWORD-TRENDS] Failed to parse trends:", parseError)
      
      // Fallback to neutral predictions
      results = keywords.map(keyword => ({
        keyword,
        currentTrend: "stable" as const,
        futureOutlook: "neutral" as const,
        seasonality: "medium" as const,
        reasoning: "Unable to analyze trends, using neutral predictions",
        recommendations: ["Monitor keyword performance", "Test with small campaigns"]
      }))
    }

    console.log("📊 [KEYWORD-TRENDS] Trend analysis completed")
    
    return {
      isSuccess: true,
      message: "Keyword trend analysis completed successfully",
      data: results
    }
  } catch (error) {
    console.error("📊 [KEYWORD-TRENDS] Error in trend analysis:", error)
    return {
      isSuccess: false,
      message: `Failed to analyze keyword trends: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 