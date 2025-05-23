"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Play, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CompleteStepProps {
  data: {
    name: string
    profilePictureUrl: string
    website: string
    keywords: string[]
    redditConnected: boolean
  }
  onComplete: () => void
  onPrevious: () => void
}

export default function CompleteStep({
  data,
  onComplete,
  onPrevious
}: CompleteStepProps) {
  console.log("🔍 [COMPLETE] Component initialized")
  console.log("🔍 [COMPLETE] Props data:", data)
  console.log("🔍 [COMPLETE] Keywords:", data.keywords)
  console.log("🔍 [COMPLETE] Keywords length:", data.keywords.length)
  console.log(
    "🔍 [COMPLETE] Keywords stringified:",
    JSON.stringify(data.keywords)
  )
  console.log("🔍 [COMPLETE] Name:", data.name)
  console.log("🔍 [COMPLETE] Website:", data.website)
  console.log("🔍 [COMPLETE] Reddit connected:", data.redditConnected)

  const [isCompleting, setIsCompleting] = useState(false)

  const handleComplete = async () => {
    console.log("🔍 [COMPLETE] handleComplete() called")
    console.log("🔍 [COMPLETE] Final data before completion:", data)
    console.log(
      "🔍 [COMPLETE] Final keywords before completion:",
      data.keywords
    )
    console.log(
      "🔍 [COMPLETE] Final keywords length before completion:",
      data.keywords.length
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
  console.log("🔍 [COMPLETE] Current data:", data)
  console.log("🔍 [COMPLETE] Current keywords:", data.keywords)
  console.log("🔍 [COMPLETE] Current keywords length:", data.keywords.length)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-6 text-center"
    >
      <div className="space-y-3">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-4xl"
        >
          🎉
        </motion.div>

        <h1 className="text-2xl font-bold text-white">Setup Complete!</h1>

        <p className="mx-auto max-w-md text-sm leading-relaxed text-gray-400">
          You're ready to find and engage with potential customers on Reddit.
        </p>
      </div>

      {/* Professional Setup Summary */}
      <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-6">
        <h3 className="mb-6 text-lg font-semibold text-white">Setup Summary</h3>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Profile</p>
              <p className="text-gray-400">{data.name || "No name provided"}</p>
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
                {data.redditConnected ? "Connected" : "Not Connected"}
              </p>
            </div>
            <div
              className={`flex size-8 items-center justify-center rounded-full ${
                data.redditConnected ? "bg-green-600/10" : "bg-yellow-600/10"
              }`}
            >
              <div
                className={`size-2 rounded-full ${
                  data.redditConnected ? "bg-green-400" : "bg-yellow-400"
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
                  {data.keywords.length}{" "}
                  {data.keywords.length === 1 ? "keyword" : "keywords"} ready
                </p>
              </div>
              <div className="flex size-8 items-center justify-center rounded-full bg-blue-600/10">
                <div className="size-2 rounded-full bg-blue-400"></div>
              </div>
            </div>

            {/* Keywords List */}
            {data.keywords.length > 0 && (
              <div className="rounded-md border border-gray-700 bg-gray-800/50 p-3">
                <div className="max-h-24 overflow-y-auto">
                  <div className="flex flex-wrap gap-1.5">
                    {data.keywords.slice(0, 6).map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-md bg-blue-600/10 px-2 py-1 text-xs text-blue-400"
                      >
                        {keyword}
                      </span>
                    ))}
                    {data.keywords.length > 6 && (
                      <span className="inline-flex items-center rounded-md bg-gray-600/20 px-2 py-1 text-xs text-gray-400">
                        +{data.keywords.length - 6} more
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
          className="w-full rounded-lg bg-blue-600 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700"
        >
          {isCompleting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Setting up your campaign...
            </>
          ) : (
            "Create My First Campaign"
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onPrevious}
          className="flex w-full items-center justify-center text-gray-400 hover:text-gray-200"
          disabled={isCompleting}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
      </div>
    </motion.div>
  )
}
