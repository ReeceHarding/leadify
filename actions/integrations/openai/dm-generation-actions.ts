"use server"

import { ActionState } from "@/types"
import OpenAI from "openai"
import { Timestamp } from "firebase/firestore"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface GenerateDMData {
  postTitle: string
  postContent: string
  postAuthor: string
  postCreatedAt: Timestamp
  subreddit: string
  businessContext: string
  targetAudience: string
  valueProposition: string
}

interface GeneratedDM {
  message: string
  followUp: string
}

export async function generateDMAction(
  data: GenerateDMData
): Promise<ActionState<GeneratedDM>> {
  console.log("💬 [GENERATE-DM] Starting DM generation...")
  console.log("💬 [GENERATE-DM] Post title:", data.postTitle)
  console.log("💬 [GENERATE-DM] Post author:", data.postAuthor)
  
  try {
    // Calculate how long ago the post was made
    const now = new Date()
    const postDate = data.postCreatedAt.toDate()
    const daysAgo = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24))
    
    let timeReference = ""
    if (daysAgo === 0) {
      timeReference = "today"
    } else if (daysAgo === 1) {
      timeReference = "yesterday"
    } else if (daysAgo < 7) {
      timeReference = `${daysAgo} days ago`
    } else if (daysAgo < 14) {
      timeReference = "last week"
    } else if (daysAgo < 30) {
      timeReference = `${Math.floor(daysAgo / 7)} weeks ago`
    } else {
      timeReference = "last month"
    }
    
    console.log("💬 [GENERATE-DM] Time reference:", timeReference)
    
    const systemPrompt = `You are a helpful assistant that writes personalized, genuine Reddit DMs for cold outreach. 
Your DMs should:
- Be casual and conversational, not salesy
- Reference the specific post and timing
- Show genuine interest in helping
- Be transparent about it being cold outreach
- Offer something valuable (guarantee, free trial, etc.)
- Be short and to the point (2-3 sentences max for first message)
- Include a follow-up message that's even shorter (1 sentence)

The user runs: ${data.businessContext}
Target audience: ${data.targetAudience}
Value proposition: ${data.valueProposition}`

    const userPrompt = `Write a DM to Reddit user "${data.postAuthor}" who posted "${data.postTitle}" in r/${data.subreddit} ${timeReference}.

Post content: "${data.postContent}"

Create two messages:
1. Initial DM - Reference their post from ${timeReference}, mention you're starting an agency/service that solves their problem, acknowledge it's cold outreach, and make an irresistible offer
2. Follow-up - A short, friendly follow-up asking for feedback

Use this style as inspiration but adapt it to the specific post:
"hey ${data.postAuthor}
saw your post from ${timeReference} about [specific problem]
↓
actually building something that might help with this
↓
know this is random cold outreach but would love to help you [specific benefit]
↓
happy to do [guarantee/free trial/money back] since we're just starting out"

Return in JSON format:
{
  "message": "the initial DM",
  "followUp": "the follow-up message"
}`

    console.log("💬 [GENERATE-DM] Calling OpenAI...")
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    })
    
    const response = completion.choices[0].message.content
    if (!response) {
      throw new Error("No response from OpenAI")
    }
    
    const generatedDM = JSON.parse(response) as GeneratedDM
    
    console.log("💬 [GENERATE-DM] ✅ DM generated successfully")
    console.log("💬 [GENERATE-DM] Message length:", generatedDM.message.length)
    console.log("💬 [GENERATE-DM] Follow-up length:", generatedDM.followUp.length)
    
    return {
      isSuccess: true,
      message: "DM generated successfully",
      data: generatedDM
    }
  } catch (error) {
    console.error("💬 [GENERATE-DM] ❌ Error generating DM:", error)
    return { isSuccess: false, message: "Failed to generate DM" }
  }
}

// Generate DM from template
export async function generateDMFromTemplateAction(
  template: string,
  variables: Record<string, string>
): Promise<ActionState<string>> {
  console.log("📝 [GENERATE-DM-TEMPLATE] Processing template...")
  console.log("📝 [GENERATE-DM-TEMPLATE] Variables:", Object.keys(variables))
  
  try {
    let processedMessage = template
    
    // Replace all variables in the template
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      processedMessage = processedMessage.replace(regex, value)
    }
    
    console.log("📝 [GENERATE-DM-TEMPLATE] ✅ Template processed")
    
    return {
      isSuccess: true,
      message: "Template processed successfully",
      data: processedMessage
    }
  } catch (error) {
    console.error("📝 [GENERATE-DM-TEMPLATE] ❌ Error:", error)
    return { isSuccess: false, message: "Failed to process template" }
  }
} 