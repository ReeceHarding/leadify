"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Play,
  Loader2,
  CheckCircle2,
  Hash,
  Globe,
  Link,
  Rocket
} from "lucide-react"
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
      className="space-y-6"
    >
      {/* Celebration Header */}
      <div className="space-y-4 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.2,
            duration: 0.8,
            type: "spring",
            bounce: 0.4
          }}
          className="flex justify-center"
        >
          <div className="relative">
            <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600">
              <CheckCircle2 className="size-10 text-white" />
            </div>
            {/* Floating celebration elements */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="absolute -right-2 -top-2 text-2xl"
            >
              🎉
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="absolute -bottom-2 -left-2 text-xl"
            >
              ✨
            </motion.div>
          </div>
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Setup Complete!</h2>
          <p className="text-muted-foreground">
            Your Lead Finder account is ready to start generating qualified
            leads
          </p>
        </div>
      </div>

      {/* Setup Summary */}
      <div className="space-y-4">
        <h3 className="text-center font-semibold">Your Configuration</h3>

        <div className="grid gap-3">
          {/* Profile Summary */}
          <div className="bg-card flex items-center gap-3 rounded-xl border p-4">
            <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
              <div className="from-primary to-primary/80 flex size-6 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white">
                {data.name
                  .split(" ")
                  .map(n => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
            </div>
            <div className="flex-1">
              <p className="font-medium">{data.name}</p>
              <p className="text-muted-foreground text-sm">Your profile</p>
            </div>
            <CheckCircle2 className="size-5 text-green-600" />
          </div>

          {/* Website Summary */}
          {data.website && (
            <div className="bg-card flex items-center gap-3 rounded-xl border p-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Globe className="size-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Website Connected</p>
                <p className="text-muted-foreground truncate text-sm">
                  {data.website}
                </p>
              </div>
              <CheckCircle2 className="size-5 text-green-600" />
            </div>
          )}

          {/* Keywords Summary */}
          <div className="bg-card flex items-center gap-3 rounded-xl border p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10">
              <Hash className="size-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {data.keywords.length} Keywords Ready
              </p>
              <p className="text-muted-foreground text-sm">
                {data.keywords.slice(0, 3).join(", ")}
                {data.keywords.length > 3 &&
                  ` +${data.keywords.length - 3} more`}
              </p>
            </div>
            <CheckCircle2 className="size-5 text-green-600" />
          </div>

          {/* Reddit Connection */}
          <div className="bg-card flex items-center gap-3 rounded-xl border p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#FF4500]/10">
              <Link className="size-5 text-[#FF4500]" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Reddit Integration</p>
              <p className="text-muted-foreground text-sm">
                {data.redditConnected
                  ? "Connected for voice analysis"
                  : "Not connected"}
              </p>
            </div>
            {data.redditConnected ? (
              <CheckCircle2 className="size-5 text-green-600" />
            ) : (
              <Badge variant="secondary" className="text-xs">
                Optional
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Next Steps Card */}
      <div className="from-primary via-primary to-primary/80 relative overflow-hidden rounded-xl bg-gradient-to-br p-6 text-white">
        <div className="relative z-10 space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Rocket className="size-6" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Ready to Launch!</h3>
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              Your AI-powered lead generation is ready. We'll monitor Reddit
              24/7 for opportunities matching your keywords and help you engage
              with potential customers authentically.
            </p>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute right-0 top-0 size-32 -translate-y-16 translate-x-16 rounded-full bg-white/5" />
        <div className="absolute bottom-0 left-0 size-24 -translate-x-12 translate-y-12 rounded-full bg-white/5" />
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        <Button
          onClick={handleComplete}
          disabled={isCompleting}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-base font-semibold text-white hover:from-green-700 hover:to-green-800"
        >
          {isCompleting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Creating your campaign...
            </>
          ) : (
            <>
              <Rocket className="mr-2 size-4" />
              Start Finding Leads
            </>
          )}
        </Button>

        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onPrevious}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2"
            disabled={isCompleting}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>

          <div className="text-muted-foreground text-sm">
            🚀 Ready to launch
          </div>
        </div>
      </div>
    </motion.div>
  )
}
