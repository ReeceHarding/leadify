"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
  const [validationError, setValidationError] = useState("")

  const normalizeUrl = (url: string): string => {
    if (!url) return ""
    url = url.trim()
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url
    }
    return url.replace(/https?:\/\/(www\.)?/, "https://")
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
      onNext()
      return
    }

    const normalizedUrl = normalizeUrl(data.website)

    if (!validateUrl(normalizedUrl)) {
      setValidationError("Please enter a valid website URL")
      return
    }

    onUpdate({ website: normalizedUrl })
    onNext()
  }

  const handleSkip = () => {
    onUpdate({ website: "" })
    onNext()
  }

  return (
    <div className="space-y-8 text-center">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-black">Your Brand Source</h1>
        <p className="mx-auto max-w-lg leading-relaxed text-gray-600">
          Let's add your website to help us understand your brand better. This
          will be used as a reference for accurate content generation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-left">
          <Input
            type="text"
            value={data.website}
            onChange={e => {
              onUpdate({ website: e.target.value })
              if (validationError) setValidationError("")
            }}
            placeholder="https://piedpiper.com"
            className="h-12 border-gray-300 bg-white text-black"
          />
          {validationError && (
            <p className="mt-2 text-sm text-red-600">{validationError}</p>
          )}
        </div>

        <div className="text-sm leading-relaxed text-gray-600">
          We'll analyze your website to create a knowledge base of key
          information for your brand. Don't worry, you can always add or update
          your knowledge base later in the app.
        </div>

        <div className="space-y-3">
          <Button
            type="submit"
            className="h-12 w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            Continue
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            className="h-12 w-full text-gray-600 hover:text-gray-800"
          >
            Skip for now →
          </Button>
        </div>
      </form>
    </div>
  )
}
