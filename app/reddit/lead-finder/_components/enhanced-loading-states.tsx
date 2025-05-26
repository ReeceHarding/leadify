"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  MessageSquare,
  TrendingUp,
  Clock,
  Hash,
  ThumbsUp
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LeadGenerationProgress as WorkflowProgressFromTypes } from "@/types"

interface LoadingStateProps {
  title?: string
  description?: string
  progress?: number
  currentStep?: number
  totalSteps?: number
  className?: string
}

export function LoadingProgress({
  title = "Loading...",
  description,
  progress,
  currentStep,
  totalSteps,
  className
}: LoadingStateProps) {
  const calculatedProgress =
    progress ||
    (currentStep && totalSteps ? (currentStep / totalSteps) * 100 : 0)

  return (
    <Card className={cn("shadow-lg dark:border-gray-700", className)}>
      <CardHeader className="border-b p-4 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Loader2 className="size-6 animate-spin text-blue-500" />
            <div className="absolute inset-0 animate-ping">
              <Loader2 className="size-6 text-blue-500 opacity-20" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {calculatedProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
              <span>Progress</span>
              <span>{Math.round(calculatedProgress)}%</span>
            </div>
            <Progress
              value={calculatedProgress}
              className="h-2.5 w-full [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-blue-600 dark:[&>div]:from-blue-500 dark:[&>div]:to-blue-700"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function EnhancedLeadSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
      {[...Array(6)].map((_, index) => (
        <Card
          key={index}
          className="flex flex-col rounded-xl border bg-white shadow-lg transition-all duration-300 dark:border-gray-700 dark:bg-gray-800"
        >
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="absolute -bottom-1 -right-1 size-3 animate-pulse rounded-full bg-green-400" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-5 w-24 rounded-md" />
                  <Skeleton className="h-3 w-16 rounded-md" />
                </div>
              </div>
              <Skeleton className="size-9 rounded-md" />
            </div>
          </CardHeader>
          <CardContent className="flex grow flex-col space-y-5">
            {/* Post Content Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-5 w-full rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />

              {/* Meta info skeleton */}
              <div className="flex items-center gap-4 pt-1">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="size-3.5 rounded-full" />
                  <Skeleton className="h-3 w-8 rounded-md" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Skeleton className="size-3.5 rounded-full" />
                  <Skeleton className="h-3 w-12 rounded-md" />
                </div>
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            </div>

            {/* Score Section Skeleton */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/30">
              <div className="mb-1.5 flex items-center justify-between">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="mt-1 h-3 w-5/6 rounded-md" />
            </div>

            {/* Comment Section Skeleton */}
            <div className="grow space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28 rounded-md" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-20 rounded-md" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              </div>

              {/* Comment content skeleton with animation */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-full animate-pulse rounded-md" />
                <Skeleton className="h-4 w-11/12 animate-pulse rounded-md [animation-delay:100ms]" />
                <Skeleton className="h-4 w-4/5 animate-pulse rounded-md [animation-delay:200ms]" />
                <Skeleton className="h-4 w-3/4 animate-pulse rounded-md [animation-delay:300ms]" />
              </div>

              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="size-7 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface StepIndicatorProps {
  steps: Array<{
    name: string
    status: "completed" | "current" | "pending"
    icon?: React.ReactNode
  }>
  className?: string
}

export function StepIndicator({ steps, className }: StepIndicatorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {steps.map((step, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center gap-3 rounded-lg p-3 transition-all",
            step.status === "current" && "bg-blue-50 dark:bg-blue-900/20",
            step.status === "completed" && "opacity-70"
          )}
        >
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-full",
              step.status === "completed" &&
                "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
              step.status === "current" &&
                "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
              step.status === "pending" &&
                "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
            )}
          >
            {step.status === "completed" ? (
              <CheckCircle2 className="size-5" />
            ) : step.status === "current" ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              step.icon || <div className="size-2 rounded-full bg-current" />
            )}
          </div>
          <span
            className={cn(
              "text-sm font-medium",
              step.status === "current" && "text-blue-700 dark:text-blue-300",
              step.status === "completed" && "text-gray-600 dark:text-gray-400",
              step.status === "pending" && "text-gray-400 dark:text-gray-600"
            )}
          >
            {step.name}
          </span>
        </div>
      ))}
    </div>
  )
}

interface GenerationProgressProps {
  progress: WorkflowProgressFromTypes
  className?: string
}

export function GenerationProgress({
  progress,
  className
}: GenerationProgressProps) {
  const currentStep = progress.currentStage || "Processing..."
  const completedSteps = progress.stages.filter(
    s => s.status === "completed"
  ).length
  const totalSteps = progress.stages.length
  const foundLeads = progress.results?.totalCommentsGenerated || 0

  const steps: Array<{
    name: string
    status: "completed" | "current" | "pending"
    icon?: React.ReactNode
  }> = [
    {
      name: "Fetching Keywords",
      status:
        completedSteps >= 1
          ? "completed"
          : completedSteps === 0
            ? "current"
            : "pending",
      icon: <Hash className="size-4" />
    },
    {
      name: "Searching Reddit",
      status:
        completedSteps >= 2
          ? "completed"
          : completedSteps === 1
            ? "current"
            : "pending",
      icon: <MessageSquare className="size-4" />
    },
    {
      name: "Scoring Relevance",
      status:
        completedSteps >= 3
          ? "completed"
          : completedSteps === 2
            ? "current"
            : "pending",
      icon: <TrendingUp className="size-4" />
    },
    {
      name: "Generating Comments",
      status:
        completedSteps >= 4
          ? "completed"
          : completedSteps === 3
            ? "current"
            : "pending",
      icon: <Sparkles className="size-4" />
    }
  ]

  return (
    <Card className={cn("shadow-lg dark:border-gray-700", className)}>
      <CardHeader className="border-b p-4 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Lead Generation Progress
          </h3>
          {foundLeads > 0 && (
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {foundLeads} leads found
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
              <span>{currentStep}</span>
              <span>{Math.round((completedSteps / totalSteps) * 100)}%</span>
            </div>
            <Progress
              value={(completedSteps / totalSteps) * 100}
              className="h-3 w-full [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-blue-600 dark:[&>div]:from-blue-500 dark:[&>div]:to-blue-700"
            />
          </div>

          <StepIndicator steps={steps} />
        </div>
      </CardContent>
    </Card>
  )
}

interface InlineLoadingProps {
  text?: string
  className?: string
}

export function InlineLoading({
  text = "Loading...",
  className
}: InlineLoadingProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400",
        className
      )}
    >
      <Loader2 className="size-4 animate-spin" />
      <span>{text}</span>
    </div>
  )
}

interface ProcessingIndicatorProps {
  title: string
  description?: string
  current: number
  total: number
  className?: string
}

export function ProcessingIndicator({
  title,
  description,
  current,
  total,
  className
}: ProcessingIndicatorProps) {
  const percentage = Math.round((current / total) * 100)

  return (
    <div
      className={cn(
        "rounded-lg border bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/20",
        className
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="size-5 animate-spin text-blue-600 dark:text-blue-400" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {title}
              </h4>
              {description && (
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {description}
                </p>
              )}
            </div>
          </div>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {current} / {total}
          </span>
        </div>
        <Progress
          value={percentage}
          className="h-2 w-full [&>div]:bg-blue-600 dark:[&>div]:bg-blue-400"
        />
      </div>
    </div>
  )
}
