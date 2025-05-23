"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateRedditAuthUrlAction } from "@/actions/integrations/reddit-oauth-actions"

interface ConnectRedditStepProps {
  data: {
    name: string
    profilePictureUrl: string
    website: string
    keywords: string[]
    redditConnected: boolean
  }
  onUpdate: (data: Partial<ConnectRedditStepProps["data"]>) => void
  onNext: () => void
  onPrevious: () => void
}

export default function ConnectRedditStep({
  data,
  onUpdate,
  onNext,
  onPrevious
}: ConnectRedditStepProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle")

  // Update connection status based on data
  useEffect(() => {
    if (data.redditConnected) {
      setConnectionStatus("connected")
    }
  }, [data.redditConnected])

  const handleConnectReddit = async () => {
    setIsConnecting(true)
    setConnectionStatus("connecting")

    try {
      const result = await generateRedditAuthUrlAction()

      if (result.isSuccess) {
        // Redirect to Reddit OAuth
        window.location.href = result.data.authUrl
      } else {
        setConnectionStatus("error")
        console.error("Failed to generate Reddit auth URL:", result.message)
      }
    } catch (error) {
      setConnectionStatus("error")
      console.error("Error connecting to Reddit:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleContinue = () => {
    onUpdate({ redditConnected: true })
    onNext()
  }

  const handleSkip = () => {
    onUpdate({ redditConnected: false })
    onNext()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-8 text-center"
    >
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-white">
          Connect Your Reddit Account
        </h1>
        <p className="text-base leading-relaxed text-gray-400">
          Connect your Reddit account to help us understand your style and
          voice.
        </p>
      </div>

      {/* Connection Status */}
      {connectionStatus === "connecting" && (
        <div className="flex flex-col items-center space-y-4 py-12">
          <div className="relative">
            <div className="size-8 animate-spin rounded-full border-2 border-gray-600 border-t-blue-600" />
          </div>
          <p className="text-gray-400">Analyzing your Reddit account...</p>
          <p className="max-w-md text-sm text-gray-400">
            We need your Reddit account to create content that sounds just like
            you. Don't worry, you can always update your Voice Profile later.
          </p>
        </div>
      )}

      {connectionStatus === "connected" && (
        <div className="flex flex-col items-center space-y-4 py-12">
          <CheckCircle2 className="size-8 text-green-400" />
          <p className="text-gray-400">
            Reddit account connected successfully!
          </p>
        </div>
      )}

      {connectionStatus === "error" && (
        <div className="rounded-lg bg-red-900/50 p-4">
          <p className="text-red-400">
            Failed to connect to Reddit. Please try again.
          </p>
        </div>
      )}

      {/* Connect Button */}
      {connectionStatus === "idle" && (
        <div className="space-y-6">
          <p className="mx-auto max-w-md text-sm text-gray-400">
            We need your Reddit account to create content that sounds just like
            you. Don't worry, you can always update your Voice Profile later.
          </p>

          <div className="flex justify-center">
            <Button
              onClick={handleConnectReddit}
              disabled={isConnecting}
              className="rounded-lg bg-[#FF4500] px-8 py-3 text-base font-medium text-white hover:bg-[#FF4500]/90"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "🔗 Connect Reddit Account"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="space-y-3">
        {connectionStatus === "connected" ? (
          <Button
            onClick={handleContinue}
            className="w-full rounded-lg bg-blue-600 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700"
          >
            Continue →
          </Button>
        ) : (
          connectionStatus === "idle" && (
            <Button
              onClick={handleSkip}
              variant="ghost"
              className="w-full text-gray-400 hover:text-gray-200"
            >
              Continue →
            </Button>
          )
        )}

        <Button
          type="button"
          variant="ghost"
          onClick={onPrevious}
          className="flex w-full items-center justify-center text-gray-400 hover:text-gray-200"
          disabled={isConnecting}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
      </div>
    </motion.div>
  )
}
