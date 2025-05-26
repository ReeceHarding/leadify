"use server"

import { ActionState } from "@/types"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

interface GenerateCampaignNameData {
  keywords: string[]
  website?: string
  businessName?: string
  businessDescription?: string
}

export async function generateCampaignNameAction(
  data: GenerateCampaignNameData
): Promise<ActionState<string>> {
  console.log("🏷️ [CAMPAIGN-NAME] Generating campaign name with data:", data)

  try {
    const businessInfo = data.businessDescription 
      ? `Business Description: ${data.businessDescription}`
      : data.website 
        ? `Website: ${data.website}`
        : "No business information provided"

    const prompt = `Generate a short, catchy campaign name (max 4 words) for a Reddit lead generation campaign.

Business: ${data.businessName || "Unknown Business"}
${businessInfo}
Keywords: ${data.keywords.join(", ")}

The campaign name should:
- Be memorable and professional
- Reflect the business or keywords
- Be suitable for a marketing campaign
- Not include "Reddit" or "Lead Gen" in the name

Return ONLY the campaign name, nothing else.`

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      temperature: 0.7,
      maxTokens: 20
    })

    const campaignName = result.text.trim()
    
    // Fallback if AI returns empty or too long
    if (!campaignName || campaignName.split(" ").length > 5) {
      const fallbackName = data.businessName 
        ? `${data.businessName} Campaign`
        : `Campaign ${new Date().toLocaleDateString()}`
      
      return {
        isSuccess: true,
        message: "Generated fallback campaign name",
        data: fallbackName
      }
    }

    console.log("🏷️ [CAMPAIGN-NAME] Generated name:", campaignName)

    return {
      isSuccess: true,
      message: "Campaign name generated successfully",
      data: campaignName
    }
  } catch (error) {
    console.error("🏷️ [CAMPAIGN-NAME] Error generating name:", error)
    
    // Return a fallback name on error
    const fallbackName = data.businessName 
      ? `${data.businessName} Campaign`
      : `Campaign ${new Date().toLocaleDateString()}`
    
    return {
      isSuccess: true,
      message: "Using fallback campaign name",
      data: fallbackName
    }
  }
} 