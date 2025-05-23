"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2 } from "lucide-react"
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

const stepLabels = {
  profile: "Profile",
  website: "Website",
  keywords: "Keywords",
  reddit: "Connect",
  complete: "Complete"
}

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

  const currentStepIndex = stepOrder.indexOf(currentStep)
  const progress = ((currentStepIndex + 1) / stepOrder.length) * 100

  // Handle Reddit OAuth callback
  useEffect(() => {
    const success = searchParams.get("success")
    const error = searchParams.get("error")

    if (success === "Reddit authentication successful") {
      // Update Reddit connection status and advance to next step
      setOnboardingData(prev => ({ ...prev, redditConnected: true }))
      setCurrentStep("complete")

      // Clean up URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete("success")
      window.history.replaceState({}, "", url.toString())
    }

    if (error) {
      // Handle error if needed
      console.error("Reddit authentication error:", error)

      // Clean up URL parameters
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

      // Redirect to lead finder with the keywords ready to create a campaign
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
    <div className="space-y-8">
      {/* Progress Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground font-medium">
            Step {currentStepIndex + 1} of {stepOrder.length}
          </span>
          <span className="text-muted-foreground">
            {Math.round(progress)}% Complete
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <Progress value={progress} className="bg-muted h-2" />
          <motion.div
            className="from-primary to-primary/80 absolute left-0 top-0 h-2 rounded-full bg-gradient-to-r"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between">
          {stepOrder.map((step, index) => (
            <div key={step} className="flex flex-col items-center gap-2">
              <div
                className={`
                  flex size-8 items-center justify-center rounded-full text-xs font-medium transition-all duration-300
                  ${
                    index < currentStepIndex
                      ? "bg-primary text-primary-foreground"
                      : index === currentStepIndex
                        ? "bg-primary text-primary-foreground ring-primary/20 ring-4"
                        : "bg-muted text-muted-foreground"
                  }
                `}
              >
                {index < currentStepIndex ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  index <= currentStepIndex
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {stepLabels[step]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {renderCurrentStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
