"use server"

import { ActionState } from "@/types"

export interface RedditPost {
  id: string
  title: string
  selftext: string
  author: string
  score: number
  num_comments: number
  created_utc: number
  subreddit: string
  permalink: string
  url: string
  upvote_ratio: number
}

export async function getTopPostsFromSubredditAction(
  subreddit: string,
  timeframe: "hour" | "day" | "week" | "month" | "year" | "all" = "week",
  limit: number = 10
): Promise<ActionState<RedditPost[]>> {
  console.log("📰 [REDDIT-POSTS] Fetching top posts from subreddit")
  console.log("📰 [REDDIT-POSTS] Subreddit:", subreddit)
  console.log("📰 [REDDIT-POSTS] Timeframe:", timeframe)
  console.log("📰 [REDDIT-POSTS] Limit:", limit)

  try {
    // Clean subreddit name (remove r/ prefix if present)
    const cleanSubreddit = subreddit.replace(/^r\//, "")
    
    const url = `https://www.reddit.com/r/${cleanSubreddit}/top.json?t=${timeframe}&limit=${limit}`
    
    console.log("📰 [REDDIT-POSTS] Fetching from URL:", url)
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Leadify/1.0 (Lead Generation Tool)"
      }
    })

    if (!response.ok) {
      console.error("📰 [REDDIT-POSTS] Reddit API error:", response.status, response.statusText)
      return {
        isSuccess: false,
        message: `Reddit API error: ${response.status} ${response.statusText}`
      }
    }

    const data = await response.json()
    
    if (!data.data || !data.data.children) {
      console.error("📰 [REDDIT-POSTS] Invalid response structure")
      return {
        isSuccess: false,
        message: "Invalid response from Reddit API"
      }
    }

    const posts: RedditPost[] = data.data.children
      .map((child: any) => child.data)
      .filter((post: any) => post.selftext && post.selftext.trim().length > 50) // Only posts with substantial text content
      .map((post: any) => ({
        id: post.id,
        title: post.title,
        selftext: post.selftext,
        author: post.author,
        score: post.score,
        num_comments: post.num_comments,
        created_utc: post.created_utc,
        subreddit: post.subreddit,
        permalink: post.permalink,
        url: post.url,
        upvote_ratio: post.upvote_ratio
      }))

    console.log("📰 [REDDIT-POSTS] Successfully fetched posts:", posts.length)

    return {
      isSuccess: true,
      message: `Successfully fetched ${posts.length} posts`,
      data: posts
    }
  } catch (error) {
    console.error("📰 [REDDIT-POSTS] Error fetching posts:", error)
    return {
      isSuccess: false,
      message: `Failed to fetch posts: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function analyzePostWritingStyleAction(
  post: RedditPost
): Promise<ActionState<{
  writingStyleAnalysis: string
  keyCharacteristics: string[]
  toneAnalysis: string
  vocabularyLevel: string
  averageSentenceLength: number
  usesEmojis: boolean
  usesSlang: boolean
  formalityLevel: "very_informal" | "informal" | "neutral" | "formal" | "very_formal"
  personalityTraits: string[]
}>> {
  console.log("✍️ [WRITING-STYLE] Analyzing post writing style")
  console.log("✍️ [WRITING-STYLE] Post ID:", post.id)
  console.log("✍️ [WRITING-STYLE] Post length:", post.selftext.length)

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (!OPENAI_API_KEY) {
      return {
        isSuccess: false,
        message: "OpenAI API key not configured"
      }
    }

    const analysisPrompt = `
Analyze the writing style of this Reddit post in extreme detail. I want to copy this exact writing style, including any grammar mistakes, spelling errors, casual language, slang, etc.

POST TITLE: ${post.title}

POST CONTENT:
${post.selftext}

SUBREDDIT: r/${post.subreddit}
AUTHOR: u/${post.author}
SCORE: ${post.score} upvotes

Please provide a comprehensive analysis that includes:

1. EXACT WRITING STYLE DESCRIPTION: Describe the writing style in detail, including any quirks, mistakes, or unique patterns
2. KEY CHARACTERISTICS: List specific characteristics (grammar patterns, word choices, sentence structure, etc.)
3. TONE ANALYSIS: Describe the overall tone and mood
4. VOCABULARY LEVEL: Assess the complexity of vocabulary used
5. SENTENCE STRUCTURE: Analyze sentence length and complexity
6. EMOJI/EMOTICON USAGE: Note any emoji or emoticon patterns
7. SLANG/INFORMAL LANGUAGE: Identify casual language, slang, or internet speak
8. FORMALITY LEVEL: Rate the formality from very informal to very formal
9. PERSONALITY TRAITS: What personality traits come through in the writing?

Focus on capturing the EXACT style so I can replicate it perfectly, including any imperfections that make it feel human and authentic.

Respond in JSON format:
{
  "writingStyleAnalysis": "detailed description of the exact writing style",
  "keyCharacteristics": ["characteristic1", "characteristic2", ...],
  "toneAnalysis": "description of tone and mood",
  "vocabularyLevel": "simple|moderate|advanced|mixed",
  "averageSentenceLength": number,
  "usesEmojis": boolean,
  "usesSlang": boolean,
  "formalityLevel": "very_informal|informal|neutral|formal|very_formal",
  "personalityTraits": ["trait1", "trait2", ...]
}
`

    console.log("✍️ [WRITING-STYLE] Sending analysis request to OpenAI")

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert writing style analyst. Analyze writing styles with extreme precision to help replicate them exactly, including any imperfections or quirks that make them feel human."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      console.error("✍️ [WRITING-STYLE] OpenAI API error:", response.status)
      return {
        isSuccess: false,
        message: `OpenAI API error: ${response.status}`
      }
    }

    const result = await response.json()
    const analysisText = result.choices[0].message.content

    console.log("✍️ [WRITING-STYLE] Raw analysis response:", analysisText)

    // Parse JSON response
    let analysis
    try {
      // Clean the response by removing markdown code blocks
      const cleanedText = analysisText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      
      console.log("✍️ [WRITING-STYLE] Cleaned analysis text:", cleanedText)
      analysis = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error("✍️ [WRITING-STYLE] Failed to parse JSON response:", parseError)
      console.error("✍️ [WRITING-STYLE] Raw response:", analysisText)
      return {
        isSuccess: false,
        message: "Failed to parse analysis response"
      }
    }

    console.log("✍️ [WRITING-STYLE] Analysis completed successfully")

    return {
      isSuccess: true,
      message: "Writing style analysis completed",
      data: analysis
    }
  } catch (error) {
    console.error("✍️ [WRITING-STYLE] Error analyzing writing style:", error)
    return {
      isSuccess: false,
      message: `Failed to analyze writing style: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 