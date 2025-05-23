/*
<ai_context>
This client component provides the hero section for the landing page.
</ai_context>
*/

"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { ChevronRight, Rocket, Search, RotateCcw, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import posthog from "posthog-js"
import { useUser } from "@clerk/nextjs"
import { useState } from "react"
import { resetAccountAction } from "@/actions/db/profiles-actions"
import AnimatedGradientText from "../magicui/animated-gradient-text"
import HeroVideoDialog from "../magicui/hero-video-dialog"

export const HeroSection = () => {
  const { user } = useUser()
  const [isResetting, setIsResetting] = useState(false)

  const handleGetStartedClick = () => {
    posthog.capture("clicked_get_started")
  }

  const handleStartOver = async () => {
    if (!user?.id) {
      alert("Please sign in first to reset your account")
      return
    }

    const confirmed = confirm(
      "🚨 DEBUG MODE: This will completely wipe your account clean and reset all onboarding progress. Are you sure you want to start over?"
    )

    if (!confirmed) return

    setIsResetting(true)
    try {
      console.log("🔧 [DEBUG] Starting complete account reset for user:", user.id)
      const result = await resetAccountAction(user.id)
      
      if (result.isSuccess) {
        console.log("✅ [DEBUG] Account reset successful, redirecting to onboarding")
        alert("✅ Account reset successfully! Redirecting to onboarding...")
        window.location.href = "/onboarding"
      } else {
        console.error("❌ [DEBUG] Account reset failed:", result.message)
        alert("❌ Failed to reset account: " + result.message)
      }
    } catch (error) {
      console.error("❌ [DEBUG] Error during account reset:", error)
      alert("❌ Error resetting account. Check console for details.")
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center px-8 pt-32 text-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex items-center justify-center"
      >
        <AnimatedGradientText>
          🎯{" "}
          <hr className="mx-2 h-4 w-px shrink-0 bg-gray-300 dark:bg-gray-600" />
          <span
            className={cn(
              `animate-gradient inline bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent`
            )}
          >
            AI-Powered Lead Generation
          </span>
          <ChevronRight className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
        </AnimatedGradientText>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="mt-8 flex max-w-2xl flex-col items-center justify-center gap-6"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="text-balance text-6xl font-bold text-gray-900 dark:text-gray-100"
        >
          Find leads on Reddit with AI
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
          className="max-w-xl text-balance text-xl text-gray-600 dark:text-gray-400"
        >
          Turn Reddit conversations into qualified leads. Our AI finds
          high-quality opportunities and generates personalized responses that
          convert.
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center gap-4"
        >
          <Link href="/onboarding" onClick={handleGetStartedClick}>
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-3 text-lg hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700">
              <Search className="mr-2 size-5" />
              Get Started &rarr;
            </Button>
          </Link>

          {/* Debug Button - Only show for signed-in users */}
          {user && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartOver}
              disabled={isResetting}
              className="border-red-500/20 bg-red-950/10 text-red-400 hover:bg-red-950/20 hover:text-red-300 dark:border-red-400/20"
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 size-4" />
                  🔧 Start Over (Debug)
                </>
              )}
            </Button>
          )}
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1, ease: "easeOut" }}
        className="mx-auto mt-20 flex w-full max-w-screen-lg items-center justify-center rounded-lg border border-gray-200 shadow-lg dark:border-gray-700"
      >
        <HeroVideoDialog
          animationStyle="top-in-bottom-out"
          videoSrc="https://www.youtube.com/embed/9yS0dR0kP-s"
          thumbnailSrc="/hero.png"
          thumbnailAlt="Hero Video"
        />
      </motion.div>
    </div>
  )
}
