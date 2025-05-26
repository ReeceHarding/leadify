"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  ArrowRight,
  CheckCircle,
  Globe,
  Target,
  MessageCircle
} from "lucide-react"
import ProfileStep from "./_components/profile-step"
import WebsiteStep from "./_components/website-step"
import KeywordsStep from "./_components/keywords-step"
import ConnectRedditStep from "./_components/connect-reddit-step"
import CompleteStep from "./_components/complete-step"
import {
  updateProfileAction,
  getProfileByUserIdAction
} from "@/actions/db/profiles-actions"
import { createOrganizationAction } from "@/actions/db/organizations-actions"
import { getCurrentOrganizationTokens } from "@/actions/integrations/reddit/reddit-auth-helpers"
import { SerializedOrganizationDocument } from "@/db/firestore/organizations-collections"

type OnboardingStep = "profile" | "website" | "keywords" | "reddit" | "complete"

const stepOrder: OnboardingStep[] = [
  "profile",
  "website",
  "keywords",
  "reddit",
  "complete"
]

export default function OnboardingPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("profile")
  const [onboardingData, setOnboardingData] = useState({
    profileName: "",
    profilePictureUrl: "",
    organizationName: "",
    organizationId: "",
    website: "",
    keywords: [] as string[],
    redditConnected: false
  })
  const [isLoading, setIsLoading] = useState(true)

  console.log("🔍 [ONBOARDING] Component initialized")
  console.log("🔍 [ONBOARDING] User ID:", user?.id)
  console.log("🔍 [ONBOARDING] User fullName:", user?.fullName)
  console.log("🔍 [ONBOARDING] User imageUrl:", user?.imageUrl)
  console.log("🔍 [ONBOARDING] Current onboardingData:", onboardingData)
  console.log("🔍 [ONBOARDING] isLoading:", isLoading)
  console.log("🔍 [ONBOARDING] currentStep:", currentStep)

  const checkRedditConnection = async (organizationIdToCheck: string) => {
    console.log(
      "🔍 [ONBOARDING] Checking Reddit connection status for organization:",
      organizationIdToCheck
    )
    if (!organizationIdToCheck) {
      console.warn(
        "🔍 [ONBOARDING] No organizationId provided to checkRedditConnection"
      )
      return false
    }
    try {
      const tokenResult = await getCurrentOrganizationTokens(
        organizationIdToCheck
      )
      const isConnected =
        tokenResult.isSuccess && !!tokenResult.data.accessToken
      console.log(
        `🔍 [ONBOARDING] Reddit connection status for org ${organizationIdToCheck}:`,
        isConnected
      )
      return isConnected
    } catch (error) {
      console.error(
        `🔍 [ONBOARDING] Error checking Reddit connection for org ${organizationIdToCheck}:`,
        error
      )
      return false
    }
  }

  useEffect(() => {
    if (!isLoaded || !user?.id) return

    const loadData = async () => {
      setIsLoading(true)
      try {
        const profileResult = await getProfileByUserIdAction(user.id)
        let initialOrganizationName = `${user.fullName || "My"} Organization`
        let initialWebsite = ""
        let initialKeywords: string[] = []
        let isRedditConnectedForCurrentOrg = false
        let currentOrgId = onboardingData.organizationId // Persist if already set by a previous step

        if (profileResult.isSuccess && profileResult.data) {
          const profile = profileResult.data
          setOnboardingData(prev => ({
            ...prev,
            profileName: profile.name || user.fullName || "",
            profilePictureUrl: profile.profilePictureUrl || user.imageUrl || ""
          }))
          // Note: profile.website and profile.keywords are legacy and removed.
          // We use a default org name based on profile/user name if no org is yet created/focused.
          initialOrganizationName =
            profile.name || user.fullName || initialOrganizationName
        }

        // Here, you might add logic to load an *existing* default/first organization for the user
        // if they are returning to onboarding. For now, we assume a new/default setup.
        // If an org ID is already in state (e.g. from previous step), use it.
        if (currentOrgId) {
          const orgRedditStatus = await checkRedditConnection(currentOrgId)
          isRedditConnectedForCurrentOrg = orgRedditStatus
        } else {
          // If no org ID yet, it will be created after the profile step.
          // Set default organization name if not already set (e.g. by website step)
          if (!onboardingData.organizationName) {
            initialOrganizationName =
              onboardingData.profileName || initialOrganizationName
          }
        }

        setOnboardingData(prev => ({
          ...prev,
          organizationName: prev.organizationName || initialOrganizationName,
          // website & keywords will be set by their respective steps
          // organizationId will be set after profile step or if loaded
          redditConnected: isRedditConnectedForCurrentOrg
        }))

        if (
          profileResult.data?.onboardingCompleted &&
          currentOrgId &&
          isRedditConnectedForCurrentOrg
        ) {
          router.push("/reddit/lead-finder")
        } else {
          // Stay on current step or default to profile. CurrentStep is already managed.
        }
      } catch (error) {
        console.error("🔍 [ONBOARDING] Error loading initial data:", error)
        setOnboardingData(prev => ({
          ...prev,
          profileName: user.fullName || "",
          profilePictureUrl: user.imageUrl || "",
          organizationName: `${user.fullName || "My"} Organization` // Default if everything fails
        }))
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user?.id, isLoaded, router]) // onboardingData removed from deps for now

  const currentStepIndex = stepOrder.indexOf(currentStep)
  const progress = ((currentStepIndex + 1) / stepOrder.length) * 100

  // Handle Reddit OAuth callback
  useEffect(() => {
    const success = searchParams.get("success")
    const error = searchParams.get("error")

    if (!user?.id || isLoading || !onboardingData.organizationId) {
      return
    }

    if (success === "Reddit authentication successful") {
      const handleRedditSuccess = async () => {
        const isRedditConnected = await checkRedditConnection(
          onboardingData.organizationId
        )
        if (isRedditConnected) {
          setOnboardingData(prev => ({ ...prev, redditConnected: true }))
          setCurrentStep("complete")
        } else {
          console.error(
            "🔍 [ONBOARDING] Reddit connection verification failed after callback"
          )
        }
        const url = new URL(window.location.href)
        url.searchParams.delete("success")
        window.history.replaceState({}, "", url.toString())
      }
      handleRedditSuccess()
    }

    if (error) {
      console.error("🔍 [ONBOARDING] Reddit authentication error:", error)
      const url = new URL(window.location.href)
      url.searchParams.delete("error")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams, user?.id, isLoading, onboardingData.organizationId])

  const nextStep = async () => {
    if (currentStep === "profile") {
      // After profile step, ensure an organization is created
      if (!onboardingData.organizationId && user?.id) {
        const orgName =
          onboardingData.organizationName ||
          onboardingData.profileName ||
          `${user.fullName || "User"}\'s Organization`
        const orgResult = await createOrganizationAction({
          ownerId: user.id,
          name: orgName,
          website: onboardingData.website // Website collected in a later step, but can be set if available
          // businessDescription can be added later
        })
        if (orgResult.isSuccess && orgResult.data) {
          setOnboardingData(prev => ({
            ...prev,
            organizationId: orgResult.data.id,
            organizationName: orgResult.data.name // Ensure org name is updated from created org
          }))
        } else {
          console.error("Failed to create organization during onboarding")
          // Handle error - perhaps show a toast
          return
        }
      }
    }

    // Save user profile (not org specific data here, that's handled by org actions)
    await saveProfileProgress()

    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1])
    }
  }

  const previousStep = () => {
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1])
    }
  }

  const updateData = (
    data: Partial<typeof onboardingData>,
    autoSaveProfile: boolean = false
  ) => {
    setOnboardingData(prev => ({ ...prev, ...data }))
    if (autoSaveProfile) {
      saveProfileProgress({ ...onboardingData, ...data })
    }
  }

  const saveProfileProgress = async (
    dataToSave?: Partial<typeof onboardingData>
  ) => {
    if (!user?.id) return
    const currentData = dataToSave || onboardingData
    try {
      await updateProfileAction(user.id, {
        name: currentData.profileName,
        profilePictureUrl: currentData.profilePictureUrl,
        // website and keywords are now org-specific
        onboardingCompleted: false // Not fully completed until the end
      })
      console.log("✅ [ONBOARDING] Profile progress saved.")
    } catch (error) {
      console.error("❌ [ONBOARDING] Error saving profile progress:", error)
    }
  }

  const completeOnboarding = async () => {
    if (!user?.id || !onboardingData.organizationId) {
      console.error(
        "🔍 [ONBOARDING] No user ID or organizationId found for completing onboarding"
      )
      return
    }

    const hasRequiredData = !!(
      onboardingData.organizationName &&
      onboardingData.website &&
      onboardingData.keywords &&
      onboardingData.keywords.length > 0 &&
      onboardingData.redditConnected === true
    )

    if (!hasRequiredData) {
      console.error(
        "🔍 [ONBOARDING] Cannot complete onboarding - missing required data for organization/campaign"
      )
      return
    }

    try {
      // Update the user's profile as onboarding completed
      await updateProfileAction(user.id, {
        name: onboardingData.profileName,
        profilePictureUrl: onboardingData.profilePictureUrl,
        onboardingCompleted: true
      })
      console.log(
        "✅ [ONBOARDING] User profile marked as onboarding completed."
      )

      // Update the organization with final details (website, business description if collected)
      // This assumes these might have been collected or refined in later steps.
      // For simplicity, we use what's in onboardingData. This might need updating OrganizationAction.
      const { updateOrganizationAction } = await import(
        "@/actions/db/organizations-actions"
      )
      await updateOrganizationAction(onboardingData.organizationId, {
        name: onboardingData.organizationName,
        website: onboardingData.website
        // businessDescription: onboardingData.businessDescription, // If collected
      })
      console.log("✅ [ONBOARDING] Organization details updated.")

      // Create the first Lead Search (Campaign)
      const { generateCampaignNameAction } = await import(
        "@/actions/lead-generation/campaign-name-actions"
      )
      const nameResult = await generateCampaignNameAction({
        keywords: onboardingData.keywords,
        website: onboardingData.website,
        businessName: onboardingData.organizationName
      })
      const campaignName = nameResult.isSuccess
        ? nameResult.data
        : `${onboardingData.organizationName} Lead Search`

      const { createCampaignAction } = await import(
        "@/actions/db/campaign-actions"
      )
      await createCampaignAction({
        userId: user.id, // Still associate with user for ownership/filtering if needed
        organizationId: onboardingData.organizationId,
        name: campaignName,
        keywords: onboardingData.keywords
        // website and businessDescription are now part of the organization
      })
      console.log("✅ [ONBOARDING] First Lead Search (Campaign) created.")

      router.push("/reddit/lead-finder")
    } catch (error) {
      console.error("❌ [ONBOARDING] Error completing onboarding:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    )
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "profile":
        return (
          <ProfileStep
            data={{
              name: onboardingData.profileName,
              profilePictureUrl: onboardingData.profilePictureUrl
            }}
            onUpdate={d =>
              updateData(
                { profileName: d.name, profilePictureUrl: d.profilePictureUrl },
                true
              )
            }
            onNext={nextStep}
          />
        )
      case "website":
        return (
          <WebsiteStep
            data={{
              website: onboardingData.website,
              businessName: onboardingData.organizationName
            }}
            onUpdate={d =>
              updateData({
                website: d.website,
                organizationName:
                  d.businessName || onboardingData.organizationName
              })
            }
            onNext={nextStep}
            onPrevious={previousStep}
          />
        )
      case "keywords":
        return (
          <KeywordsStep
            data={{
              keywords: onboardingData.keywords,
              website: onboardingData.website,
              businessDescription: onboardingData.organizationName
            }}
            onUpdate={d => updateData({ keywords: d.keywords })}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        )
      case "reddit":
        return (
          <ConnectRedditStep
            data={{
              // Pass context data; profilePictureUrl is removed as it's not org-specific
              name: onboardingData.organizationName,
              website: onboardingData.website,
              keywords: onboardingData.keywords,
              redditConnected: onboardingData.redditConnected
            }}
            onUpdate={d => updateData({ redditConnected: d.redditConnected })}
            onNext={nextStep}
            onPrevious={previousStep}
            organizationId={onboardingData.organizationId} // Pass the current orgId
          />
        )
      case "complete":
        return (
          <CompleteStep
            profileName={onboardingData.profileName}
            organizationName={onboardingData.organizationName}
            website={onboardingData.website}
            keywords={onboardingData.keywords}
            redditConnected={onboardingData.redditConnected}
            onComplete={completeOnboarding}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center p-4">
      <div className="w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold">
            Welcome to Leadify! Let's get you set up.
          </h1>
          <p className="text-muted-foreground mt-2 text-center">
            Follow these simple steps to configure your first lead generation
            agent.
          </p>
        </div>

        <Progress value={progress} className="w-full" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {renderCurrentStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
