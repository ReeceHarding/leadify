"use server"

import { ActionState } from "@/types"
import { analyzeThreadIndustryAndExpertiseAction, getIndustrySpecificAdaptationsAction } from "@/actions/integrations/openai/industry-analysis-actions"

interface IndustryAnalysisTestResult {
  basicAnalysisWorking: boolean
  adaptationsWorking: boolean
  analysisResult: any
  adaptationsResult: any
  testScenarios: {
    scenario: string
    industry: string
    expertise: string
    confidence: number
  }[]
}

export async function testIndustryAnalysisSystemAction(): Promise<ActionState<IndustryAnalysisTestResult>> {
  console.log("🧪 [TEST-INDUSTRY-ANALYSIS] Starting industry analysis system test")
  
  try {
    const testScenarios = [
      {
        title: "Need help choosing between building in-house vs outsourcing custom software development",
        content: "I'm a non-technical founder of a growing company and we need custom software built. I'm torn between hiring developers vs working with an agency. Budget is around $50k-100k and timeline is 6 months. What would you recommend?",
        subreddit: "entrepreneur",
        keywords: ["software development", "custom solutions", "technical consulting"]
      },
      {
        title: "Looking for advice on scaling my e-commerce marketing",
        content: "We're a small e-commerce business doing about $500k/year in revenue. Our current marketing is mostly Facebook ads but we want to diversify. Looking at Google Ads, influencer marketing, and email campaigns. What's worked for others?",
        subreddit: "marketing",
        keywords: ["digital marketing", "e-commerce", "growth strategy"]
      },
      {
        title: "Help with financial planning for startup fundraising",
        content: "We're preparing for Series A and need to get our financial projections and models in order. Current revenue is $100k MRR growing 15% month over month. What should we focus on for due diligence?",
        subreddit: "startups",
        keywords: ["financial planning", "fundraising", "startup consulting"]
      }
    ]

    const testResults = []
    let basicAnalysisWorking = true
    let adaptationsWorking = true
    let lastAnalysisResult = null
    let lastAdaptationsResult = null

    for (const scenario of testScenarios) {
      console.log(`🧪 [TEST-INDUSTRY-ANALYSIS] Testing scenario: ${scenario.title.substring(0, 50)}...`)
      
      // Test basic industry analysis
      const analysisResult = await analyzeThreadIndustryAndExpertiseAction(
        scenario.title,
        scenario.content,
        scenario.subreddit,
        scenario.keywords
      )

      if (!analysisResult.isSuccess) {
        console.error(`❌ [TEST-INDUSTRY-ANALYSIS] Analysis failed for scenario: ${scenario.title}`)
        basicAnalysisWorking = false
        continue
      }

      const analysis = analysisResult.data
      lastAnalysisResult = analysis

      console.log(`✅ [TEST-INDUSTRY-ANALYSIS] Analysis successful:`)
      console.log(`   Industry: ${analysis.clientIndustry}`)
      console.log(`   Expertise: ${analysis.expertiseArea}`)
      console.log(`   Service: ${analysis.serviceOffering}`)
      console.log(`   Confidence: ${analysis.confidence}`)

      testResults.push({
        scenario: scenario.title,
        industry: analysis.clientIndustry,
        expertise: analysis.expertiseArea,
        confidence: analysis.confidence
      })

      // Test industry-specific adaptations
      const adaptationsResult = await getIndustrySpecificAdaptationsAction(
        analysis.clientIndustry,
        analysis.expertiseArea,
        `${scenario.title}\n\n${scenario.content}`
      )

      if (!adaptationsResult.isSuccess) {
        console.error(`❌ [TEST-INDUSTRY-ANALYSIS] Adaptations failed for scenario: ${scenario.title}`)
        adaptationsWorking = false
        continue
      }

      lastAdaptationsResult = adaptationsResult.data

      console.log(`✅ [TEST-INDUSTRY-ANALYSIS] Adaptations successful:`)
      console.log(`   Industry Terms: ${adaptationsResult.data.industryTerms.length} terms`)
      console.log(`   Common Challenges: ${adaptationsResult.data.commonChallenges.length} challenges`)
      console.log(`   Typical Solutions: ${adaptationsResult.data.typicalSolutions.length} solutions`)

      // Add small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log("🎉 [TEST-INDUSTRY-ANALYSIS] All tests completed!")
    console.log(`🎉 [TEST-INDUSTRY-ANALYSIS] Basic Analysis Working: ${basicAnalysisWorking}`)
    console.log(`🎉 [TEST-INDUSTRY-ANALYSIS] Adaptations Working: ${adaptationsWorking}`)

    return {
      isSuccess: true,
      message: "Industry analysis system test completed successfully",
      data: {
        basicAnalysisWorking,
        adaptationsWorking,
        analysisResult: lastAnalysisResult,
        adaptationsResult: lastAdaptationsResult,
        testScenarios: testResults
      }
    }

  } catch (error) {
    console.error("❌ [TEST-INDUSTRY-ANALYSIS] Test failed:", error)
    return {
      isSuccess: false,
      message: `Industry analysis system test failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function testSpecificIndustryAnalysisAction(
  threadTitle: string,
  threadContent: string,
  subreddit: string,
  campaignKeywords: string[]
): Promise<ActionState<{
  analysis: any
  adaptations: any
  processingTime: number
}>> {
  console.log("🧪 [TEST-SPECIFIC-ANALYSIS] Testing specific thread analysis")
  console.log("🧪 [TEST-SPECIFIC-ANALYSIS] Title:", threadTitle)
  console.log("🧪 [TEST-SPECIFIC-ANALYSIS] Subreddit:", subreddit)

  const startTime = Date.now()

  try {
    // Test the analysis
    const analysisResult = await analyzeThreadIndustryAndExpertiseAction(
      threadTitle,
      threadContent,
      subreddit,
      campaignKeywords
    )

    if (!analysisResult.isSuccess) {
      return {
        isSuccess: false,
        message: `Analysis failed: ${analysisResult.message}`
      }
    }

    const analysis = analysisResult.data

    // Test the adaptations
    const adaptationsResult = await getIndustrySpecificAdaptationsAction(
      analysis.clientIndustry,
      analysis.expertiseArea,
      `${threadTitle}\n\n${threadContent}`
    )

    if (!adaptationsResult.isSuccess) {
      return {
        isSuccess: false,
        message: `Adaptations failed: ${adaptationsResult.message}`
      }
    }

    const adaptations = adaptationsResult.data
    const processingTime = Date.now() - startTime

    console.log("✅ [TEST-SPECIFIC-ANALYSIS] Analysis completed successfully")
    console.log("✅ [TEST-SPECIFIC-ANALYSIS] Processing time:", processingTime, "ms")

    return {
      isSuccess: true,
      message: "Specific industry analysis test completed successfully",
      data: {
        analysis,
        adaptations,
        processingTime
      }
    }

  } catch (error) {
    console.error("❌ [TEST-SPECIFIC-ANALYSIS] Test failed:", error)
    return {
      isSuccess: false,
      message: `Specific analysis test failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 