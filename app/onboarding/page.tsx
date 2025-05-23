"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, User, Globe, Tag, Settings, Trophy } from "lucide-react"
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

const stepIcons = {
  profile: User,
  website: Globe,
  keywords: Tag,
  reddit: Settings,
  complete: Trophy
}

const stepDescriptions = {
  profile: "Set up your profile",
  website: "Add your website",
  keywords: "Define target keywords",
  reddit: "Connect your Reddit account",
  complete: "You're all set!"
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
    <div className="space-y-12">
      {/* Enhanced Progress Section */}
      <div className="space-y-8">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground font-semibold">
            Step {currentStepIndex + 1} of {stepOrder.length}
          </span>
          <span className="text-muted-foreground font-medium">
            {Math.round(progress)}% Complete
          </span>
        </div>

        {/* Enhanced Progress Bar */}
        <div className="relative">
          <div className="bg-muted h-3 overflow-hidden rounded-full">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Enhanced Step Indicators */}
        <div className="grid grid-cols-5 gap-4">
          {stepOrder.map((step, index) => {
            const StepIcon = stepIcons[step]
            const isCompleted = index < currentStepIndex
            const isCurrent = index === currentStepIndex

            return (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center gap-3"
              >
                <div
                  className={`
                    relative flex size-12 items-center justify-center rounded-xl transition-all duration-300
                    ${
                      isCompleted
                        ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
                        : isCurrent
                          ? "bg-primary text-primary-foreground ring-primary/20 shadow-lg ring-4"
                          : "bg-muted text-muted-foreground"
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="size-6" />
                  ) : (
                    <StepIcon className="size-6" />
                  )}

                  {isCurrent && (
                    <motion.div
                      className="bg-primary/20 absolute inset-0 rounded-xl"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>

                <div className="text-center">
                  <div
                    className={`text-sm font-semibold transition-colors ${
                      index <= currentStepIndex
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {stepLabels[step]}
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {stepDescriptions[step]}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Enhanced Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="glass shadow-glow rounded-2xl p-8"
        >
          {renderCurrentStep()}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
