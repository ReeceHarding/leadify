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
  MinusCircle
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
  SerializedGeneratedCommentDocument
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
}

export default function LeadFinderDashboard() {
  const { user } = useUser()
  
  // Consolidated state
  const [state, setState] = useState<DashboardState>({
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
    workflowRunning: false
  })
  
  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newLeadIds, setNewLeadIds] = useState<Set<string>>(new Set())
  
  // Refs for polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)
  
  console.log(`🔧 [DASHBOARD] Current state:`, {
    campaignId: state.campaignId,
    leadsCount: state.leads.length,
    isLoading: state.isLoading,
    pollingEnabled: state.pollingEnabled,
    workflowRunning: state.workflowRunning
  })
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  // Initialize dashboard on mount
  useEffect(() => {
    const initialize = async () => {
      if (!user?.id) {
        console.log("🔧 [INIT] No user ID available")
        return
      }

      console.log("🔧 [INIT] Starting dashboard initialization for user:", user.id)
      
      try {
        // Get user profile
        const profileResult = await getProfileByUserIdAction(user.id)
        if (!profileResult.isSuccess) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: "Failed to load user profile"
          }))
          return
        }

        const profile = profileResult.data
        const keywords = profile.keywords || []
        
        console.log("🔧 [INIT] Profile loaded with keywords:", keywords)

        // Check for existing campaigns
        const campaignsResult = await getCampaignsByUserIdAction(user.id)
        
        if (campaignsResult.isSuccess && campaignsResult.data.length > 0) {
          // Use the most recent campaign
          const latestCampaign = campaignsResult.data[0]
          console.log("🔧 [INIT] Found existing campaign:", latestCampaign.id)
          
          setState(prev => ({
            ...prev,
            campaignId: latestCampaign.id,
            isLoading: false,
            pollingEnabled: true
          }))
        } else if (keywords.length > 0) {
          // Create new campaign if we have keywords
          console.log("🔧 [INIT] No campaigns found, creating new one with keywords")
          await createAndRunCampaign(keywords)
        } else {
          // No campaigns and no keywords
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: "Please complete onboarding to set up keywords"
          }))
        }
      } catch (error) {
        console.error("🔧 [INIT] Error during initialization:", error)
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: "Failed to initialize dashboard"
        }))
      }
    }

    initialize()
  }, [user?.id])

  // Create and run a new campaign
  const createAndRunCampaign = async (keywords: string[]) => {
    if (!user?.id) return
    
    console.log("🚀 [CREATE-CAMPAIGN] Creating new campaign with keywords:", keywords)
    
    try {
      // Get profile for website info
      const profileResult = await getProfileByUserIdAction(user.id)
      if (!profileResult.isSuccess || !profileResult.data.website) {
        throw new Error("Website information missing from profile")
      }
      
      // Create campaign
      const campaignResult = await createCampaignAction({
        userId: user.id,
        name: `Lead Generation - ${new Date().toLocaleDateString()}`,
        website: profileResult.data.website,
        keywords: keywords
      })
      
      if (!campaignResult.isSuccess) {
        throw new Error(campaignResult.message)
      }
      
      const campaignId = campaignResult.data.id
      console.log("🚀 [CREATE-CAMPAIGN] Campaign created:", campaignId)
      
      // Update state with new campaign
      setState(prev => ({
        ...prev,
        campaignId,
        workflowRunning: true,
        pollingEnabled: true,
        error: null
      }))
      
      // Run workflow in background
      runFullLeadGenerationWorkflowAction(campaignId)
        .then(result => {
          if (!mountedRef.current) return
          
          console.log("🚀 [WORKFLOW] Workflow completed:", result.isSuccess)
          setState(prev => ({
            ...prev,
            workflowRunning: false
          }))
          
          if (!result.isSuccess) {
            toast.error("Lead generation failed", {
              description: result.message
            })
          }
        })
        .catch(error => {
          if (!mountedRef.current) return
          
          console.error("🚀 [WORKFLOW] Workflow error:", error)
          setState(prev => ({
            ...prev,
            workflowRunning: false
          }))
        })
      
    } catch (error) {
      console.error("🚀 [CREATE-CAMPAIGN] Error:", error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to create campaign",
        isLoading: false
      }))
    }
  }

  // Fetch leads for current campaign
  const fetchLeads = useCallback(async () => {
    if (!state.campaignId || !mountedRef.current) return
    
    console.log(`📊 [FETCH-LEADS] Fetching for campaign: ${state.campaignId}`)
    
    try {
      const result = await getGeneratedCommentsByCampaignAction(state.campaignId)
      
      if (!mountedRef.current) return
      
      if (!result.isSuccess) {
        console.error("📊 [FETCH-LEADS] Failed:", result.message)
        return
      }
      
      console.log(`📊 [FETCH-LEADS] Fetched ${result.data.length} leads`)
      
      // Transform leads
      const currentLeadIds = new Set(state.leads.map(l => l.id))
      const newIds = new Set<string>()
      
      const transformedLeads: LeadResult[] = result.data.map(comment => {
        if (!currentLeadIds.has(comment.id)) {
          newIds.add(comment.id)
        }
        
        let subreddit = "unknown"
        try {
          const url = new URL(comment.postUrl)
          const match = url.pathname.match(/\/r\/([^\/]+)/)
          if (match && match[1]) {
            subreddit = match[1]
          }
        } catch (e) {
          // Silent fail
        }
        
        return {
          id: comment.id,
          campaignId: comment.campaignId,
          postUrl: comment.postUrl,
          postTitle: comment.postTitle,
          postAuthor: comment.postAuthor,
          postContentSnippet: comment.postContentSnippet,
          subreddit,
          relevanceScore: comment.relevanceScore,
          reasoning: comment.reasoning,
          microComment: comment.microComment,
          mediumComment: comment.mediumComment,
          verboseComment: comment.verboseComment,
          status: comment.status || "new",
          selectedLength: comment.selectedLength || state.selectedLength,
          timeAgo: getTimeAgo(comment.createdAt),
          originalData: comment,
          postScore: comment.postScore,
          keyword: comment.keyword
        }
      })
      
      // Sort by newest first
      transformedLeads.sort((a, b) => {
        const aTime = new Date(a.originalData?.createdAt || 0).getTime()
        const bTime = new Date(b.originalData?.createdAt || 0).getTime()
        return bTime - aTime
      })
      
      setState(prev => ({
        ...prev,
        leads: transformedLeads,
        lastPolledAt: new Date()
      }))
      
      setNewLeadIds(newIds)
      
      // Log new leads
      if (newIds.size > 0) {
        console.log(`✨ [FETCH-LEADS] ${newIds.size} new leads detected`)
      }
      
    } catch (error) {
      console.error("📊 [FETCH-LEADS] Error:", error)
    }
  }, [state.campaignId, state.leads, state.selectedLength])

  // Set up polling when campaign is selected
  useEffect(() => {
    if (!state.campaignId || !state.pollingEnabled) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      return
    }
    
    console.log("🔄 [POLLING] Starting polling for campaign:", state.campaignId)
    
    // Initial fetch
    fetchLeads()
    
    // Set up interval
    pollingIntervalRef.current = setInterval(() => {
      fetchLeads()
    }, POLLING_INTERVAL)
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [state.campaignId, state.pollingEnabled, fetchLeads])

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
          newLeadIds={newLeadIds}
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

