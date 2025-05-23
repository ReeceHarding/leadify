"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Progress } from "@/components/ui/progress"
import ProfileStep from "./_components/profile-step"
import WebsiteStep from "./_components/website-step"
import KeywordsStep from "./_components/keywords-step"
import ConnectRedditStep from "./_components/connect-reddit-step"
import CompleteStep from "./_components/complete-step"
import {
  updateProfileAction,
  getProfileByUserIdAction
} from "@/actions/db/profiles-actions"
import { getRedditAccessTokenAction } from "@/actions/integrations/reddit-oauth-actions"

type OnboardingStep = "profile" | "website" | "keywords" | "reddit" | "complete"

const stepOrder: OnboardingStep[] = [
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
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("profile")
  const [onboardingData, setOnboardingData] = useState({
    name: "",
    profilePictureUrl: "",
    website: "",
    keywords: [] as string[],
    redditConnected: false
  })
  const [isLoading, setIsLoading] = useState(true)

  console.log("🔍 [ONBOARDING] Simple flow - Current step:", currentStep)
  console.log("🔍 [ONBOARDING] Simple flow - User ID:", user?.id)
  console.log(
    "🔍 [ONBOARDING] Simple flow - Keywords count:",
    onboardingData.keywords.length
  )

  // Load profile and check if we should skip onboarding
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return

      console.log("🔍 [ONBOARDING] Loading profile for user:", user.id)

      try {
        const profileResult = await getProfileByUserIdAction(user.id)

        if (profileResult.isSuccess && profileResult.data) {
          const profile = profileResult.data
          console.log(
            "🔍 [ONBOARDING] Profile loaded, keywords count:",
            profile.keywords?.length || 0
          )

          // If user has keywords, skip onboarding entirely
          if (profile.keywords && profile.keywords.length > 1) {
            console.log(
              "🔍 [ONBOARDING] User has keywords, skipping onboarding"
            )
            router.push("/reddit/lead-finder")
            return
          }

          // Set profile data
          setOnboardingData({
            name: profile.name || user.fullName || "",
            profilePictureUrl: profile.profilePictureUrl || user.imageUrl || "",
            website: profile.website || "",
            keywords: profile.keywords || [],
            redditConnected: false
          })

          // Check Reddit connection
          const tokenResult = await getRedditAccessTokenAction()
          if (tokenResult.isSuccess) {
            setOnboardingData(prev => ({ ...prev, redditConnected: true }))
          }
        } else {
          // New user, set defaults from Clerk
          setOnboardingData({
            name: user.fullName || "",
            profilePictureUrl: user.imageUrl || "",
            website: "",
            keywords: [],
            redditConnected: false
          })
        }
      } catch (error) {
        console.error("🔍 [ONBOARDING] Error loading profile:", error)
        setOnboardingData({
          name: user.fullName || "",
          profilePictureUrl: user.imageUrl || "",
          website: "",
          keywords: [],
          redditConnected: false
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [user?.id, router])

  // Handle Reddit OAuth callback
  useEffect(() => {
    const success = searchParams.get("success")
    if (success === "Reddit authentication successful") {
      console.log("🔍 [ONBOARDING] Reddit auth successful")
      setOnboardingData(prev => ({ ...prev, redditConnected: true }))

      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete("success")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams])

  const nextStep = async () => {
    console.log("🔍 [ONBOARDING] Moving to next step from:", currentStep)

    // Save current progress
    if (user?.id) {
      await updateProfileAction(user.id, {
        name: onboardingData.name,
        profilePictureUrl: onboardingData.profilePictureUrl,
        website: onboardingData.website,
        keywords: onboardingData.keywords,
        onboardingCompleted: false
      })
    }

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

  const updateData = (data: Partial<typeof onboardingData>) => {
    console.log("🔍 [ONBOARDING] Updating data:", data)
    setOnboardingData(prev => ({ ...prev, ...data }))
  }

  const completeOnboarding = async () => {
    console.log("🔍 [ONBOARDING] Completing onboarding")

    if (!user?.id) return

    try {
      await updateProfileAction(user.id, {
        name: onboardingData.name,
        profilePictureUrl: onboardingData.profilePictureUrl,
        website: onboardingData.website,
        keywords: onboardingData.keywords,
        onboardingCompleted: true
      })

      console.log(
        "🔍 [ONBOARDING] Onboarding completed, redirecting to lead finder"
      )
      router.push("/reddit/lead-finder")
    } catch (error) {
      console.error("🔍 [ONBOARDING] Error completing onboarding:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-12">
        <div className="flex flex-col items-center space-y-4 py-12">
          <div className="size-8 animate-spin rounded-full border-2 border-gray-600 border-t-blue-600" />
          <p className="text-gray-400">Loading your profile...</p>
        </div>
      </div>
    )
  }

  const currentStepIndex = stepOrder.indexOf(currentStep)
  const progress = ((currentStepIndex + 1) / stepOrder.length) * 100

  const renderCurrentStep = () => {
    switch (currentStep) {
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

  return (
    <div className="mx-auto w-full max-w-lg space-y-12">
      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm text-gray-400">
          <span>Setup Progress</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-800">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

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

      {/* Step Indicators */}
      <div className="flex justify-center space-x-2">
        {stepOrder.map((step, index) => (
          <div
            key={step}
            className={`size-2 rounded-full transition-colors ${
              index <= currentStepIndex ? "bg-blue-600" : "bg-gray-600"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
