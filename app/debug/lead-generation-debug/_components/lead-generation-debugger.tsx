"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Zap,
  Database,
  User,
  Target,
  MessageSquare,
  Play,
  Bug
} from "lucide-react"
import { toast } from "sonner"

// Actions
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import {
  getCampaignsByUserIdAction,
  createCampaignAction
} from "@/actions/db/campaign-actions"
import {
  getGeneratedCommentsByCampaignAction,
  createGeneratedCommentAction
} from "@/actions/db/lead-generation-actions"
import { runFullLeadGenerationWorkflowAction } from "@/actions/lead-generation/workflow-actions"

interface DebugStep {
  name: string
  status: "pending" | "checking" | "success" | "error"
  message?: string
  data?: any
}

export default function LeadGenerationDebugger() {
  const { user, isLoaded } = useUser()
  const [isRunning, setIsRunning] = useState(false)
  const [steps, setSteps] = useState<DebugStep[]>([
    { name: "User Authentication", status: "pending" },
    { name: "Profile Check", status: "pending" },
    { name: "Keywords Check", status: "pending" },
    { name: "Campaign Check", status: "pending" },
    { name: "Comments Check", status: "pending" },
    { name: "Workflow Status", status: "pending" }
  ])
  const [logs, setLogs] = useState<string[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null
  )

  const addLog = (message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}${data ? `: ${JSON.stringify(data, null, 2)}` : ""}`
    console.log(`🐛 DEBUG: ${logEntry}`)
    setLogs(prev => [...prev, logEntry])
  }

  const updateStep = (
    name: string,
    status: DebugStep["status"],
    message?: string,
    data?: any
  ) => {
    setSteps(prev =>
      prev.map(step =>
        step.name === name ? { ...step, status, message, data } : step
      )
    )
    if (message) {
      addLog(`${name}: ${message}`, data)
    }
  }

  const runDiagnostics = async () => {
    if (!user) {
      toast.error("User not authenticated")
      return
    }

    setIsRunning(true)
    setLogs([])
    addLog("Starting diagnostics", { userId: user.id })

    try {
      // Step 1: Check user authentication
      updateStep("User Authentication", "checking")
      if (user && user.id) {
        updateStep("User Authentication", "success", "User authenticated", {
          userId: user.id
        })
      } else {
        updateStep("User Authentication", "error", "User not authenticated")
        return
      }

      // Step 2: Check profile
      updateStep("Profile Check", "checking")
      const profileResult = await getProfileByUserIdAction(user.id)
      if (profileResult.isSuccess) {
        updateStep("Profile Check", "success", "Profile found", {
          name: profileResult.data.name,
          website: profileResult.data.website,
          onboardingCompleted: profileResult.data.onboardingCompleted
        })
      } else {
        updateStep("Profile Check", "error", "Profile not found or incomplete")
        return
      }

      // Step 3: Check keywords
      updateStep("Keywords Check", "checking")
      const keywords = profileResult.data.keywords || []
      if (keywords.length > 0) {
        updateStep(
          "Keywords Check",
          "success",
          `Found ${keywords.length} keywords`,
          { keywords }
        )
      } else {
        updateStep("Keywords Check", "error", "No keywords found")
      }

      // Step 4: Check campaigns
      updateStep("Campaign Check", "checking")
      const campaignsResult = await getCampaignsByUserIdAction(user.id)
      if (campaignsResult.isSuccess && campaignsResult.data.length > 0) {
        const campaigns = campaignsResult.data
        setSelectedCampaignId(campaigns[0].id)
        updateStep(
          "Campaign Check",
          "success",
          `Found ${campaigns.length} campaigns`,
          {
            campaigns: campaigns.map((c: any) => ({
              id: c.id,
              name: c.name,
              status: c.status,
              createdAt: c.createdAt
            }))
          }
        )

        // Step 5: Check comments for each campaign
        updateStep("Comments Check", "checking")
        let totalComments = 0
        for (const campaign of campaigns) {
          const commentsResult = await getGeneratedCommentsByCampaignAction(
            campaign.id
          )
          if (commentsResult.isSuccess) {
            totalComments += commentsResult.data.length
            addLog(
              `Campaign ${campaign.id} has ${commentsResult.data.length} comments`
            )
          }
        }
        updateStep(
          "Comments Check",
          totalComments > 0 ? "success" : "error",
          totalComments > 0
            ? `Found ${totalComments} total comments`
            : "No comments found in any campaign"
        )
      } else {
        updateStep("Campaign Check", "error", "No campaigns found")
        updateStep(
          "Comments Check",
          "error",
          "Cannot check comments without campaigns"
        )
      }

      // Step 6: Check workflow status
      updateStep("Workflow Status", "success", "Diagnostics complete")
    } catch (error) {
      addLog("Diagnostic error", {
        error: error instanceof Error ? error.message : "Unknown error"
      })
      toast.error("Diagnostic failed")
    } finally {
      setIsRunning(false)
    }
  }

  const createTestCampaign = async () => {
    if (!user) return

    try {
      addLog("Creating test campaign")

      // Get profile for website
      const profileResult = await getProfileByUserIdAction(user.id)
      if (!profileResult.isSuccess || !profileResult.data.website) {
        toast.error("Profile missing website information")
        return
      }

      // Create campaign
      const campaignResult = await createCampaignAction({
        userId: user.id,
        name: `Test Campaign - ${new Date().toISOString()}`,
        website: profileResult.data.website,
        keywords: ["test keyword 1", "test keyword 2"]
      })

      if (campaignResult.isSuccess) {
        addLog("Test campaign created", { campaignId: campaignResult.data.id })
        toast.success("Test campaign created!")
        setSelectedCampaignId(campaignResult.data.id)

        // Re-run diagnostics to update status
        await runDiagnostics()
      } else {
        throw new Error(campaignResult.message)
      }
    } catch (error) {
      addLog("Failed to create test campaign", {
        error: error instanceof Error ? error.message : "Unknown error"
      })
      toast.error("Failed to create test campaign")
    }
  }

  const createTestComment = async () => {
    if (!selectedCampaignId) {
      toast.error("No campaign selected")
      return
    }

    try {
      addLog("Creating test comment", { campaignId: selectedCampaignId })

      const testComment = {
        campaignId: selectedCampaignId,
        redditThreadId: `test-thread-${Date.now()}`,
        threadId: `t3_test${Date.now()}`,
        postUrl: `https://reddit.com/r/test/comments/test${Date.now()}/test_post/`,
        postTitle: "Test Post: Looking for business recommendations",
        postAuthor: "test_user",
        postContentSnippet:
          "I'm looking for recommendations on the best tools for my business. We need something that can help with...",
        relevanceScore: 85,
        reasoning:
          "This is a test lead with high relevance score for testing purposes",
        microComment: "Check out our solution at example.com!",
        mediumComment:
          "Based on your needs, I'd recommend checking out our platform. It's specifically designed for businesses like yours and has helped many similar companies streamline their operations.",
        verboseComment:
          "I understand you're looking for business tools. Based on what you've described, I'd strongly recommend taking a look at our platform. We've helped dozens of similar businesses streamline their operations and increase efficiency by up to 40%. Our solution offers comprehensive features including automated workflows, real-time analytics, and seamless integrations with your existing tools. The best part is we offer a 14-day free trial so you can test it out risk-free. Happy to share more details if you're interested!",
        status: "new" as const,
        keyword: "business recommendations",
        postScore: 42
      }

      const result = await createGeneratedCommentAction(testComment)

      if (result.isSuccess) {
        addLog("Test comment created successfully", { id: result.data.id })
        toast.success("Test comment created!")

        // Re-run diagnostics to update counts
        await runDiagnostics()
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      addLog("Failed to create test comment", {
        error: error instanceof Error ? error.message : "Unknown error"
      })
      toast.error("Failed to create test comment")
    }
  }

  const runFullWorkflow = async () => {
    if (!user) return

    try {
      addLog("Starting full workflow")

      // Get profile for keywords and website
      const profileResult = await getProfileByUserIdAction(user.id)
      if (
        !profileResult.isSuccess ||
        !profileResult.data.keywords ||
        profileResult.data.keywords.length === 0
      ) {
        toast.error("No keywords found in profile")
        return
      }

      if (!profileResult.data.website) {
        toast.error("No website found in profile")
        return
      }

      // Create a new campaign first
      const campaignResult = await createCampaignAction({
        userId: user.id,
        name: `Lead Generation - ${new Date().toLocaleDateString()}`,
        website: profileResult.data.website,
        keywords: profileResult.data.keywords
      })

      if (!campaignResult.isSuccess) {
        throw new Error(campaignResult.message)
      }

      const campaignId = campaignResult.data.id
      setSelectedCampaignId(campaignId)
      addLog("Campaign created", { campaignId })

      // Run the workflow with the campaign ID
      const result = await runFullLeadGenerationWorkflowAction(campaignId)

      if (result.isSuccess) {
        addLog("Workflow started successfully", {
          workflowData: result.data
        })
        toast.success("Lead generation workflow started!")
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      addLog("Failed to run workflow", {
        error: error instanceof Error ? error.message : "Unknown error"
      })
      toast.error("Failed to run workflow")
    }
  }

  // Auto-run diagnostics on mount
  useEffect(() => {
    if (isLoaded && user) {
      runDiagnostics()
    }
  }, [isLoaded, user])

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Generation Debug Controls</CardTitle>
          <CardDescription>
            Diagnose and fix issues with the lead generation system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={runDiagnostics} disabled={isRunning}>
              {isRunning ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Run Diagnostics
            </Button>
            <Button
              variant="outline"
              onClick={createTestCampaign}
              disabled={isRunning}
            >
              <Database className="mr-2 size-4" />
              Create Test Campaign
            </Button>
            <Button
              variant="outline"
              onClick={createTestComment}
              disabled={isRunning || !selectedCampaignId}
            >
              <MessageSquare className="mr-2 size-4" />
              Create Test Comment
            </Button>
            <Button
              variant="outline"
              onClick={runFullWorkflow}
              disabled={isRunning}
            >
              <Zap className="mr-2 size-4" />
              Run Full Workflow
            </Button>
          </div>

          {selectedCampaignId && (
            <Alert>
              <AlertCircle className="size-4" />
              <AlertTitle>Selected Campaign</AlertTitle>
              <AlertDescription className="font-mono text-sm">
                {selectedCampaignId}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Diagnostic Results */}
      <Card>
        <CardHeader>
          <CardTitle>Diagnostic Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                {step.status === "pending" && (
                  <Bug className="text-muted-foreground size-4" />
                )}
                {step.status === "checking" && (
                  <Loader2 className="size-4 animate-spin text-blue-500" />
                )}
                {step.status === "success" && (
                  <CheckCircle2 className="size-4 text-green-500" />
                )}
                {step.status === "error" && (
                  <AlertCircle className="size-4 text-red-500" />
                )}
                <div>
                  <div className="font-medium">{step.name}</div>
                  {step.message && (
                    <div className="text-muted-foreground text-sm">
                      {step.message}
                    </div>
                  )}
                </div>
              </div>
              <Badge
                variant={
                  step.status === "success"
                    ? "default"
                    : step.status === "error"
                      ? "destructive"
                      : step.status === "checking"
                        ? "secondary"
                        : "outline"
                }
              >
                {step.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Debug Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
          <CardDescription>
            Detailed execution logs for troubleshooting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full rounded-md border p-4 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-muted-foreground">
                No logs yet. Run diagnostics to see logs.
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-2 whitespace-pre-wrap">
                  {log}
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common fixes for lead generation issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>Common Issues & Solutions</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>
                  <strong>No comments showing:</strong> Click "Create Test
                  Comment" to verify the UI works
                </li>
                <li>
                  <strong>Campaign not found:</strong> Click "Create Test
                  Campaign" to create one
                </li>
                <li>
                  <strong>Workflow not running:</strong> Click "Run Full
                  Workflow" to start lead generation
                </li>
                <li>
                  <strong>No keywords:</strong> Complete onboarding at
                  /onboarding
                </li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
