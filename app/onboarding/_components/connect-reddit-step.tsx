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
  MessageSquare,
  Lock,
  Zap,
  Users,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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

  const benefits = [
    {
      icon: MessageSquare,
      title: "Voice Analysis",
      description:
        "AI learns your writing style from Reddit comments and posts to match your tone",
      color: "blue"
    },
    {
      icon: Shield,
      title: "Privacy Protected",
      description:
        "Only analyze public posts. Your personal data and private messages stay secure",
      color: "green"
    },
    {
      icon: Eye,
      title: "Authentic Responses",
      description:
        "Generate responses that match your natural communication style and personality",
      color: "purple"
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* Enhanced Header */}
      <div className="space-y-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center"
        >
          <div className="shadow-glow rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 p-4 dark:from-orange-950 dark:to-orange-900">
            <Link className="size-8 text-[#FF4500]" />
          </div>
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Connect Reddit Account
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed">
            Connect your Reddit account to analyze your communication style and
            create authentic responses that sound like you.
          </p>
        </div>
      </div>

      {/* Enhanced Connection Status */}
      {connectionStatus === "connecting" && (
        <Card className="shadow-glow border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
          <CardContent className="p-12">
            <div className="flex flex-col items-center space-y-6">
              <div className="relative">
                <div className="border-muted size-20 animate-spin rounded-full border-4 border-t-[#FF4500]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-[#FF4500] shadow-lg">
                    <Link className="size-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="space-y-3 text-center">
                <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Connecting to Reddit...
                </p>
                <p className="text-muted-foreground mx-auto max-w-md">
                  Securely analyzing your Reddit activity to understand your
                  communication style and preferences
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {connectionStatus === "connected" && (
        <Card className="shadow-glow border-0 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/20">
          <CardContent className="p-12">
            <div className="flex flex-col items-center space-y-6">
              <div className="relative">
                <div className="flex size-20 items-center justify-center rounded-full bg-green-500/20 ring-4 ring-green-100 dark:ring-green-900/50">
                  <CheckCircle2 className="size-12 text-green-600" />
                </div>
              </div>
              <div className="space-y-3 text-center">
                <p className="text-xl font-semibold text-green-700 dark:text-green-300">
                  Successfully Connected!
                </p>
                <p className="text-muted-foreground mx-auto max-w-md">
                  Your Reddit account is now linked and ready for AI analysis.
                  We can now create responses that match your style.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {connectionStatus === "error" && (
        <Card className="shadow-glow border-0 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/20">
          <CardContent className="p-8">
            <div className="space-y-4 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-500/20">
                <X className="size-8 text-red-600" />
              </div>
              <div>
                <p className="mb-2 text-lg font-semibold text-red-700 dark:text-red-300">
                  Connection Failed
                </p>
                <p className="text-muted-foreground">
                  We couldn't connect to Reddit. Please check your connection
                  and try again.
                </p>
              </div>
              <Button
                onClick={handleConnectReddit}
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Connect Section */}
      {connectionStatus === "idle" && (
        <div className="space-y-8">
          {/* Benefits Cards */}
          <div className="grid gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              >
                <Card className="shadow-glow border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`
                        flex size-12 items-center justify-center rounded-xl
                        ${benefit.color === "blue" ? "bg-blue-100 dark:bg-blue-950" : ""}
                        ${benefit.color === "green" ? "bg-green-100 dark:bg-green-950" : ""}
                        ${benefit.color === "purple" ? "bg-purple-100 dark:bg-purple-950" : ""}
                      `}
                      >
                        <benefit.icon
                          className={`
                          size-6
                          ${benefit.color === "blue" ? "text-blue-600" : ""}
                          ${benefit.color === "green" ? "text-green-600" : ""}
                          ${benefit.color === "purple" ? "text-purple-600" : ""}
                        `}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {benefit.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Enhanced Security Notice */}
          <Card className="shadow-glow border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/20">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <Lock className="size-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Security & Privacy
                </h3>
              </div>
              <div className="text-muted-foreground grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600" />
                  <span>OAuth 2.0 secure connection</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600" />
                  <span>Only public posts analyzed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600" />
                  <span>No personal messages accessed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-green-600" />
                  <span>Revoke access anytime</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Reddit Connect Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="space-y-4 text-center"
          >
            <Button
              onClick={handleConnectReddit}
              disabled={isConnecting}
              className="h-16 w-full rounded-xl bg-[#FF4500] text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-[#FF4500]/90 hover:shadow-xl"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-3 size-6 animate-spin" />
                  Connecting to Reddit...
                </>
              ) : (
                <>
                  <Link className="mr-3 size-6" />
                  Connect Reddit Account
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2">
              <Shield className="size-4 text-green-600" />
              <Badge
                variant="outline"
                className="border-green-200 text-xs text-green-700 dark:border-green-800 dark:text-green-300"
              >
                Secure OAuth 2.0 Connection
              </Badge>
            </div>
          </motion.div>
        </div>
      )}

      {/* Enhanced Navigation */}
      <div className="space-y-6">
        {connectionStatus === "connected" ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button
              onClick={handleContinue}
              className="h-14 w-full rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105 hover:from-green-700 hover:to-green-800 hover:shadow-xl"
            >
              Continue to Complete Setup
            </Button>
          </motion.div>
        ) : (
          connectionStatus === "idle" && (
            <Button
              onClick={handleSkip}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground h-12 w-full font-medium transition-colors"
            >
              Skip for now - I'll connect later
            </Button>
          )
        )}

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onPrevious}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-lg px-4 py-2 transition-colors"
            disabled={isConnecting}
          >
            <ArrowLeft className="size-4" />
            Back to Keywords
          </Button>

          <div className="flex items-center gap-3">
            {connectionStatus === "idle" && (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Zap className="size-4 text-orange-600" />
                <span>Optional but recommended</span>
              </div>
            )}
            <div className="text-muted-foreground text-sm">Step 4 of 5</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
