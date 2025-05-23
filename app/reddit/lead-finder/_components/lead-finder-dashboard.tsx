"use client"

import { useState, useEffect } from "react"
import {
  Plus,
  Search,
  Target,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Eye,
  Copy,
  ExternalLink,
  User,
  Calendar,
  ThumbsUp,
  Sparkles,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import CreateCampaignDialog from "./create-campaign-dialog"
import CampaignsList from "./campaigns-list"
import { runFullLeadGenerationWorkflowAction } from "@/actions/lead-generation/workflow-actions"
import { getGeneratedCommentsByCampaignAction } from "@/actions/db/lead-generation-actions"

interface LeadResult {
  id: string
  author: string
  subreddit: string
  title: string
  content: string
  score: number
  comments: number
  timeAgo: string
  generatedComment: string
  commentLength: "micro" | "medium" | "verbose"
  url: string
  relevanceScore: number
}

interface WorkflowProgress {
  currentStep: string
  completedSteps: number
  totalSteps: number
  isLoading: boolean
  error?: string
}

export default function LeadFinderDashboard() {
  const [selectedLength, setSelectedLength] = useState<
    "micro" | "medium" | "verbose"
  >("medium")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [leads, setLeads] = useState<LeadResult[]>([])
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowProgress>({
    currentStep: "Initializing...",
    completedSteps: 0,
    totalSteps: 6,
    isLoading: false
  })
  const [campaignId, setCampaignId] = useState<string | null>(null)

  // Get keywords from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const keywordsParam = urlParams.get("keywords")

    if (keywordsParam) {
      const keywords = JSON.parse(decodeURIComponent(keywordsParam))
      if (keywords.length > 0) {
        startLeadGeneration(keywords)
      }
    }
  }, [])

  const startLeadGeneration = async (keywords: string[]) => {
    try {
      setWorkflowProgress({
        currentStep: "Starting lead generation workflow...",
        completedSteps: 0,
        totalSteps: 6,
        isLoading: true
      })

      // For now, we'll create a campaign with the keywords
      // In a real implementation, this would come from the onboarding flow
      const mockCampaignId = "campaign_" + Date.now()
      setCampaignId(mockCampaignId)

      // Start the workflow
      const result = await runFullLeadGenerationWorkflowAction(mockCampaignId)

      if (result.isSuccess) {
        // Fetch the results
        await fetchResults(mockCampaignId)
        setWorkflowProgress({
          currentStep: "Complete!",
          completedSteps: 6,
          totalSteps: 6,
          isLoading: false
        })
      } else {
        setWorkflowProgress({
          currentStep: "Error occurred",
          completedSteps: 0,
          totalSteps: 6,
          isLoading: false,
          error: result.message
        })
      }
    } catch (error) {
      console.error("Error in lead generation:", error)
      setWorkflowProgress({
        currentStep: "Error occurred",
        completedSteps: 0,
        totalSteps: 6,
        isLoading: false,
        error: "Failed to start lead generation"
      })
    }
  }

  const fetchResults = async (campaignId: string) => {
    try {
      const results = await getGeneratedCommentsByCampaignAction(campaignId)
      if (results.isSuccess) {
        // Transform the results into our display format
        const transformedLeads: LeadResult[] = results.data.map(
          (result: any) => ({
            id: result.id,
            author: result.author || "unknown",
            subreddit: result.subreddit || "entrepreneur",
            title: result.title,
            content: result.content,
            score: result.relevanceScore || result.score || 85,
            comments: result.numComments || 25,
            timeAgo: getTimeAgo(result.createdAt),
            generatedComment:
              result[`${selectedLength}Comment`] ||
              result.mediumComment ||
              "Great insights!",
            commentLength: selectedLength,
            url: result.url || "#",
            relevanceScore: result.relevanceScore || 85
          })
        )
        setLeads(transformedLeads)
      }
    } catch (error) {
      console.error("Error fetching results:", error)
    }
  }

  const getTimeAgo = (timestamp: any): string => {
    // Simple time ago calculation
    const now = Date.now()
    const diff = now - (timestamp?.seconds * 1000 || now - 7200000) // Default to 2h ago
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[...Array(6)].map((_, index) => (
        <Card key={index} className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="size-10" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-8" />
              </div>
            </div>
            <div className="h-px bg-gray-200 dark:bg-gray-700" />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
              <Skeleton className="h-16 w-full rounded-md" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="size-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderWorkflowProgress = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {workflowProgress.isLoading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : workflowProgress.error ? (
              <AlertCircle className="size-5 text-red-500" />
            ) : (
              <CheckCircle2 className="size-5 text-green-500" />
            )}
            Lead Generation Progress
          </CardTitle>
          <CardDescription>
            {workflowProgress.error
              ? "An error occurred"
              : workflowProgress.currentStep}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Progress</span>
              <span>
                {Math.round(
                  (workflowProgress.completedSteps /
                    workflowProgress.totalSteps) *
                    100
                )}
                % Complete
              </span>
            </div>
            <Progress
              value={
                (workflowProgress.completedSteps /
                  workflowProgress.totalSteps) *
                100
              }
              className="w-full"
            />
            {workflowProgress.error && (
              <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {workflowProgress.error}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {workflowProgress.isLoading && renderLoadingSkeleton()}
    </div>
  )

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold dark:text-gray-100">Results</h1>
            <div className="flex items-center gap-4">
              <Select
                value={selectedLength}
                onValueChange={(value: any) => setSelectedLength(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="micro">Micro</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="verbose">Verbose</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600"
              >
                <Plus className="mr-2 size-4" />
                New Campaign
              </Button>
            </div>
          </div>

          {/* Show progress or results */}
          {workflowProgress.isLoading || leads.length === 0 ? (
            renderWorkflowProgress()
          ) : (
            /* Results Grid */
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {leads.map(lead => (
                <Card
                  key={lead.id}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarFallback className="text-xs">
                            {lead.author.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium dark:text-gray-100">
                          {lead.author}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          @{lead.author}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                          <Copy className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Post Content */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium dark:text-gray-100">
                        {lead.title}
                      </h3>
                      <p className="line-clamp-3 text-sm text-gray-600 dark:text-gray-400">
                        {lead.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="size-3" />
                          {lead.score}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="size-3" />
                          {lead.comments}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {lead.timeAgo}
                        </span>
                      </div>
                    </div>

                    {/* Generated Comment */}
                    <div className="space-y-2 border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Generated Comment
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Score: {lead.relevanceScore}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(lead.generatedComment)
                            }
                          >
                            Add to drafts
                          </Button>
                        </div>
                      </div>
                      <p className="rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-800 dark:text-gray-200">
                        {lead.generatedComment}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs capitalize text-gray-500 dark:text-gray-400">
                          {lead.commentLength} length
                        </span>
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={lead.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Campaign Dialog */}
      <CreateCampaignDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false)
        }}
      />
    </div>
  )
}
