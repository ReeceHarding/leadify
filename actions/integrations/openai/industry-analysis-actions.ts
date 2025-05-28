"use server"

import { ActionState } from "@/types"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = "https://api.openai.com/v1"

interface IndustryAnalysis {
  clientIndustry: string
  expertiseArea: string
  serviceOffering: string
  reasoning: string
  confidence: number
}

export async function analyzeThreadIndustryAndExpertiseAction(
  threadTitle: string,
  threadContent: string,
  subreddit: string,
  campaignKeywords: string[],
  knowledgeBaseContent?: string
): Promise<ActionState<IndustryAnalysis>> {
  console.log("🔍 [INDUSTRY-ANALYSIS] Starting intelligent industry analysis")
  console.log("🔍 [INDUSTRY-ANALYSIS] Thread title:", threadTitle)
  console.log("🔍 [INDUSTRY-ANALYSIS] Subreddit:", subreddit)
  console.log("🔍 [INDUSTRY-ANALYSIS] Campaign keywords:", campaignKeywords.join(", "))

  try {
    if (!OPENAI_API_KEY) {
      console.error("🔍 [INDUSTRY-ANALYSIS] OpenAI API key not found")
      return {
        isSuccess: false,
        message: "OpenAI API key not configured"
      }
    }

    const industryAnalysisPrompt = `Analyze this Reddit thread and determine the most appropriate client industry and expertise area for providing helpful advice.

THREAD TITLE: ${threadTitle}
THREAD CONTENT: ${threadContent}
SUBREDDIT: r/${subreddit}
CAMPAIGN KEYWORDS: ${campaignKeywords.join(", ")}

${knowledgeBaseContent ? `\nCONTEXT ABOUT OUR BUSINESS:
${knowledgeBaseContent}` : ""}

Based on the content, determine:

1. CLIENT INDUSTRY: What industry/field is this person operating in or asking about?
   - Be specific (e.g., "SaaS technology", "e-commerce", "healthcare", "fintech")
   - Consider their business model, target market, and challenges
   - Look at the terminology and context they use

2. EXPERTISE AREA: What type of expertise would be most helpful for their situation?
   - Match the specific problem they're describing
   - Consider what kind of consultant would be most valuable
   - Think about the skills needed to solve their challenge

3. SERVICE OFFERING: What kind of service would naturally fit their needs?
   - Be specific about the type of help they need
   - Consider their stage (startup, scaling, enterprise)
   - Match their apparent budget and timeline constraints

4. CONFIDENCE: Rate 1-100 how confident you are in this analysis
   - 90-100: Very clear industry and needs
   - 70-89: Good indicators, some assumptions
   - 50-69: Moderate confidence, general category
   - Below 50: Unclear, using broad categories

Consider these factors:
- The specific problem they're describing
- The language and terminology they use
- The subreddit context and community
- The type of help they're seeking
- The campaign keywords that led to this thread
- Their apparent business stage and constraints
- Industry-specific challenges mentioned

Return JSON format:
{
  "clientIndustry": "specific industry classification",
  "expertiseArea": "specific expertise that would help most",
  "serviceOffering": "natural service description that fits their needs",
  "reasoning": "detailed explanation of why these choices fit their situation",
  "confidence": <1-100>
}`

    console.log("🔍 [INDUSTRY-ANALYSIS] Sending analysis request to OpenAI")

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert business analyst who specializes in understanding client needs and matching them with appropriate expertise. You analyze business contexts with precision and provide specific, actionable classifications."
          },
          {
            role: "user",
            content: industryAnalysisPrompt
          }
        ],
        temperature: 0.2, // Lower temperature for more consistent analysis
        max_tokens: 800
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("🔍 [INDUSTRY-ANALYSIS] OpenAI API error:", errorText)
      return {
        isSuccess: false,
        message: `OpenAI API error: ${response.status} - ${errorText}`
      }
    }

    const data = await response.json()
    const analysisContent = data.choices[0]?.message?.content

    if (!analysisContent) {
      console.error("🔍 [INDUSTRY-ANALYSIS] No analysis content received")
      return {
        isSuccess: false,
        message: "No analysis content received from OpenAI"
      }
    }

    let analysis: IndustryAnalysis
    try {
      const parsedAnalysis = JSON.parse(analysisContent)
      analysis = {
        clientIndustry: parsedAnalysis.clientIndustry || "business consulting",
        expertiseArea: parsedAnalysis.expertiseArea || "business strategy",
        serviceOffering: parsedAnalysis.serviceOffering || "consulting services",
        reasoning: parsedAnalysis.reasoning || "General business context",
        confidence: parsedAnalysis.confidence || 50
      }
    } catch (parseError) {
      console.error("🔍 [INDUSTRY-ANALYSIS] Failed to parse analysis:", parseError)
      console.error("🔍 [INDUSTRY-ANALYSIS] Raw content:", analysisContent)
      
      // Fallback to defaults if parsing fails
      analysis = {
        clientIndustry: "business consulting",
        expertiseArea: "business strategy",
        serviceOffering: "consulting services",
        reasoning: "Failed to parse analysis, using defaults",
        confidence: 30
      }
    }

    console.log("🔍 [INDUSTRY-ANALYSIS] Analysis completed successfully")
    console.log("🔍 [INDUSTRY-ANALYSIS] Client Industry:", analysis.clientIndustry)
    console.log("🔍 [INDUSTRY-ANALYSIS] Expertise Area:", analysis.expertiseArea)
    console.log("🔍 [INDUSTRY-ANALYSIS] Service Offering:", analysis.serviceOffering)
    console.log("🔍 [INDUSTRY-ANALYSIS] Confidence:", analysis.confidence)
    console.log("🔍 [INDUSTRY-ANALYSIS] Reasoning:", analysis.reasoning)

    return {
      isSuccess: true,
      message: "Industry analysis completed successfully",
      data: analysis
    }
  } catch (error) {
    console.error("🔍 [INDUSTRY-ANALYSIS] Error analyzing industry:", error)
    return {
      isSuccess: false,
      message: `Failed to analyze industry: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function getIndustrySpecificAdaptationsAction(
  clientIndustry: string,
  expertiseArea: string,
  threadContext: string
): Promise<ActionState<{
  industryTerms: string[]
  commonChallenges: string[]
  typicalSolutions: string[]
  budgetRanges: string[]
  timelineExpectations: string[]
}>> {
  console.log("🔍 [INDUSTRY-ADAPTATIONS] Getting industry-specific adaptations")
  console.log("🔍 [INDUSTRY-ADAPTATIONS] Industry:", clientIndustry)
  console.log("🔍 [INDUSTRY-ADAPTATIONS] Expertise:", expertiseArea)

  try {
    if (!OPENAI_API_KEY) {
      return {
        isSuccess: false,
        message: "OpenAI API key not configured"
      }
    }

    const adaptationsPrompt = `Generate industry-specific adaptations for providing authentic consulting advice.

CLIENT INDUSTRY: ${clientIndustry}
EXPERTISE AREA: ${expertiseArea}
THREAD CONTEXT: ${threadContext}

Generate specific adaptations for this industry:

1. INDUSTRY TERMS: 6-8 technical terms that would be natural to use when discussing this industry
2. COMMON CHALLENGES: 4-5 typical pain points businesses in this industry face
3. TYPICAL SOLUTIONS: 4-5 standard approaches or tools commonly used in this industry
4. BUDGET RANGES: Realistic cost expectations for different types of work in this industry
5. TIMELINE EXPECTATIONS: Typical project durations for different complexity levels

Make these specific to the industry, not generic business advice.

Return JSON format:
{
  "industryTerms": ["term1", "term2", "term3", "term4", "term5", "term6"],
  "commonChallenges": ["challenge1", "challenge2", "challenge3", "challenge4"],
  "typicalSolutions": ["solution1", "solution2", "solution3", "solution4"],
  "budgetRanges": ["$X-Y for basic", "$X-Y for standard", "$X-Y for premium"],
  "timelineExpectations": ["X weeks for simple", "X months for complex", "X months for enterprise"]
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
            content: "You are an expert in various industries who provides specific, realistic information about industry standards, terminology, and practices."
          },
          {
            role: "user",
            content: adaptationsPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 600
      })
    })

    if (!response.ok) {
      console.error("🔍 [INDUSTRY-ADAPTATIONS] API error:", response.status)
      return {
        isSuccess: false,
        message: "Failed to get industry adaptations"
      }
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return {
        isSuccess: false,
        message: "No adaptations content received"
      }
    }

    try {
      const adaptations = JSON.parse(content)
      console.log("🔍 [INDUSTRY-ADAPTATIONS] Adaptations generated successfully")
      
      return {
        isSuccess: true,
        message: "Industry adaptations generated successfully",
        data: {
          industryTerms: adaptations.industryTerms || [],
          commonChallenges: adaptations.commonChallenges || [],
          typicalSolutions: adaptations.typicalSolutions || [],
          budgetRanges: adaptations.budgetRanges || [],
          timelineExpectations: adaptations.timelineExpectations || []
        }
      }
    } catch (parseError) {
      console.error("🔍 [INDUSTRY-ADAPTATIONS] Failed to parse adaptations:", parseError)
      return {
        isSuccess: false,
        message: "Failed to parse industry adaptations"
      }
    }
  } catch (error) {
    console.error("🔍 [INDUSTRY-ADAPTATIONS] Error:", error)
    return {
      isSuccess: false,
      message: `Failed to get industry adaptations: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 