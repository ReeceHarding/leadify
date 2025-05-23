"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Link,
  Shield,
  Eye,
  MessageSquare
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
      className="space-y-6"
    >
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-[#FF4500]/10 p-3">
            <Link className="size-6 text-[#FF4500]" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Connect Reddit Account</h2>
        <p className="text-muted-foreground">
          Connect your Reddit account to analyze your voice and create authentic
          responses
        </p>
      </div>

      {/* Connection Status */}
      {connectionStatus === "connecting" && (
        <div className="flex flex-col items-center space-y-6 py-12">
          <div className="relative">
            <div className="border-muted size-16 animate-spin rounded-full border-4 border-t-[#FF4500]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex size-8 items-center justify-center rounded-full bg-[#FF4500]">
                <div className="text-xs text-white">🔗</div>
              </div>
            </div>
          </div>
          <div className="space-y-2 text-center">
            <p className="font-medium">Connecting to Reddit...</p>
            <p className="text-muted-foreground text-sm">
              Securely analyzing your Reddit activity to understand your voice
            </p>
          </div>
        </div>
      )}

      {connectionStatus === "connected" && (
        <div className="flex flex-col items-center space-y-6 py-12">
          <div className="relative">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="size-8 text-green-600" />
            </div>
          </div>
          <div className="space-y-2 text-center">
            <p className="font-medium text-green-600">
              Successfully Connected!
            </p>
            <p className="text-muted-foreground text-sm">
              Your Reddit account is now linked and ready for AI analysis
            </p>
          </div>
        </div>
      )}

      {connectionStatus === "error" && (
        <div className="bg-destructive/10 border-destructive/20 rounded-xl border p-4">
          <p className="text-destructive text-center">
            Failed to connect to Reddit. Please try again.
          </p>
        </div>
      )}

      {/* Connect Section */}
      {connectionStatus === "idle" && (
        <div className="space-y-6">
          {/* Benefits */}
          <div className="grid gap-4">
            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="text-primary mt-0.5 size-5" />
                <div>
                  <h3 className="font-medium">Voice Analysis</h3>
                  <p className="text-muted-foreground text-sm">
                    AI learns your writing style from Reddit comments and posts
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <Shield className="text-primary mt-0.5 size-5" />
                <div>
                  <h3 className="font-medium">Privacy Protected</h3>
                  <p className="text-muted-foreground text-sm">
                    Only analyze public posts. Your personal data stays private
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <Eye className="text-primary mt-0.5 size-5" />
                <div>
                  <h3 className="font-medium">Authentic Responses</h3>
                  <p className="text-muted-foreground text-sm">
                    Generate responses that match your natural communication
                    style
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Reddit Connect Button */}
          <div className="space-y-4 text-center">
            <Button
              onClick={handleConnectReddit}
              disabled={isConnecting}
              className="h-12 w-full rounded-xl bg-[#FF4500] font-semibold text-white hover:bg-[#FF4500]/90"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <div className="mr-2 text-base">🔗</div>
                  Connect Reddit Account
                </>
              )}
            </Button>

            <Badge variant="outline" className="text-xs">
              <Shield className="mr-1 size-3" />
              Secure OAuth 2.0 Connection
            </Badge>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="space-y-4">
        {connectionStatus === "connected" ? (
          <Button
            onClick={handleContinue}
            className="h-12 w-full rounded-xl text-base font-semibold"
          >
            Continue
          </Button>
        ) : (
          connectionStatus === "idle" && (
            <Button
              onClick={handleSkip}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground h-12 w-full"
            >
              Skip for now
            </Button>
          )
        )}

        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onPrevious}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2"
            disabled={isConnecting}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>

          {connectionStatus === "idle" && (
            <div className="text-muted-foreground text-sm">
              Optional but recommended
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
