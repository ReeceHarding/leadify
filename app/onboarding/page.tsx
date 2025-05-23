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

  console.log("🔍 [ONBOARDING] Component initialized")
  console.log("🔍 [ONBOARDING] User ID:", user?.id)
  console.log("🔍 [ONBOARDING] User fullName:", user?.fullName)
  console.log("🔍 [ONBOARDING] User imageUrl:", user?.imageUrl)
  console.log("🔍 [ONBOARDING] Current onboardingData:", onboardingData)
  console.log("🔍 [ONBOARDING] isLoading:", isLoading)
  console.log("🔍 [ONBOARDING] currentStep:", currentStep)

  // Check if Reddit is actually connected by verifying stored tokens
  const checkRedditConnection = async () => {
    console.log("🔍 [ONBOARDING] Checking Reddit connection status...")
    try {
      const tokenResult = await getRedditAccessTokenAction()
      const isConnected = tokenResult.isSuccess
      console.log("🔍 [ONBOARDING] Reddit connection status:", isConnected)
      return isConnected
    } catch (error) {
      console.error("🔍 [ONBOARDING] Error checking Reddit connection:", error)
      return false
    }
  }

  // Load existing profile data when user is available
  useEffect(() => {
    console.log("🔍 [ONBOARDING] useEffect for loading profile triggered")
    console.log("🔍 [ONBOARDING] user?.id:", user?.id)

    const loadExistingProfile = async () => {
      if (!user?.id) {
        console.log("🔍 [ONBOARDING] No user ID, setting isLoading to false")
        setIsLoading(false)
        return
      }

      console.log("🔍 [ONBOARDING] Loading existing profile for user:", user.id)
      setIsLoading(true)

      try {
        const profileResult = await getProfileByUserIdAction(user.id)
        console.log("🔍 [ONBOARDING] Profile load result:", profileResult)

        if (profileResult.isSuccess && profileResult.data) {
          console.log("🔍 [ONBOARDING] Profile loaded successfully")
          console.log("🔍 [ONBOARDING] Profile data:", profileResult.data)
          console.log(
            "🔍 [ONBOARDING] Profile keywords:",
            profileResult.data.keywords
          )
          console.log(
            "🔍 [ONBOARDING] Profile keywords length:",
            profileResult.data.keywords?.length || 0
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
          console.log(
            "🔍 [ONBOARDING] - keywords length:",
            loadedData.keywords.length
          )

          setOnboardingData(loadedData)

          // Check actual Reddit connection status
          console.log("🔍 [ONBOARDING] Checking Reddit connection...")
          const isRedditConnected = await checkRedditConnection()

          // Update Reddit connection status
          setOnboardingData(prev => ({
            ...prev,
            redditConnected: isRedditConnected
          }))

          console.log(
            "🔍 [ONBOARDING] Final Reddit connection status:",
            isRedditConnected
          )

          // SIMPLIFIED LOGIC: Skip onboarding if keywords > 1, otherwise start from profile
          if (loadedData.keywords.length > 1) {
            console.log(
              "🔍 [ONBOARDING] Keywords exist (length > 1), skipping onboarding and redirecting to lead finder"
            )
            router.push("/reddit/lead-finder")
            return
          } else {
            console.log(
              "🔍 [ONBOARDING] No keywords or insufficient keywords, starting from profile step"
            )
            setCurrentStep("profile")
          }
        } else {
          console.log(
            "🔍 [ONBOARDING] No existing profile found, setting default data from Clerk user"
          )
          // Set default data from Clerk user
          setOnboardingData({
            name: user.fullName || "",
            profilePictureUrl: user.imageUrl || "",
            website: "",
            keywords: [],
            redditConnected: false
          })
          setCurrentStep("profile")
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
        setCurrentStep("profile")
      } finally {
        setIsLoading(false)
        console.log("🔍 [ONBOARDING] Profile loading completed")
        console.log("🔍 [ONBOARDING] Final currentStep:", currentStep)
      }
    }

    loadExistingProfile()
  }, [user?.id, router])

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

    if (!user?.id || isLoading) {
      console.log(
        "🔍 [ONBOARDING] Waiting for user and profile to load before processing Reddit callback"
      )
      return
    }

    if (success === "Reddit authentication successful") {
      console.log("🔍 [ONBOARDING] Reddit auth successful, verifying tokens...")

      // Verify Reddit connection with actual token check
      const handleRedditSuccess = async () => {
        const isRedditConnected = await checkRedditConnection()
        console.log(
          "🔍 [ONBOARDING] Verified Reddit connection:",
          isRedditConnected
        )

        if (isRedditConnected) {
          // Update Reddit connection status
          setOnboardingData(prev => ({
            ...prev,
            redditConnected: true
          }))

          console.log(
            "🔍 [ONBOARDING] Reddit connected, advancing to complete step"
          )
          setCurrentStep("complete")
        } else {
          console.error("🔍 [ONBOARDING] Reddit connection verification failed")
        }

        // Clean up URL parameters AFTER processing
        const url = new URL(window.location.href)
        url.searchParams.delete("success")
        window.history.replaceState({}, "", url.toString())
      }

      handleRedditSuccess()
    }

    if (error) {
      console.error("🔍 [ONBOARDING] Reddit authentication error:", error)
      // Clean up URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete("error")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams, user?.id, isLoading])

  const nextStep = async () => {
    console.log("🔍 [ONBOARDING] nextStep() called")
    console.log("🔍 [ONBOARDING] Current step:", currentStep)
    console.log("🔍 [ONBOARDING] Current onboardingData:", onboardingData)

    // Save progress before moving to next step
    await saveProgress()

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
    } else {
      console.log(
        "🔍 [ONBOARDING] Cannot go back further (at beginning of onboarding)"
      )
    }
  }

  const [pendingAutoSave, setPendingAutoSave] = useState<{
    data: Partial<typeof onboardingData>
    shouldSave: boolean
  } | null>(null)

  // Handle auto-save in useEffect to avoid updating component during render
  useEffect(() => {
    if (pendingAutoSave?.shouldSave && user?.id) {
      console.log("💾 [ONBOARDING] Processing auto-save...")
      saveProgress(onboardingData)
      setPendingAutoSave(null)
    }
  }, [pendingAutoSave, user?.id, onboardingData])

  const updateData = (
    data: Partial<typeof onboardingData>,
    autoSave: boolean = false
  ) => {
    console.log("🔍 [ONBOARDING] updateData() called with:", data)
    console.log("🔍 [ONBOARDING] Auto-save requested:", autoSave)

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

      return updated
    })

    // Schedule auto-save if requested
    if (autoSave && user?.id) {
      console.log("💾 [ONBOARDING] Scheduling auto-save...")
      setPendingAutoSave({ data, shouldSave: true })
    }
  }

  // Progressive save function to save data after each step
  const saveProgress = async (dataToSave?: Partial<typeof onboardingData>) => {
    if (!user?.id) {
      console.log("🔍 [ONBOARDING] No user ID available for saving progress")
      return
    }

    // Use provided data or current onboarding data
    const currentData = dataToSave || onboardingData

    console.log("💾 [ONBOARDING] Saving progress to Firebase...")
    console.log("💾 [ONBOARDING] Data to save:", currentData)
    console.log("💾 [ONBOARDING] Keywords to save:", currentData.keywords)
    console.log(
      "💾 [ONBOARDING] Keywords length:",
      currentData.keywords?.length || 0
    )

    try {
      const savePayload = {
        name: currentData.name || "",
        profilePictureUrl: currentData.profilePictureUrl || "",
        website: currentData.website || "",
        keywords: currentData.keywords || [],
        // DON'T mark as completed yet - this is just progress saving
        onboardingCompleted: false
      }

      console.log("💾 [ONBOARDING] Save payload:", savePayload)
      console.log("💾 [ONBOARDING] Payload keywords:", savePayload.keywords)

      const result = await updateProfileAction(user.id, savePayload)

      if (result.isSuccess) {
        console.log("✅ [ONBOARDING] Progress saved successfully to Firebase")
        console.log("✅ [ONBOARDING] Saved profile data:", result.data)
      } else {
        console.error(
          "❌ [ONBOARDING] Failed to save progress:",
          result.message
        )
      }
    } catch (error) {
      console.error("❌ [ONBOARDING] Error saving progress:", error)
    }
  }

  const completeOnboarding = async () => {
    console.log("🔍 [ONBOARDING] completeOnboarding() called")
    console.log("🔍 [ONBOARDING] Final onboardingData:", onboardingData)
    console.log("🔍 [ONBOARDING] Final keywords:", onboardingData.keywords)
    console.log(
      "🔍 [ONBOARDING] Final keywords length:",
      onboardingData.keywords.length
    )

    if (!user?.id) {
      console.error("🔍 [ONBOARDING] No user ID found")
      return
    }

    // Simple validation: just check if we have required data
    const hasRequiredData = !!(
      onboardingData.name &&
      onboardingData.name.trim() !== "" &&
      onboardingData.website &&
      onboardingData.website.trim() !== "" &&
      onboardingData.keywords &&
      onboardingData.keywords.length > 0 &&
      onboardingData.redditConnected === true
    )

    console.log("🔍 [ONBOARDING] - hasRequiredData:", hasRequiredData)

    if (!hasRequiredData) {
      console.error(
        "🔍 [ONBOARDING] Cannot complete onboarding - missing required data"
      )
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

      // Redirect to lead finder
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
    console.log(
      "🔍 [ONBOARDING] Current keywords in render:",
      onboardingData.keywords
    )
    console.log(
      "🔍 [ONBOARDING] Current keywords length in render:",
      onboardingData.keywords.length
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
            onUpdate={data => {
              // Auto-save when keywords are updated since they're AI-generated
              const shouldAutoSave = data.keywords && data.keywords.length > 0
              updateData(data, shouldAutoSave)
            }}
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
      <div className="flex flex-col items-center space-y-4">
        <div className="flex justify-center space-x-2">
          {stepOrder.map((step, index) => (
            <div
              key={step}
              className={`size-3 rounded-full transition-colors ${
                index <= currentStepIndex ? "bg-blue-600" : "bg-gray-600"
              }`}
            />
          ))}
        </div>
        <div className="flex justify-center space-x-8 text-xs text-gray-500">
          {["Profile", "Website", "Keywords", "Reddit", "Launch"].map(
            (stepName, index) => (
              <span
                key={stepName}
                className={`${
                  index <= currentStepIndex ? "text-blue-400" : "text-gray-600"
                }`}
              >
                {stepName}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  )
}
