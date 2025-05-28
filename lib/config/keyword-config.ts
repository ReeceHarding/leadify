import { analyzeKeywordPerformanceAction } from "@/actions/integrations/openai/dynamic-keyword-scoring-actions"

export const KEYWORD_CONFIG = {
  // Minimum number of Google results we consider "enough" before widening the search.
  MIN_RESULTS: Number(process.env.KEYWORD_MIN_RESULTS || 3),
  // Maximum number of fallback attempts (quoted → unquoted → synonyms ...).
  MAX_ATTEMPTS: Number(process.env.KEYWORD_MAX_ATTEMPTS || 3),
  // Dynamic score threshold - will be determined by LLM analysis
  SCORE_THRESHOLD: Number(process.env.KEYWORD_SCORE_THRESHOLD || 0.3),
  // Dynamic scoring configuration
  DYNAMIC_SCORING: {
    // Use LLM for keyword performance analysis
    USE_LLM_SCORING: process.env.USE_LLM_KEYWORD_SCORING !== "false",
    // Minimum confidence level for LLM scores
    MIN_CONFIDENCE: Number(process.env.KEYWORD_MIN_CONFIDENCE || 70),
    // Default context for analysis when specific context isn't available
    DEFAULT_CONTEXT: {
      industry: "business consulting",
      businessType: "professional services",
      targetAudience: "business owners and entrepreneurs"
    }
  }
} as const

export type KeywordConfig = typeof KEYWORD_CONFIG

// Dynamic keyword scoring function that adapts thresholds based on context
export async function getDynamicKeywordThreshold(
  keywords: string[],
  context?: {
    industry?: string
    businessType?: string
    targetAudience?: string
  }
): Promise<number> {
  console.log("📊 [DYNAMIC-THRESHOLD] Calculating dynamic keyword threshold")
  console.log("📊 [DYNAMIC-THRESHOLD] Keywords:", keywords)
  console.log("📊 [DYNAMIC-THRESHOLD] Context:", context)

  // If LLM scoring is disabled, use static threshold
  if (!KEYWORD_CONFIG.DYNAMIC_SCORING.USE_LLM_SCORING) {
    console.log(
      "📊 [DYNAMIC-THRESHOLD] LLM scoring disabled, using static threshold:",
      KEYWORD_CONFIG.SCORE_THRESHOLD
    )
    return KEYWORD_CONFIG.SCORE_THRESHOLD
  }

  try {
    // Use provided context or default
    const analysisContext = {
      industry:
        context?.industry ||
        KEYWORD_CONFIG.DYNAMIC_SCORING.DEFAULT_CONTEXT.industry,
      businessType:
        context?.businessType ||
        KEYWORD_CONFIG.DYNAMIC_SCORING.DEFAULT_CONTEXT.businessType,
      targetAudience:
        context?.targetAudience ||
        KEYWORD_CONFIG.DYNAMIC_SCORING.DEFAULT_CONTEXT.targetAudience
    }

    // Analyze keyword performance
    const analysisResult = await analyzeKeywordPerformanceAction(
      keywords,
      analysisContext
    )

    if (analysisResult.isSuccess && analysisResult.data.length > 0) {
      const scores = analysisResult.data

      // Calculate dynamic threshold based on keyword quality distribution
      const averageScore =
        scores.reduce((sum, score) => sum + score.overallScore, 0) /
        scores.length
      const highQualityCount = scores.filter(
        score => score.overallScore >= 70
      ).length
      const qualityRatio = highQualityCount / scores.length

      // Adaptive threshold calculation
      let dynamicThreshold: number

      if (qualityRatio > 0.7) {
        // High quality keywords - raise the bar
        dynamicThreshold = Math.max(0.6, (averageScore / 100) * 0.8)
      } else if (qualityRatio > 0.4) {
        // Mixed quality - moderate threshold
        dynamicThreshold = Math.max(0.4, (averageScore / 100) * 0.7)
      } else {
        // Lower quality keywords - be more lenient
        dynamicThreshold = Math.max(0.3, (averageScore / 100) * 0.6)
      }

      console.log("📊 [DYNAMIC-THRESHOLD] Analysis complete:")
      console.log("📊 [DYNAMIC-THRESHOLD] - Average score:", averageScore)
      console.log("📊 [DYNAMIC-THRESHOLD] - Quality ratio:", qualityRatio)
      console.log(
        "📊 [DYNAMIC-THRESHOLD] - Dynamic threshold:",
        dynamicThreshold
      )

      return dynamicThreshold
    } else {
      console.warn(
        "📊 [DYNAMIC-THRESHOLD] Analysis failed, using static threshold"
      )
      return KEYWORD_CONFIG.SCORE_THRESHOLD
    }
  } catch (error) {
    console.error(
      "📊 [DYNAMIC-THRESHOLD] Error calculating dynamic threshold:",
      error
    )
    return KEYWORD_CONFIG.SCORE_THRESHOLD
  }
}

// Get keyword quality insights
export async function getKeywordQualityInsights(
  keywords: string[],
  context?: {
    industry?: string
    businessType?: string
    targetAudience?: string
  }
): Promise<{
  averageScore: number
  highQualityCount: number
  recommendations: string[]
  threshold: number
}> {
  console.log("📊 [KEYWORD-INSIGHTS] Generating keyword quality insights")

  try {
    const analysisContext = {
      industry:
        context?.industry ||
        KEYWORD_CONFIG.DYNAMIC_SCORING.DEFAULT_CONTEXT.industry,
      businessType:
        context?.businessType ||
        KEYWORD_CONFIG.DYNAMIC_SCORING.DEFAULT_CONTEXT.businessType,
      targetAudience:
        context?.targetAudience ||
        KEYWORD_CONFIG.DYNAMIC_SCORING.DEFAULT_CONTEXT.targetAudience
    }

    const analysisResult = await analyzeKeywordPerformanceAction(
      keywords,
      analysisContext
    )
    const threshold = await getDynamicKeywordThreshold(keywords, context)

    if (analysisResult.isSuccess && analysisResult.data.length > 0) {
      const scores = analysisResult.data
      const averageScore =
        scores.reduce((sum, score) => sum + score.overallScore, 0) /
        scores.length
      const highQualityCount = scores.filter(
        score => score.overallScore >= 70
      ).length

      // Generate recommendations based on analysis
      const recommendations: string[] = []

      if (averageScore < 50) {
        recommendations.push(
          "Consider refining your keyword strategy - current keywords show low performance potential"
        )
      }

      if (highQualityCount === 0) {
        recommendations.push(
          "No high-quality keywords found - research more targeted, high-intent keywords"
        )
      }

      const lowCompetitionCount = scores.filter(
        s => s.competitionLevel < 50
      ).length
      if (lowCompetitionCount > 0) {
        recommendations.push(
          `Focus on ${lowCompetitionCount} low-competition keywords for quick wins`
        )
      }

      const highROICount = scores.filter(s => s.estimatedROI === "high").length
      if (highROICount > 0) {
        recommendations.push(
          `Prioritize ${highROICount} high-ROI keywords for maximum impact`
        )
      }

      return {
        averageScore: Math.round(averageScore),
        highQualityCount,
        recommendations,
        threshold
      }
    } else {
      return {
        averageScore: 50,
        highQualityCount: 0,
        recommendations: [
          "Unable to analyze keywords - using default recommendations"
        ],
        threshold
      }
    }
  } catch (error) {
    console.error("📊 [KEYWORD-INSIGHTS] Error generating insights:", error)
    return {
      averageScore: 50,
      highQualityCount: 0,
      recommendations: [
        "Error analyzing keywords - review keyword relevance manually"
      ],
      threshold: KEYWORD_CONFIG.SCORE_THRESHOLD
    }
  }
}
