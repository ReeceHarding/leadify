"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  CheckCircle2,
  Search,
  MessageSquare,
  TrendingUp,
  Sparkles,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LeadGenerationProgress } from "@/types"
import { motion, AnimatePresence } from "framer-motion"

interface LeadGenerationProgressBarProps {
  progress: LeadGenerationProgress | null
  existingLeadsCount: number
  className?: string
}

export default function LeadGenerationProgressBar({
  progress,
  existingLeadsCount,
  className
}: LeadGenerationProgressBarProps) {
  console.log("🎯🎯🎯 [PROGRESS-BAR] Rendering with:", {
    progress,
    existingLeadsCount,
    hasProgress: !!progress
  })

  if (!progress) return null

  // Calculate the actual progress values
  const totalThreadsToAnalyze = progress.results?.totalThreadsFound || 10
  const threadsAnalyzed = progress.results?.totalThreadsAnalyzed || 0
  const commentsGenerated = progress.results?.totalCommentsGenerated || 0
  
  // Calculate progress percentage based on actual work done
  const progressPercentage = progress.totalProgress || 0
  
  // Get current stage info
  const currentStage = progress.stages?.find(s => s.status === "in_progress") || 
                      progress.stages?.[progress.stages.length - 1]
  
  const currentStageMessage = currentStage?.message || progress.currentStage || "Processing..."
  
  console.log("🎯🎯🎯 [PROGRESS-BAR] Calculated values:", {
    totalThreadsToAnalyze,
    threadsAnalyzed,
    commentsGenerated,
    progressPercentage,
    currentStageMessage
  })

  // Determine icon and color based on status
  const getStatusIcon = () => {
    if (progress.status === "completed") return CheckCircle2
    if (progress.status === "error") return AlertCircle
    if (currentStage?.name === "Searching Reddit") return Search
    if (currentStage?.name === "Analyzing Relevance") return TrendingUp
    if (currentStage?.name === "Generating Comments") return Sparkles
    return MessageSquare
  }

  const getStatusColor = () => {
    if (progress.status === "completed") return "text-green-600 dark:text-green-400"
    if (progress.status === "error") return "text-red-600 dark:text-red-400"
    return "text-blue-600 dark:text-blue-400"
  }

  const getProgressColor = () => {
    if (progress.status === "completed") return "[&>div]:bg-gradient-to-r [&>div]:from-green-400 [&>div]:to-green-600 dark:[&>div]:from-green-500 dark:[&>div]:to-green-700"
    if (progress.status === "error") return "[&>div]:bg-gradient-to-r [&>div]:from-red-400 [&>div]:to-red-600 dark:[&>div]:from-red-500 dark:[&>div]:to-red-700"
    return "[&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-blue-600 dark:[&>div]:from-blue-500 dark:[&>div]:to-blue-700"
  }

  const StatusIcon = getStatusIcon()
  const statusColor = getStatusColor()
  const progressColor = getProgressColor()

  // Calculate total leads (existing + new)
  const totalLeads = existingLeadsCount + commentsGenerated

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={cn("overflow-hidden", className)}>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header with status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon className={cn("size-4", statusColor)} />
                  <span className={cn("text-sm font-medium", statusColor)}>
                    {currentStageMessage}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "transition-colors",
                    progress.status === "completed" && "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
                    progress.status === "error" && "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
                    progress.status === "in_progress" && "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  )}
                >
                  {commentsGenerated} out of {totalLeads} leads
                </Badge>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <Progress 
                  value={progressPercentage} 
                  className={cn("h-2 w-full", progressColor)}
                />
                <div className={cn("flex justify-between text-xs", statusColor)}>
                  <span>
                    {progress.stages?.filter(s => s.status === "completed").length || 0} of {progress.stages?.length || 8} steps completed
                  </span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
              </div>

              {/* Stage indicators */}
              <div className="flex gap-1 pt-2">
                {progress.stages?.map((stage, index) => (
                  <motion.div
                    key={stage.name}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-all duration-300",
                      stage.status === "completed" && (progress.status === "error" ? "bg-red-600 dark:bg-red-400" : "bg-blue-600 dark:bg-blue-400"),
                      stage.status === "in_progress" && "animate-pulse bg-blue-400 dark:bg-blue-500",
                      stage.status === "pending" && "bg-blue-200 dark:bg-blue-800"
                    )}
                    title={stage.name}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
} 