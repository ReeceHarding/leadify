"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Settings,
  Target,
  WifiOff,
  ShieldAlert,
  FileWarning,
  ArrowRight,
  Clock,
  CheckCircle,
  MessageCircle,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { classifyErrorAction, generateErrorSolutionAction } from "@/actions/integrations/openai/intelligent-error-classification-actions"

interface ErrorStateProps {
  error: string
  onRetry?: () => void
  className?: string
  context?: {
    component?: string
    userAction?: string
    systemState?: string
  }
}

interface ErrorAction {
  label: string
  action: () => void
  icon?: React.ReactNode
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive"
}

interface IntelligentErrorInfo {
  title: string
  description: string
  icon: React.ReactNode
  actions: ErrorAction[]
  type: "warning" | "error" | "info"
  isLoading: boolean
  quickFix?: string
  stepByStepGuide?: string[]
}

// Fallback function for when LLM classification fails
function getFallbackErrorInfo(error: string): Omit<IntelligentErrorInfo, 'isLoading'> {
  if (error.includes("No valid Reddit access token") || error.includes("Please reconnect your Reddit account")) {
    return {
      title: "Reddit Connection Required",
      description:
        "To find and generate leads, you need to connect your Reddit account. This allows us to search Reddit and analyze discussions on your behalf.",
      icon: <ShieldAlert className="size-6" />,
      actions: [
        {
          label: "Connect Reddit Account",
          action: () => (window.location.href = "/reddit/settings"),
          icon: <ExternalLink className="size-4" />,
          variant: "default"
        }
      ],
      type: "warning"
    }
  }

  if (error.includes("No keywords found")) {
    return {
      title: "No Keywords Found",
      description:
        "You need to set up your lead generation keywords before we can find Reddit posts.",
      icon: <Target className="size-6" />,
      actions: [
        {
          label: "Complete Onboarding",
          action: () => (window.location.href = "/onboarding"),
          icon: <ArrowRight className="size-4" />,
          variant: "default"
        }
      ],
      type: "info"
    }
  }

  if (error.includes("Failed to connect") || error.includes("Network error")) {
    return {
      title: "Connection Error",
      description:
        "We're having trouble connecting to the server. Please check your internet connection and try again.",
      icon: <WifiOff className="size-6" />,
      actions: [
        {
          label: "Retry Connection",
          action: () => window.location.reload(),
          icon: <RefreshCw className="size-4" />,
          variant: "default"
        }
      ],
      type: "error"
    }
  }

  // Default error
  return {
    title: "Something went wrong",
    description: error || "An unexpected error occurred. Please try again.",
    icon: <AlertCircle className="size-6" />,
    actions: [
      {
        label: "Try Again",
        action: () => window.location.reload(),
        icon: <RefreshCw className="size-4" />,
        variant: "default"
      }
    ],
    type: "error"
  }
}

// Hook for intelligent error classification
function useIntelligentErrorInfo(error: string, context?: ErrorStateProps['context']): IntelligentErrorInfo {
  const [errorInfo, setErrorInfo] = useState<IntelligentErrorInfo>(() => ({
    ...getFallbackErrorInfo(error),
    isLoading: true
  }))

  useEffect(() => {
    const classifyError = async () => {
      console.log("🚨 [ENHANCED-ERROR] Starting intelligent error classification for:", error)
      
      try {
        setErrorInfo(prev => ({ ...prev, isLoading: true }))

        const classificationResult = await classifyErrorAction(error, context)

        if (classificationResult.isSuccess) {
          const classification = classificationResult.data
          console.log("🚨 [ENHANCED-ERROR] Classification successful:", classification.errorType)

          // Generate solution based on classification
          const solutionResult = await generateErrorSolutionAction(classification, {
            technicalLevel: "intermediate",
            preferredSolutionType: "detailed_guide",
            timeAvailable: "few_minutes"
          })

          let actions: ErrorAction[] = []
          
          // Convert suggested actions to UI actions
          if (classification.quickFix) {
            actions.push({
              label: "Quick Fix",
              action: () => {
                // For now, just show an alert with the quick fix
                alert(classification.quickFix)
              },
              icon: <RefreshCw className="size-4" />,
              variant: "default"
            })
          }

          // Add primary suggested actions
          classification.suggestedActions.slice(0, 2).forEach((action, index) => {
            actions.push({
              label: action.length > 20 ? action.substring(0, 20) + "..." : action,
              action: () => {
                if (action.toLowerCase().includes("refresh") || action.toLowerCase().includes("reload")) {
                  window.location.reload()
                } else if (action.toLowerCase().includes("reddit") && action.toLowerCase().includes("connect")) {
                  window.location.href = "/reddit/settings"
                } else if (action.toLowerCase().includes("onboarding") || action.toLowerCase().includes("setup")) {
                  window.location.href = "/onboarding"
                } else {
                  // Generic action - show alert with full instruction
                  alert(action)
                }
              },
              icon: <ArrowRight className="size-4" />,
              variant: index === 0 ? "default" : "outline"
            })
          })

          // Determine icon based on error type
          let icon: React.ReactNode
          switch (classification.errorType) {
            case "authentication":
            case "authorization":
              icon = <ShieldAlert className="size-6" />
              break
            case "network":
              icon = <WifiOff className="size-6" />
              break
            case "rate_limit":
              icon = <Clock className="size-6" />
              break
            case "validation":
            case "user_error":
              icon = <FileWarning className="size-6" />
              break
            case "configuration":
              icon = <Settings className="size-6" />
              break
            default:
              icon = <AlertCircle className="size-6" />
          }

          // Determine type based on severity
          let type: "warning" | "error" | "info"
          switch (classification.severity) {
            case "critical":
            case "high":
              type = "error"
              break
            case "medium":
              type = "warning"
              break
            case "low":
              type = "info"
              break
            default:
              type = "error"
          }

          setErrorInfo({
            title: classification.userFriendlyMessage.split('.')[0] || "Error Occurred",
            description: classification.userFriendlyMessage,
            icon,
            actions,
            type,
            isLoading: false,
            quickFix: classification.quickFix,
            stepByStepGuide: solutionResult.isSuccess ? solutionResult.data.stepByStepGuide : undefined
          })
        } else {
          console.warn("🚨 [ENHANCED-ERROR] Classification failed, using fallback")
          setErrorInfo(prev => ({ ...getFallbackErrorInfo(prev.title), isLoading: false }))
        }
      } catch (error) {
        console.error("🚨 [ENHANCED-ERROR] Error in classification:", error)
        setErrorInfo(prev => ({ ...getFallbackErrorInfo(prev.title), isLoading: false }))
      }
    }

    classifyError()
  }, [error, context])

  return errorInfo
}

export function EnhancedErrorState({
  error,
  onRetry,
  className,
  context
}: ErrorStateProps) {
  const errorInfo = useIntelligentErrorInfo(error, context)

  return (
    <Card
      className={cn(
        "shadow-lg",
        errorInfo.type === "error" && "border-red-200 dark:border-red-700/50",
        errorInfo.type === "warning" &&
          "border-amber-200 dark:border-amber-700/50",
        errorInfo.type === "info" && "border-blue-200 dark:border-blue-700/50",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "rounded-lg p-2",
              errorInfo.type === "error" &&
                "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
              errorInfo.type === "warning" &&
                "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
              errorInfo.type === "info" &&
                "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            )}
          >
            {errorInfo.isLoading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              errorInfo.icon
            )}
          </div>
          <div className="flex-1 space-y-1">
            <CardTitle
              className={cn(
                "text-lg",
                errorInfo.type === "error" && "text-red-900 dark:text-red-100",
                errorInfo.type === "warning" &&
                  "text-amber-900 dark:text-amber-100",
                errorInfo.type === "info" && "text-blue-900 dark:text-blue-100"
              )}
            >
              {errorInfo.isLoading ? "Analyzing error..." : errorInfo.title}
            </CardTitle>
            <CardDescription
              className={cn(
                errorInfo.type === "error" && "text-red-700 dark:text-red-300",
                errorInfo.type === "warning" &&
                  "text-amber-700 dark:text-amber-300",
                errorInfo.type === "info" && "text-blue-700 dark:text-blue-300"
              )}
            >
              {errorInfo.isLoading 
                ? "Please wait while we analyze the error and provide helpful solutions..."
                : errorInfo.description
              }
            </CardDescription>
            
            {/* Show quick fix if available */}
            {!errorInfo.isLoading && errorInfo.quickFix && (
              <div className="mt-3 rounded-md border bg-gray-50 p-3 dark:bg-gray-800">
                <p className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                  Quick Fix:
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {errorInfo.quickFix}
                </p>
              </div>
            )}
            
            {/* Show step-by-step guide if available */}
            {!errorInfo.isLoading && errorInfo.stepByStepGuide && errorInfo.stepByStepGuide.length > 0 && (
              <div className="mt-3 rounded-md border bg-gray-50 p-3 dark:bg-gray-800">
                <p className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  Step-by-step solution:
                </p>
                <ol className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  {errorInfo.stepByStepGuide.map((step, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="font-medium">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {!errorInfo.isLoading && errorInfo.actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || "default"}
              onClick={action.action}
              className={cn(
                "gap-2",
                errorInfo.type === "error" &&
                  action.variant === "default" &&
                  "bg-red-600 hover:bg-red-700",
                errorInfo.type === "warning" &&
                  action.variant === "default" &&
                  "bg-amber-600 hover:bg-amber-700",
                errorInfo.type === "info" &&
                  action.variant === "default" &&
                  "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="gap-2">
              <RefreshCw className="size-4" />
              Custom Retry
            </Button>
          )}
          {errorInfo.isLoading && (
            <Button disabled variant="outline" className="gap-2">
              <Loader2 className="size-4 animate-spin" />
              Analyzing...
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface InlineErrorProps {
  error: string
  onRetry?: () => void
  className?: string
}

export function InlineError({ error, onRetry, className }: InlineErrorProps) {
  const errorInfo = useIntelligentErrorInfo(error)

  return (
    <Alert
      className={cn(
        errorInfo.type === "error" &&
          "border-red-200 bg-red-50 dark:border-red-700/50 dark:bg-red-900/30",
        errorInfo.type === "warning" &&
          "border-amber-200 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-900/30",
        errorInfo.type === "info" &&
          "border-blue-200 bg-blue-50 dark:border-blue-700/50 dark:bg-blue-900/30",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5",
              errorInfo.type === "error" && "text-red-600 dark:text-red-400",
              errorInfo.type === "warning" &&
                "text-amber-600 dark:text-amber-400",
              errorInfo.type === "info" && "text-blue-600 dark:text-blue-400"
            )}
          >
            <AlertCircle className="size-4" />
          </div>
          <div className="space-y-1">
            <AlertTitle
              className={cn(
                "text-sm font-medium",
                errorInfo.type === "error" && "text-red-900 dark:text-red-100",
                errorInfo.type === "warning" &&
                  "text-amber-900 dark:text-amber-100",
                errorInfo.type === "info" && "text-blue-900 dark:text-blue-100"
              )}
            >
              {errorInfo.title}
            </AlertTitle>
            <AlertDescription
              className={cn(
                "text-sm",
                errorInfo.type === "error" && "text-red-700 dark:text-red-300",
                errorInfo.type === "warning" &&
                  "text-amber-700 dark:text-amber-300",
                errorInfo.type === "info" && "text-blue-700 dark:text-blue-300"
              )}
            >
              {errorInfo.description}
            </AlertDescription>
          </div>
        </div>
        {(onRetry || errorInfo.actions.length > 0) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRetry || errorInfo.actions[0]?.action}
            className={cn(
              "gap-1.5",
              errorInfo.type === "error" &&
                "text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300",
              errorInfo.type === "warning" &&
                "text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-300",
              errorInfo.type === "info" &&
                "text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
            )}
          >
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        )}
      </div>
    </Alert>
  )
}

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  title = "No results found",
  description = "Try adjusting your filters or search criteria",
  icon = <MessageCircle className="size-12" />,
  action,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <div className="mb-4 text-gray-400 dark:text-gray-600">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <p className="mb-6 max-w-sm text-sm text-gray-600 dark:text-gray-400">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} className="gap-2">
          <RefreshCw className="size-4" />
          {action.label}
        </Button>
      )}
    </div>
  )
}

interface SuccessStateProps {
  title: string
  description?: string
  actions?: ErrorAction[]
  className?: string
}

export function SuccessState({
  title,
  description,
  actions,
  className
}: SuccessStateProps) {
  return (
    <Card
      className={cn(
        "border-green-200 bg-green-50 shadow-lg dark:border-green-700/50 dark:bg-green-900/30",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-green-100 p-2 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="size-6" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-lg text-green-900 dark:text-green-100">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="text-green-700 dark:text-green-300">
                {description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      {actions && actions.length > 0 && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "default"}
                onClick={action.action}
                className="gap-2"
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
