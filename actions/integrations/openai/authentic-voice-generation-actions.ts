"use server"

import { ActionState } from "@/types"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = "https://api.openai.com/v1"

interface AuthenticVoicePrompt {
  systemPrompt: string
  userPrompt: string
  voiceCharacteristics: {
    enthusiasmLevel: "high" | "medium" | "low"
    expertiseDomain: string
    personalConnection: string
    credibilityMarker: string
    helpOffer: string
  }
  adaptationVariables: {
    industryTerms: string[]
    industryChallenges: string[]
    typicalSolutions: string[]
    budgetRanges: string[]
    timelineExpectations: string[]
  }
}

export async function generateAuthenticVoicePromptAction(
  clientIndustry: string,
  clientSituation: string,
  expertiseArea: string,
  serviceOffering: string,
  urgencyLevel: "low" | "medium" | "high" = "medium",
  complexityLevel: "simple" | "moderate" | "complex" = "moderate"
): Promise<ActionState<AuthenticVoicePrompt>> {
  console.log("🎯 [AUTHENTIC-VOICE] Starting generateAuthenticVoicePromptAction")
  console.log("🎯 [AUTHENTIC-VOICE] Client industry:", clientIndustry)
  console.log("🎯 [AUTHENTIC-VOICE] Client situation:", clientSituation)
  console.log("🎯 [AUTHENTIC-VOICE] Expertise area:", expertiseArea)
  console.log("🎯 [AUTHENTIC-VOICE] Service offering:", serviceOffering)

  try {
    if (!OPENAI_API_KEY) {
      console.error("🎯 [AUTHENTIC-VOICE] OpenAI API key not found")
      return {
        isSuccess: false,
        message: "OpenAI API key not configured"
      }
    }

    // Generate industry-specific adaptations
    const adaptationPrompt = `
Analyze this client situation and generate specific adaptations for the authentic consultant voice:

CLIENT INDUSTRY: ${clientIndustry}
CLIENT SITUATION: ${clientSituation}
YOUR EXPERTISE: ${expertiseArea}
YOUR SERVICE: ${serviceOffering}
URGENCY: ${urgencyLevel}
COMPLEXITY: ${complexityLevel}

Generate specific adaptations:

1. INDUSTRY TERMS: 5-8 relevant technical terms that would be natural to use
2. INDUSTRY CHALLENGES: 3-5 common pain points in this industry
3. TYPICAL SOLUTIONS: 3-4 standard approaches people use in this domain
4. BUDGET RANGES: Realistic cost expectations for this type of work
5. TIMELINE EXPECTATIONS: Typical project durations for this complexity

6. PERSONAL CONNECTION: How would an expert in ${expertiseArea} naturally relate to this situation?
7. CREDIBILITY MARKER: Brief statement showing relevant experience
8. ENTHUSIASM LEVEL: high/medium/low based on how exciting this challenge would be
9. HELP OFFER: Specific way you could assist with their situation

Return JSON format:
{
  "industryTerms": ["term1", "term2", ...],
  "industryChallenges": ["challenge1", "challenge2", ...],
  "typicalSolutions": ["solution1", "solution2", ...],
  "budgetRanges": ["range1", "range2", ...],
  "timelineExpectations": ["timeline1", "timeline2", ...],
  "personalConnection": "how you relate to their situation",
  "credibilityMarker": "brief experience statement",
  "enthusiasmLevel": "high|medium|low",
  "helpOffer": "specific assistance you can provide"
}
`

    console.log("🎯 [AUTHENTIC-VOICE] Generating industry adaptations")

    const adaptationResponse = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
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
            content: "You are an expert at analyzing business situations and generating authentic, industry-specific communication adaptations."
          },
          {
            role: "user",
            content: adaptationPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    })

    if (!adaptationResponse.ok) {
      const errorText = await adaptationResponse.text()
      console.error("🎯 [AUTHENTIC-VOICE] OpenAI API error:", errorText)
      return {
        isSuccess: false,
        message: `OpenAI API error: ${adaptationResponse.status} - ${errorText}`
      }
    }

    const adaptationData = await adaptationResponse.json()
    const adaptationContent = adaptationData.choices[0]?.message?.content

    if (!adaptationContent) {
      console.error("🎯 [AUTHENTIC-VOICE] No adaptation content received")
      return {
        isSuccess: false,
        message: "No adaptation content received from OpenAI"
      }
    }

    let adaptations
    try {
      adaptations = JSON.parse(adaptationContent)
    } catch (parseError) {
      console.error("🎯 [AUTHENTIC-VOICE] Failed to parse adaptations:", parseError)
      return {
        isSuccess: false,
        message: "Failed to parse adaptation result"
      }
    }

    console.log("🎯 [AUTHENTIC-VOICE] Adaptations generated successfully")

    // Generate the authentic voice prompt using the adaptations
    const systemPrompt = `You are an experienced ${expertiseArea} consultant who writes with an authentic, helpful voice. You MUST follow these critical writing rules:

CRITICAL WRITING RULES (NEVER BREAK THESE):

1. NEVER USE HYPHENS (-) ANYWHERE:
   - Write "3rd party" not "third-party"
   - Write "full stack" not "full-stack" 
   - Write "long term" not "long-term"
   - Write "real time" not "real-time"
   - Write "co founder" not "co-founder"
   - Write "time boxed" not "time-boxed"
   - Write "Jack of all trades" not "Jack-of-all-trades"

2. SYMBOL & ABBREVIATION USAGE:
   - Use "$" instead of "money", "dollars", "cost", "budget"
   - Use "3rd" instead of "third"
   - Use "&" in business contexts
   - Use "BS" instead of full phrase when appropriate

3. CAPITALIZATION FOR EMPHASIS:
   - Use ALL CAPS for key emphasis: "YOUR needs", "YOUR situation"
   - Mix proper case and lowercase in headers naturally

4. PUNCTUATION PATTERNS:
   - Single exclamation marks for normal enthusiasm
   - Double exclamation marks for extra excitement: "project!!"
   - Use "And," to start sentences with comma
   - Colons for introducing lists and explanations

AUTHENTIC VOICE CHARACTERISTICS:
- Personal Connection: ${adaptations.personalConnection}
- Credibility: ${adaptations.credibilityMarker}
- Enthusiasm Level: ${adaptations.enthusiasmLevel}
- Help Offer: ${adaptations.helpOffer}

INDUSTRY CONTEXT:
- Industry: ${clientIndustry}
- Common Terms: ${adaptations.industryTerms.join(", ")}
- Typical Challenges: ${adaptations.industryChallenges.join(", ")}
- Standard Solutions: ${adaptations.typicalSolutions.join(", ")}
- Budget Ranges: ${adaptations.budgetRanges.join(", ")}
- Timeline Expectations: ${adaptations.timelineExpectations.join(", ")}

WRITING STRUCTURE:
1. Personal Connection Opening (show enthusiasm, offer to help)
2. Framework Questions ("There are a handful of things you need to consider:")
3. Option Presentation ("Then you have a few options.")
4. Detailed Analysis (honest pros/cons, specific expectations)
5. Personal Closing (reiterate help offer, show enthusiasm)

TONE REQUIREMENTS:
- Conversational, not formal
- Helpful, not salesy  
- Experienced, not pretentious
- Honest, not overpromising
- Enthusiastic, not fake
- Personal, not corporate

Remember: You're teaching them HOW to think about their decision, not just WHAT to do. Present multiple genuine options, be honest about challenges, and focus on helping them succeed.`

    const userPrompt = `Write a helpful Reddit comment responding to someone in ${clientIndustry} who is dealing with: ${clientSituation}

Your response should:
- Start with a personal connection and offer to help
- Ask 3-4 key questions they need to consider
- Present 3-4 genuine options with honest pros/cons
- Include specific expectations ("Expect to pay...")
- Mention ${serviceOffering} as ONE natural option among others
- End with enthusiasm and offer to chat further

Make it feel like you're genuinely helping a friend think through their decision, not pitching them. Be specific to their industry and situation.

CRITICAL: Follow ALL the writing rules above, especially NEVER using hyphens anywhere in your response.`

    console.log("🎯 [AUTHENTIC-VOICE] Authentic voice prompt generated successfully")

    const result: AuthenticVoicePrompt = {
      systemPrompt,
      userPrompt,
      voiceCharacteristics: {
        enthusiasmLevel: adaptations.enthusiasmLevel,
        expertiseDomain: expertiseArea,
        personalConnection: adaptations.personalConnection,
        credibilityMarker: adaptations.credibilityMarker,
        helpOffer: adaptations.helpOffer
      },
      adaptationVariables: {
        industryTerms: adaptations.industryTerms,
        industryChallenges: adaptations.industryChallenges,
        typicalSolutions: adaptations.typicalSolutions,
        budgetRanges: adaptations.budgetRanges,
        timelineExpectations: adaptations.timelineExpectations
      }
    }

    return {
      isSuccess: true,
      message: "Authentic voice prompt generated successfully",
      data: result
    }
  } catch (error) {
    console.error("🎯 [AUTHENTIC-VOICE] Error generating authentic voice prompt:", error)
    return {
      isSuccess: false,
      message: `Failed to generate authentic voice prompt: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function generateAuthenticCommentAction(
  threadTitle: string,
  threadContent: string,
  subreddit: string,
  clientIndustry: string,
  expertiseArea: string,
  serviceOffering: string,
  commentType: "micro" | "medium" | "verbose" = "medium"
): Promise<ActionState<string>> {
  console.log("🎯 [AUTHENTIC-COMMENT] Starting generateAuthenticCommentAction")
  console.log("🎯 [AUTHENTIC-COMMENT] Thread title:", threadTitle)
  console.log("🎯 [AUTHENTIC-COMMENT] Comment type:", commentType)

  try {
    if (!OPENAI_API_KEY) {
      console.error("🎯 [AUTHENTIC-COMMENT] OpenAI API key not found")
      return {
        isSuccess: false,
        message: "OpenAI API key not configured"
      }
    }

    // First generate the voice prompt
    const voicePromptResult = await generateAuthenticVoicePromptAction(
      clientIndustry,
      `${threadTitle}\n\n${threadContent}`,
      expertiseArea,
      serviceOffering
    )

    if (!voicePromptResult.isSuccess) {
      return {
        isSuccess: false,
        message: "Failed to generate voice prompt"
      }
    }

    const voicePrompt = voicePromptResult.data

    // Generate comment based on type
    let commentPrompt = ""
    
    if (commentType === "micro") {
      commentPrompt = `Generate a MICRO comment (5-15 words) that shows genuine interest and offers to help.

Examples:
- "oh man i've been there! happy to share what worked"
- "this hits close to home! would love to help you think through this"
- "i remember this exact challenge! feel free to message me"

Make it feel authentic and personal, not generic. NEVER use hyphens.`
    } else if (commentType === "medium") {
      commentPrompt = `Generate a MEDIUM comment (30-80 words) that:
- Shows empathy and connection
- Briefly mentions your relevant experience
- Asks 1-2 key questions they should consider
- Offers to help think through their options
- NEVER uses hyphens anywhere

Keep it conversational and helpful, not salesy.`
    } else {
      commentPrompt = `Generate a VERBOSE comment (300-500 words) following the full authentic consultant structure:

1. Personal connection opening
2. Key questions they need to consider
3. 3-4 genuine options with honest pros/cons
4. Specific expectations and realistic warnings
5. Personal closing with offer to help

Make it comprehensive but conversational. NEVER use hyphens anywhere.`
    }

    const finalPrompt = `${voicePrompt.userPrompt}

SPECIFIC COMMENT TYPE: ${commentType.toUpperCase()}
${commentPrompt}

Thread Title: ${threadTitle}
Thread Content: ${threadContent}
Subreddit: r/${subreddit}

Remember: Be genuinely helpful, not promotional. Focus on their specific situation.`

    console.log("🎯 [AUTHENTIC-COMMENT] Generating comment with authentic voice")

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
            content: voicePrompt.systemPrompt
          },
          {
            role: "user",
            content: finalPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: commentType === "verbose" ? 1500 : commentType === "medium" ? 300 : 100
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("🎯 [AUTHENTIC-COMMENT] OpenAI API error:", errorText)
      return {
        isSuccess: false,
        message: `OpenAI API error: ${response.status} - ${errorText}`
      }
    }

    const data = await response.json()
    const comment = data.choices[0]?.message?.content

    if (!comment) {
      console.error("🎯 [AUTHENTIC-COMMENT] No comment generated")
      return {
        isSuccess: false,
        message: "No comment generated by OpenAI"
      }
    }

    console.log("🎯 [AUTHENTIC-COMMENT] Authentic comment generated successfully")
    console.log("🎯 [AUTHENTIC-COMMENT] Comment length:", comment.length)

    return {
      isSuccess: true,
      message: "Authentic comment generated successfully",
      data: comment.trim()
    }
  } catch (error) {
    console.error("🎯 [AUTHENTIC-COMMENT] Error generating authentic comment:", error)
    return {
      isSuccess: false,
      message: `Failed to generate authentic comment: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 