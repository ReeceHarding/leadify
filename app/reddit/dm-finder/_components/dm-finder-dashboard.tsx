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
  Zap,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Trash2,
  X,
  HelpCircle,
  Users,
  Award,
  CalendarDays,
  StopCircle
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
import Link from "next/link"
import { usePostHog } from "posthog-js/react"
import { useSearchParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useOrganization } from "@/components/utilities/organization-provider"
import {
  Timestamp,
  onSnapshot,
  collection,
  query,
  where,
  doc
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toISOString } from "@/lib/utils/timestamp-utils"
import { validateOrganizationId, resolveOrganizationId } from "@/lib/utils/organization-utils"

// Import DM-specific components and types
import DMCard from "./dashboard/dm-card"
import { DMPost, DMAutomation, DashboardState, WorkflowProgress } from "./dashboard/types"
import CreateDMAutomationDialog from "./create-dm-automation-dialog"

// Import DM actions
import {
  getDMAutomationsByOrganizationAction,
  getDMAutomationByIdAction,
  createDMAutomationAction,
  updateDMAutomationAction
} from "@/actions/db/dm-actions"
import {
  runDMAutomationWorkflowAction,
  stopDMAutomationWorkflowAction
} from "@/actions/dm-generation/dm-workflow-actions"
import {
  generatePersonalizedDMAction
} from "@/actions/dm-generation/dm-generation-actions"
import {
  sendRedditDMAction
} from "@/actions/integrations/reddit/dm-actions"
import {
  getRedditThreadsByOrganizationAction
} from "@/actions/db/reddit-threads-actions"
import { RedditThreadDocument } from "@/db/firestore/reddit-threads-collections"

const ITEMS_PER_PAGE = 20
const POLLING_INTERVAL = 5000 // 5 seconds

const initialState: DashboardState = {
  automationId: null,
  automationName: null,
  automations: [],
  posts: [],
  isLoading: true,
  error: null,
  selectedLength: "verbose",
  currentPage: 1,
  sortBy: "relevance",
  filterKeyword: "",
  filterScore: 0,
  activeTab: "all",
  selectedPost: null,
  editingDMId: null,
  toneInstruction: "",
  regeneratingId: null,
  sendingDMId: null,
  queuingDMId: null,
  removingDMId: null,
  isBatchSending: false,
  showRedditAuthDialog: false,
  showMassDMDialog: false,
  lastPolledAt: null,
  pollingEnabled: false,
  workflowRunning: false,
  debugMode: false,
  debugLogs: [],
  searchQuery: "",
  selectedKeyword: null,
  dateFilter: "all"
}

// Helper functions
const getTimeAgo = (timestamp: number): string => {
  const now = Date.now() / 1000
  const diff = now - timestamp
  
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(timestamp * 1000).toLocaleDateString()
}

const filterByDate = (post: DMPost, dateFilter: string): boolean => {
  if (dateFilter === "all") return true

  const postDate = new Date(post.created_utc * 1000)
  const now = new Date()
  const daysDiff = Math.floor(
    (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  switch (dateFilter) {
    case "today":
      return daysDiff === 0
    case "week":
      return daysDiff <= 7
    case "month":
      return daysDiff <= 30
    case "3months":
      return daysDiff <= 90
    default:
      return true
  }
}

const matchesSearchQuery = (post: DMPost, query: string): boolean => {
  if (!query.trim()) return true

  const lowerQuery = query.toLowerCase()
  const searchableFields = [
    post.title,
    post.selftext,
    post.author,
    post.subreddit,
    post.dmContent
  ]
    .filter(Boolean)
    .map(field => field!.toLowerCase())

  return searchableFields.some(field => field.includes(lowerQuery))
}

export default function DMFinderDashboard() {
  const { user, isLoaded: userLoaded } = useUser()
  const { currentOrganization, isLoading: organizationLoading } = useOrganization()
  const [state, setState] = useState<DashboardState>(initialState)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null)
  const [findNewUsersOpen, setFindNewUsersOpen] = useState(false)
  const [currentAutomationKeywords, setCurrentAutomationKeywords] = useState<string[]>([])
  const newPostIds = useRef(new Set<string>())
  const searchParams = useSearchParams()
  const [liveFirestoreProgress, setLiveFirestoreProgress] = useState<WorkflowProgress | null>(null)
  const [redditConnected, setRedditConnected] = useState<boolean | null>(null)
  const posthog = usePostHog()

  // Debug logging
  const addDebugLog = useCallback(
    (message: string, data?: any) => {
      const timestamp = new Date().toISOString()
      const logEntry = `[${timestamp}] ${message}${data ? `: ${JSON.stringify(data, null, 2)}` : ""}`
      console.log(`🔍 DM: ${logEntry}`)

      if (state.debugMode) {
        setState(prev => ({
          ...prev,
          debugLogs: [...prev.debugLogs.slice(-99), logEntry]
        }))
      }
    },
    [state.debugMode]
  )

  // Update state helper
  const updateState = (updates: Partial<DashboardState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  // Check Reddit connection status
  useEffect(() => {
    const checkRedditConnection = async () => {
      if (!currentOrganization?.id) return
      
      try {
        const { getCurrentOrganizationTokens } = await import(
          "@/actions/integrations/reddit/reddit-auth-helpers"
        )
        const tokenResult = await getCurrentOrganizationTokens(
          currentOrganization.id
        )
        const isConnected =
          tokenResult.isSuccess && !!tokenResult.data.accessToken
        setRedditConnected(isConnected)
        addDebugLog("Reddit connection status", { isConnected })
      } catch (error) {
        console.error("Error checking Reddit connection:", error)
        setRedditConnected(false)
      }
    }

    checkRedditConnection()
  }, [currentOrganization?.id, addDebugLog])

  // Initialize dashboard
  useEffect(() => {
    const initialize = async () => {
      if (!userLoaded || organizationLoading) {
        addDebugLog("Waiting for user/organization to load")
        return
      }

      if (!currentOrganization?.id) {
        addDebugLog("No organization selected")
        updateState({
          isLoading: false,
          error: "Please select an organization to view DM automations"
        })
        return
      }

      addDebugLog("Initializing DM Finder dashboard", {
        organizationId: currentOrganization.id
      })

      try {
        // Load DM automations
        const automationsResult = await getDMAutomationsByOrganizationAction(
          currentOrganization.id
        )

        if (!automationsResult.isSuccess) {
          throw new Error(automationsResult.message)
        }

        const rawAutomations = automationsResult.data || []
        addDebugLog("Loaded DM automations", { count: rawAutomations.length })

        // Transform DMAutomationDocument to DMAutomation type
        const automations: DMAutomation[] = rawAutomations.map(auto => ({
          id: auto.id,
          name: auto.name,
          organizationId: auto.organizationId,
          status: auto.isActive ? "running" : "draft",
          totalDMsSent: auto.dmsSentToday || 0,
          createdAt: auto.createdAt.toDate().toISOString(),
          keywords: auto.keywords,
          targetSubreddits: auto.subreddits
        }))

        // Get automation ID from URL or use most recent
        const urlAutomationId = searchParams.get("automationId")
        const selectedAutomation = urlAutomationId
          ? automations.find(a => a.id === urlAutomationId)
          : automations[0]

        if (selectedAutomation) {
          updateState({
            automations,
            automationId: selectedAutomation.id,
            automationName: selectedAutomation.name,
            isLoading: false
          })

          // Load posts for the selected automation
          await loadPostsForAutomation(selectedAutomation.id)
        } else {
          updateState({
            automations,
            isLoading: false
          })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to initialize"
        addDebugLog("Initialization error", { error: errorMessage })
        updateState({
          error: errorMessage,
          isLoading: false
        })
      }
    }

    initialize()
  }, [userLoaded, organizationLoading, currentOrganization, searchParams, addDebugLog])

  // Load posts for automation
  const loadPostsForAutomation = async (automationId: string) => {
    if (!currentOrganization?.id) return

    addDebugLog("Loading posts for automation", { automationId })

    try {
      // Get threads from shared collection
      const threadsResult = await getRedditThreadsByOrganizationAction(
        currentOrganization.id
      )

      if (!threadsResult.isSuccess) {
        throw new Error(threadsResult.message)
      }

      const threads = threadsResult.data || []
      
      // Transform threads to DMPost format
      const posts: DMPost[] = threads.map((thread: RedditThreadDocument) => ({
        id: thread.id,
        threadId: thread.id,
        title: thread.title,
        author: thread.author,
        subreddit: thread.subreddit,
        url: thread.url,
        created_utc: thread.createdUtc,
        selftext: thread.content || thread.contentSnippet || "",
        score: thread.score,
        num_comments: thread.numComments,
        timeAgo: getTimeAgo(thread.createdUtc),
        relevanceScore: thread.relevanceScore,
        reasoning: thread.reasoning,
        hasComment: thread.hasComment,
        hasDM: false, // TODO: Check DM status
        keywords: thread.keywords,
        selectedLength: "verbose"
      }))

      addDebugLog("Loaded posts", { count: posts.length })
      updateState({ posts })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load posts"
      addDebugLog("Error loading posts", { error: errorMessage })
      toast.error(errorMessage)
    }
  }

  // Real-time workflow progress listener
  useEffect(() => {
    if (!state.automationId) {
      setLiveFirestoreProgress(null)
      return
    }

    addDebugLog("Setting up Firestore listener for DM workflow progress", {
      automationId: state.automationId
    })

    const progressDocRef = doc(db, "dm_progress", state.automationId)
    const unsubscribe = onSnapshot(
      progressDocRef,
      docSnapshot => {
        if (docSnapshot.exists()) {
          const progressData = docSnapshot.data() as WorkflowProgress
          addDebugLog("DM workflow progress snapshot received", {
            data: progressData
          })
          setLiveFirestoreProgress(progressData)

          updateState({
            workflowRunning: !progressData.isComplete,
            error: progressData.error || null
          })
        }
      },
      error => {
        addDebugLog("Firestore listener error", { error: error.message })
      }
    )

    return () => unsubscribe()
  }, [state.automationId, addDebugLog])

  // Handle automation selection
  const handleAutomationSelect = async (automationId: string) => {
    const automation = state.automations.find(a => a.id === automationId)
    if (!automation) return

    updateState({
      automationId: automation.id,
      automationName: automation.name,
      currentPage: 1
    })

    await loadPostsForAutomation(automation.id)
  }

  // Handle run workflow
  const handleRunWorkflow = async () => {
    if (!state.automationId || !currentOrganization?.id) {
      toast.error("Please select an automation first")
      return
    }

    addDebugLog("Starting DM workflow", { automationId: state.automationId })

    try {
      updateState({ workflowRunning: true, error: null })

      const result = await runDMAutomationWorkflowAction(state.automationId)

      if (result.isSuccess) {
        toast.success("DM automation started! Messages will be sent in real-time.")
        posthog?.capture("dm_workflow_started", {
          automationId: state.automationId,
          organizationId: currentOrganization.id
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to start workflow"
      addDebugLog("Workflow start error", { error: errorMessage })
      updateState({ error: errorMessage, workflowRunning: false })
      toast.error(errorMessage)
    }
  }

  // Handle stop workflow
  const handleStopWorkflow = async () => {
    if (!state.automationId) return

    addDebugLog("Stopping DM workflow", { automationId: state.automationId })

    try {
      const result = await stopDMAutomationWorkflowAction(state.automationId)

      if (result.isSuccess) {
        toast.success("DM automation stopped")
        updateState({ workflowRunning: false })
        posthog?.capture("dm_workflow_stopped", {
          automationId: state.automationId
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to stop workflow"
      addDebugLog("Workflow stop error", { error: errorMessage })
      toast.error(errorMessage)
    }
  }

  // Handle generate DM
  const handleGenerateDM = async (post: DMPost) => {
    if (!currentOrganization?.id) {
      toast.error("Please select an organization first")
      return
    }

    addDebugLog("Generating DM for post", { postId: post.id })

    try {
      const result = await generatePersonalizedDMAction({
        postTitle: post.title,
        postContent: post.selftext,
        postAuthor: post.author,
        postCreatedAt: new Date(post.created_utc * 1000).toISOString(),
        subreddit: post.subreddit,
        businessContext: `Organization: ${currentOrganization.name}`,
        targetAudience: "Reddit users looking for solutions",
        valueProposition: "Professional services to help with their needs"
      })

      if (result.isSuccess && result.data) {
        // Update post with generated DM
        updateState({
          posts: state.posts.map(p =>
            p.id === post.id
              ? {
                  ...p,
                  dmContent: result.data.message,
                  selectedLength: state.selectedLength
                }
              : p
          )
        })
        toast.success("DM generated successfully!")
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate DM"
      addDebugLog("DM generation error", { error: errorMessage })
      toast.error(errorMessage)
    }
  }

  // Handle send DM
  const handleSendDM = async (post: DMPost) => {
    if (!post.dmContent) {
      toast.error("Please generate a DM first")
      return
    }

    addDebugLog("Sending DM", { postId: post.id, author: post.author })
    updateState({ sendingDMId: post.id })

    try {
      const result = await sendRedditDMAction({
        organizationId: currentOrganization?.id || "",
        recipientUsername: post.author,
        subject: `Re: ${post.title}`,
        message: post.dmContent
      })

      if (result.isSuccess) {
        // Update post status
        updateState({
          posts: state.posts.map(p =>
            p.id === post.id
              ? { ...p, dmStatus: "sent", dmSentAt: new Date().toISOString() }
              : p
          ),
          sendingDMId: null
        })
        toast.success("DM sent successfully!")
        posthog?.capture("dm_sent", {
          postId: post.id,
          author: post.author
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send DM"
      addDebugLog("DM send error", { error: errorMessage })
      updateState({ sendingDMId: null })
      toast.error(errorMessage)
    }
  }

  // Handle edit DM
  const handleEditDM = (postId: string, newContent: string) => {
    updateState({
      posts: state.posts.map(p =>
        p.id === postId ? { ...p, dmContent: newContent } : p
      ),
      editingDMId: null
    })
    toast.success("DM updated!")
  }

  // Handle add to queue
  const handleAddToQueue = async (post: DMPost) => {
    updateState({
      posts: state.posts.map(p =>
        p.id === post.id ? { ...p, dmStatus: "queued" } : p
      ),
      queuingDMId: null
    })
    toast.success("Added to DM queue!")
  }

  // Handle remove from queue
  const handleRemoveFromQueue = async (post: DMPost) => {
    updateState({
      posts: state.posts.map(p =>
        p.id === post.id ? { ...p, dmStatus: "draft" } : p
      ),
      removingDMId: null
    })
    toast.success("Removed from queue")
  }

  // Handle copy DM
  const handleCopyDM = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success("DM copied to clipboard!")
    } catch (error) {
      toast.error("Failed to copy DM")
    }
  }

  // Handle regenerate DM
  const handleRegenerateDM = async (post: DMPost, instructions?: string) => {
    updateState({ regeneratingId: post.id })
    
    try {
      // Regenerate with optional instructions
      await handleGenerateDM(post)
      updateState({ regeneratingId: null })
    } catch (error) {
      updateState({ regeneratingId: null })
    }
  }

  // Handle delete DM
  const handleDeleteDM = (postId: string) => {
    updateState({
      posts: state.posts.filter(p => p.id !== postId)
    })
    toast.success("Post removed")
  }

  // Handle view on Reddit
  const handleViewReddit = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer")
  }

  // Handle length change
  const handleLengthChange = (postId: string, length: "micro" | "medium" | "verbose") => {
    updateState({
      posts: state.posts.map(p =>
        p.id === postId ? { ...p, selectedLength: length } : p
      )
    })
  }

  // Filter and sort posts
  const filteredAndSortedPosts = useMemo(() => {
    let filtered = state.posts

    // Apply search filter
    if (state.searchQuery) {
      filtered = filtered.filter(post => matchesSearchQuery(post, state.searchQuery))
    }

    // Apply keyword filter
    if (state.selectedKeyword) {
      filtered = filtered.filter(post =>
        post.keywords?.includes(state.selectedKeyword!)
      )
    }

    // Apply date filter
    filtered = filtered.filter(post => filterByDate(post, state.dateFilter))

    // Apply score filter
    if (state.filterScore > 0) {
      filtered = filtered.filter(
        post => (post.relevanceScore || 0) >= state.filterScore
      )
    }

    // Apply tab filter
    if (state.activeTab === "queue") {
      filtered = filtered.filter(post => post.dmStatus === "queued")
    } else if (state.activeTab === "sent") {
      filtered = filtered.filter(post => post.dmStatus === "sent")
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (state.sortBy) {
        case "relevance":
          return (b.relevanceScore || 0) - (a.relevanceScore || 0)
        case "upvotes":
          return b.score - a.score
        case "time":
          return b.created_utc - a.created_utc
        case "fetched":
          return b.id.localeCompare(a.id)
        case "posted":
          const aPosted = a.dmSentAt ? new Date(a.dmSentAt).getTime() : 0
          const bPosted = b.dmSentAt ? new Date(b.dmSentAt).getTime() : 0
          return bPosted - aPosted
        default:
          return 0
      }
    })

    return sorted
  }, [state.posts, state.searchQuery, state.selectedKeyword, state.dateFilter, state.filterScore, state.activeTab, state.sortBy])

  // Paginated posts
  const paginatedPosts = useMemo(() => {
    const startIndex = (state.currentPage - 1) * ITEMS_PER_PAGE
    return filteredAndSortedPosts.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredAndSortedPosts, state.currentPage])

  const totalPages = Math.ceil(filteredAndSortedPosts.length / ITEMS_PER_PAGE)

  // Get unique keywords from posts
  const uniqueKeywords = useMemo(() => {
    const keywords = new Set<string>()
    state.posts.forEach(post => {
      post.keywords?.forEach(keyword => keywords.add(keyword))
    })
    return Array.from(keywords).sort()
  }, [state.posts])

  // Loading state
  if (state.isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (state.error && !state.posts.length) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">DM Finder</h1>
            <p className="text-muted-foreground">
              Find and send personalized direct messages to Reddit users
            </p>
          </div>
          <div className="flex items-center gap-2">
            {state.debugMode && (
              <Badge variant="outline" className="gap-1">
                <Bug className="size-3" />
                Debug Mode
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateState({ debugMode: !state.debugMode })}
            >
              <Bug className="mr-1 size-3" />
              {state.debugMode ? "Hide" : "Show"} Debug
            </Button>
          </div>
        </div>

        {/* Automation Selector and Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Select
                  value={state.automationId || ""}
                  onValueChange={handleAutomationSelect}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select a DM automation" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.automations.map(automation => (
                      <SelectItem key={automation.id} value={automation.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span>{automation.name}</span>
                          <Badge
                            variant={
                              automation.status === "completed"
                                ? "default"
                                : automation.status === "running"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {automation.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {state.automationId && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {state.automations.find(a => a.id === state.automationId)?.totalDMsSent || 0} DMs sent
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!state.workflowRunning ? (
                  <Button
                    onClick={handleRunWorkflow}
                    disabled={!state.automationId || !redditConnected}
                  >
                    <Play className="mr-2 size-4" />
                    Run Automation
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={handleStopWorkflow}
                  >
                    <StopCircle className="mr-2 size-4" />
                    Stop Automation
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="mr-2 size-4" />
                  New Automation
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Workflow Progress */}
        {liveFirestoreProgress && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Automation Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{liveFirestoreProgress.currentStage}</span>
                  <span className="text-muted-foreground">
                    {Math.round(liveFirestoreProgress.totalProgress)}%
                  </span>
                </div>
                <Progress value={liveFirestoreProgress.totalProgress} />
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  {liveFirestoreProgress.stages.map((stage, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {stage.status === "completed" ? (
                        <CheckCircle2 className="size-4 text-green-500" />
                      ) : stage.status === "in_progress" ? (
                        <Loader2 className="size-4 animate-spin text-blue-500" />
                      ) : stage.status === "error" ? (
                        <AlertCircle className="size-4 text-red-500" />
                      ) : (
                        <Clock className="size-4 text-gray-400" />
                      )}
                      <span className={
                        stage.status === "completed"
                          ? "text-green-600 dark:text-green-400"
                          : stage.status === "in_progress"
                          ? "text-blue-600 dark:text-blue-400"
                          : stage.status === "error"
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-500"
                      }>
                        {stage.name}
                      </span>
                    </div>
                  ))}
                </div>
                {liveFirestoreProgress.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertDescription>{liveFirestoreProgress.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reddit Connection Alert */}
        {redditConnected === false && (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>Reddit Not Connected</AlertTitle>
            <AlertDescription>
              Connect your Reddit account to send DMs.{" "}
              <Link href="/reddit/settings" className="font-medium underline">
                Connect Reddit
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="relative">
                <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  placeholder="Search posts..."
                  value={state.searchQuery}
                  onChange={e => updateState({ searchQuery: e.target.value })}
                  className="pl-9"
                />
              </div>

              {/* Keyword Filter */}
              <Select
                value={state.selectedKeyword ?? "all"}
                onValueChange={(value: string) =>
                  updateState({
                    selectedKeyword: value === "all" ? null : value
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All keywords" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All keywords</SelectItem>
                  {uniqueKeywords.map(keyword => (
                    <SelectItem key={keyword} value={keyword}>
                      {keyword}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select
                value={state.dateFilter}
                onValueChange={(value: any) =>
                  updateState({ dateFilter: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Past week</SelectItem>
                  <SelectItem value="month">Past month</SelectItem>
                  <SelectItem value="3months">Past 3 months</SelectItem>
                </SelectContent>
              </Select>

              {/* Score Filter */}
              <Select
                value={state.filterScore.toString()}
                onValueChange={value =>
                  updateState({ filterScore: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All scores</SelectItem>
                  <SelectItem value="40">40%+ match</SelectItem>
                  <SelectItem value="60">60%+ match</SelectItem>
                  <SelectItem value="80">80%+ match</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm font-medium">Sort by:</span>
              <Select
                value={state.sortBy}
                onValueChange={(value: any) => updateState({ sortBy: value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="upvotes">Upvotes</SelectItem>
                  <SelectItem value="time">Post time</SelectItem>
                  <SelectItem value="fetched">Fetched time</SelectItem>
                  <SelectItem value="posted">DM sent time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs
          value={state.activeTab}
          onValueChange={(value: any) => updateState({ activeTab: value })}
        >
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Database className="size-4" />
              All Posts ({state.posts.length})
            </TabsTrigger>
            <TabsTrigger value="queue" className="gap-2">
              <Clock className="size-4" />
              Queue ({state.posts.filter(p => p.dmStatus === "queued").length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <CheckCircle2 className="size-4" />
              Sent ({state.posts.filter(p => p.dmStatus === "sent").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={state.activeTab} className="mt-6">
            {/* Posts Grid */}
            {paginatedPosts.length > 0 ? (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
                  {paginatedPosts.map(post => (
                    <DMCard
                      key={post.id}
                      post={post}
                      isEditing={state.editingDMId === post.id}
                      isSending={state.sendingDMId === post.id}
                      isQueuing={state.queuingDMId === post.id}
                      isRemoving={state.removingDMId === post.id}
                      isRegenerating={state.regeneratingId === post.id}
                      selectedLength={state.selectedLength}
                      onGenerateDM={handleGenerateDM}
                      onSendDM={handleSendDM}
                      onEditDM={handleEditDM}
                      onCancelEdit={() => updateState({ editingDMId: null })}
                      onAddToQueue={handleAddToQueue}
                      onRemoveFromQueue={handleRemoveFromQueue}
                      onCopyDM={handleCopyDM}
                      onRegenerateDM={handleRegenerateDM}
                      onDeleteDM={handleDeleteDM}
                      onViewReddit={handleViewReddit}
                      onLengthChange={handleLengthChange}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateState({ currentPage: Math.max(1, state.currentPage - 1) })}
                      disabled={state.currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-muted-foreground text-sm">
                      Page {state.currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateState({ currentPage: Math.min(totalPages, state.currentPage + 1) })}
                      disabled={state.currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="text-muted-foreground mb-4 size-12" />
                  <h3 className="mb-2 text-lg font-semibold">No posts found</h3>
                  <p className="text-muted-foreground text-center text-sm">
                    {state.automationId
                      ? "Run the automation to find users and generate DMs"
                      : "Select or create a DM automation to get started"}
                  </p>
                  {state.automationId && (
                    <Button
                      className="mt-4"
                      onClick={handleRunWorkflow}
                      disabled={!redditConnected}
                    >
                      <Play className="mr-2 size-4" />
                      Run Automation
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Debug Panel */}
        {state.debugMode && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Debug Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] w-full rounded border p-4">
                <pre className="text-xs">
                  {state.debugLogs.join("\n") || "No debug logs yet"}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <CreateDMAutomationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        organizationId={currentOrganization?.id || ""}
        onSuccess={(automation) => {
          updateState({
            automations: [...state.automations, automation],
            automationId: automation.id,
            automationName: automation.name
          })
          loadPostsForAutomation(automation.id)
        }}
      />
    </div>
  )
} 