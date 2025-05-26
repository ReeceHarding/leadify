"use client"

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
  MessageCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ErrorStateProps {
  error: string
  onRetry?: () => void
  className?: string
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

function getErrorInfo(error: string): {
  title: string
  description: string
  icon: React.ReactNode
  actions: ErrorAction[]
  type: "warning" | "error" | "info"
} {
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

  if (error.includes("Reddit auth") || error.includes("authenticate")) {
    return {
      title: "Reddit Authentication Required",
      description: "You need to authenticate with Reddit to post comments.",
      icon: <ShieldAlert className="size-6" />,
      actions: [
        {
          label: "Authenticate with Reddit",
          action: () => (window.location.href = "/api/reddit/auth"),
          icon: <ExternalLink className="size-4" />,
          variant: "default"
        }
      ],
      type: "warning"
    }
  }

  if (error.includes("Rate limit")) {
    return {
      title: "Rate Limit Exceeded",
      description:
        "You've hit Reddit's rate limit. Please wait a few minutes before trying again.",
      icon: <Clock className="size-6" />,
      actions: [
        {
          label: "Try Again Later",
          action: () => window.location.reload(),
          icon: <Clock className="size-4" />,
          variant: "outline"
        }
      ],
      type: "warning"
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

export function EnhancedErrorState({
  error,
  onRetry,
  className
}: ErrorStateProps) {
  const errorInfo = getErrorInfo(error)

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
            {errorInfo.icon}
          </div>
          <div className="space-y-1">
            <CardTitle
              className={cn(
                "text-lg",
                errorInfo.type === "error" && "text-red-900 dark:text-red-100",
                errorInfo.type === "warning" &&
                  "text-amber-900 dark:text-amber-100",
                errorInfo.type === "info" && "text-blue-900 dark:text-blue-100"
              )}
            >
              {errorInfo.title}
            </CardTitle>
            <CardDescription
              className={cn(
                errorInfo.type === "error" && "text-red-700 dark:text-red-300",
                errorInfo.type === "warning" &&
                  "text-amber-700 dark:text-amber-300",
                errorInfo.type === "info" && "text-blue-700 dark:text-blue-300"
              )}
            >
              {errorInfo.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {errorInfo.actions.map((action, index) => (
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
  const errorInfo = getErrorInfo(error)

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
