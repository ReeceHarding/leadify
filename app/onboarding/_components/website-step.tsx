"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Globe,
  Loader2,
  Building2,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

    if (!data.website.trim()) {
      onNext() // Allow skipping website
      return
    }

    const normalizedUrl = normalizeUrl(data.website)

    if (!validateUrl(normalizedUrl)) {
      // TODO: Add proper toast notification
      alert("Please enter a valid website URL")
      return
    }

    setIsValidating(true)
    onUpdate({ website: normalizedUrl })

    setTimeout(() => {
      setIsValidating(false)
      onNext()
    }, 1000)
  }

  const handleSkip = () => {
    onUpdate({ website: "" })
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
          <div className="bg-primary/10 rounded-full p-3">
            <Building2 className="text-primary size-6" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Connect your website</h2>
        <p className="text-muted-foreground">
          Help us understand your brand better by adding your website URL.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Website Input */}
        <div className="space-y-2">
          <Label htmlFor="website" className="text-sm font-medium">
            Website URL
          </Label>
          <div className="relative">
            <Input
              id="website"
              type="text"
              value={data.website}
              onChange={e => onUpdate({ website: e.target.value })}
              placeholder="https://yourcompany.com"
              className="focus-ring h-12 pl-12 text-base"
            />
            <Globe className="text-muted-foreground absolute left-4 top-1/2 size-5 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground text-xs">
            We'll analyze your website to better understand your brand and
            create personalized responses.
          </p>
        </div>

        {/* Benefits */}
        <div className="bg-muted/30 space-y-3 rounded-xl p-4">
          <h3 className="text-sm font-medium">What this helps with:</h3>
          <div className="text-muted-foreground space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <ChevronRight className="text-primary size-4" />
              <span>AI learns your brand voice and tone</span>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="text-primary size-4" />
              <span>Better context for Reddit responses</span>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="text-primary size-4" />
              <span>More accurate lead qualification</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            type="submit"
            className="h-12 w-full rounded-xl text-base font-semibold"
            disabled={isValidating}
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Analyzing Website...
              </>
            ) : (
              "Continue"
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground h-12 w-full"
            disabled={isValidating}
          >
            Skip for now
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onPrevious}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2"
            disabled={isValidating}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div></div>
        </div>
      </form>
    </motion.div>
  )
}
