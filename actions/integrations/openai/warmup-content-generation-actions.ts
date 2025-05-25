/*
<ai_context>
OpenAI integration for generating Reddit warm-up content.
Uses GPT models to analyze subreddit styles and generate posts/comments.
</ai_context>
*/

"use server"

import { ActionState } from "@/types"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface SubredditRecommendation {
  subreddit: string
  reason: string
  relevance: number // 1-10
}

interface GeneratedPost {
  title: string
  content: string
}

export async function recommendSubredditsAction(
  userKeywords: string[],
  productDescription: string
): Promise<ActionState<SubredditRecommendation[]>> {
  try {
    console.log("🤖 [RECOMMEND-SUBREDDITS] Generating subreddit recommendations")
    
    const prompt = `Based on these keywords: ${userKeywords.join(", ")} and this product/service description: "${productDescription}"
    
    Recommend 5-10 subreddits where the user can naturally build karma and establish themselves as a helpful community member.
    
    Focus on subreddits where:
    1. The user has genuine knowledge or interest related to the topics
    2. The community is active and values helpful contributions
    3. The user can participate naturally without forcing their product/service into conversations
    4. Building karma through quality posts and comments is achievable
    
    Avoid subreddits that are:
    - Too strict about new accounts
    - Purely promotional or business-focused
    - Inactive or have very high karma requirements
    
    Return a JSON array of objects with:
    - subreddit: the subreddit name (without r/)
    - reason: why this subreddit is good for building karma naturally
    - relevance: score from 1-10 (based on how well it matches their expertise)
    
    Order by relevance score descending.`

    const response = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        {
          role: "system",
          content: "You are a Reddit marketing expert who helps users find relevant subreddits to build authority in."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      // @ts-ignore - o3-mini specific parameter
      reasoning_effort: "low"
    })

    const content = response.choices[0].message.content
    if (!content) {
      return { isSuccess: false, message: "No recommendations generated" }
    }

    const result = JSON.parse(content)
    const recommendations = result.recommendations || result.subreddits || []
    
    console.log(`✅ [RECOMMEND-SUBREDDITS] Generated ${recommendations.length} recommendations`)
    
    return {
      isSuccess: true,
      message: "Subreddit recommendations generated",
      data: recommendations
    }
  } catch (error) {
    console.error("❌ [RECOMMEND-SUBREDDITS] Error:", error)
    return { isSuccess: false, message: "Failed to generate recommendations" }
  }
}

export async function analyzeSubredditStyleAction(
  topPosts: any[]
): Promise<ActionState<{ writingStyle: string; commonTopics: string[] }>> {
  try {
    console.log("🤖 [ANALYZE-STYLE] Analyzing subreddit writing style")
    
    const postsText = topPosts.map(post => 
      `Title: ${post.title}\nContent: ${post.selftext || post.content || ""}\nUpvotes: ${post.score || post.upvotes}`
    ).join("\n\n---\n\n")

    const prompt = `Analyze these top posts from a subreddit and extract VERY SPECIFIC writing patterns:
    
    Posts to analyze:
    ${postsText}
    
    Extract:
    1. EXACT writing style patterns including:
       - Specific phrases and expressions used
       - Sentence structure and length patterns
       - Punctuation habits (lots of exclamation marks? questions? periods?)
       - Capitalization patterns
       - Common opening/closing phrases
       - Use of slang, abbreviations, or specific terminology
       - Paragraph structure and length
       - Whether they use personal anecdotes or stay general
       - Specific formatting quirks (even in plain text)
    
    2. Common topics and themes
    
    Be EXTREMELY specific about the writing style - I need to be able to recreate posts that feel exactly like these.
    
    Return a JSON object with:
    - writingStyle: a VERY detailed description of the exact writing patterns
    - commonTopics: an array of common topics/themes`

    const response = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing Reddit content patterns and capturing exact writing styles down to the smallest details."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      // @ts-ignore - o3-mini specific parameter
      reasoning_effort: "medium"
    })

    const content = response.choices[0].message.content
    if (!content) {
      return { isSuccess: false, message: "No analysis generated" }
    }

    const analysis = JSON.parse(content)
    
    console.log("✅ [ANALYZE-STYLE] Style analysis completed")
    
    return {
      isSuccess: true,
      message: "Style analysis completed",
      data: {
        writingStyle: analysis.writingStyle || "",
        commonTopics: analysis.commonTopics || []
      }
    }
  } catch (error) {
    console.error("❌ [ANALYZE-STYLE] Error:", error)
    return { isSuccess: false, message: "Failed to analyze style" }
  }
}

export async function generateWarmupPostAction(
  subreddit: string,
  writingStyle: string,
  commonTopics: string[],
  userKeywords: string[]
): Promise<ActionState<GeneratedPost>> {
  try {
    console.log(`🤖 [GENERATE-POST] Generating warm-up post for r/${subreddit}`)
    
    const prompt = `You need to write a Reddit post that could have been written by any of the top posters in r/${subreddit}.

    EXACT WRITING STYLE TO COPY:
    ${writingStyle}
    
    Topics that work well: ${commonTopics.join(", ")}
    
    CRITICAL INSTRUCTIONS:
    1. Copy the EXACT writing style described above - use the same phrases, punctuation patterns, capitalization, sentence structures
    2. If they use lots of exclamation marks, you use lots of exclamation marks
    3. If they write short choppy sentences, you write short choppy sentences
    4. If they use specific slang or abbreviations, you use the same ones
    5. Match their paragraph structure exactly
    6. Use their typical opening and closing styles
    7. Make it feel 100% authentic to the subreddit
    
    DO NOT:
    - Use any AI-typical phrases or formal language unless that's what the subreddit uses
    - Mention any products or services
    - Include any self-promotion
    - Use time-sensitive content
    - Write in a generic "helpful AI" style - write EXACTLY like the community writes
    
    The post should be indistinguishable from a real top post in r/${subreddit}.
    
    Return a JSON object with:
    - title: the post title (matching EXACTLY how titles are written in this subreddit)
    - content: the post body in PLAIN TEXT (matching EXACTLY how posts are written)`

    const response = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        {
          role: "system",
          content: `You are a long-time member of r/${subreddit} who writes exactly like other successful posters there. You never write like an AI - you write exactly like the community.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      // @ts-ignore - o3-mini specific parameter
      reasoning_effort: "high"
    })

    const content = response.choices[0].message.content
    if (!content) {
      return { isSuccess: false, message: "No post generated" }
    }

    const post = JSON.parse(content)
    
    console.log("✅ [GENERATE-POST] Post generated successfully")
    
    return {
      isSuccess: true,
      message: "Post generated successfully",
      data: {
        title: post.title || "",
        content: post.content || ""
      }
    }
  } catch (error) {
    console.error("❌ [GENERATE-POST] Error:", error)
    return { isSuccess: false, message: "Failed to generate post" }
  }
}

export async function generateWarmupCommentsAction(
  comments: any[],
  postContext: string
): Promise<ActionState<{ commentId: string; reply: string }[]>> {
  try {
    console.log("🤖 [GENERATE-COMMENTS] Generating comment replies")
    
    const commentsToReply = comments
      .filter(comment => comment.data && !comment.data.author.includes("[deleted]"))
      .slice(0, 5) // Limit to 5 comments max

    if (commentsToReply.length === 0) {
      return {
        isSuccess: true,
        message: "No comments to reply to",
        data: []
      }
    }

    const prompt = `Generate short, helpful replies to these Reddit comments. Context: ${postContext}
    
    Comments to reply to:
    ${commentsToReply.map((comment, i) => 
      `${i + 1}. "${comment.data.body}"`
    ).join("\n")}
    
    Generate replies that are:
    - Very short (max 10 words, preferably 3-7 words)
    - Helpful, friendly, or add to the discussion
    - Natural and conversational
    - Relevant to the comment
    - IN PLAIN TEXT ONLY (no markdown, no asterisks, no formatting)
    - NEVER USE HYPHENS (-) in your replies
    
    CRITICAL: Do NOT use hyphens anywhere in your replies. No dashes, no hyphens, no minus signs.
    
    Focus on building karma by being a helpful community member, not promoting anything.
    
    Return a JSON object with an array called "replies", each containing:
    - commentIndex: the comment number (1-based)
    - reply: the short reply text in plain text without any hyphens`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful Reddit user who writes very short, friendly replies in plain text to build karma. You NEVER use hyphens or dashes in your replies."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.9
    })

    const content = response.choices[0].message.content
    if (!content) {
      return { isSuccess: false, message: "No replies generated" }
    }

    const result = JSON.parse(content)
    const replies = (result.replies || []).map((reply: any) => ({
      commentId: commentsToReply[reply.commentIndex - 1]?.data?.id || "",
      reply: reply.reply
    })).filter((r: any) => r.commentId)
    
    console.log(`✅ [GENERATE-COMMENTS] Generated ${replies.length} comment replies`)
    
    return {
      isSuccess: true,
      message: "Comment replies generated",
      data: replies
    }
  } catch (error) {
    console.error("❌ [GENERATE-COMMENTS] Error:", error)
    return { isSuccess: false, message: "Failed to generate replies" }
  }
} 