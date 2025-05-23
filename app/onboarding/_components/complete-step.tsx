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
  const [isCompleting, setIsCompleting] = useState(false)

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await onComplete()
    } catch (error) {
      console.error("Error completing onboarding:", error)
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-8 text-center"
    >
      <div className="space-y-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-5xl"
        >
          🎉
        </motion.div>

        <h1 className="text-3xl font-bold text-gray-900">
          Congratulations! You're ready to start creating with Lead Finder!
        </h1>

        <p className="mx-auto max-w-lg text-base leading-relaxed text-gray-600">
          Turn any Reddit opportunity into engaging content in seconds. Simply
          paste a link below to transform it into ready-to-share posts.
        </p>
      </div>

      {/* Summary of Setup */}
      <div className="space-y-4 rounded-lg bg-gray-50 p-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Your Setup Summary
        </h3>

        <div className="grid grid-cols-1 gap-4 text-left md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-700">Profile</p>
            <p className="text-gray-600">{data.name}</p>
          </div>

          {data.website && (
            <div>
              <p className="text-sm font-medium text-gray-700">Website</p>
              <p className="break-all text-gray-600">{data.website}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700">
              Reddit Connected
            </p>
            <Badge variant={data.redditConnected ? "default" : "secondary"}>
              {data.redditConnected ? "Connected" : "Not Connected"}
            </Badge>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700">
              Keywords Generated
            </p>
            <p className="text-gray-600">
              {data.keywords.length} keywords ready
            </p>
          </div>
        </div>

        {data.keywords.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Target Keywords
            </p>
            <div className="flex flex-wrap gap-1">
              {data.keywords.slice(0, 6).map((keyword, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
              {data.keywords.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{data.keywords.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Video/Demo Preview */}
      <div className="relative rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
        <div className="relative z-10">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-white/20 p-4">
              <Play className="size-8" />
            </div>
          </div>
          <h3 className="mb-2 text-xl font-semibold">
            Ready to Find Your First Leads
          </h3>
          <p className="text-blue-100">
            We'll search Reddit for opportunities matching your keywords and
            help you engage with potential customers.
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute right-4 top-4 opacity-20">
          <div className="size-16 rounded-full bg-white"></div>
        </div>
        <div className="absolute bottom-4 left-4 opacity-10">
          <div className="size-12 rounded-full bg-white"></div>
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
          className="flex w-full items-center justify-center text-gray-600 hover:text-gray-800"
          disabled={isCompleting}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
      </div>
    </motion.div>
  )
}
