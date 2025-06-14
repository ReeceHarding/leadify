"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Play, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CompleteStepProps {
  profileName: string
  organizationName: string
  website: string
  keywords: string[]
  redditConnected: boolean
  onComplete: () => void
}

export default function CompleteStep({
  profileName,
  organizationName,
  website,
  keywords,
  redditConnected,
  onComplete
}: CompleteStepProps) {
  console.log("🔍 [COMPLETE] Component initialized")
  console.log("🔍 [COMPLETE] Keywords:", keywords)
  console.log("🔍 [COMPLETE] Keywords length:", keywords?.length || 0)
  console.log("🔍 [COMPLETE] Profile Name:", profileName)
  console.log("🔍 [COMPLETE] Organization Name:", organizationName)
  console.log("🔍 [COMPLETE] Website:", website)
  console.log("🔍 [COMPLETE] Reddit connected:", redditConnected)

  const [isCompleting, setIsCompleting] = useState(false)

  const handleComplete = async () => {
    console.log("🔍 [COMPLETE] handleComplete() called")
    console.log("🔍 [COMPLETE] Final data before completion:", {
      profileName,
      organizationName,
      website,
      keywords,
      redditConnected
    })
    console.log("🔍 [COMPLETE] Final keywords before completion:", keywords)
    console.log(
      "🔍 [COMPLETE] Final keywords length before completion:",
      keywords.length
    )

    setIsCompleting(true)
    try {
      console.log("🔍 [COMPLETE] Calling onComplete()")
      await onComplete()
      console.log("🔍 [COMPLETE] onComplete() completed successfully")
    } catch (error) {
      console.error("🔍 [COMPLETE] Error completing onboarding:", error)
    } finally {
      setIsCompleting(false)
      console.log("🔍 [COMPLETE] Completion process finished")
    }
  }

  console.log("🔍 [COMPLETE] Rendering component")
  console.log("🔍 [COMPLETE] Current data:", {
    profileName,
    organizationName,
    website,
    keywords,
    redditConnected
  })
  console.log("🔍 [COMPLETE] Current keywords:", keywords)
  console.log("🔍 [COMPLETE] Current keywords length:", keywords.length)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-6 text-center"
    >
      <div className="space-y-4">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-gradient-to-r from-green-600 to-green-700">
          <span className="text-2xl">🎉</span>
        </div>

        <h1 className="text-3xl font-bold text-white">You're All Set!</h1>

        <p className="mx-auto max-w-md text-base leading-relaxed text-gray-400">
          Your Reddit lead generation system is ready. Let's create your first
          campaign and start finding customers who need exactly what you offer.
        </p>
        <div className="mx-auto max-w-md rounded-lg border border-green-600/20 bg-green-600/5 p-3">
          <p className="text-sm text-green-200">
            ✨ <strong>What's next:</strong> We'll search Reddit for active
            discussions matching your keywords and help you engage authentically
          </p>
        </div>
      </div>

      {/* Professional Setup Summary */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h3 className="mb-6 text-lg font-semibold text-white">Setup Summary</h3>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Your Profile</p>
              <p className="text-gray-400">{profileName || "Not set"}</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-full bg-green-600/10">
              <div className="size-2 rounded-full bg-green-400"></div>
            </div>
          </div>

          {/* Organization Section */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Organization</p>
              <p className="text-gray-400">{organizationName || "Not set"}</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-full bg-green-600/10">
              <div className="size-2 rounded-full bg-green-400"></div>
            </div>
          </div>

          {/* Reddit Connection */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">
                Reddit Integration
              </p>
              <p className="text-gray-400">
                {redditConnected ? "Connected" : "Not Connected"}
              </p>
            </div>
            <div
              className={`flex size-8 items-center justify-center rounded-full ${
                redditConnected ? "bg-green-600/10" : "bg-yellow-600/10"
              }`}
            >
              <div
                className={`size-2 rounded-full ${
                  redditConnected ? "bg-green-400" : "bg-yellow-400"
                }`}
              ></div>
            </div>
          </div>

          {/* Keywords Section */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">
                  Keywords Generated
                </p>
                <p className="text-gray-400">
                  {keywords.length}{" "}
                  {keywords.length === 1 ? "keyword" : "keywords"} ready
                </p>
              </div>
              <div className="flex size-8 items-center justify-center rounded-full bg-blue-600/10">
                <div className="size-2 rounded-full bg-blue-400"></div>
              </div>
            </div>

            {/* Keywords List */}
            {keywords.length > 0 && (
              <div className="rounded-md border border-gray-700 bg-gray-800/50 p-3">
                <div className="max-h-24 overflow-y-auto">
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.slice(0, 6).map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-md bg-blue-600/10 px-2 py-1 text-xs text-blue-400"
                      >
                        {keyword}
                      </span>
                    ))}
                    {keywords.length > 6 && (
                      <span className="inline-flex items-center rounded-md bg-gray-600/20 px-2 py-1 text-xs text-gray-400">
                        +{keywords.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Professional Call-to-Action */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-blue-600/10">
            <Play className="size-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Ready to Find Your First Leads
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              We'll search Reddit for opportunities matching your keywords and
              help you engage with potential customers.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleComplete}
          disabled={isCompleting}
          className="w-full rounded-lg bg-green-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-green-700"
        >
          {isCompleting ? (
            <>
              <Loader2 className="mr-2 size-5 animate-spin" />
              Launching Your Lead Finder...
            </>
          ) : (
            "🚀 Start Finding Leads Now"
          )}
        </Button>
      </div>
    </motion.div>
  )
}
