"use server"

import LeadsStream from "./leads-stream"
import StartLeadGeneration from "./start-lead-generation"
import { auth } from "@clerk/nextjs/server"
import {
  getCampaignsByOrganizationIdAction,
  createCampaignAction
} from "@/actions/db/campaign-actions"
import { getOrganizationsByUserIdAction } from "@/actions/db/organizations-actions"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Plus, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import CreateCampaignDialog from "./create-campaign-dialog"

export default async function CampaignSelector() {
  console.log(
    "🔥🔥🔥 [CAMPAIGN-SELECTOR] ========== COMPONENT START =========="
  )
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Timestamp:", new Date().toISOString())
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Starting CampaignSelector component")

  const { userId } = await auth()
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Auth check - userId:", userId)
  console.log(
    "🔥🔥🔥 [CAMPAIGN-SELECTOR] Auth complete, user authenticated:",
    !!userId
  )

  if (!userId) {
    console.log(
      "🔥🔥🔥 [CAMPAIGN-SELECTOR] ❌ No userId found, returning 'Not authenticated'"
    )
    console.log(
      "🔥🔥🔥 [CAMPAIGN-SELECTOR] ========== COMPONENT END (NO AUTH) =========="
    )
    return <div className="text-destructive">Not authenticated</div>
  }

  // Get user's organizations
  console.log(
    "🔥🔥🔥 [CAMPAIGN-SELECTOR] 🏢 Fetching organizations for userId:",
    userId
  )
  const organizationsResult = await getOrganizationsByUserIdAction(userId)
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Organizations fetch complete")
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Organizations result:", {
    isSuccess: organizationsResult.isSuccess,
    count: organizationsResult.data?.length || 0,
    message: organizationsResult.message
  })

  if (!organizationsResult.isSuccess || !organizationsResult.data || organizationsResult.data.length === 0) {
    console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] ❌ No organizations found")
    console.log(
      "🔥🔥🔥 [CAMPAIGN-SELECTOR] ========== COMPONENT END (NO ORGANIZATIONS) =========="
    )
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>
          Please create an organization first to start using campaigns.
        </AlertDescription>
      </Alert>
    )
  }

  const activeOrganization = organizationsResult.data[0] // Use first organization
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] ✅ Organization loaded successfully")
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Organization data:", {
    id: activeOrganization.id,
    name: activeOrganization.name,
    website: activeOrganization.website,
    hasWebsite: !!activeOrganization.website
  })

  // Check if organization has required setup
  if (!activeOrganization.website) {
    console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] ⚠️ Organization missing website")
    console.log(
      "🔥🔥🔥 [CAMPAIGN-SELECTOR] ========== COMPONENT END (ORGANIZATION INCOMPLETE) =========="
    )
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            Please complete your organization setup by adding a website before creating campaigns.
          </AlertDescription>
        </Alert>
        <Button asChild>
          <a href="/onboarding">Complete Organization Setup</a>
        </Button>
      </div>
    )
  }

  // Get existing campaigns for this organization
  console.log(
    "🔥🔥🔥 [CAMPAIGN-SELECTOR] 📋 Fetching campaigns for organizationId:",
    activeOrganization.id
  )
  const campaignsResult = await getCampaignsByOrganizationIdAction(activeOrganization.id)
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Campaigns fetch complete")
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Campaigns result:", {
    isSuccess: campaignsResult.isSuccess,
    count: campaignsResult.data?.length || 0,
    message: campaignsResult.message,
    campaignIds: campaignsResult.data?.map(c => c.id) || []
  })

  const campaigns = campaignsResult.isSuccess ? campaignsResult.data : []
  console.log(
    "🔥🔥🔥 [CAMPAIGN-SELECTOR] Total campaigns found:",
    campaigns.length
  )

  let current = campaigns.length > 0 ? campaigns[0] : null
  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Current campaign selected:", {
    exists: !!current,
    id: current?.id,
    name: current?.name,
    keywords: current?.keywords,
    keywordCount: current?.keywords?.length || 0,
    status: current?.status
  })

  // If no campaign exists, show the create campaign dialog
  if (!current) {
    console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] ⚠️ No campaign found")
    console.log(
      "🔥🔥🔥 [CAMPAIGN-SELECTOR] User needs to create their first campaign"
    )
    console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Showing create campaign prompt")
    console.log(
      "🔥🔥🔥 [CAMPAIGN-SELECTOR] ========== COMPONENT END (NO CAMPAIGN) =========="
    )
    return (
      <div className="space-y-4 pt-6">
        <Alert>
          <AlertCircle className="size-4" />
          <AlertDescription>
            You need to create a campaign to start finding leads. Each campaign
            can have its own specific keywords.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button asChild>
            <a href="/reddit/lead-finder">
              <Plus className="mr-2 size-4" />
              Create Your First Campaign
            </a>
          </Button>
        </div>
      </div>
    )
  }

  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] ✅ Campaign found, rendering UI")
  console.log(
    "🔥🔥🔥 [CAMPAIGN-SELECTOR] Rendering campaign UI with campaign:",
    {
      id: current.id,
      name: current.name,
      keywords: current.keywords,
      keywordCount: current.keywords?.length || 0,
      status: current.status,
      totalSearchResults: current.totalSearchResults,
      totalThreadsAnalyzed: current.totalThreadsAnalyzed,
      totalCommentsGenerated: current.totalCommentsGenerated
    }
  )

  console.log("🔥🔥🔥 [CAMPAIGN-SELECTOR] Rendering components:")
  console.log(
    "🔥🔥🔥 [CAMPAIGN-SELECTOR] - StartLeadGeneration with campaignId:",
    current.id
  )
  console.log(
    "🔥🔥🔥 [CAMPAIGN-SELECTOR] - LeadsStream with campaignId:",
    current.id
  )

  return (
    <div className="space-y-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Active Campaign: {current.name}
          </h3>
          <p className="text-muted-foreground text-sm">
            Keywords: {current.keywords?.join(", ") || "None"}
          </p>
        </div>
        <StartLeadGeneration campaignId={current.id} />
      </div>

      <Suspense
        fallback={(() => {
          console.log(
            "🔥🔥🔥 [CAMPAIGN-SELECTOR] 🔄 Showing Suspense fallback for LeadsStream"
          )
          return (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          )
        })()}
      >
        {(() => {
          console.log(
            "🔥🔥🔥 [CAMPAIGN-SELECTOR] 🎯 Rendering LeadsStream with campaignId:",
            current.id
          )
          console.log(
            "🔥🔥🔥 [CAMPAIGN-SELECTOR] ========== COMPONENT END (SUCCESS) =========="
          )
          return <LeadsStream campaignId={current.id} />
        })()}
      </Suspense>
    </div>
  )
}
