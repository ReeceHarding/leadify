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
  Rocket,
  Trophy,
  Sparkles,
  Target,
  TrendingUp,
  Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

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

  const summaryItems = [
    {
      icon: Users,
      title: data.name,
      subtitle: "Your profile",
      completed: true,
      color: "blue"
    },
    {
      icon: Globe,
      title: data.website ? "Website Connected" : "No Website",
      subtitle: data.website || "Website can be added later",
      completed: !!data.website,
      color: "green",
      optional: !data.website
    },
    {
      icon: Hash,
      title: `${data.keywords.length} Keywords Ready`,
      subtitle:
        data.keywords.slice(0, 2).join(", ") +
        (data.keywords.length > 2 ? ` +${data.keywords.length - 2} more` : ""),
      completed: data.keywords.length > 0,
      color: "purple"
    },
    {
      icon: Link,
      title: "Reddit Integration",
      subtitle: data.redditConnected
        ? "Connected for voice analysis"
        : "Can be connected later",
      completed: data.redditConnected,
      color: "orange",
      optional: !data.redditConnected
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* Enhanced Celebration Header */}
      <div className="space-y-6 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: -180 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{
            delay: 0.2,
            duration: 1,
            type: "spring",
            bounce: 0.6
          }}
          className="flex justify-center"
        >
          <div className="relative">
            <div className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-2xl shadow-green-500/25">
              <Trophy className="size-12 text-white" />
            </div>

            {/* Enhanced floating celebration elements */}
            {[
              { emoji: "🎉", delay: 0.5, position: "-right-3 -top-3" },
              { emoji: "✨", delay: 0.7, position: "-bottom-3 -left-3" },
              { emoji: "🚀", delay: 0.9, position: "-top-3 -left-3" },
              { emoji: "🎯", delay: 1.1, position: "-bottom-3 -right-3" }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0, rotate: 180 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  rotate: 0,
                  y: [0, -10, 0]
                }}
                transition={{
                  delay: item.delay,
                  duration: 0.6,
                  y: {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }
                }}
                className={`absolute ${item.position} text-2xl`}
              >
                {item.emoji}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="space-y-3"
        >
          <h2 className="gradient-text text-4xl font-bold">Setup Complete!</h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed">
            Congratulations! Your AI-powered lead generation system is ready to
            find and engage with qualified prospects on Reddit.
          </p>
        </motion.div>
      </div>

      {/* Enhanced Setup Summary */}
      <Card className="shadow-glow border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
                Your Configuration Summary
              </h3>
              <p className="text-muted-foreground">
                Everything is set up and ready to start generating leads
              </p>
            </div>

            <div className="grid gap-4">
              {summaryItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                >
                  <div
                    className={`
                    flex items-center gap-4 rounded-xl p-4 transition-all duration-300
                    ${
                      item.completed
                        ? "border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                        : "border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                    }
                  `}
                  >
                    <div
                      className={`
                      flex size-12 items-center justify-center rounded-xl
                      ${item.color === "blue" && item.completed ? "bg-blue-100 dark:bg-blue-950" : ""}
                      ${item.color === "green" && item.completed ? "bg-green-100 dark:bg-green-950" : ""}
                      ${item.color === "purple" && item.completed ? "bg-purple-100 dark:bg-purple-950" : ""}
                      ${item.color === "orange" && item.completed ? "bg-orange-100 dark:bg-orange-950" : ""}
                      ${!item.completed ? "bg-gray-100 dark:bg-gray-800" : ""}
                    `}
                    >
                      <item.icon
                        className={`
                        size-6
                        ${item.color === "blue" && item.completed ? "text-blue-600" : ""}
                        ${item.color === "green" && item.completed ? "text-green-600" : ""}
                        ${item.color === "purple" && item.completed ? "text-purple-600" : ""}
                        ${item.color === "orange" && item.completed ? "text-orange-600" : ""}
                        ${!item.completed ? "text-gray-400" : ""}
                      `}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {item.title}
                      </p>
                      <p className="text-muted-foreground truncate text-sm">
                        {item.subtitle}
                      </p>
                    </div>

                    {item.completed ? (
                      <CheckCircle2 className="size-6 text-green-600" />
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {item.optional ? "Optional" : "Pending"}
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Next Steps Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <Card className="shadow-glow overflow-hidden border-0 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700">
          <CardContent className="relative p-8">
            <div className="relative z-10 space-y-6 text-center text-white">
              <div className="flex justify-center">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="flex size-16 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm"
                >
                  <Rocket className="size-8" />
                </motion.div>
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-bold">Ready to Launch!</h3>
                <p className="mx-auto max-w-md leading-relaxed text-white/90">
                  Your AI-powered lead generation system will monitor Reddit
                  24/7, identifying opportunities and helping you engage
                  authentically with potential customers.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-3">
                <div className="flex items-center gap-3 text-white/80">
                  <Target className="size-5" />
                  <span className="text-sm font-medium">Smart Targeting</span>
                </div>
                <div className="flex items-center gap-3 text-white/80">
                  <Sparkles className="size-5" />
                  <span className="text-sm font-medium">AI Responses</span>
                </div>
                <div className="flex items-center gap-3 text-white/80">
                  <TrendingUp className="size-5" />
                  <span className="text-sm font-medium">
                    Real-time Analytics
                  </span>
                </div>
              </div>
            </div>

            {/* Enhanced decorative background elements */}
            <div className="absolute right-0 top-0 size-40 -translate-y-20 translate-x-20 rounded-full bg-white/5" />
            <div className="absolute bottom-0 left-0 size-32 -translate-x-16 translate-y-16 rounded-full bg-white/5" />
            <div className="absolute right-1/4 top-1/2 size-6 animate-pulse rounded-full bg-white/10" />
            <div
              className="absolute bottom-1/4 left-1/3 size-4 animate-pulse rounded-full bg-white/10"
              style={{ animationDelay: "1s" }}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Action Buttons */}
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <Button
            onClick={handleComplete}
            disabled={isCompleting}
            className="h-16 w-full rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-green-700 hover:to-green-800 hover:shadow-xl disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCompleting ? (
              <>
                <Loader2 className="mr-3 size-6 animate-spin" />
                Creating your lead generation campaign...
              </>
            ) : (
              <>
                <Rocket className="mr-3 size-6" />
                Start Finding Leads Now
              </>
            )}
          </Button>
        </motion.div>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onPrevious}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-lg px-4 py-2 transition-colors"
            disabled={isCompleting}
          >
            <ArrowLeft className="size-4" />
            Back to Reddit Setup
          </Button>

          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Trophy className="size-4 text-yellow-600" />
            <span>Setup Complete - Step 5 of 5</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
