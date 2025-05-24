"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react"
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
  Loader2,
  Filter,
  ArrowUpDown,
  Hash,
  Edit2,
  PlusCircle,
  RefreshCw,
  Send,
  PlayCircle,
  MinusCircle,
  Bug,
  Database,
  Zap
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import CreateCampaignDialog from "./create-campaign-dialog"
import CampaignsList from "./campaigns-list"
import PostDetailPopup from "./post-detail-popup"
import CommentEditor from "./comment-editor"
import AnimatedCopyButton from "./animated-copy-button"
import posthog from "posthog-js"
import {
  EnhancedLeadSkeleton,
  GenerationProgress,
  InlineLoading,
  ProcessingIndicator
} from "./enhanced-loading-states"
import {
  EnhancedErrorState,
  InlineError,
  EmptyState
} from "./enhanced-error-states"
import { runFullLeadGenerationWorkflowAction } from "@/actions/lead-generation/workflow-actions"
import {
  getGeneratedCommentsByCampaignAction,
  updateGeneratedCommentAction,
  updateGeneratedCommentLengthAction,
  createGeneratedCommentAction
} from "@/actions/db/lead-generation-actions"
import {
  createCampaignAction,
  getCampaignsByUserIdAction,
  getCampaignByIdAction
} from "@/actions/db/campaign-actions"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { regenerateCommentsWithToneAction } from "@/actions/integrations/openai-actions"
import {
  postCommentAndUpdateStatusAction,
  testRedditPostingAction
} from "@/actions/integrations/reddit-posting-actions"
import {
  processPostWithRateLimit,
  queuePostsForAsyncProcessing,
  getPostingQueueStatus
} from "@/actions/integrations/reddit-posting-queue"
import { useUser } from "@clerk/nextjs"
import { Timestamp } from "firebase/firestore"
import LeadCard from "./dashboard/lead-card"
import DashboardHeader from "./dashboard/dashboard-header"
import ToneCustomizer from "./dashboard/tone-customizer"
import FiltersAndSorting from "./dashboard/filters-and-sorting"
import BatchPoster from "./dashboard/batch-poster"
import PaginationControls from "./dashboard/pagination-controls"
import LeadsDisplay from "./dashboard/leads-display"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

// Import newly created types and utils
import { LeadResult, WorkflowProgress } from "./dashboard/types"
import { getTimeAgo, serializeTimestampToISO } from "./dashboard/utils"

const ITEMS_PER_PAGE = 10
const POLLING_INTERVAL = 5000 // 5 seconds

interface DashboardState {
  // Core state
  campaignId: string | null
  leads: LeadResult[]
  isLoading: boolean
  error: string | null
  
  // UI state
  selectedLength: "micro" | "medium" | "verbose"
  currentPage: number
  sortBy: "relevance" | "upvotes" | "time"
  filterKeyword: string
  filterScore: number
  activeTab: "all" | "queue"
  
  // Operation state
  selectedPost: LeadResult | null
  editingCommentId: string | null
  toneInstruction: string
  regeneratingId: string | null
  postingLeadId: string | null
  queuingLeadId: string | null
  removingLeadId: string | null
  isBatchPosting: boolean
  
  // Metadata
  lastPolledAt: Date | null
  pollingEnabled: boolean
  workflowRunning: boolean
  
  // Debug mode
  debugMode: boolean
  debugLogs: string[]
}

const initialState: DashboardState = {
  campaignId: null,
  leads: [],
  isLoading: true,
  error: null,
  selectedLength: "medium",
  currentPage: 1,
  sortBy: "relevance",
  filterKeyword: "",
  filterScore: 0,
  activeTab: "all",
  selectedPost: null,
  editingCommentId: null,
  toneInstruction: "",
  regeneratingId: null,
  postingLeadId: null,
  queuingLeadId: null,
  removingLeadId: null,
  isBatchPosting: false,
  lastPolledAt: null,
  pollingEnabled: false,
  workflowRunning: false,
  debugMode: false,
  debugLogs: []
}

export default function LeadFinderDashboard() {
  const { user, isLoaded: userLoaded } = useUser()
  const [state, setState] = useState<DashboardState>(initialState)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)
  const newLeadIds = useRef(new Set<string>())
  
  // Debug logging
  const addDebugLog = useCallback((message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}${data ? `: ${JSON.stringify(data, null, 2)}` : ''}`
    console.log(`🐛 ${logEntry}`)
    
    if (state.debugMode) {
      setState(prev => ({
        ...prev,
        debugLogs: [...prev.debugLogs.slice(-99), logEntry] // Keep last 100 logs
      }))
    }
  }, [state.debugMode])
  
  // Fetch leads
  const fetchLeads = useCallback(async () => {
    if (!state.campaignId) {
      addDebugLog("No campaign ID, skipping fetch")
      return
    }
    
    addDebugLog("Fetching leads for campaign", { campaignId: state.campaignId })
    
    try {
      const result = await getGeneratedCommentsByCampaignAction(state.campaignId)
      
      if (result.isSuccess) {
        addDebugLog("Fetch successful", { 
          count: result.data.length,
          campaignId: state.campaignId 
        })
        
        const transformedLeads: LeadResult[] = result.data.map(comment => ({
          id: comment.id,
          campaignId: comment.campaignId,
          postUrl: comment.postUrl,
          postTitle: comment.postTitle,
          postAuthor: comment.postAuthor,
          postContentSnippet: comment.postContentSnippet,
          subreddit: comment.postUrl.match(/r\/([^/]+)/)?.[1] || "Unknown",
          relevanceScore: comment.relevanceScore,
          reasoning: comment.reasoning,
          microComment: comment.microComment,
          mediumComment: comment.mediumComment,
          verboseComment: comment.verboseComment,
          status: comment.status || "new",
          selectedLength: comment.selectedLength || "medium",
          timeAgo: getTimeAgo(comment.createdAt),
          originalData: comment,
          postScore: comment.postScore,
          keyword: comment.keyword
        }))
        
        // Track new leads
        transformedLeads.forEach(lead => {
          if (!state.leads.find(l => l.id === lead.id)) {
            newLeadIds.current.add(lead.id)
          }
        })
        
        setState(prev => ({
          ...prev,
          leads: transformedLeads,
          lastPolledAt: new Date(),
          error: null
        }))
      } else {
        addDebugLog("Fetch failed", { 
          error: result.message,
          campaignId: state.campaignId 
        })
        setState(prev => ({ ...prev, error: result.message }))
      }
    } catch (error) {
      addDebugLog("Fetch error", { 
        error: error instanceof Error ? error.message : "Unknown error",
        campaignId: state.campaignId 
      })
      setState(prev => ({ 
        ...prev, 
        error: "Failed to fetch leads" 
      }))
    }
  }, [state.campaignId, state.leads, addDebugLog])
  
  // Initialize dashboard
  useEffect(() => {
    const initialize = async () => {
      if (!userLoaded || !user) {
        addDebugLog("User not loaded yet")
        return
      }
      
      addDebugLog("Initializing dashboard", { userId: user.id })
      setState(prev => ({ ...prev, isLoading: true }))
      
      try {
        // Get campaigns
        const campaignsResult = await getCampaignsByUserIdAction(user.id)
        
        if (campaignsResult.isSuccess && campaignsResult.data.length > 0) {
          const latestCampaign = campaignsResult.data[0]
          addDebugLog("Found existing campaign", { 
            campaignId: latestCampaign.id,
            status: latestCampaign.status 
          })
          
          setState(prev => ({
            ...prev,
            campaignId: latestCampaign.id,
            workflowRunning: latestCampaign.status === "running"
          }))
          
          // Fetch leads for the campaign
          await fetchLeads()
        } else {
          addDebugLog("No campaigns found")
          
          // Check if user has keywords set up
          const profileResult = await getProfileByUserIdAction(user.id)
          const keywords = profileResult.data?.keywords || []
          if (profileResult.isSuccess && keywords.length > 0) {
            addDebugLog("User has keywords, creating campaign", {
              keywords: keywords
            })
            await createAndRunCampaign(keywords)
          } else {
            addDebugLog("No keywords found, showing error")
            setState(prev => ({
              ...prev,
              error: "No keywords found. Please complete onboarding first.",
              isLoading: false
            }))
          }
        }
      } catch (error) {
        addDebugLog("Initialization error", { 
          error: error instanceof Error ? error.message : "Unknown error" 
        })
        setState(prev => ({
          ...prev,
          error: "Failed to initialize dashboard",
          isLoading: false
        }))
      }
    }
    
    initialize()
  }, [userLoaded, user, addDebugLog])
  
  // Create and run campaign
  const createAndRunCampaign = async (keywords: string[]) => {
    if (!user) return
    
    addDebugLog("Creating new campaign", { keywords })
    
    try {
      setState(prev => ({ 
        ...prev, 
        workflowRunning: true,
        error: null 
      }))

      // Get profile for website
      const profileResult = await getProfileByUserIdAction(user.id)
      if (!profileResult.isSuccess || !profileResult.data.website) {
        toast.error("Profile missing website information for campaign creation")
        setState(prev => ({...prev, workflowRunning: false, error: "Profile missing website"}))
        return
      }
      
      // Create campaign first
      const campaignResult = await createCampaignAction({
        userId: user.id,
        name: `Lead Gen - ${new Date().toLocaleDateString()}`,
        website: profileResult.data.website,
        keywords: keywords
      })

      if (!campaignResult.isSuccess) {
        throw new Error(`Campaign creation failed: ${campaignResult.message}`)
      }
      
      const newCampaignId = campaignResult.data.id
      addDebugLog("Campaign created successfully", { campaignId: newCampaignId })
      
      setState(prev => ({
        ...prev,
        campaignId: newCampaignId, // Set the new campaign ID here
        workflowRunning: true // Workflow will be started next
      }))
      
      // Now run the workflow with the new campaign ID
      const workflowRunResult = await runFullLeadGenerationWorkflowAction(newCampaignId)
      
      if (workflowRunResult.isSuccess) {
        addDebugLog("Workflow started successfully for new campaign", { 
          campaignId: newCampaignId,
          workflowProgress: workflowRunResult.data 
        })
        toast.success("Lead generation started! New leads will appear as they're found.")
        // Polling will pick up from here if enabled by campaignId change
      } else {
        throw new Error(`Workflow start failed: ${workflowRunResult.message}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create and run campaign"
      addDebugLog("Campaign creation/run error", { error: errorMessage })
      setState(prev => ({
        ...prev,
        error: errorMessage,
        workflowRunning: false
      }))
      toast.error(errorMessage)
    }
  }
  
  // Manual test data creation
  const createTestData = async () => {
    if (!state.campaignId || !user) {
      toast.error("No campaign selected")
      return
    }
    
    addDebugLog("Creating test data", { campaignId: state.campaignId })
    
    try {
      const testComment = {
        campaignId: state.campaignId,
        redditThreadId: `test-thread-${Date.now()}`,
        threadId: `t3_test${Date.now()}`,
        postUrl: `https://reddit.com/r/test/comments/test${Date.now()}/test_post/`,
        postTitle: "Test Post: Looking for recommendations",
        postAuthor: "test_user",
        postContentSnippet: "I'm looking for recommendations on the best tools for my business...",
        relevanceScore: 85,
        reasoning: "This is a test lead with high relevance score",
        microComment: "Check out our solution!",
        mediumComment: "Based on your needs, I'd recommend checking out our platform. It's specifically designed for businesses like yours and has helped many similar companies.",
        verboseComment: "I understand you're looking for business tools. Based on what you've described, I'd strongly recommend taking a look at our platform. We've helped dozens of similar businesses streamline their operations and increase efficiency. Our solution offers comprehensive features including automated workflows, real-time analytics, and seamless integrations with your existing tools. Happy to share more details if you're interested!",
        status: "new" as const,
        keyword: "test keyword",
        postScore: 42
      }
      
      const result = await createGeneratedCommentAction(testComment)
      
      if (result.isSuccess) {
        addDebugLog("Test data created successfully", { id: result.data.id })
        toast.success("Test lead created successfully!")
        await fetchLeads()
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      addDebugLog("Test data creation error", { 
        error: error instanceof Error ? error.message : "Unknown error" 
      })
      toast.error("Failed to create test data")
    }
  }
  
  // Manual workflow trigger
  const manualRunWorkflow = async () => {
    if (!user) return
    
    addDebugLog("Manually triggering workflow")
    
    try {
      const profileResult = await getProfileByUserIdAction(user.id)
      if (!profileResult.isSuccess || !profileResult.data.keywords || profileResult.data.keywords.length === 0) {
        toast.error("No keywords found. Please set up keywords first.")
        return
      }
      
      await createAndRunCampaign(profileResult.data.keywords)
    } catch (error) {
      addDebugLog("Manual workflow error", { 
        error: error instanceof Error ? error.message : "Unknown error" 
      })
      toast.error("Failed to run workflow")
    }
  }
  
  // Polling effect
  useEffect(() => {
    if (state.pollingEnabled && state.campaignId) {
      addDebugLog("Starting polling", { 
        campaignId: state.campaignId,
        interval: "5 seconds" 
      })
      
      // Initial fetch
      fetchLeads()
      
      // Set up interval
      pollingInterval.current = setInterval(() => {
        fetchLeads()
      }, 5000) // Poll every 5 seconds
      
      return () => {
        if (pollingInterval.current) {
          addDebugLog("Stopping polling")
          clearInterval(pollingInterval.current)
          pollingInterval.current = null
        }
      }
    }
  }, [state.pollingEnabled, state.campaignId, fetchLeads, addDebugLog])
  
  // Campaign change effect
  useEffect(() => {
    if (state.campaignId) {
      addDebugLog("Campaign changed, enabling polling", { 
        campaignId: state.campaignId 
      })
      setState(prev => ({ ...prev, pollingEnabled: true, isLoading: false }))
    }
  }, [state.campaignId, addDebugLog])
  
  // Helper to update state
  const updateState = (updates: Partial<DashboardState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  // Get display comment based on selected length
  const getDisplayComment = (lead: LeadResult): string => {
    const lengthMap = {
      micro: lead.microComment,
      medium: lead.mediumComment,
      verbose: lead.verboseComment
    }
    return lengthMap[lead.selectedLength || state.selectedLength]
  }

  // Handle comment editing
  const handleCommentEdit = async (leadId: string, newComment: string) => {
    console.log("✏️ [EDIT] Editing comment for lead:", leadId)
    
    const lead = state.leads.find(l => l.id === leadId)
    if (!lead) return
    
    try {
      const lengthField = `${lead.selectedLength || state.selectedLength}Comment`
      const result = await updateGeneratedCommentAction(leadId, {
        [lengthField]: newComment
      })
      
      if (result.isSuccess) {
        setState(prev => ({
          ...prev,
          leads: prev.leads.map(l =>
            l.id === leadId
              ? {
                  ...l,
                  [lengthField]: newComment,
                  [`${lead.selectedLength || state.selectedLength}Comment`]: newComment
                }
              : l
          ),
          editingCommentId: null
        }))
        toast.success("Comment updated")
      } else {
        toast.error("Failed to update comment")
      }
    } catch (error) {
      console.error("✏️ [EDIT] Error:", error)
      toast.error("Error updating comment")
    }
  }

  // Handle adding to queue
  const handleAddToQueue = async (lead: LeadResult) => {
    console.log("➕ [QUEUE] Adding to queue:", lead.id)
    updateState({ queuingLeadId: lead.id })
    
    try {
      const result = await updateGeneratedCommentAction(lead.id, {
        status: "queued"
      })
      
      if (result.isSuccess) {
        setState(prev => ({
          ...prev,
          leads: prev.leads.map(l =>
            l.id === lead.id ? { ...l, status: "queued" } : l
          ),
          queuingLeadId: null
        }))
        toast.success("Added to posting queue")
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("➕ [QUEUE] Error:", error)
      toast.error("Failed to add to queue")
      updateState({ queuingLeadId: null })
    }
  }

  // Handle removing from queue
  const handleRemoveFromQueue = async (lead: LeadResult) => {
    console.log("➖ [QUEUE] Removing from queue:", lead.id)
    updateState({ removingLeadId: lead.id })
    
    try {
      const result = await updateGeneratedCommentAction(lead.id, {
        status: "new"
      })
      
      if (result.isSuccess) {
        setState(prev => ({
          ...prev,
          leads: prev.leads.map(l =>
            l.id === lead.id ? { ...l, status: "new" } : l
          ),
          removingLeadId: null
        }))
        toast.success("Removed from queue")
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("➖ [QUEUE] Error:", error)
      toast.error("Failed to remove from queue")
      updateState({ removingLeadId: null })
    }
  }

  // Handle immediate posting
  const handlePostNow = async (lead: LeadResult) => {
    console.log("📤 [POST] Posting immediately:", lead.id)
    updateState({ postingLeadId: lead.id })
    
    try {
      const comment = getDisplayComment(lead)
      const result = await postCommentAndUpdateStatusAction(
        lead.id,
        lead.postUrl,
        comment
      )
      
      if (result.isSuccess) {
        setState(prev => ({
          ...prev,
          leads: prev.leads.map(l =>
            l.id === lead.id ? { ...l, status: "posted" } : l
          ),
          postingLeadId: null
        }))
        toast.success("Comment posted successfully!")
        posthog.capture("reddit_comment_posted", {
          leadId: lead.id,
          method: "immediate"
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("📤 [POST] Error:", error)
      toast.error("Failed to post comment")
      updateState({ postingLeadId: null })
    }
  }

  // Handle tone regeneration
  const handleToneRegeneration = async () => {
    if (!state.selectedPost || !state.toneInstruction.trim()) {
      toast.error("Please enter tone instructions")
      return
    }
    
    console.log("🎨 [TONE] Regenerating with instruction:", state.toneInstruction)
    updateState({ regeneratingId: state.selectedPost.id })
    
    try {
      // Get website content from campaign
      const campaignResult = await getCampaignByIdAction(state.campaignId!)
      if (!campaignResult.isSuccess || !campaignResult.data.websiteContent) {
        throw new Error("Website content not available")
      }
      
      const result = await regenerateCommentsWithToneAction(
        state.selectedPost.postTitle,
        state.selectedPost.postContentSnippet,
        state.selectedPost.subreddit,
        campaignResult.data.websiteContent,
        state.toneInstruction
      )
      
      if (result.isSuccess) {
        // Update the comment in the database
        await updateGeneratedCommentAction(state.selectedPost.id, {
          microComment: result.data.microComment,
          mediumComment: result.data.mediumComment,
          verboseComment: result.data.verboseComment
        })
        
        setState(prev => ({
          ...prev,
          leads: prev.leads.map(l =>
            l.id === state.selectedPost!.id
              ? {
                  ...l,
                  microComment: result.data.microComment,
                  mediumComment: result.data.mediumComment,
                  verboseComment: result.data.verboseComment
                }
              : l
          ),
          regeneratingId: null,
          toneInstruction: ""
        }))
        toast.success("Comments regenerated with new tone")
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("🎨 [TONE] Error:", error)
      toast.error("Failed to regenerate comments")
      updateState({ regeneratingId: null })
    }
  }

  // Handle batch posting
  const handleBatchPostQueue = async () => {
    if (!user?.id) {
      toast.error("Please log in to post comments")
      return
    }
    
    const queuedLeads = state.leads.filter(l => l.status === "queued")
    
    if (queuedLeads.length === 0) {
      toast.error("No comments in queue")
      return
    }
    
    console.log("📦 [BATCH] Starting batch post for", queuedLeads.length, "leads")
    updateState({ isBatchPosting: true })
    
    try {
      const posts = queuedLeads.map(lead => ({
        leadId: lead.id,
        threadId: lead.postUrl.match(/\/comments\/([a-zA-Z0-9]+)/)?.[1] || "",
        comment: getDisplayComment(lead)
      }))
      
      const result = await queuePostsForAsyncProcessing(user.id, posts)
      
      if (result.isSuccess) {
        toast.success(`Processing ${result.data.queuedCount} comments`)
        posthog.capture("reddit_batch_post_started", {
          count: result.data.queuedCount
        })
        
        // Start checking status
        checkQueueStatus()
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("📦 [BATCH] Error:", error)
      toast.error("Failed to start batch posting")
    } finally {
      updateState({ isBatchPosting: false })
    }
  }

  // Check queue status
  const checkQueueStatus = async () => {
    if (!user?.id) return
    
    try {
      const result = await getPostingQueueStatus(user.id)
      
      if (result.isSuccess) {
        const { pending, processing, completed, failed } = result.data
        
        // Update lead statuses based on queue stats
        // Note: This is a simplified approach - in production you'd want to 
        // track individual post statuses
        
        console.log(`📦 [QUEUE-STATUS] Pending: ${pending}, Processing: ${processing}, Completed: ${completed}, Failed: ${failed}`)
        
        // If still processing, check again in a few seconds
        if (processing > 0 || pending > 0) {
          setTimeout(checkQueueStatus, 3000)
        }
      }
    } catch (error) {
      console.error("📦 [QUEUE-STATUS] Error:", error)
    }
  }

  // Filtering and sorting
  const filteredAndSortedLeads = useMemo(() => {
    let filtered = state.leads

    // Filter by tab
    if (state.activeTab === "queue") {
      filtered = filtered.filter(lead => lead.status === "queued")
    }

    // Filter by keyword
    if (state.filterKeyword) {
      filtered = filtered.filter(lead =>
        lead.keyword?.toLowerCase().includes(state.filterKeyword.toLowerCase())
      )
    }

    // Filter by score
    if (state.filterScore > 0) {
      filtered = filtered.filter(lead => lead.relevanceScore >= state.filterScore)
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (state.sortBy) {
        case "relevance":
          return b.relevanceScore - a.relevanceScore
        case "upvotes":
          return (b.postScore || 0) - (a.postScore || 0)
        case "time":
          return filtered.indexOf(b) - filtered.indexOf(a)
        default:
          return 0
      }
    })

    return sorted
  }, [state.leads, state.filterKeyword, state.filterScore, state.sortBy, state.activeTab])

  // Paginated leads
  const paginatedLeads = useMemo(() => {
    const startIndex = (state.currentPage - 1) * ITEMS_PER_PAGE
    return filteredAndSortedLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredAndSortedLeads, state.currentPage])

  const totalPages = Math.ceil(filteredAndSortedLeads.length / ITEMS_PER_PAGE)

  // Render loading state
  if (state.isLoading) {
    return (
      <div className="container mx-auto space-y-6 py-6">
        <EnhancedLeadSkeleton />
      </div>
    )
  }

  // Render error state
  if (state.error && !state.campaignId) {
    return (
      <div className="container mx-auto py-6">
        <EnhancedErrorState
          error={state.error}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Debug Panel */}
      {state.debugMode && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="size-5" />
              Debug Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Campaign ID:</strong> {state.campaignId || "None"}
              </div>
              <div>
                <strong>Leads Count:</strong> {state.leads.length}
              </div>
              <div>
                <strong>Workflow Running:</strong> {state.workflowRunning ? "Yes" : "No"}
              </div>
              <div>
                <strong>Polling:</strong> {state.pollingEnabled ? "Enabled" : "Disabled"}
              </div>
              <div>
                <strong>Last Poll:</strong> {state.lastPolledAt?.toLocaleTimeString() || "Never"}
              </div>
              <div>
                <strong>Error:</strong> {state.error || "None"}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={createTestData}
                disabled={!state.campaignId}
              >
                <Database className="mr-2 size-4" />
                Create Test Lead
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={manualRunWorkflow}
              >
                <Zap className="mr-2 size-4" />
                Run Workflow
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchLeads}
                disabled={!state.campaignId}
              >
                <RefreshCw className="mr-2 size-4" />
                Fetch Now
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Debug Logs</Label>
              <ScrollArea className="h-40 w-full rounded-md border p-2 font-mono text-xs">
                {state.debugLogs.map((log, i) => (
                  <div key={i} className="whitespace-pre-wrap">{log}</div>
                ))}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Debug Toggle */}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => updateState({ debugMode: !state.debugMode })}
          className="text-muted-foreground"
        >
          <Bug className="mr-2 size-4" />
          {state.debugMode ? "Hide" : "Show"} Debug
        </Button>
      </div>
      
      {/* Your existing dashboard components */}
      <DashboardHeader
        campaignId={state.campaignId}
        leadsCount={state.leads.length}
        approvedLeadsCount={state.leads.filter(l => l.status === "queued").length}
        isPolling={state.pollingEnabled}
        lastPolledAt={state.lastPolledAt}
        activeTab={state.activeTab}
        onTabChange={(value) => updateState({ activeTab: value as "all" | "queue" })}
        workflowProgressError={state.error || undefined}
        onCompleteOnboardingClick={() => window.location.href = "/onboarding"}
        selectedCommentLength={state.selectedLength}
        onCommentLengthChange={(value) => updateState({ selectedLength: value as "micro" | "medium" | "verbose" })}
        onNewCampaignClick={() => setCreateDialogOpen(true)}
      />
      
      <div className="grid gap-4">
        <FiltersAndSorting
          filterKeyword={state.filterKeyword}
          filterScore={state.filterScore}
          sortBy={state.sortBy}
          onFilterKeywordChange={(value) => updateState({ filterKeyword: value })}
          onFilterScoreChange={(value) => updateState({ filterScore: value })}
          onSortByChange={(value) => updateState({ sortBy: value as "relevance" | "upvotes" | "time" })}
          paginatedLeadsCount={paginatedLeads.length}
          totalFilteredLeadsCount={filteredAndSortedLeads.length}
          disabled={state.isLoading || state.workflowRunning}
        />

        {state.activeTab === "queue" && (
          <BatchPoster
            approvedLeadsCount={state.leads.filter(l => l.status === "queued").length}
            onBatchPostQueue={handleBatchPostQueue}
            isBatchPosting={state.isBatchPosting}
          />
        )}

        <LeadsDisplay
          workflowProgress={{
            currentStep: state.workflowRunning ? "Lead generation running..." : "Ready",
            completedSteps: state.workflowRunning ? 3 : 6,
            totalSteps: 6,
            isLoading: state.isLoading,
            error: state.error || undefined
          }}
          leads={state.leads}
          filteredAndSortedLeads={filteredAndSortedLeads}
          paginatedLeads={paginatedLeads}
          newLeadIds={newLeadIds.current}
          activeTab={state.activeTab}
          campaignId={state.campaignId}
          selectedLength={state.selectedLength}
          getDisplayComment={getDisplayComment}
          editingCommentId={state.editingCommentId}
          onEditClick={(leadId: string) => updateState({ editingCommentId: leadId })}
          onSaveComment={handleCommentEdit}
          onCancelEdit={() => updateState({ editingCommentId: null })}
          removingLeadId={state.removingLeadId}
          queuingLeadId={state.queuingLeadId}
          postingLeadId={state.postingLeadId}
          onRemoveFromQueue={handleRemoveFromQueue}
          onAddToQueue={handleAddToQueue}
          onPostNow={handlePostNow}
          onCardClick={(lead: LeadResult) => updateState({ selectedPost: lead })}
          toneInstruction={state.toneInstruction}
          onToneInstructionChange={(value: string) => updateState({ toneInstruction: value })}
          onRegenerateAllTones={handleToneRegeneration}
          isRegeneratingAllTones={state.regeneratingId === state.selectedPost?.id}
          filterKeyword={state.filterKeyword}
          onFilterKeywordChange={(value: string) => updateState({ filterKeyword: value })}
          filterScore={state.filterScore}
          onFilterScoreChange={(value: number) => updateState({ filterScore: value })}
          sortBy={state.sortBy}
          onSortByChange={(value: "relevance" | "upvotes" | "time") => updateState({ sortBy: value })}
          approvedLeadsCount={state.leads.filter(l => l.status === "queued").length}
          onBatchPostQueue={handleBatchPostQueue}
          isBatchPosting={state.isBatchPosting}
          currentPage={state.currentPage}
          totalPages={totalPages}
          onPageChange={(page: number) => updateState({ currentPage: page })}
          onTriggerCreateCampaign={() => setCreateDialogOpen(true)}
        />
      </div>

      {/* Dialogs and popups */}
      <CreateCampaignDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          fetchLeads()
          setCreateDialogOpen(false)
        }}
      />

      {state.selectedPost && (
        <PostDetailPopup
          open={!!state.selectedPost}
          onOpenChange={(open: boolean) => {
            if (!open) updateState({ selectedPost: null })
          }}
          lead={state.selectedPost}
        />
      )}
    </div>
  )
}

