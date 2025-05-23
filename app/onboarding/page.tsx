"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import ProfileStep from "./_components/profile-step"
import WebsiteStep from "./_components/website-step"
import KeywordsStep from "./_components/keywords-step"
import ConnectRedditStep from "./_components/connect-reddit-step"
import CompleteStep from "./_components/complete-step"
import { updateProfileAction } from "@/actions/db/profiles-actions"

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
    name: user?.fullName || "",
    profilePictureUrl: user?.imageUrl || "",
    website: "",
    keywords: [] as string[],
    redditConnected: false
  })

  console.log("🔍 [ONBOARDING] Component initialized")
  console.log("🔍 [ONBOARDING] Initial user:", user?.id)
  console.log("🔍 [ONBOARDING] Initial onboardingData:", onboardingData)

  const currentStepIndex = stepOrder.indexOf(currentStep)
  const progress = ((currentStepIndex + 1) / stepOrder.length) * 100

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
    if (currentIndex > 0) {
      const prevStepName = stepOrder[currentIndex - 1]
      console.log("🔍 [ONBOARDING] Moving to previous step:", prevStepName)
      setCurrentStep(prevStepName)
    }
  }

  const updateData = (data: Partial<typeof onboardingData>) => {
    console.log("🔍 [ONBOARDING] updateData() called with:", data)
    console.log(
      "🔍 [ONBOARDING] Current onboardingData before update:",
      onboardingData
    )

    setOnboardingData(prev => {
      const updated = { ...prev, ...data }
      console.log("🔍 [ONBOARDING] Updated onboardingData:", updated)
      console.log("🔍 [ONBOARDING] Keywords specifically:", updated.keywords)
      console.log("🔍 [ONBOARDING] Keywords length:", updated.keywords.length)
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

    try {
      console.log(
        "🔍 [ONBOARDING] Calling updateProfileAction with user ID:",
        user.id
      )
      console.log("🔍 [ONBOARDING] Profile data being saved:", {
        name: onboardingData.name,
        profilePictureUrl: onboardingData.profilePictureUrl,
        website: onboardingData.website,
        keywords: onboardingData.keywords,
        onboardingCompleted: true
      })

      const profileResult = await updateProfileAction(user.id, {
        name: onboardingData.name,
        profilePictureUrl: onboardingData.profilePictureUrl,
        website: onboardingData.website,
        keywords: onboardingData.keywords,
        onboardingCompleted: true
      })

      console.log("🔍 [ONBOARDING] Profile updated successfully")
      console.log("🔍 [ONBOARDING] Profile update result:", profileResult)

      if (!profileResult.isSuccess) {
        throw new Error("Failed to update profile")
      }

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

  const renderCurrentStep = () => {
    console.log(
      "🔍 [ONBOARDING] renderCurrentStep() called for step:",
      currentStep
    )
    console.log(
      "🔍 [ONBOARDING] Current onboardingData in render:",
      onboardingData
    )

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
            className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
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
