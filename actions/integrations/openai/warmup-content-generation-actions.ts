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

    const prompt = `Analyze these top posts from a subreddit and extract:
    1. The common writing style (tone, length, format, etc.)
    2. Common topics and themes
    
    Posts to analyze:
    ${postsText}
    
    Return a JSON object with:
    - writingStyle: a description of the writing style
    - commonTopics: an array of common topics/themes`

    const response = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing Reddit content patterns and writing styles."
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
    
    const prompt = `Generate a Reddit post for r/${subreddit} that mimics the top posts in this subreddit.
    
    Your goal is to create a post that will get upvotes and build karma by:
    1. Matching this exact writing style: ${writingStyle}
    2. Focusing on one of these popular topics that get engagement: ${commonTopics.join(", ")}
    3. Using the same format and tone as successful posts in this subreddit
    4. Being genuinely helpful, interesting, or entertaining to the community
    5. Encouraging discussion through questions or interesting observations
    
    DO NOT:
    - Mention any products or services
    - Include any self-promotion
    - Reference the keywords: ${userKeywords.join(", ")} (these are just for context)
    - Use time-sensitive content or current events
    
    The post should feel like it was written by a regular member of r/${subreddit} who understands what content performs well there.
    
    Return a JSON object with:
    - title: the post title (matching the subreddit's typical title style)
    - content: the post body in PLAIN TEXT (no markdown, no formatting, just regular text)`

    const response = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        {
          role: "system",
          content: `You are a regular Reddit user in r/${subreddit} who creates posts that get lots of upvotes by understanding what the community likes.`
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
    
    Focus on building karma by being a helpful community member, not promoting anything.
    
    Return a JSON object with an array called "replies", each containing:
    - commentIndex: the comment number (1-based)
    - reply: the short reply text in plain text`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful Reddit user who writes very short, friendly replies in plain text to build karma and be a good community member."
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