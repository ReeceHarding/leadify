"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Globe, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface WebsiteStepProps {
  data: {
    website: string
    businessName: string // This will be the organizationName
  }
  onUpdate: (data: Partial<{ website: string; businessName?: string }>) => void
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
      // If website is empty, but business name might have been updated
      onUpdate({ website: "", businessName: data.businessName }) 
      onNext()
      return
    }

    const normalizedUrl = normalizeUrl(data.website)

    if (!validateUrl(normalizedUrl)) {
      alert("Please enter a valid website URL")
      return
    }

    setIsValidating(true)

    // Update the website URL and potentially businessName if it was editable here
    onUpdate({ website: normalizedUrl, businessName: data.businessName })

    // Simulate validation delay
    setTimeout(() => {
      setIsValidating(false)
      onNext()
    }, 1000)
  }

  const handleSkip = () => {
    onUpdate({ website: "", businessName: data.businessName }) // Pass businessName if it was changed
    onNext()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-8 text-center"
    >
      <div className="space-y-4">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-blue-700">
          <span className="text-2xl font-bold text-white">2</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Connect Your Website</h1>
        <p className="text-base leading-relaxed text-gray-400">
          Add your business website so our AI can learn about your products,
          services, and unique value proposition.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Website Input */}
        <div className="space-y-3">
          <Label
            htmlFor="website"
            className="text-sm font-medium text-gray-300"
          >
            What's your business website?
          </Label>
          <div className="relative">
            <Input
              id="website"
              type="text"
              value={data.website}
              onChange={e => onUpdate({ website: e.target.value, businessName: data.businessName })}
              placeholder="Enter your website URL (e.g., https://mycompany.com)"
              className="rounded-lg border-gray-600 bg-gray-900 py-3 pl-12 text-center text-base text-white placeholder:text-gray-500"
            />
            <Globe className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gray-500" />
          </div>
          <p className="text-xs text-gray-500">
            Our AI will study your website to understand your services, target
            market, and brand voice
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col space-y-3">
          <Button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700"
            disabled={isValidating}
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Analyzing Website...
              </>
            ) : (
              "Continue →"
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            className="w-full text-gray-400 hover:text-gray-200"
            disabled={isValidating}
          >
            Skip for now →
          </Button>
        </div>

        {/* Back Button */}
        <Button
          type="button"
          variant="ghost"
          onClick={onPrevious}
          className="flex w-full items-center justify-center text-gray-400 hover:text-gray-200"
          disabled={isValidating}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
      </form>
    </motion.div>
  )
}
