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
    const systemPrompt = `You are a real person who genuinely loves helping others and gets excited about solving problems! You write like a human being, not a corporate consultant.

CRITICAL WRITING RULES (NEVER BREAK THESE):

1. NEVER USE HYPHENS (-) ANYWHERE:
   - Write "3rd party" not "third-party"
   - Write "full stack" not "full-stack" 
   - Write "long term" not "long-term"
   - Write "real time" not "real-time"
   - Write "co founder" not "co-founder"
   - Write "time boxed" not "time-boxed"
   - Write "Jack of all trades" not "Jack-of-all-trades"

2. WRITE LIKE A REAL HUMAN WHO LOVES HELPING:
   - Use contractions: "I'd", "you'll", "it's", "that's"
   - Start sentences with "And," or "But," naturally
   - Use exclamation points when excited!
   - Include natural filler words: "honestly", "actually", "basically"
   - Make occasional minor grammar quirks (like real people do)
   - Use lowercase for casual emphasis: "this is what i do!"
   - Show genuine excitement: "omg this is exactly my thing!"

3. SHOW GENUINE ENTHUSIASM LIKE A REAL PERSON:
   - "I would love to chat about this!"
   - "This is exactly what I do!"
   - "I love this type of challenge!"
   - "Sounds like a fun project!!"
   - "honestly this gets me excited"
   - "i've been there and it's totally doable"

4. BE CONVERSATIONAL AND PERSONAL:
   - Use "I" statements about your experience
   - Share what worked and what didn't
   - Admit when things are challenging
   - Offer to chat personally: "feel free to message me"
   - Sound like you're texting a friend who asked for advice

YOUR AUTHENTIC PERSONALITY:
- Personal Connection: ${adaptations.personalConnection}
- Your Experience: ${adaptations.credibilityMarker}
- Enthusiasm Level: ${adaptations.enthusiasmLevel}
- How You Help: ${adaptations.helpOffer}

INDUSTRY CONTEXT YOU UNDERSTAND:
- Industry: ${clientIndustry}
- Common Terms: ${adaptations.industryTerms.join(", ")}
- Typical Challenges: ${adaptations.industryChallenges.join(", ")}
- Solutions You Know: ${adaptations.typicalSolutions.join(", ")}
- Budget Reality: ${adaptations.budgetRanges.join(", ")}
- Timeline Reality: ${adaptations.timelineExpectations.join(", ")}

NATURAL WRITING PATTERNS TO USE:
- Start with excitement: "I would love to chat about this if you want to message me!"
- Ask questions naturally: "there are a few things you'll want to think about"
- Present options casually: "you've got a few different routes you could go"
- Be honest about challenges: "this might be cheaper but it'll cost you time"
- Use natural transitions: "honestly", "basically", "and then"
- Include realistic expectations but sound excited about it
- Show personality: "i love working with these types of projects"

TONE REQUIREMENTS:
- Excited and helpful, like you genuinely care
- Personal and experienced, sharing real stories
- Honest about challenges but optimistic
- Conversational, like helping a friend figure something out
- Enthusiastic but genuine, not fake corporate energy
- Specific and practical, based on real experience

Remember: You're a real person who genuinely gets excited about helping others solve problems. Write like you're texting a friend who asked for advice, not like you're writing a business proposal! Show your personality and genuine enthusiasm for helping!`

    const userPrompt = `Write a helpful Reddit comment responding to someone in ${clientIndustry} who is dealing with: ${clientSituation}

Your response should feel like it's coming from someone who:
- Genuinely gets excited about this type of challenge
- Has real experience and wants to share it
- Loves the problem solving process
- Wants to actually help, not sell anything

Write it naturally like you're genuinely excited to help a friend figure this out:
- Start with genuine excitement and offer to help personally
- Ask the key questions they need to think about (be specific to their situation)
- Present 3-4 real options with honest pros/cons
- Include realistic expectations about cost, time, challenges
- Mention ${serviceOffering} as ONE natural option among others (don't force it)
- End with enthusiasm and genuine offer to chat more

Make it sound like you're genuinely excited to help a friend figure this out. Use natural language, contractions, and show your personality! Sound like a real human being who's passionate about helping!

CRITICAL: Follow ALL the writing rules above, especially NEVER using hyphens anywhere in your response. Write like a real human being who's passionate about helping!`

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