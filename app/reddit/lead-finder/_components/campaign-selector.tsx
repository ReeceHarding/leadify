"use server"

import LeadsStream from "./leads-stream"
import StartLeadGeneration from "./start-lead-generation"
import { auth } from "@clerk/nextjs/server"
import { getCampaignsByUserIdAction, createCampaignAction } from "@/actions/db/campaign-actions"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Plus, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default async function CampaignSelector() {
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Starting CampaignSelector component")
  
  const { userId } = await auth()
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Auth check - userId:", userId)
  
  if (!userId) {
    console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] No userId found, returning 'Not authenticated'")
    return <div className="text-destructive">Not authenticated</div>
  }

  // Get user profile to check keywords
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Fetching profile for userId:", userId)
  const profileResult = await getProfileByUserIdAction(userId)
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Profile result:", {
    isSuccess: profileResult.isSuccess,
    hasData: !!profileResult.data,
    message: profileResult.message
  })
  
  if (!profileResult.isSuccess || !profileResult.data) {
    console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Profile fetch failed or no data")
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>
          Please complete your profile setup first.
        </AlertDescription>
      </Alert>
    )
  }

  const profile = profileResult.data
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Profile data:", {
    name: profile.name,
    website: profile.website,
    keywordsCount: profile.keywords?.length || 0,
    keywords: profile.keywords
  })
  
  const hasKeywords = profile.keywords && profile.keywords.length > 0
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Has keywords:", hasKeywords)

  if (!hasKeywords) {
    console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] No keywords found, prompting user to complete profile")
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            You need to add keywords to your profile before creating campaigns.
          </AlertDescription>
        </Alert>
        <Button asChild>
          <a href="/onboarding">
            Complete Profile Setup
          </a>
        </Button>
      </div>
    )
  }

  // Get existing campaigns
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Fetching campaigns for userId:", userId)
  const campaignsResult = await getCampaignsByUserIdAction(userId)
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Campaigns result:", {
    isSuccess: campaignsResult.isSuccess,
    count: campaignsResult.data?.length || 0,
    message: campaignsResult.message
  })
  
  const campaigns = campaignsResult.isSuccess ? campaignsResult.data : []
  
  let current = campaigns.length > 0 ? campaigns[0] : null
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Current campaign:", {
    exists: !!current,
    id: current?.id,
    keywords: current?.keywords
  })

  // If no campaign exists, create one automatically
  if (!current && hasKeywords) {
    console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] No campaign found, creating one automatically")
    console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Creating with data:", {
      userId,
      keywords: profile.keywords,
      name: profile.name || "Untitled Campaign",
      website: profile.website || ""
    })
    
    // Generate campaign name using AI
    const { generateCampaignNameAction } = await import("@/actions/lead-generation/campaign-name-actions")
    
    const nameResult = await generateCampaignNameAction({
      keywords: profile.keywords || [],
      website: profile.website,
      businessName: profile.name
    })

    const campaignName = nameResult.isSuccess 
      ? nameResult.data 
      : profile.name || "Untitled Campaign"
    
    const createResult = await createCampaignAction({
      userId,
      keywords: profile.keywords || [],
      name: campaignName,
      website: profile.website || ""
    })
    
    console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Create campaign result:", {
      isSuccess: createResult.isSuccess,
      hasData: !!createResult.data,
      message: createResult.message,
      campaignId: createResult.data?.id
    })

    if (createResult.isSuccess && createResult.data) {
      current = createResult.data
    }
  }

  if (!current) {
    console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Failed to create or find campaign")
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>
          Failed to create campaign. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Rendering campaign UI with campaign:", {
    id: current.id,
    keywords: current.keywords
  })

  return (
    <div className="space-y-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Active Campaign
          </h3>
          <p className="text-muted-foreground text-sm">
            Keywords: {current.keywords?.join(", ") || "None"}
          </p>
        </div>
        <StartLeadGeneration campaignId={current.id} />
      </div>
      
      <Suspense
        fallback={
          (() => {
            console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Showing Suspense fallback for LeadsStream")
            return (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            )
          })()
        }
      >
        {(() => {
          console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Rendering LeadsStream with campaignId:", current.id)
          return <LeadsStream campaignId={current.id} />
        })()}
      </Suspense>
    </div>
  )
} 