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
  const { userId } = await auth()
  if (!userId) return <div className="text-destructive">Not authenticated</div>

  // Get user profile to check keywords
  const profileResult = await getProfileByUserIdAction(userId)
  if (!profileResult.isSuccess || !profileResult.data) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please complete your profile setup first.
        </AlertDescription>
      </Alert>
    )
  }

  const profile = profileResult.data
  const hasKeywords = profile.keywords && profile.keywords.length > 0

  if (!hasKeywords) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <Alert>
          <AlertCircle className="h-4 w-4" />
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
  const campaignsResult = await getCampaignsByUserIdAction(userId)
  const campaigns = campaignsResult.isSuccess ? campaignsResult.data : []
  
  let current = campaigns.length > 0 ? campaigns[0] : null

  // If no campaign exists, create one automatically
  if (!current && hasKeywords) {
    console.log("🔥 [CAMPAIGN-SELECTOR] No campaign found, creating one automatically")
    const createResult = await createCampaignAction({
      userId,
      keywords: profile.keywords || [],
      name: profile.name || "Untitled Campaign",
      website: profile.website || ""
    })

    if (createResult.isSuccess && createResult.data) {
      current = createResult.data
    }
  }

  if (!current) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to create campaign. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Active Campaign
          </h3>
          <p className="text-sm text-muted-foreground">
            Keywords: {current.keywords?.join(", ") || "None"}
          </p>
        </div>
        <StartLeadGeneration campaignId={current.id} />
      </div>
      
      <Suspense
        fallback={
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        }
      >
        <LeadsStream campaignId={current.id} />
      </Suspense>
    </div>
  )
} 