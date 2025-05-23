"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import ProfileStep from "./profile-step"
import WebsiteStep from "./website-step"
import KeywordsStep from "./keywords-step"
import ConnectRedditStep from "./connect-reddit-step"
import CompleteStep from "./complete-step"
import { updateProfileAction } from "@/actions/db/profiles-actions"

type OnboardingStep = "profile" | "website" | "keywords" | "reddit" | "complete"

const stepOrder: OnboardingStep[] = [
  "profile",
  "website",
  "keywords",
  "reddit",
  "complete"
]

const ONBOARDING_STORAGE_KEY = "onboarding_data"
const ONBOARDING_STEP_KEY = "onboarding_step"

export default function OnboardingFlow() {
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

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem(ONBOARDING_STORAGE_KEY)
    const savedStep = localStorage.getItem(ONBOARDING_STEP_KEY)

    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData)
        setOnboardingData(prev => ({
          ...prev,
          ...parsedData,
          // Always use current user data for name and profile picture
          name: user?.fullName || parsedData.name || "",
          profilePictureUrl:
            user?.imageUrl || parsedData.profilePictureUrl || ""
        }))
      } catch (error) {
        console.error("Error parsing saved onboarding data:", error)
      }
    }

    if (savedStep && stepOrder.includes(savedStep as OnboardingStep)) {
      setCurrentStep(savedStep as OnboardingStep)
    }
  }, [user])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(onboardingData))
  }, [onboardingData])

  // Save current step to localStorage
  useEffect(() => {
    localStorage.setItem(ONBOARDING_STEP_KEY, currentStep)
  }, [currentStep])

  const currentStepIndex = stepOrder.indexOf(currentStep)

  // Handle Reddit OAuth callback
  useEffect(() => {
    const success = searchParams.get("success")
    const error = searchParams.get("error")

    if (success === "Reddit authentication successful") {
      setOnboardingData(prev => ({ ...prev, redditConnected: true }))
      setCurrentStep("complete")

      const url = new URL(window.location.href)
      url.searchParams.delete("success")
      window.history.replaceState({}, "", url.toString())
    }

    if (error) {
      console.error("Reddit authentication error:", error)
      const url = new URL(window.location.href)
      url.searchParams.delete("error")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams])

  const nextStep = () => {
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
    setOnboardingData(prev => ({ ...prev, ...data }))
  }

  const completeOnboarding = async () => {
    if (!user?.id) return

    try {
      await updateProfileAction(user.id, {
        name: onboardingData.name,
        profilePictureUrl: onboardingData.profilePictureUrl,
        website: onboardingData.website,
        onboardingCompleted: true
      })

      localStorage.removeItem(ONBOARDING_STORAGE_KEY)
      localStorage.removeItem(ONBOARDING_STEP_KEY)

      router.push(
        `/reddit/lead-finder?keywords=${encodeURIComponent(JSON.stringify(onboardingData.keywords))}`
      )
    } catch (error) {
      console.error("Error completing onboarding:", error)
    }
  }

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
    <div className="space-y-12">
      {/* Main Content */}
      <div className="min-h-[600px]">{renderCurrentStep()}</div>

      {/* Simple Progress Dots */}
      <div className="flex justify-center space-x-2">
        {stepOrder.map((_, index) => (
          <div
            key={index}
            className={`size-2 rounded-full ${
              index === currentStepIndex
                ? "bg-blue-600"
                : index < currentStepIndex
                  ? "bg-blue-300"
                  : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
