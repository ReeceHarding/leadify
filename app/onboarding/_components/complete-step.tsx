"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Play, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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

      {/* Summary of Setup */}
      <div className="space-y-4 rounded-lg bg-gray-800 p-4">
        <h3 className="text-base font-semibold text-white">
          Your Setup Summary
        </h3>

        <div className="grid grid-cols-2 gap-3 text-left text-sm">
          <div>
            <p className="font-medium text-gray-300">Profile</p>
            <p className="text-gray-400">{data.name}</p>
          </div>

          <div>
            <p className="font-medium text-gray-300">Reddit Connected</p>
            <Badge variant={data.redditConnected ? "default" : "secondary"}>
              {data.redditConnected ? "Connected" : "Not Connected"}
            </Badge>
          </div>

          <div className="col-span-2">
            <p className="font-medium text-gray-300">Keywords Generated</p>
            <p className="text-gray-400">
              {data.keywords.length} keywords ready
            </p>
            {/* Debug display of actual keywords */}
            <div className="mt-2 text-xs text-gray-500">
              Keywords: {data.keywords.join(", ") || "None"}
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="relative rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="relative z-10">
          <div className="mb-3 flex justify-center">
            <div className="rounded-full bg-white/20 p-3">
              <Play className="size-6" />
            </div>
          </div>
          <h3 className="mb-2 text-lg font-semibold">
            Ready to Find Your First Leads
          </h3>
          <p className="text-sm text-blue-100">
            We'll search Reddit for opportunities matching your keywords and
            help you engage with potential customers.
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute right-3 top-3 opacity-20">
          <div className="size-12 rounded-full bg-white"></div>
        </div>
        <div className="absolute bottom-3 left-3 opacity-10">
          <div className="size-8 rounded-full bg-white"></div>
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
