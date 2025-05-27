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
  console.log("🔥🔥🔥 [PROGRESS-BAR] Rendering with:", {
    hasProgress: !!progress,
    status: progress?.status,
    existingLeadsCount,
    newLeadsFound: progress?.results?.totalCommentsGenerated || 0
  })

  if (!progress || progress.status === "completed" || progress.status === "error") {
    console.log("🔥🔥🔥 [PROGRESS-BAR] Not showing - no progress or completed/error")
    return null
  }

  const newLeadsFound = progress.results?.totalCommentsGenerated || 0
  const totalLeads = existingLeadsCount + newLeadsFound
  const currentStage = progress.currentStage || "Initializing..."
  
  // Calculate progress percentage based on stages
  const completedStages = progress.stages.filter(s => s.status === "completed").length
  const totalStages = progress.stages.length
  const progressPercentage = totalStages > 0 ? (completedStages / totalStages) * 100 : 0

  // Get icon for current stage
  const getStageIcon = (stageName: string) => {
    if (stageName.includes("Search")) return <Search className="size-4" />
    if (stageName.includes("Analyz")) return <TrendingUp className="size-4" />
    if (stageName.includes("Generat")) return <Sparkles className="size-4" />
    if (stageName.includes("Thread")) return <MessageSquare className="size-4" />
    return <Loader2 className="size-4 animate-spin" />
  }

  console.log("🔥🔥🔥 [PROGRESS-BAR] Progress details:", {
    currentStage,
    completedStages,
    totalStages,
    progressPercentage,
    newLeadsFound,
    totalLeads
  })

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={cn("border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20", className)}>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header with stage info and lead count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStageIcon(currentStage)}
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {currentStage}
                  </span>
                </div>
                <Badge 
                  variant="secondary" 
                  className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                >
                  {newLeadsFound} out of {totalLeads} leads
                </Badge>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <Progress 
                  value={progressPercentage} 
                  className="h-2 w-full [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-blue-600 dark:[&>div]:from-blue-500 dark:[&>div]:to-blue-700"
                />
                <div className="flex justify-between text-xs text-blue-700 dark:text-blue-300">
                  <span>{completedStages} of {totalStages} steps completed</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
              </div>

              {/* Additional info */}
              {progress.results && (
                <div className="grid grid-cols-3 gap-2 border-t border-blue-200 pt-2 dark:border-blue-800">
                  <div className="text-center">
                    <div className="text-xs text-blue-600 dark:text-blue-400">Threads Found</div>
                    <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      {progress.results.totalThreadsFound || 0}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-blue-600 dark:text-blue-400">Analyzed</div>
                    <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      {progress.results.totalThreadsAnalyzed || 0}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-blue-600 dark:text-blue-400">New Leads</div>
                    <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      {newLeadsFound}
                    </div>
                  </div>
                </div>
              )}

              {/* Stage indicators */}
              <div className="flex gap-1 pt-2">
                {progress.stages.map((stage, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-all duration-300",
                      stage.status === "completed" 
                        ? "bg-blue-600 dark:bg-blue-400" 
                        : stage.status === "in_progress"
                        ? "animate-pulse bg-blue-400 dark:bg-blue-500"
                        : "bg-blue-200 dark:bg-blue-800"
                    )}
                    title={stage.name}
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