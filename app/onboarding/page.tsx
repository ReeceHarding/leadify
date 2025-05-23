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

type OnboardingStep =
  | "welcome"
  | "profile"
  | "website"
  | "keywords"
  | "reddit"
  | "complete"

const stepOrder: OnboardingStep[] = [
  "welcome",
  "profile",
  "website",
  "keywords",
  "reddit",
  "complete"
]

export default function OnboardingPage() {
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome")
  const [onboardingData, setOnboardingData] = useState({
    name: "",
    profilePictureUrl: "",
    website: "",
    keywords: [] as string[],
    redditConnected: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false)
  const [onboardingStarted, setOnboardingStarted] = useState(false)

  console.log("🔍 [ONBOARDING] Component initialized")
  console.log("🔍 [ONBOARDING] User ID:", user?.id)
  console.log("🔍 [ONBOARDING] User fullName:", user?.fullName)
  console.log("🔍 [ONBOARDING] User imageUrl:", user?.imageUrl)
  console.log("🔍 [ONBOARDING] Initial onboardingData:", onboardingData)
  console.log("🔍 [ONBOARDING] isLoading:", isLoading)
  console.log("🔍 [ONBOARDING] hasLoadedProfile:", hasLoadedProfile)
  console.log("🔍 [ONBOARDING] onboardingStarted:", onboardingStarted)
  console.log("🔍 [ONBOARDING] currentStep:", currentStep)

  // Load existing profile data when user is available
  useEffect(() => {
    console.log("🔍 [ONBOARDING] useEffect for loading profile triggered")
    console.log("🔍 [ONBOARDING] user?.id:", user?.id)
    console.log("🔍 [ONBOARDING] hasLoadedProfile:", hasLoadedProfile)
    console.log("🔍 [ONBOARDING] isLoading:", isLoading)

    const loadExistingProfile = async () => {
      if (!user?.id || hasLoadedProfile) {
        console.log(
          "🔍 [ONBOARDING] Skipping profile load - no user ID or already loaded"
        )
        if (!user?.id) {
          console.log("🔍 [ONBOARDING] No user ID, setting isLoading to false")
          setIsLoading(false)
        }
        return
      }

      console.log("🔍 [ONBOARDING] Loading existing profile for user:", user.id)
      setIsLoading(true)

      try {
        const profileResult = await getProfileByUserIdAction(user.id)
        console.log("🔍 [ONBOARDING] Profile load result:", profileResult)
        console.log(
          "🔍 [ONBOARDING] Profile load success:",
          profileResult.isSuccess
        )

        if (profileResult.isSuccess && profileResult.data) {
          console.log("🔍 [ONBOARDING] Profile loaded successfully")
          console.log("🔍 [ONBOARDING] Profile data:", profileResult.data)
          console.log(
            "🔍 [ONBOARDING] Profile onboardingCompleted:",
            profileResult.data.onboardingCompleted
          )
          console.log(
            "🔍 [ONBOARDING] Profile keywords:",
            profileResult.data.keywords
          )
          console.log(
            "🔍 [ONBOARDING] Profile keywords length:",
            profileResult.data.keywords?.length || 0
          )
          console.log("🔍 [ONBOARDING] Profile name:", profileResult.data.name)
          console.log(
            "🔍 [ONBOARDING] Profile website:",
            profileResult.data.website
          )

          // Update onboarding data with existing profile data
          const loadedData = {
            name: profileResult.data.name || user.fullName || "",
            profilePictureUrl:
              profileResult.data.profilePictureUrl || user.imageUrl || "",
            website: profileResult.data.website || "",
            keywords: profileResult.data.keywords || [],
            redditConnected: false // Will be determined by checking Reddit tokens
          }

          console.log(
            "🔍 [ONBOARDING] Setting onboarding data to loaded profile:"
          )
          console.log("🔍 [ONBOARDING] - name:", loadedData.name)
          console.log(
            "🔍 [ONBOARDING] - profilePictureUrl:",
            loadedData.profilePictureUrl
          )
          console.log("🔍 [ONBOARDING] - website:", loadedData.website)
          console.log("🔍 [ONBOARDING] - keywords:", loadedData.keywords)
          console.log(
            "🔍 [ONBOARDING] - keywords length:",
            loadedData.keywords.length
          )
          console.log(
            "🔍 [ONBOARDING] - redditConnected:",
            loadedData.redditConnected
          )

          setOnboardingData(loadedData)

          // Determine which step to start on based on existing data
          if (profileResult.data.onboardingCompleted) {
            console.log(
              "🔍 [ONBOARDING] Onboarding marked as completed, checking data completeness..."
            )

            // Verify that all required data is actually present
            const hasCompleteData =
              profileResult.data.name &&
              profileResult.data.name !== "" &&
              profileResult.data.website &&
              profileResult.data.website !== "" &&
              profileResult.data.keywords &&
              profileResult.data.keywords.length > 0

            console.log("🔍 [ONBOARDING] Data completeness check:")
            console.log(
              "🔍 [ONBOARDING] - name present:",
              !!(profileResult.data.name && profileResult.data.name !== "")
            )
            console.log(
              "🔍 [ONBOARDING] - website present:",
              !!(
                profileResult.data.website && profileResult.data.website !== ""
              )
            )
            console.log(
              "🔍 [ONBOARDING] - keywords present:",
              !!(
                profileResult.data.keywords &&
                profileResult.data.keywords.length > 0
              )
            )
            console.log("🔍 [ONBOARDING] - hasCompleteData:", hasCompleteData)

            if (hasCompleteData) {
              console.log(
                "🔍 [ONBOARDING] Data is complete, redirecting to lead finder"
              )
              router.push("/reddit/lead-finder")
              return
            } else {
              console.log(
                "🔍 [ONBOARDING] Onboarding marked complete but data is incomplete, continuing onboarding flow"
              )
              // Continue with normal onboarding flow to fill missing data
            }
          } else {
            // Check if user has started onboarding (has any data beyond defaults)
            const hasStartedOnboarding =
              (profileResult.data.name && profileResult.data.name !== "") ||
              (profileResult.data.website &&
                profileResult.data.website !== "") ||
              (profileResult.data.keywords &&
                profileResult.data.keywords.length > 0)

            console.log(
              "🔍 [ONBOARDING] Has started onboarding:",
              hasStartedOnboarding
            )
            console.log(
              "🔍 [ONBOARDING] Name exists:",
              !!(profileResult.data.name && profileResult.data.name !== "")
            )
            console.log(
              "🔍 [ONBOARDING] Website exists:",
              !!(
                profileResult.data.website && profileResult.data.website !== ""
              )
            )
            console.log(
              "🔍 [ONBOARDING] Keywords exist:",
              !!(
                profileResult.data.keywords &&
                profileResult.data.keywords.length > 0
              )
            )

            if (!hasStartedOnboarding) {
              console.log(
                "🔍 [ONBOARDING] User hasn't started onboarding, showing welcome screen"
              )
              setCurrentStep("welcome")
              setOnboardingStarted(false)
            } else {
              console.log(
                "🔍 [ONBOARDING] User has started onboarding, determining step"
              )
              setOnboardingStarted(true)
              // Determine step based on completed data
              if (loadedData.keywords.length > 0) {
                console.log(
                  "🔍 [ONBOARDING] Keywords exist, starting on reddit step"
                )
                setCurrentStep("reddit")
              } else if (loadedData.website) {
                console.log(
                  "🔍 [ONBOARDING] Website exists, starting on keywords step"
                )
                setCurrentStep("keywords")
              } else if (loadedData.name) {
                console.log(
                  "🔍 [ONBOARDING] Name exists, starting on website step"
                )
                setCurrentStep("website")
              } else {
                console.log("🔍 [ONBOARDING] Starting from profile step")
                setCurrentStep("profile")
              }
            }
          }
        } else {
          console.log(
            "🔍 [ONBOARDING] No existing profile found or failed to load"
          )
          console.log(
            "🔍 [ONBOARDING] Setting default data from Clerk user and showing welcome"
          )
          // Set default data from Clerk user
          setOnboardingData({
            name: user.fullName || "",
            profilePictureUrl: user.imageUrl || "",
            website: "",
            keywords: [],
            redditConnected: false
          })
          setCurrentStep("welcome")
          setOnboardingStarted(false)
        }
      } catch (error) {
        console.error("🔍 [ONBOARDING] Error loading profile:", error)
        // Set default data from Clerk user on error
        setOnboardingData({
          name: user.fullName || "",
          profilePictureUrl: user.imageUrl || "",
          website: "",
          keywords: [],
          redditConnected: false
        })
        setCurrentStep("welcome")
        setOnboardingStarted(false)
      } finally {
        setIsLoading(false)
        setHasLoadedProfile(true)
        console.log("🔍 [ONBOARDING] Profile loading completed")
        console.log("🔍 [ONBOARDING] Final currentStep:", currentStep)
        console.log(
          "🔍 [ONBOARDING] Final onboardingStarted:",
          onboardingStarted
        )
      }
    }

    loadExistingProfile()
  }, [user?.id, hasLoadedProfile, router])

  const currentStepIndex = stepOrder.indexOf(currentStep)
  const progress = ((currentStepIndex + 1) / stepOrder.length) * 100

  console.log("🔍 [ONBOARDING] Current step index:", currentStepIndex)
  console.log("🔍 [ONBOARDING] Progress:", progress)

  // Handle Reddit OAuth callback
  useEffect(() => {
    console.log("🔍 [ONBOARDING] useEffect for Reddit OAuth callback triggered")
    const success = searchParams.get("success")
    const error = searchParams.get("error")

    console.log(
      "🔍 [ONBOARDING] URL params - success:",
      success,
      "error:",
      error
    )

    if (success === "Reddit authentication successful") {
      console.log("🔍 [ONBOARDING] Reddit auth successful, updating state")
      console.log(
        "🔍 [ONBOARDING] Current onboardingData before Reddit update:",
        onboardingData
      )

      // Update Reddit connection status and advance to next step
      setOnboardingData(prev => {
        const updated = { ...prev, redditConnected: true }
        console.log(
          "🔍 [ONBOARDING] Updated onboardingData after Reddit connect:",
          updated
        )
        return updated
      })
      setCurrentStep("complete")
      console.log("🔍 [ONBOARDING] Advanced to complete step")

      // Clean up URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete("success")
      window.history.replaceState({}, "", url.toString())
    }

    if (error) {
      // Handle error if needed
      console.error("🔍 [ONBOARDING] Reddit authentication error:", error)

      // Clean up URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete("error")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams])

  const startOnboarding = () => {
    console.log("🔍 [ONBOARDING] startOnboarding() called")
    console.log("🔍 [ONBOARDING] Setting onboardingStarted to true")
    console.log("🔍 [ONBOARDING] Moving to profile step")

    setOnboardingStarted(true)
    setCurrentStep("profile")

    console.log("🔍 [ONBOARDING] Onboarding started successfully")
  }

  const nextStep = () => {
    console.log("🔍 [ONBOARDING] nextStep() called")
    console.log("🔍 [ONBOARDING] Current step:", currentStep)
    console.log("🔍 [ONBOARDING] Current onboardingData:", onboardingData)

    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex < stepOrder.length - 1) {
      const nextStepName = stepOrder[currentIndex + 1]
      console.log("🔍 [ONBOARDING] Moving to next step:", nextStepName)
      setCurrentStep(nextStepName)
    }
  }

  const previousStep = () => {
    console.log("🔍 [ONBOARDING] previousStep() called")
    console.log("🔍 [ONBOARDING] Current step:", currentStep)

    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 1) {
      // Changed from 0 to 1 to prevent going back to welcome
      const prevStepName = stepOrder[currentIndex - 1]
      console.log("🔍 [ONBOARDING] Moving to previous step:", prevStepName)
      setCurrentStep(prevStepName)
    } else {
      console.log(
        "🔍 [ONBOARDING] Cannot go back further (at beginning of onboarding)"
      )
    }
  }

  const updateData = (data: Partial<typeof onboardingData>) => {
    console.log("🔍 [ONBOARDING] updateData() called with:", data)
    console.log(
      "🔍 [ONBOARDING] Current onboardingData before update:",
      onboardingData
    )

    // Log specific updates
    Object.keys(data).forEach(key => {
      console.log(
        `🔍 [ONBOARDING] Updating ${key}:`,
        data[key as keyof typeof data]
      )
      if (key === "keywords") {
        const keywords = data[key as keyof typeof data] as string[]
        console.log(
          `🔍 [ONBOARDING] Keywords array length:`,
          keywords?.length || 0
        )
        console.log(`🔍 [ONBOARDING] Keywords content:`, keywords)
      }
    })

    setOnboardingData(prev => {
      const updated = { ...prev, ...data }
      console.log("🔍 [ONBOARDING] Updated onboardingData:", updated)
      console.log("🔍 [ONBOARDING] Keywords specifically:", updated.keywords)
      console.log("🔍 [ONBOARDING] Keywords length:", updated.keywords.length)
      console.log(
        "🔍 [ONBOARDING] Keywords stringified:",
        JSON.stringify(updated.keywords)
      )
      return updated
    })
  }

  const completeOnboarding = async () => {
    console.log("🔍 [ONBOARDING] completeOnboarding() called")
    console.log("🔍 [ONBOARDING] Final onboardingData:", onboardingData)
    console.log("🔍 [ONBOARDING] Final keywords:", onboardingData.keywords)
    console.log(
      "🔍 [ONBOARDING] Final keywords length:",
      onboardingData.keywords.length
    )
    console.log(
      "🔍 [ONBOARDING] Final keywords stringified:",
      JSON.stringify(onboardingData.keywords)
    )

    if (!user?.id) {
      console.error("🔍 [ONBOARDING] No user ID found")
      return
    }

    // Validate that all required data is present before completing
    const hasRequiredData =
      onboardingData.name &&
      onboardingData.name !== "" &&
      onboardingData.website &&
      onboardingData.website !== "" &&
      onboardingData.keywords &&
      onboardingData.keywords.length > 0

    console.log("🔍 [ONBOARDING] Pre-completion validation:")
    console.log(
      "🔍 [ONBOARDING] - name valid:",
      !!(onboardingData.name && onboardingData.name !== "")
    )
    console.log(
      "🔍 [ONBOARDING] - website valid:",
      !!(onboardingData.website && onboardingData.website !== "")
    )
    console.log(
      "🔍 [ONBOARDING] - keywords valid:",
      !!(onboardingData.keywords && onboardingData.keywords.length > 0)
    )
    console.log("🔍 [ONBOARDING] - hasRequiredData:", hasRequiredData)

    if (!hasRequiredData) {
      console.error(
        "🔍 [ONBOARDING] Cannot complete onboarding - missing required data"
      )
      console.error("🔍 [ONBOARDING] Missing data details:")
      if (!onboardingData.name) console.error("🔍 [ONBOARDING] - Missing name")
      if (!onboardingData.website)
        console.error("🔍 [ONBOARDING] - Missing website")
      if (!onboardingData.keywords || onboardingData.keywords.length === 0)
        console.error("🔍 [ONBOARDING] - Missing keywords")
      return
    }

    try {
      console.log(
        "🔍 [ONBOARDING] Calling updateProfileAction with user ID:",
        user.id
      )

      const updatePayload = {
        name: onboardingData.name,
        profilePictureUrl: onboardingData.profilePictureUrl,
        website: onboardingData.website,
        keywords: onboardingData.keywords,
        onboardingCompleted: true
      }

      console.log("🔍 [ONBOARDING] Profile data being saved:", updatePayload)
      console.log(
        "🔍 [ONBOARDING] Keywords being saved:",
        updatePayload.keywords
      )
      console.log(
        "🔍 [ONBOARDING] Keywords being saved (stringified):",
        JSON.stringify(updatePayload.keywords)
      )

      const profileResult = await updateProfileAction(user.id, updatePayload)

      console.log("🔍 [ONBOARDING] Profile update result:", profileResult)

      if (!profileResult.isSuccess) {
        console.error(
          "🔍 [ONBOARDING] Profile update failed:",
          profileResult.message
        )
        throw new Error("Failed to update profile")
      }

      console.log("🔍 [ONBOARDING] Profile updated successfully")
      console.log("🔍 [ONBOARDING] Updated profile data:", profileResult.data)

      // Redirect to lead finder - keywords will be retrieved from profile
      const redirectUrl = `/reddit/lead-finder`

      console.log(
        "🔍 [ONBOARDING] Keywords saved to profile:",
        onboardingData.keywords
      )
      console.log("🔍 [ONBOARDING] Redirect URL:", redirectUrl)

      router.push(redirectUrl)
    } catch (error) {
      console.error("🔍 [ONBOARDING] Error completing onboarding:", error)
    }
  }

  // Welcome screen component
  const WelcomeStep = () => {
    console.log("🔍 [ONBOARDING] Rendering WelcomeStep")

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="space-y-8 text-center"
      >
        <div className="space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600">
            <Target className="size-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome to Leadify</h1>
          <p className="text-lg leading-relaxed text-gray-400">
            Let's set up your account to start finding high-quality leads on
            Reddit. This will only take a few minutes.
          </p>
        </div>

        <div className="grid gap-6 text-left">
          <div className="flex items-start space-x-4">
            <div className="mt-1 flex size-8 items-center justify-center rounded-full bg-gray-800">
              <CheckCircle className="size-4 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Profile Setup</h3>
              <p className="text-sm text-gray-400">
                Add your name and profile picture to personalize your experience
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="mt-1 flex size-8 items-center justify-center rounded-full bg-gray-800">
              <Globe className="size-4 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Website Analysis</h3>
              <p className="text-sm text-gray-400">
                Connect your website so we can understand your business better
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="mt-1 flex size-8 items-center justify-center rounded-full bg-gray-800">
              <Target className="size-4 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Keyword Generation</h3>
              <p className="text-sm text-gray-400">
                AI-powered keyword generation to find your ideal customers
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="mt-1 flex size-8 items-center justify-center rounded-full bg-gray-800">
              <MessageCircle className="size-4 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Reddit Connection</h3>
              <p className="text-sm text-gray-400">
                Connect your Reddit account to start engaging with leads
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={startOnboarding}
            className="w-full rounded-lg bg-blue-600 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700"
          >
            Start Onboarding
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </motion.div>
    )
  }

  const renderCurrentStep = () => {
    console.log(
      "🔍 [ONBOARDING] renderCurrentStep() called for step:",
      currentStep
    )
    console.log(
      "🔍 [ONBOARDING] Current onboardingData in render:",
      onboardingData
    )
    console.log(
      "🔍 [ONBOARDING] Current keywords in render:",
      onboardingData.keywords
    )
    console.log(
      "🔍 [ONBOARDING] Current keywords length in render:",
      onboardingData.keywords.length
    )

    switch (currentStep) {
      case "welcome":
        return <WelcomeStep />
      case "profile":
        return (
          <ProfileStep
            data={onboardingData}
            onUpdate={updateData}
            onNext={nextStep}
          />
        )
      case "website":
        return (
          <WebsiteStep
            data={onboardingData}
            onUpdate={updateData}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        )
      case "keywords":
        return (
          <KeywordsStep
            data={onboardingData}
            onUpdate={updateData}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        )
      case "reddit":
        return (
          <ConnectRedditStep
            data={onboardingData}
            onUpdate={updateData}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        )
      case "complete":
        return (
          <CompleteStep
            data={onboardingData}
            onComplete={completeOnboarding}
            onPrevious={previousStep}
          />
        )
      default:
        return null
    }
  }

  // Show loading state while loading profile
  if (isLoading) {
    console.log("🔍 [ONBOARDING] Rendering loading state")
    return (
      <div className="mx-auto w-full max-w-lg space-y-12">
        <div className="flex flex-col items-center space-y-4 py-12">
          <div className="relative">
            <div className="size-8 animate-spin rounded-full border-2 border-gray-600 border-t-blue-600" />
          </div>
          <p className="text-gray-400">Loading your profile...</p>
        </div>
      </div>
    )
  }

  console.log("🔍 [ONBOARDING] Rendering main component")
  console.log("🔍 [ONBOARDING] Final render onboardingData:", onboardingData)
  console.log("🔍 [ONBOARDING] Final render keywords:", onboardingData.keywords)
  console.log("🔍 [ONBOARDING] Final render currentStep:", currentStep)
  console.log(
    "🔍 [ONBOARDING] Final render onboardingStarted:",
    onboardingStarted
  )

  return (
    <div className="mx-auto w-full max-w-lg space-y-12">
      {/* Progress Bar - only show if onboarding has started */}
      {onboardingStarted && currentStep !== "welcome" && (
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Setup Progress</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderCurrentStep()}
        </motion.div>
      </AnimatePresence>

      {/* Step Indicators - only show if onboarding has started */}
      {onboardingStarted && currentStep !== "welcome" && (
        <div className="flex justify-center space-x-2">
          {stepOrder.slice(1).map(
            (
              step,
              index // Skip welcome step in indicators
            ) => (
              <div
                key={step}
                className={`size-2 rounded-full transition-colors ${
                  index + 1 <= currentStepIndex ? "bg-blue-600" : "bg-gray-600"
                }`}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}
