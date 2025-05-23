"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Globe,
  Loader2,
  Building2,
  ChevronRight,
  CheckCircle,
  Sparkles,
  Target,
  MessageSquare
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

interface WebsiteStepProps {
  data: {
    name: string
    profilePictureUrl: string
    website: string
    keywords: string[]
    redditConnected: boolean
  }
  onUpdate: (data: Partial<WebsiteStepProps["data"]>) => void
  onNext: () => void
  onPrevious: () => void
}

export default function WebsiteStep({
  data,
  onUpdate,
  onNext,
  onPrevious
}: WebsiteStepProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState("")

  const normalizeUrl = (url: string): string => {
    if (!url) return ""

    // Remove whitespace
    url = url.trim()

    // Add https:// if no protocol is specified
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url
    }

    // Remove www. and add it back consistently
    url = url.replace(/https?:\/\/(www\.)?/, "https://")

    return url
  }

  const validateUrl = (url: string): boolean => {
    try {
      const normalized = normalizeUrl(url)
      new URL(normalized)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError("")

    if (!data.website.trim()) {
      onNext() // Allow skipping website
      return
    }

    const normalizedUrl = normalizeUrl(data.website)

    if (!validateUrl(normalizedUrl)) {
      setValidationError(
        "Please enter a valid website URL (e.g., yourcompany.com)"
      )
      return
    }

    setIsValidating(true)
    onUpdate({ website: normalizedUrl })

    setTimeout(() => {
      setIsValidating(false)
      onNext()
    }, 1500)
  }

  const handleSkip = () => {
    onUpdate({ website: "" })
    onNext()
  }

  const benefits = [
    {
      icon: Sparkles,
      title: "AI learns your brand voice",
      description: "Understands your tone and messaging style",
      color: "blue"
    },
    {
      icon: Target,
      title: "Better context for responses",
      description: "More relevant and personalized Reddit replies",
      color: "green"
    },
    {
      icon: MessageSquare,
      title: "Accurate lead qualification",
      description: "Identifies prospects that match your target market",
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
          <div className="shadow-glow rounded-2xl bg-gradient-to-br from-green-50 to-green-100 p-4 dark:from-green-950 dark:to-green-900">
            <Building2 className="size-8 text-green-600" />
          </div>
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Connect your website
          </h2>
          <p className="text-muted-foreground mx-auto max-w-lg text-lg leading-relaxed">
            Help us understand your brand better by adding your website URL.
            This enables more personalized AI responses.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Enhanced Website Input */}
        <Card className="shadow-glow border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Globe className="size-5 text-gray-600" />
                <Label
                  htmlFor="website"
                  className="text-base font-semibold text-gray-900 dark:text-gray-100"
                >
                  Website URL (Optional)
                </Label>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Input
                    id="website"
                    type="text"
                    value={data.website}
                    onChange={e => {
                      onUpdate({ website: e.target.value })
                      if (validationError) setValidationError("")
                    }}
                    placeholder="yourcompany.com or https://yourcompany.com"
                    className="h-14 rounded-xl border-2 border-gray-200 bg-white pl-12 pr-4 text-lg shadow-sm transition-all duration-200 focus:border-green-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-green-400"
                  />
                  <Globe className="text-muted-foreground absolute left-4 top-1/2 size-5 -translate-y-1/2" />
                </div>

                {validationError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600 dark:border-red-800 dark:bg-red-950/20"
                  >
                    {validationError}
                  </motion.div>
                )}

                <p className="text-muted-foreground text-sm">
                  We'll analyze your website to understand your brand voice and
                  create more personalized responses. You can always add this
                  later.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Benefits Section */}
        <Card className="shadow-glow border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/20">
          <CardContent className="p-8">
            <div className="space-y-6">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                <Sparkles className="size-5 text-blue-600" />
                What this enables:
              </h3>

              <div className="grid gap-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-4 rounded-xl border border-white/20 bg-white/50 p-4 dark:border-gray-800/20 dark:bg-gray-900/50"
                  >
                    <div
                      className={`
                      flex size-10 items-center justify-center rounded-xl
                      ${benefit.color === "blue" ? "bg-blue-100 dark:bg-blue-950" : ""}
                      ${benefit.color === "green" ? "bg-green-100 dark:bg-green-950" : ""}
                      ${benefit.color === "purple" ? "bg-purple-100 dark:bg-purple-950" : ""}
                    `}
                    >
                      <benefit.icon
                        className={`
                        size-5
                        ${benefit.color === "blue" ? "text-blue-600" : ""}
                        ${benefit.color === "green" ? "text-green-600" : ""}
                        ${benefit.color === "purple" ? "text-purple-600" : ""}
                      `}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {benefit.title}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {benefit.description}
                      </div>
                    </div>
                    <CheckCircle className="size-5 text-green-600" />
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Action Buttons */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button
              type="submit"
              className="h-14 w-full rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105 hover:from-green-700 hover:to-green-800 hover:shadow-xl disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isValidating}
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" />
                  Analyzing Website...
                </>
              ) : (
                "Continue to Keywords"
              )}
            </Button>
          </motion.div>

          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground h-12 w-full font-medium transition-colors"
            disabled={isValidating}
          >
            Skip for now - I'll add this later
          </Button>
        </div>

        {/* Enhanced Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onPrevious}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-lg px-4 py-2 transition-colors"
            disabled={isValidating}
          >
            <ArrowLeft className="size-4" />
            Back to Profile
          </Button>

          <div className="text-muted-foreground text-sm">Step 2 of 5</div>
        </div>
      </form>
    </motion.div>
  )
}
