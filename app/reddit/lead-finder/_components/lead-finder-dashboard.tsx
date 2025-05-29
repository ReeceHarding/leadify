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
  Mail
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
import EditCampaignDialog from "./edit-campaign-dialog"
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
import { stopLeadGenerationWorkflowAction } from "@/actions/lead-generation/workflow-actions"
import {
  getGeneratedCommentsByCampaignAction,
  updateGeneratedCommentAction,
  updateGeneratedCommentLengthAction,
  createGeneratedCommentAction
} from "@/actions/db/lead-generation-actions"
import {
  createCampaignAction,
  getCampaignsByOrganizationIdAction,
  getCampaignByIdAction
} from "@/actions/db/campaign-actions"

import { regenerateCommentsWithToneAction } from "@/actions/integrations/openai/openai-actions"
import {
  postCommentAndUpdateStatusAction,
  testRedditPostingAction
} from "@/actions/integrations/reddit/reddit-posting-actions"
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
import LeadCard from "./dashboard/lead-card"
import DashboardHeader from "./dashboard/dashboard-header"
import ToneCustomizer from "./dashboard/tone-customizer"
import BatchPoster from "./dashboard/batch-poster"
import PaginationControls from "./dashboard/pagination-controls"
import LeadsDisplay from "./dashboard/leads-display"
import FindMoreLeads from "./dashboard/find-more-leads"
import FindNewLeadsDialog from "./find-new-leads-dialog"
import MassPostDialog from "./dashboard/mass-post-dialog"
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
import { GeneratedCommentDocument } from "@/db/firestore/lead-generation-collections"
import { toISOString } from "@/lib/utils/timestamp-utils"
import { validateOrganizationId, resolveOrganizationId } from "@/lib/utils/organization-utils"

// Import newly created types and utils
import { LeadResult } from "./dashboard/types"
import { getTimeAgo, serializeTimestampToISO } from "./dashboard/utils"
import {
  LeadGenerationProgress,
  LEAD_GENERATION_STAGES
} from "@/types"
import LeadGenerationProgressBar from "./dashboard/lead-generation-progress-bar"
import { 
  checkThreadInteractionAction,
  updateThreadInteractionAction,
  recordThreadInteractionAction
} from "@/actions/db/reddit-threads-actions"
import { semanticFilterAction } from "@/actions/integrations/openai/semantic-search-actions"
import { cn } from "@/lib/utils"
import MonitoringSettings from "./dashboard/monitoring-settings"

const ITEMS_PER_PAGE = 20
const POLLING_INTERVAL = 5000 // 5 seconds

interface Campaign {
  id: string
  name: string
  businessDescription?: string
  keywords: string[]
  status: "draft" | "running" | "completed" | "paused" | "error"
  totalCommentsGenerated: number
  createdAt: string
}

interface DashboardState {
  // Core state
  campaignId: string | null
  campaignName: string | null
  campaigns: Campaign[]
  leads: LeadResult[]
  isLoading: boolean
  error: string | null

  // UI state
  selectedLength: "micro" | "medium" | "verbose"
  currentPage: number
  sortBy: "relevance" | "upvotes" | "time" | "fetched" | "posted"
  filterKeyword: string
  filterScore: number
  activeTab: "all" | "queue"
  viewMode: "comment" | "dm" | "monitor" // Update viewMode to include monitor

  // Operation state
  selectedPost: LeadResult | null
  editingCommentId: string | null
  toneInstruction: string
  regeneratingId: string | null
  postingLeadId: string | null
  queuingLeadId: string | null
  removingLeadId: string | null
  isBatchPosting: boolean
  showRedditAuthDialog: boolean
  showMassPostDialog: boolean
  sendingDMLeadId: string | null // Add DM sending state

  // Metadata
  lastPolledAt: Date | null
  pollingEnabled: boolean
  workflowRunning: boolean

  // Debug mode
  debugMode: boolean
  debugLogs: string[]

  // New filter states
  searchQuery: string
  selectedKeyword: string | null
  dateFilter: "all" | "today" | "week" | "month" | "3months"
}

const initialState: DashboardState = {
  campaignId: null,
  campaignName: null,
  campaigns: [],
  leads: [],
  isLoading: true,
  error: null,
  selectedLength: "verbose",
  currentPage: 1,
  sortBy: "relevance",
  filterKeyword: "",
  filterScore: 0,
  activeTab: "all",
  viewMode: "comment", // Initialize viewMode
  selectedPost: null,
  editingCommentId: null,
  toneInstruction: "",
  regeneratingId: null,
  postingLeadId: null,
  queuingLeadId: null,
  removingLeadId: null,
  isBatchPosting: false,
  showRedditAuthDialog: false,
  showMassPostDialog: false,
  sendingDMLeadId: null, // Initialize DM sending state
  lastPolledAt: null,
  pollingEnabled: false,
  workflowRunning: false,
  debugMode: false,
  debugLogs: [],
  searchQuery: "",
  selectedKeyword: null,
  dateFilter: "all"
}

// Add date filter helper function
const filterByDate = (lead: LeadResult, dateFilter: string): boolean => {
  if (dateFilter === "all") return true

  const postDate = lead.postCreatedAt ? new Date(lead.postCreatedAt) : null
  if (!postDate) return true // If no date, include it

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

// Replace text search helper function with semantic search
const performSemanticSearch = async (leads: LeadResult[], query: string): Promise<LeadResult[]> => {
  if (!query.trim()) return leads

  console.log("🔍 [LEAD-FINDER] Performing semantic search for:", query)
  
  // Convert leads to ContentItem format for semantic filtering
  const contentItems = leads.map(lead => ({
    id: lead.id || `${lead.postTitle}-${lead.postAuthor}`,
    title: lead.postTitle,
    content: lead.postContentSnippet,
    author: lead.postAuthor,
    subreddit: lead.subreddit,
    keyword: lead.keyword,
    // Include the full lead object for later retrieval
    originalLead: lead
  }))

  try {
    const semanticResult = await semanticFilterAction(query, contentItems, {
      minRelevanceScore: 30, // Lower threshold for broader matching
      maxResults: leads.length, // Don't limit results
      includeInsights: false // Skip insights for performance
    })

    if (semanticResult.isSuccess) {
      console.log("🔍 [LEAD-FINDER] Semantic search found:", semanticResult.data.totalMatches, "matches")
      
      // Extract the original leads from the matched items
      const matchedLeads = semanticResult.data.matchedItems.map((item: any) => item.originalLead as LeadResult)
      return matchedLeads
    } else {
      console.warn("🔍 [LEAD-FINDER] Semantic search failed, falling back to basic search")
      // Fallback to basic string matching
      return leads.filter(lead => matchesSearchQuery(lead, query))
    }
  } catch (error) {
    console.error("🔍 [LEAD-FINDER] Semantic search error:", error)
    // Fallback to basic string matching
    return leads.filter(lead => matchesSearchQuery(lead, query))
  }
}

// Keep the original function as fallback
const matchesSearchQuery = (lead: LeadResult, query: string): boolean => {
  if (!query.trim()) return true

  const lowerQuery = query.toLowerCase()
  const searchableFields = [
    lead.postTitle,
    lead.postContentSnippet,
    lead.postAuthor,
    lead.subreddit,
    lead.microComment,
    lead.mediumComment,
    lead.verboseComment
  ]
    .filter(Boolean)
    .map(field => field!.toLowerCase())

  return searchableFields.some(field => field.includes(lowerQuery))
}

export default function LeadFinderDashboard() {
  const { user, isLoaded: userLoaded } = useUser()
  const { currentOrganization, isLoading: organizationLoading } = useOrganization()
  const [state, setState] = useState<DashboardState>(initialState)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)
  const [findNewLeadsOpen, setFindNewLeadsOpen] = useState(false)
  const [currentCampaignKeywords, setCurrentCampaignKeywords] = useState<
    string[]
  >([])
  const newLeadIds = useRef(new Set<string>())
  const searchParams = useSearchParams()
  const [liveFirestoreProgress, setLiveFirestoreProgress] =
    useState<LeadGenerationProgress | null>(null)
  const [redditConnected, setRedditConnected] = useState<boolean | null>(null)
  const posthog = usePostHog()
  const [notificationLead, setNotificationLead] = useState<LeadResult | null>(null) // Add notification lead state

  // Debug logging
  const addDebugLog = useCallback(
    (message: string, data?: any) => {
      const timestamp = new Date().toISOString()
      let dataString = ""
      
      if (data) {
        try {
          // Create a safe version of the data for logging
          const safeData = JSON.parse(JSON.stringify(data, (key, value) => {
            // Handle Firestore Timestamp objects
            if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
              return value.toDate().toISOString()
            }
            // Handle circular references by returning a placeholder
            if (value && typeof value === 'object' && value.constructor === Object) {
              const seen = new WeakSet()
              return JSON.parse(JSON.stringify(value, (k, v) => {
                if (typeof v === 'object' && v !== null) {
                  if (seen.has(v)) return '[Circular]'
                  seen.add(v)
                }
                return v
              }))
            }
            return value
          }))
          dataString = `: ${JSON.stringify(safeData, null, 2)}`
        } catch (e) {
          // If all else fails, just use toString
          dataString = `: [Complex Object - ${e instanceof Error ? e.message : 'Serialization failed'}]`
        }
      }
      
      const logEntry = `[${timestamp}] ${message}${dataString}`
      console.log(`🐛 ${logEntry}`)

      if (state.debugMode) {
        setState(prev => ({
          ...prev,
          debugLogs: [...prev.debugLogs.slice(-99), logEntry]
        }))
      }
    },
    [state.debugMode]
  )

  // Track organization changes and reset state when switching
  const previousOrgIdRef = useRef<string | null>(null)
  
  useEffect(() => {
    if (currentOrganization?.id && previousOrgIdRef.current && currentOrganization.id !== previousOrgIdRef.current) {
      console.log("🔄 [LEAD-FINDER] Organization changed, resetting state", {
        from: previousOrgIdRef.current,
        to: currentOrganization.id
      })
      
      // Reset the entire dashboard state when organization changes
      setState({
        ...initialState,
        debugMode: state.debugMode,
        debugLogs: state.debugLogs
      })
      
      // Clear any stored campaign selection for the new organization
      if (user?.id) {
        const oldKey = `campaign_${previousOrgIdRef.current}_${user.id}`
        const hasOldKey = localStorage.getItem(oldKey)
        if (hasOldKey) {
          console.log("🔄 [LEAD-FINDER] Clearing old campaign selection", oldKey)
        }
      }
    }
    
    // Update the ref with current organization ID
    previousOrgIdRef.current = currentOrganization?.id || null
  }, [currentOrganization?.id, user?.id, state.debugMode, state.debugLogs])

  // Listen for organization change events
  useEffect(() => {
    const handleOrganizationChange = (event: CustomEvent) => {
      console.log("🔄 [LEAD-FINDER] Organization change event received", event.detail)
      
      // Reset the dashboard state
      setState({
        ...initialState,
        debugMode: state.debugMode,
        debugLogs: state.debugLogs
      })
      
      // Clear Firestore listeners will be handled by the campaignId change
    }
    
    window.addEventListener('organizationChanged', handleOrganizationChange as EventListener)
    
    return () => {
      window.removeEventListener('organizationChanged', handleOrganizationChange as EventListener)
    }
  }, [state.debugMode, state.debugLogs])

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

  // Create and run campaign (MOVED TO BE BEFORE INITIALIZE useEffect)
  const createAndRunCampaign = useCallback(
    async (keywords: string[]) => {
      if (!user) {
        addDebugLog("createAndRunCampaign: User not available")
        return
      }

      if (!currentOrganization) {
        addDebugLog("createAndRunCampaign: No active organization")
        toast.error("Please select an organization first")
        return
      }

      addDebugLog("Creating new campaign", { keywords })

      try {
        setState(prev => ({
          ...prev,
          isLoading: true,
          workflowRunning: true,
          error: null
        }))

        // Profile check removed - using organization context instead
        if (!currentOrganization) {
          toast.error("No organization selected. Cannot create campaign.")
          addDebugLog("No organization selected for campaign creation", {
            userId: user.id
          })
          setState(prev => ({
            ...prev,
            workflowRunning: false,
            isLoading: false,
            error: "No organization selected"
          }))
          return
        }

        if (!currentOrganization.website) {
          toast.error(
            "Organization is missing website information. Cannot create campaign."
          )
          addDebugLog("Organization missing website for campaign creation", {
            organizationId: currentOrganization.id
          })
          setState(prev => ({
            ...prev,
            workflowRunning: false,
            isLoading: false,
            error: "Organization missing website"
          }))
          return
        }

        const campaignResult = await createCampaignAction({
          userId: user.id,
          organizationId: currentOrganization.id,
          name: `Lead Gen - ${new Date().toLocaleDateString()}`,
          website: currentOrganization.website,
          keywords: keywords
        })

        if (!campaignResult.isSuccess || !campaignResult.data?.id) {
          throw new Error(`Campaign creation failed: ${campaignResult.message}`)
        }

        const newCampaignId = campaignResult.data.id
        addDebugLog("Campaign created successfully", {
          campaignId: newCampaignId
        })

        setState(prev => ({
          ...prev,
          campaignId: newCampaignId,
          workflowRunning: true
        }))

        const workflowRunResult =
          await runFullLeadGenerationWorkflowAction(newCampaignId)

        if (workflowRunResult.isSuccess) {
          addDebugLog("Workflow started successfully for new campaign", {
            campaignId: newCampaignId,
            workflowProgress: workflowRunResult.data
          })
          toast.success(
            "Lead generation campaign started! New leads will appear in real-time."
          )
        } else {
          throw new Error(
            `Workflow start failed for new campaign ${newCampaignId}: ${workflowRunResult.message}`
          )
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to create and run campaign"
        addDebugLog("Campaign creation/run error", { error: errorMessage })
        setState(prev => ({
          ...prev,
          error: errorMessage,
          workflowRunning: false,
          isLoading: false
        }))
        toast.error(errorMessage)
      }
    },
    [user, currentOrganization, addDebugLog]
  )

  // Real-time workflow progress listener
  useEffect(() => {
    if (!state.campaignId) {
      setLiveFirestoreProgress(null)
      return
    }

    addDebugLog("Setting up Firestore listener for workflow progress", {
      campaignId: state.campaignId
    })

    const progressDocRef = doc(db, "lead_generation_progress", state.campaignId)
    const unsubscribe = onSnapshot(
      progressDocRef,
      docSnapshot => {
        if (docSnapshot.exists()) {
          const rawProgressData = docSnapshot.data()
          
          // Serialize the progress data to avoid circular structure issues
          const progressData: LeadGenerationProgress = {
            campaignId: rawProgressData.campaignId,
            status: rawProgressData.status,
            currentStage: rawProgressData.currentStage,
            totalProgress: rawProgressData.totalProgress,
            startedAt: rawProgressData.startedAt, // Keep as Timestamp for now
            completedAt: rawProgressData.completedAt, // Keep as Timestamp for now
            error: rawProgressData.error,
            results: rawProgressData.results,
            // Serialize stage timestamps if they exist
            stages: rawProgressData.stages?.map((stage: any) => ({
              ...stage,
              startedAt: stage.startedAt, // Keep as Timestamp
              completedAt: stage.completedAt // Keep as Timestamp
            })) || []
          }
          
          addDebugLog("Workflow progress snapshot received", {
            status: progressData.status,
            totalProgress: progressData.totalProgress
          })
          setLiveFirestoreProgress(progressData)

          setState(prev => ({
            ...prev,
            workflowRunning: progressData.status === "in_progress",
            error:
              progressData.status === "error"
                ? progressData.error || "Workflow error from Firestore"
                : prev.error
          }))
        } else {
          addDebugLog(
            "Workflow progress document does not exist for campaign:",
            state.campaignId
          )
          setLiveFirestoreProgress(null)
          setState(prev => ({ ...prev, workflowRunning: false }))
        }
      },
      error => {
        console.error("Error listening to workflow progress:", error)
        addDebugLog("Error listening to workflow progress", { error })
        setLiveFirestoreProgress(null)
        setState(prev => ({
          ...prev,
          workflowRunning: false,
          error: "Failed to load workflow progress"
        }))
      }
    )

    return () => {
      addDebugLog("Cleaning up Firestore listener for workflow progress", {
        campaignId: state.campaignId
      })
      unsubscribe()
    }
  }, [state.campaignId, addDebugLog])

  // Real-time leads listener using Firestore onSnapshot
  useEffect(() => {
    if (!state.campaignId) {
      addDebugLog("No campaign ID, skipping Firestore listener setup")
      return
    }

    addDebugLog("Setting up Firestore listener for campaign", {
      campaignId: state.campaignId
    })
    setState(prev => ({ ...prev, isLoading: true }))

    const commentsQuery = query(
      collection(db, "generated_comments"),
      where("campaignId", "==", state.campaignId)
    )

    const unsubscribe = onSnapshot(
      commentsQuery,
      querySnapshot => {
        addDebugLog("Firestore snapshot received", {
          count: querySnapshot.size,
          campaignId: state.campaignId
        })
        const transformedLeads: LeadResult[] = querySnapshot.docs.map(
          docSnap => {
            const comment = docSnap.data() as GeneratedCommentDocument
            
            // Use centralized timestamp utility to ensure proper serialization
            const createdAtISO = toISOString(comment.createdAt) || new Date().toISOString()
            const updatedAtISO = toISOString(comment.updatedAt) || new Date().toISOString()
            const postCreatedAtISO = toISOString(comment.postCreatedAt) || undefined

            return {
              id: docSnap.id,
              campaignId: comment.campaignId || "",
              organizationId: validateOrganizationId(currentOrganization?.id, "Lead creation"),
              threadId: comment.threadId || "",
              postUrl: comment.postUrl || "",
              postTitle: comment.postTitle || "Untitled Post",
              postAuthor: comment.postAuthor || "Unknown Author",
              postContentSnippet: comment.postContentSnippet || "",
              postContent: comment.postContent,
              subreddit: comment.postUrl?.match(/r\/([^/]+)/)?.[1] || "Unknown",
              relevanceScore: comment.relevanceScore || 0,
              reasoning: comment.reasoning || "",
              microComment: comment.microComment || "",
              mediumComment: comment.mediumComment || "",
              verboseComment: comment.verboseComment || "",
              // Add DM fields
              dmMessage: comment.dmMessage,
              dmSubject: comment.dmSubject,
              dmFollowUp: comment.dmFollowUp,
              dmStatus: comment.dmStatus,
              dmSentAt: comment.dmSentAt ? toISOString(comment.dmSentAt) || undefined : undefined,
              dmError: comment.dmError,
              status: comment.status || "new",
              selectedLength: comment.selectedLength || "medium",
              timeAgo: postCreatedAtISO
                ? getTimeAgo(postCreatedAtISO)
                : getTimeAgo(createdAtISO),
              // Remove originalData as it contains Firestore Timestamp objects
              postScore: comment.postScore || 0,
              keyword: comment.keyword || "",
              createdAt: createdAtISO,
              updatedAt: updatedAtISO,
              postCreatedAt: postCreatedAtISO,
              postedCommentUrl: comment.postedCommentUrl || undefined,
              hasDM: false // Will be updated by checkDMStatus effect
            }
          }
        )

        transformedLeads.forEach(lead => {
          if (!state.leads.find(l => l.id === lead.id)) {
            newLeadIds.current.add(lead.id)
          }
        })

        setState(prev => ({
          ...prev,
          leads: transformedLeads,
          isLoading: false, // Data received, stop loading
          lastPolledAt: new Date(), // Can be renamed to lastUpdatedAt
          error: null
        }))
      },
      error => {
        addDebugLog("Firestore listener error", {
          error: error.message,
          campaignId: state.campaignId
        })
        setState(prev => ({
          ...prev,
          error: "Failed to listen for real-time lead updates.",
          isLoading: false
        }))
      }
    )

    // Cleanup listener on component unmount or when campaignId changes
    return () => {
      addDebugLog("Cleaning up Firestore listener for campaign", {
        campaignId: state.campaignId
      })
      unsubscribe()
    }
  }, [state.campaignId, addDebugLog]) // Dependencies: re-run if campaignId or addDebugLog changes.

  // Initialize dashboard: Fetches initial campaign or creates one.
  useEffect(() => {
    const initialize = async () => {
      if (!userLoaded || !user) {
        addDebugLog("User not loaded yet for initialization")
        return
      }

      // Wait for organization context to be loaded
      if (!currentOrganization) {
        addDebugLog("Waiting for organization context to load")
        // Don't set isLoading to false here - wait for organization
        return
      }

      addDebugLog("Initializing dashboard", { 
        userId: user.id,
        organizationId: currentOrganization.id 
      })
      
      // Set isLoading to true at the start of initialization.
      // The onSnapshot listener will set it to false once data is loaded or an error occurs.
      setState(prev => ({ ...prev, isLoading: true }))

      try {
        // Check localStorage for previously selected campaign
        const storedCampaignId = localStorage.getItem(`campaign_${currentOrganization.id}_${user.id}`)
        
        const campaignsResult = await getCampaignsByOrganizationIdAction(
          currentOrganization.id
        )

        // Transform campaigns data for the dropdown
        const transformedCampaigns: Campaign[] = campaignsResult.isSuccess
          ? campaignsResult.data.map(campaign => {
              return {
                id: campaign.id,
                name: campaign.name,
                businessDescription: campaign.businessDescription,
                keywords: campaign.keywords || [],
                status: campaign.status || "draft",
                totalCommentsGenerated: campaign.totalCommentsGenerated || 0,
                createdAt:
                  typeof campaign.createdAt === "string"
                    ? campaign.createdAt
                    : (campaign.createdAt as any)?.toDate?.()?.toISOString() ||
                      new Date().toISOString()
              }
            })
          : []

        setState(prev => ({ ...prev, campaigns: transformedCampaigns }))

        if (campaignsResult.isSuccess && campaignsResult.data.length > 0) {
          // Try to use stored campaign ID first, then fall back to latest
          let selectedCampaign = null
          
          if (storedCampaignId) {
            selectedCampaign = campaignsResult.data.find(c => c.id === storedCampaignId)
            if (selectedCampaign) {
              addDebugLog("Restored previously selected campaign", {
                campaignId: storedCampaignId
              })
            }
          }
          
          if (!selectedCampaign) {
            // Fall back to latest campaign
            selectedCampaign = campaignsResult.data.sort((a: any, b: any) => {
              // Assuming createdAt is a string (ISO format) or Timestamp
              const dateA =
                typeof a.createdAt === "string"
                  ? new Date(a.createdAt)
                  : (a.createdAt as Timestamp)?.toDate()
              const dateB =
                typeof b.createdAt === "string"
                  ? new Date(b.createdAt)
                  : (b.createdAt as Timestamp)?.toDate()
              return (dateB?.getTime() || 0) - (dateA?.getTime() || 0)
            })[0]
            
            addDebugLog("Selected latest campaign", {
              campaignId: selectedCampaign.id,
              status: selectedCampaign.status
            })
          }

          setState(prev => ({ ...prev, campaignId: selectedCampaign.id }))
          
          // Store the selected campaign ID
          localStorage.setItem(`campaign_${currentOrganization.id}_${user.id}`, selectedCampaign.id)
          
          addDebugLog("Campaign selected", { campaignId: selectedCampaign.id })

          // Fetch full campaign details to get the name
          getCampaignByIdAction(selectedCampaign.id).then(result => {
            if (result.isSuccess && result.data) {
              setState(prev => ({
                ...prev,
                campaignName: result.data.name || null
              }))
              setCurrentCampaignKeywords(
                result.data.keywords || []
              )
            }
          })
        } else {
          addDebugLog("No campaigns found for organization")
          setState(prev => ({ ...prev, isLoading: false }))
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to initialize"
        addDebugLog("Initialization error", { error: errorMessage })
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false
        }))
      }
    }

    initialize()
  }, [userLoaded, user, currentOrganization, addDebugLog])

  // Handle Reddit OAuth success
  useEffect(() => {
    const success = searchParams.get("success")
    const error = searchParams.get("error")

    if (success === "Reddit authentication successful") {
      toast.success("Reddit account connected successfully!")
      // Clear the success parameter from URL
      const url = new URL(window.location.href)
      url.searchParams.delete("success")
      window.history.replaceState({}, "", url)
    }

    if (error) {
      toast.error(`Reddit authentication failed: ${error}`)
      // Clear the error parameter from URL
      const url = new URL(window.location.href)
      url.searchParams.delete("error")
      window.history.replaceState({}, "", url)
    }
  }, [searchParams])

  // Check DM status for leads
  useEffect(() => {
    const checkDMStatus = async () => {
      if (state.leads.length === 0) return
      
      console.log("🔍 [DM-STATUS] Checking DM status for", state.leads.length, "leads")
      
      // Check DM status for each lead
      const dmStatusPromises = state.leads.map(async (lead) => {
        if (!lead.threadId) return { leadId: lead.id, hasDM: false }
        
        try {
          const result = await checkThreadInteractionAction(
            currentOrganization?.id || "",
            lead.threadId,
            lead.postAuthor
          )
          
          return {
            leadId: lead.id,
            hasDM: result.isSuccess ? result.data.hasDM : false
          }
        } catch (error) {
          console.error("Error checking DM status for lead:", lead.id, error)
          return { leadId: lead.id, hasDM: false }
        }
      })
      
      const dmStatuses = await Promise.all(dmStatusPromises)
      
      // Update leads with DM status
      setState(prev => ({
        ...prev,
        leads: prev.leads.map(lead => {
          const status = dmStatuses.find(s => s.leadId === lead.id)
          return status ? { ...lead, hasDM: status.hasDM } : lead
        })
      }))
    }
    
    checkDMStatus()
  }, [state.leads.length, currentOrganization?.id])

  // Manual test data creation
  const createTestData = async () => {
    if (!state.campaignId || !user) {
      toast.error("No campaign selected or user not available")
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
        postContentSnippet:
          "I'm looking for recommendations on the best tools for my business...",
        relevanceScore: 85,
        reasoning: "This is a test lead with high relevance score",
        microComment: "Check out our solution!",
        mediumComment:
          "Based on your needs, I'd recommend checking out our platform. It's specifically designed for businesses like yours and has helped many similar companies.",
        verboseComment:
          "I understand you're looking for business tools. Based on what you've described, I'd strongly recommend taking a look at our platform. We've helped dozens of similar businesses streamline their operations and increase efficiency. Our solution offers comprehensive features including automated workflows, real-time analytics, and seamless integrations with your existing tools. Happy to share more details if you're interested!",
        status: "new" as const,
        keyword: "test keyword",
        postScore: 42
        // Ensure all fields of CreateGeneratedCommentData are present if that type is strict
      }

      // Assuming createGeneratedCommentAction expects a compatible type
      const result = await createGeneratedCommentAction(testComment as any) // Cast to any if types are misaligned temporarily

      if (result.isSuccess) {
        addDebugLog("Test data created successfully", { id: result.data.id })
        toast.success("Test lead created successfully!")
        // await fetchLeads() // Removed: onSnapshot will pick up changes
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

  // Manual workflow trigger - now opens the dialog
  const manualRunWorkflow = async () => {
    if (!state.campaignId) {
      toast.error("Please select a campaign first")
      return
    }

    await runFullLeadGenerationWorkflowAction(state.campaignId)
  }

  const handleStopWorkflow = async () => {
    if (!state.campaignId) {
      toast.error("No active campaign to stop")
      return
    }

    addDebugLog("Stopping workflow", { campaignId: state.campaignId })

    try {
      const result = await stopLeadGenerationWorkflowAction(state.campaignId)
      
      if (result.isSuccess) {
        toast.success("Lead generation stopped successfully")
        setState(prev => ({
          ...prev,
          workflowRunning: false
        }))
        addDebugLog("Workflow stopped successfully")
      } else {
        toast.error(result.message)
        addDebugLog("Failed to stop workflow", { error: result.message })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to stop workflow"
      toast.error(errorMessage)
      addDebugLog("Error stopping workflow", { error: errorMessage })
    }
  }

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
  const handleCommentEdit = async (leadId: string, newContent: string, isDM: boolean = false) => {
    console.log("✏️ [EDIT] Editing", isDM ? "DM" : "comment", "for lead:", leadId)

    const lead = state.leads.find(l => l.id === leadId)
    if (!lead) return

    try {
      if (isDM) {
        // Update DM content
        const result = await updateGeneratedCommentAction(leadId, {
          dmMessage: newContent
        })

        if (result.isSuccess) {
          setState(prev => ({
            ...prev,
            leads: prev.leads.map(l =>
              l.id === leadId
                ? { ...l, dmMessage: newContent }
                : l
            ),
            editingCommentId: null
          }))
          toast.success("DM updated")
        } else {
          toast.error("Failed to update DM")
        }
      } else {
        // Update comment content
        const lengthField = `${lead.selectedLength || state.selectedLength}Comment`
        const result = await updateGeneratedCommentAction(leadId, {
          [lengthField]: newContent
        })

        if (result.isSuccess) {
          setState(prev => ({
            ...prev,
            leads: prev.leads.map(l =>
              l.id === leadId
                ? {
                    ...l,
                    [lengthField]: newContent,
                    [`${lead.selectedLength || state.selectedLength}Comment`]:
                      newContent
                  }
                : l
            ),
            editingCommentId: null
          }))
          toast.success("Comment updated")
        } else {
          toast.error("Failed to update comment")
        }
      }
    } catch (error) {
      console.error("✏️ [EDIT] Error:", error)
      toast.error(isDM ? "Error updating DM" : "Error updating comment")
    }
  }

  // Handle sending DM
  const handleSendDM = async (lead: LeadResult) => {
    console.log("📨 [DM] Sending DM to:", lead.postAuthor)
    updateState({ sendingDMLeadId: lead.id })

    try {
      if (!lead.dmMessage) {
        throw new Error("No DM message available")
      }

      // Import the Reddit DM sending action
      const { sendRedditDMAction } = await import(
        "@/actions/integrations/reddit/reddit-dm-actions"
      )

      const result = await sendRedditDMAction(
        currentOrganization?.id || "",
        lead.postAuthor,
        lead.dmSubject || "Re: Your post",
        lead.dmMessage
      )

      if (result.isSuccess) {
        // Update the lead status
        await updateGeneratedCommentAction(lead.id, {
          dmStatus: "sent",
          dmSentAt: Timestamp.now()
        })

        setState(prev => ({
          ...prev,
          leads: prev.leads.map(l =>
            l.id === lead.id
              ? {
                  ...l,
                  dmStatus: "sent",
                  dmSentAt: new Date().toISOString(),
                  hasDM: true
                }
              : l
          ),
          sendingDMLeadId: null
        }))

        // Update thread interaction
        await updateThreadInteractionAction(lead.threadId, {
          hasDM: true
        })

        // Record the interaction
        await recordThreadInteractionAction({
          organizationId: currentOrganization?.id || "",
          threadId: lead.threadId,
          userId: user?.id || "",
          type: "dm",
          details: {
            status: "sent"
          }
        })

        toast.success("DM sent successfully!")
        posthog.capture("reddit_dm_sent", {
          leadId: lead.id,
          recipient: lead.postAuthor
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("📨 [DM] Error sending:", error)

      const errorMessage = error instanceof Error ? error.message : String(error)
      
      if (
        errorMessage.includes("No valid Reddit access token") ||
        errorMessage.includes("authentication")
      ) {
        updateState({ showRedditAuthDialog: true })
        toast.error("Please reconnect your Reddit account")
      } else if (errorMessage.includes("User not found")) {
        toast.error("User not found or has deleted their account")
      } else if (errorMessage.includes("blocked")) {
        toast.error("Cannot send DM - user has blocked DMs or you")
      } else {
        toast.error("Failed to send DM")
      }

      // Update with error status
      await updateGeneratedCommentAction(lead.id, {
        dmStatus: "failed",
        dmError: errorMessage
      })

      updateState({ sendingDMLeadId: null })
    }
  }

  // Handle adding to queue
  const handleAddToQueue = async (lead: LeadResult) => {
    console.log("➕ [QUEUE] Adding to queue:", lead.id)

    // Check if queue is empty
    const queuedLeads = state.leads.filter(l => l.status === "queued")
    const isQueueEmpty = queuedLeads.length === 0

    // If queue is empty and this is the first item, post immediately
    if (isQueueEmpty) {
      console.log("📤 [QUEUE] Queue empty, posting immediately:", lead.id)
      updateState({ postingLeadId: lead.id })

      try {
        const comment = getDisplayComment(lead)

        // Extract thread ID from the Reddit URL
        const threadId = lead.postUrl.match(/\/comments\/([a-zA-Z0-9]+)/)?.[1]
        if (!threadId) {
          throw new Error(
            "Could not extract thread ID from URL: " + lead.postUrl
          )
        }

        console.log(
          "📤 [QUEUE] Extracted thread ID:",
          threadId,
          "from URL:",
          lead.postUrl
        )

        const result = await postCommentAndUpdateStatusAction(
          lead.id,
          threadId,
          comment,
          currentOrganization?.id || ""
        )

        if (result.isSuccess) {
          setState(prev => ({
            ...prev,
            leads: prev.leads.map(l =>
              l.id === lead.id
                ? {
                    ...l,
                    status: "posted",
                    postedCommentUrl: result.data.link
                  }
                : l
            ),
            postingLeadId: null
          }))
          toast.success("Comment posted successfully!")
          posthog.capture("reddit_comment_posted", {
            leadId: lead.id,
            method: "immediate_from_queue"
          })
        } else {
          throw new Error(result.message)
        }
      } catch (error) {
        console.error("📤 [QUEUE] Error posting:", error)

        // Check if it's an authentication error
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        if (
          errorMessage.includes("No valid Reddit access token") ||
          errorMessage.includes("authentication") ||
          errorMessage.includes("re-authenticate")
        ) {
          updateState({ showRedditAuthDialog: true })
          toast.error("Please reconnect your Reddit account")
        } else if (
          errorMessage.includes(
            "don't have permission to post in this subreddit"
          )
        ) {
          toast.error("Posting blocked by subreddit rules", {
            description:
              "This subreddit has posting restrictions. Try a different subreddit or check if you need to join first.",
            duration: 6000
          })
        } else {
          toast.error("Failed to post comment")
        }

        updateState({ postingLeadId: null })
      }
    } else {
      // Queue is not empty, just add to queue
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

      // Extract thread ID from the Reddit URL
      const threadId = lead.postUrl.match(/\/comments\/([a-zA-Z0-9]+)/)?.[1]
      if (!threadId) {
        throw new Error("Could not extract thread ID from URL: " + lead.postUrl)
      }

      console.log(
        "📤 [POST] Extracted thread ID:",
        threadId,
        "from URL:",
        lead.postUrl
      )

      const result = await postCommentAndUpdateStatusAction(
        lead.id,
        threadId,
        comment,
        currentOrganization?.id || ""
      )

      if (result.isSuccess) {
        setState(prev => ({
          ...prev,
          leads: prev.leads.map(l =>
            l.id === lead.id
              ? {
                  ...l,
                  status: "posted",
                  postedCommentUrl: result.data.link
                }
              : l
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

      // Check if it's an authentication error
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      if (
        errorMessage.includes("No valid Reddit access token") ||
        errorMessage.includes("authentication") ||
        errorMessage.includes("re-authenticate")
      ) {
        updateState({ showRedditAuthDialog: true })
        toast.error("Please reconnect your Reddit account")
      } else if (
        errorMessage.includes("don't have permission to post in this subreddit")
      ) {
        toast.error("Posting blocked by subreddit rules", {
          description:
            "This subreddit has posting restrictions. Try a different subreddit or check if you need to join first.",
          duration: 6000
        })
      } else {
        toast.error("Failed to post comment")
      }

      updateState({ postingLeadId: null })
    }
  }

  // Handle tone regeneration
  const handleToneRegeneration = async () => {
    if (!state.toneInstruction.trim()) {
      toast.error("Please enter tone instructions")
      return
    }

    // If no selected post, regenerate for all leads
    const leadsToRegenerate = state.selectedPost
      ? [state.selectedPost]
      : state.leads

    console.log(
      "🎨 [TONE] Regenerating with instruction:",
      state.toneInstruction
    )
    updateState({ regeneratingId: "all" }) // Use "all" as ID when regenerating all

    try {
      // Get website content from campaign
      const campaignResult = await getCampaignByIdAction(state.campaignId!)
      if (!campaignResult.isSuccess || !campaignResult.data.websiteContent) {
        throw new Error("Website content not available")
      }

      // Regenerate comments for each lead
      for (const lead of leadsToRegenerate) {
        const result = await regenerateCommentsWithToneAction(
          lead.postTitle,
          lead.postContentSnippet,
          lead.subreddit,
          campaignResult.data.websiteContent,
          state.toneInstruction,
          lead.organizationId, // Pass organizationId from lead
          lead.postUrl, // Pass the post URL for fetching existing comments
          lead.microComment, // Pass existing micro comment
          lead.mediumComment, // Pass existing medium comment
          lead.verboseComment // Pass existing verbose comment
        )

        if (result.isSuccess) {
          // Update the comment in the database
          await updateGeneratedCommentAction(lead.id, {
            microComment: result.data.microComment,
            mediumComment: result.data.mediumComment,
            verboseComment: result.data.verboseComment
          })

          setState(prev => ({
            ...prev,
            leads: prev.leads.map(l =>
              l.id === lead.id
                ? {
                    ...l,
                    microComment: result.data.microComment,
                    mediumComment: result.data.mediumComment,
                    verboseComment: result.data.verboseComment
                  }
                : l
            )
          }))
        }
      }

      setState(prev => ({
        ...prev,
        regeneratingId: null,
        toneInstruction: ""
      }))
      toast.success(
        `Comments regenerated with new tone for ${leadsToRegenerate.length} lead(s)`
      )
    } catch (error) {
      console.error("🎨 [TONE] Error:", error)
      toast.error("Failed to regenerate comments")
      updateState({ regeneratingId: null })
    }
  }

  // Handle regenerating a single comment with specific instructions
  const handleRegenerateWithInstructions = async (
    leadId: string,
    instructions: string
  ) => {
    console.log("✨ [REGENERATE] Regenerating comment with instructions:", {
      leadId,
      instructions
    })

    const lead = state.leads.find(l => l.id === leadId)
    if (!lead) return

    try {
      // Check if this is a request to use new prompts
      if (instructions === "__USE_NEW_PROMPTS__") {
        console.log("✨ [REGENERATE] Using new AI prompts for single comment")
        
        // Get campaign details
        const campaignResult = await getCampaignByIdAction(state.campaignId!)
        if (!campaignResult.isSuccess || !campaignResult.data) {
          throw new Error("Campaign details not available")
        }

        const campaign = campaignResult.data
        const websiteContent = campaign.websiteContent
        if (!websiteContent) {
          throw new Error("Website content not available")
        }

        // Get personalization data
        const { getKnowledgeBaseByOrganizationIdAction } = await import(
          "@/actions/db/personalization-actions"
        )
        const knowledgeBaseResult = await getKnowledgeBaseByOrganizationIdAction(lead.organizationId)
        let brandNameToUse = campaign.name
        
        if (knowledgeBaseResult.isSuccess && knowledgeBaseResult.data) {
          const kb = knowledgeBaseResult.data
          brandNameToUse = kb.brandNameOverride || campaign.name || "our solution"
          brandNameToUse = brandNameToUse.toLowerCase()
        }

        // Get the Reddit thread data
        const { collection, query, where, getDocs, limit } = await import("firebase/firestore")
        const { db } = await import("@/db/db")
        const { LEAD_COLLECTIONS } = await import("@/db/schema")
        
        const threadQuery = query(
          collection(db, LEAD_COLLECTIONS.REDDIT_THREADS),
          where("threadId", "==", lead.threadId),
          limit(1)
        )
        const threadSnapshot = await getDocs(threadQuery)

        if (threadSnapshot.empty) {
          throw new Error("Thread data not found")
        }

        const threadData = threadSnapshot.docs[0].data()

        // Fetch existing comments from Reddit for context
        let existingRedditComments: string[] = []
        try {
          const { fetchRedditCommentsAction } = await import(
            "@/actions/integrations/reddit/reddit-actions"
          )
          const commentsResult = await fetchRedditCommentsAction(
            lead.organizationId,
            lead.threadId,
            threadData.subreddit,
            "best",
            10
          )
          if (commentsResult.isSuccess && commentsResult.data.length > 0) {
            existingRedditComments = commentsResult.data
              .filter(c => c.body && c.body !== "[deleted]" && c.body !== "[removed]")
              .map(c => c.body)
              .slice(0, 5)
          }
        } catch (error) {
          console.warn("✨ [REGENERATE] Failed to fetch Reddit comments:", error)
        }

        // Use the new personalized scoring and comment generation
        const { scoreThreadAndGeneratePersonalizedCommentsAction } = await import(
          "@/actions/integrations/openai/openai-actions"
        )

        const result = await scoreThreadAndGeneratePersonalizedCommentsAction(
          threadData.title,
          threadData.content,
          threadData.subreddit,
          lead.organizationId,
          campaign.keywords,
          websiteContent,
          existingRedditComments,
          brandNameToUse
        )

        if (result.isSuccess) {
          // Update the comment in the database
          await updateGeneratedCommentAction(leadId, {
            relevanceScore: result.data.score,
            reasoning: result.data.reasoning,
            microComment: result.data.microComment,
            mediumComment: result.data.mediumComment,
            verboseComment: result.data.verboseComment
          })

          setState(prev => ({
            ...prev,
            leads: prev.leads.map(l =>
              l.id === leadId
                ? {
                    ...l,
                    relevanceScore: result.data.score,
                    reasoning: result.data.reasoning,
                    microComment: result.data.microComment,
                    mediumComment: result.data.mediumComment,
                    verboseComment: result.data.verboseComment
                  }
                : l
            )
          }))
        } else {
          throw new Error(result.message)
        }
      } else {
        // Regular regeneration with custom instructions
        const campaignResult = await getCampaignByIdAction(state.campaignId!)
        if (!campaignResult.isSuccess || !campaignResult.data.websiteContent) {
          throw new Error("Website content not available")
        }

        // Call the regeneration action with the specific instructions
        const result = await regenerateCommentsWithToneAction(
          lead.postTitle,
          lead.postContentSnippet,
          lead.subreddit,
          campaignResult.data.websiteContent,
          instructions,
          lead.organizationId,
          lead.postUrl,
          lead.microComment,
          lead.mediumComment,
          lead.verboseComment
        )

        if (result.isSuccess) {
          // Update the comment in the database
          await updateGeneratedCommentAction(leadId, {
            microComment: result.data.microComment,
            mediumComment: result.data.mediumComment,
            verboseComment: result.data.verboseComment
          })

          setState(prev => ({
            ...prev,
            leads: prev.leads.map(l =>
              l.id === leadId
                ? {
                    ...l,
                    microComment: result.data.microComment,
                    mediumComment: result.data.mediumComment,
                    verboseComment: result.data.verboseComment
                  }
                : l
            )
          }))
        } else {
          throw new Error(result.message)
        }
      }
    } catch (error) {
      console.error("✨ [REGENERATE] Error:", error)
      throw error // Re-throw to let the LeadCard handle the error display
    }
  }

  // Handle regenerating all comments with new prompts
  const handleRegenerateAllWithNewPrompts = async () => {
    if (!state.campaignId) {
      toast.error("No campaign selected")
      return
    }

    console.log("🔄 [REGENERATE-ALL] Starting regeneration with new prompts")
    updateState({ regeneratingId: "all" })

    try {
      // Import and call the new regeneration action
      const { regenerateAllCommentsForCampaignAction } = await import(
        "@/actions/lead-generation/workflow-actions"
      )
      
      const result = await regenerateAllCommentsForCampaignAction(state.campaignId)

      if (result.isSuccess) {
        toast.success(result.message)
        
        // Refresh the leads to show updated comments
        const commentsResult = await getGeneratedCommentsByCampaignAction(state.campaignId)
        if (commentsResult.isSuccess) {
          const transformedLeads: LeadResult[] = commentsResult.data.map(comment => ({
            id: comment.id,
            campaignId: comment.campaignId,
            organizationId: comment.organizationId,
            threadId: comment.threadId,
            postUrl: comment.postUrl,
            postTitle: comment.postTitle,
            postAuthor: comment.postAuthor,
            postContentSnippet: comment.postContentSnippet,
            postContent: comment.postContent,
            relevanceScore: comment.relevanceScore,
            reasoning: comment.reasoning,
            microComment: comment.microComment,
            mediumComment: comment.mediumComment,
            verboseComment: comment.verboseComment,
            status: comment.status,
            selectedLength: comment.selectedLength || "verbose",
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            keyword: comment.keyword,
            postScore: comment.postScore,
            postCreatedAt: comment.postCreatedAt,
            postedCommentUrl: comment.postedCommentUrl,
            subreddit: comment.postUrl.match(/\/r\/([^\/]+)/)?.[1] || "",
            timeAgo: getTimeAgo(comment.postCreatedAt || comment.createdAt)
          }))
          
          setState(prev => ({
            ...prev,
            leads: transformedLeads,
            regeneratingId: null
          }))
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("🔄 [REGENERATE-ALL] Error:", error)
      toast.error("Failed to regenerate comments")
    } finally {
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

    console.log(
      "📦 [BATCH] Starting batch post for",
      queuedLeads.length,
      "leads"
    )
    updateState({ isBatchPosting: true })

    try {
      const posts = queuedLeads.map(lead => ({
        leadId: lead.id,
        threadId: lead.postUrl.match(/\/comments\/([a-zA-Z0-9]+)/)?.[1] || "",
        comment: getDisplayComment(lead),
        organizationId: currentOrganization?.id || ""
      }))

      // Dynamic import to avoid importing server action in client component
      const { queuePostsForAsyncProcessing } = await import(
        "@/actions/integrations/reddit/reddit-posting-queue"
      )
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
      // Dynamic import to avoid importing server action in client component
      const { getPostingQueueStatus } = await import(
        "@/actions/integrations/reddit/reddit-posting-queue"
      )
      const result = await getPostingQueueStatus(user.id)

      if (result.isSuccess) {
        const { pending, processing, completed, failed } = result.data

        // Update lead statuses based on queue stats
        // Note: This is a simplified approach - in production you'd want to
        // track individual post statuses

        console.log(
          `📦 [QUEUE-STATUS] Pending: ${pending}, Processing: ${processing}, Completed: ${completed}, Failed: ${failed}`
        )

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
      filtered = filtered.filter(
        lead => lead.relevanceScore >= state.filterScore
      )
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
  }, [
    state.leads,
    state.filterKeyword,
    state.filterScore,
    state.sortBy,
    state.activeTab
  ])

  // Paginated leads
  const paginatedLeads = useMemo(() => {
    const startIndex = (state.currentPage - 1) * ITEMS_PER_PAGE
    return filteredAndSortedLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredAndSortedLeads, state.currentPage])

  const totalPages = Math.ceil(filteredAndSortedLeads.length / ITEMS_PER_PAGE)

  const handleMassPost = () => {
    updateState({ showMassPostDialog: true })
  }

  // Get unique keywords from leads
  const uniqueKeywords = useMemo(() => {
    const keywords = new Set<string>()
    state.leads.forEach(lead => {
      if (lead.keyword) keywords.add(lead.keyword)
    })
    return Array.from(keywords).sort()
  }, [state.leads])

  // Filter and sort leads with semantic search
  const [filteredLeads, setFilteredLeads] = useState<LeadResult[]>([])
  const [isFiltering, setIsFiltering] = useState(false)

  // Update filtered leads when search criteria change
  useEffect(() => {
    const applyFilters = async () => {
      setIsFiltering(true)
      try {
        let filtered = [...state.leads]

        // Apply monitor tab filter - only show posts from today
        if (state.viewMode === "monitor") {
          const now = new Date()
          const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).getTime()
          
          filtered = filtered.filter(lead => {
            if (!lead.postCreatedAt) return false
            const postDate = new Date(lead.postCreatedAt).getTime()
            return postDate >= sevenDaysAgo
          })
          
          // Sort by most recent first for monitor tab
          filtered.sort((a, b) => {
            const dateA = a.postCreatedAt ? new Date(a.postCreatedAt).getTime() : 0
            const dateB = b.postCreatedAt ? new Date(b.postCreatedAt).getTime() : 0
            return dateB - dateA
          })
        } else {
          // Apply semantic text search filter
          if (state.searchQuery.trim()) {
            console.log("🔍 [LEAD-FINDER] Applying semantic search filter")
            filtered = await performSemanticSearch(filtered, state.searchQuery)
          }

          // Apply keyword filter
          if (state.selectedKeyword) {
            filtered = filtered.filter(lead => lead.keyword === state.selectedKeyword)
          }

          // Apply score filter
          if (state.filterScore > 0) {
            filtered = filtered.filter(
              lead => lead.relevanceScore >= state.filterScore
            )
          }

          // Apply date filter
          filtered = filtered.filter(lead => filterByDate(lead, state.dateFilter))

          // Apply tab filter
          if (state.activeTab === "queue") {
            filtered = filtered.filter(lead => lead.status === "queued")
          }

          // Sort
          switch (state.sortBy) {
            case "relevance":
              filtered.sort((a, b) => b.relevanceScore - a.relevanceScore)
              break
            case "upvotes":
              filtered.sort((a, b) => (b.postScore || 0) - (a.postScore || 0))
              break
            case "time":
              filtered.sort((a, b) => {
                const dateA = a.postCreatedAt
                  ? new Date(a.postCreatedAt).getTime()
                  : 0
                const dateB = b.postCreatedAt
                  ? new Date(b.postCreatedAt).getTime()
                  : 0
                return dateB - dateA
              })
              break
            case "posted":
              // Sort by Reddit post creation date (newest first)
              filtered.sort((a, b) => {
                const dateA = a.postCreatedAt
                  ? new Date(a.postCreatedAt).getTime()
                  : 0
                const dateB = b.postCreatedAt
                  ? new Date(b.postCreatedAt).getTime()
                  : 0
                return dateB - dateA
              })
              break
            case "fetched":
              // Sort by when we found the lead (newest first)
              filtered.sort((a, b) => {
                const dateA = a.createdAt
                  ? new Date(a.createdAt).getTime()
                  : 0
                const dateB = b.createdAt
                  ? new Date(b.createdAt).getTime()
                  : 0
                return dateB - dateA
              })
              break
          }
        }

        setFilteredLeads(filtered)

        // Update notification count for monitor tab
        if (state.viewMode === "monitor") {
          const newPostsCount = filtered.filter(lead => {
            // Consider a post "new" if it's not posted and not viewed
            return lead.status === "new" && !lead.dmStatus
          }).length

          // Dispatch event to update sidebar notification
          window.dispatchEvent(new CustomEvent('leadFinderNotificationUpdate', {
            detail: { count: newPostsCount }
          }))
        }
      } catch (error) {
        console.error("🔍 [LEAD-FINDER] Error applying filters:", error)
        // Fallback to basic filtering
        let filtered = [...state.leads]
        
        if (state.searchQuery.trim()) {
          filtered = filtered.filter(lead => matchesSearchQuery(lead, state.searchQuery))
        }
        
        if (state.selectedKeyword) {
          filtered = filtered.filter(lead => lead.keyword === state.selectedKeyword)
        }
        
        if (state.filterScore > 0) {
          filtered = filtered.filter(lead => lead.relevanceScore >= state.filterScore)
        }
        
        filtered = filtered.filter(lead => filterByDate(lead, state.dateFilter))
        
        if (state.activeTab === "queue") {
          filtered = filtered.filter(lead => lead.status === "queued")
        }
        
        setFilteredLeads(filtered)
      } finally {
        setIsFiltering(false)
      }
    }

    applyFilters()
  }, [
    state.leads,
    state.searchQuery,
    state.selectedKeyword,
    state.filterScore,
    state.dateFilter,
    state.activeTab,
    state.sortBy,
    state.viewMode // Add viewMode to dependencies
  ])

  // Add effect to automatically show notification popup for new leads in monitor mode
  useEffect(() => {
    if (state.viewMode === "monitor" && filteredLeads.length > 0) {
      // Find the first unprocessed lead
      const unprocessedLead = filteredLeads.find(lead => 
        lead.status === "new" && !lead.dmStatus && !lead.hasDM
      )
      
      if (unprocessedLead && !notificationLead) {
        setNotificationLead(unprocessedLead)
      }
    }
  }, [state.viewMode, filteredLeads, notificationLead])

  // Handle notification actions
  const handleNotificationIgnore = async () => {
    if (!notificationLead) return
    
    // Mark as viewed
    await updateGeneratedCommentAction(notificationLead.id, {
      status: "viewed"
    })
    
    setState(prev => ({
      ...prev,
      leads: prev.leads.map(l =>
        l.id === notificationLead.id
          ? { ...l, status: "viewed" }
          : l
      )
    }))
    
    setNotificationLead(null)
    toast.success("Lead marked as viewed")
  }

  const handleNotificationSendComment = async () => {
    if (!notificationLead) return
    
    await handlePostNow(notificationLead)
    setNotificationLead(null)
  }

  const handleNotificationSendDM = async () => {
    if (!notificationLead) return
    
    await handleSendDM(notificationLead)
    setNotificationLead(null)
  }

  const handleNotificationSendBoth = async () => {
    if (!notificationLead) return
    
    // Send both comment and DM
    await Promise.all([
      handlePostNow(notificationLead),
      handleSendDM(notificationLead)
    ])
    
    setNotificationLead(null)
    toast.success("Comment and DM sent!")
  }

  // Render loading state
  if (state.isLoading && !state.leads.length && !state.error) {
    return null // Let the Suspense boundary in the page handle the skeleton
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

  // Check Reddit connection and show prompt if not connected
  if (redditConnected === false && currentOrganization) {
    return (
      <div className="container mx-auto py-6">
        <Card className="mx-auto max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
              <MessageSquare className="size-8 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-2xl">Connect Your Reddit Account</CardTitle>
            <CardDescription className="mt-2 text-base">
              To start finding and engaging with leads, you need to connect a Reddit account to your organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
              <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
                Why connect Reddit?
              </h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>Search Reddit for discussions relevant to your business</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>Analyze existing comments to match your tone and style</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>Post helpful responses when you approve them</span>
                </li>
              </ul>
            </div>

            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
              <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> We never post without your explicit approval. You have full control over every comment.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                onClick={async () => {
                  // Set the organization ID cookie before redirecting
                  document.cookie = `reddit_auth_org_id=${currentOrganization.id}; path=/; max-age=600; samesite=lax${window.location.protocol === 'https:' ? '; secure' : ''}`
                  // Redirect to Reddit auth with return URL back to lead finder
                  window.location.href = "/api/reddit/auth?return_url=/reddit/lead-finder"
                }}
                className="gap-2"
                size="lg"
              >
                <ExternalLink className="size-4" />
                Connect Reddit Account
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = "/dashboard"}
                size="lg"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
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
                <strong>Workflow Running:</strong>{" "}
                {state.workflowRunning ? "Yes" : "No"}
              </div>
              <div>
                <strong>Polling:</strong>{" "}
                {state.pollingEnabled ? "Enabled" : "Disabled"}
              </div>
              <div>
                <strong>Last Poll:</strong>{" "}
                {state.lastPolledAt?.toLocaleTimeString() || "Never"}
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
              <Button size="sm" variant="outline" onClick={manualRunWorkflow}>
                <Zap className="mr-2 size-4" />
                Run Workflow
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  addDebugLog(
                    "Fetch Now button clicked - no direct action with onSnapshot."
                  )
                }
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
                  <div key={i} className="whitespace-pre-wrap">
                    {log}
                  </div>
                ))}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Header */}
      <DashboardHeader
        campaignId={state.campaignId}
        campaignName={state.campaignName || undefined}
        campaigns={state.campaigns}
        totalLeads={state.leads.length}
        queuedLeads={state.leads.filter(l => l.status === "queued").length}
        postedLeads={state.leads.filter(l => l.status === "posted").length}
        onCreateCampaign={() => setCreateDialogOpen(true)}
        onRunWorkflow={manualRunWorkflow}
        onSelectCampaign={(campaignId: string) => {
          console.log("🔄 [LEAD-FINDER] Switching to campaign:", campaignId)
          
          // Reset state when switching campaigns
          setState(prev => ({ 
            ...prev, 
            campaignId, 
            isLoading: true,
            leads: [], // Clear leads when switching campaigns
            currentPage: 1, // Reset pagination
            selectedPost: null, // Clear any selected post
            editingCommentId: null, // Clear any editing state
            error: null // Clear any errors
          }))
          
          // Persist the selected campaign ID
          if (user && currentOrganization) {
            localStorage.setItem(`campaign_${currentOrganization.id}_${user.id}`, campaignId)
          }
          
          // Load campaign details
          getCampaignByIdAction(campaignId).then(result => {
            if (result.isSuccess && result.data) {
              setState(prev => ({
                ...prev,
                campaignName: result.data.name || null
              }))
              setCurrentCampaignKeywords(
                result.data.keywords || []
              )
            }
          })
        }}
        onEditCampaign={(campaignId: string) => {
          console.log("📝 [LEAD-FINDER] Opening edit dialog for campaign:", campaignId)
          setEditingCampaignId(campaignId)
          setEditDialogOpen(true)
        }}
        isWorkflowRunning={state.workflowRunning || liveFirestoreProgress?.status === "in_progress"}
        onMassPost={handleMassPost}
        onStopWorkflow={handleStopWorkflow}
      />

      {/* Filters Section */}
      <div className="bg-card rounded-lg border p-4 shadow-sm dark:border-gray-700">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex grow items-center gap-2">
              <Filter className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <Input
                placeholder="Search by title, body, username..."
                value={state.searchQuery}
                onChange={e =>
                  setState(prev => ({ ...prev, searchQuery: e.target.value }))
                }
                className="h-9 grow"
              />
            </div>

            {/* Keyword Filter */}
            <div className="flex items-center gap-2">
              <Hash className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <Select
                value={state.selectedKeyword || "all"}
                onValueChange={value =>
                  setState(prev => ({
                    ...prev,
                    selectedKeyword: value === "all" ? null : value
                  }))
                }
              >
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue placeholder="All Keywords" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Keywords</SelectItem>
                  {uniqueKeywords.map(keyword => (
                    <SelectItem key={keyword} value={keyword}>
                      {keyword}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <Select
                value={state.dateFilter}
                onValueChange={(value: any) =>
                  setState(prev => ({ ...prev, dateFilter: value }))
                }
              >
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Past 7 Days</SelectItem>
                  <SelectItem value="month">Past 30 Days</SelectItem>
                  <SelectItem value="3months">Past 3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Score Filter */}
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <Select
                value={state.filterScore.toString()}
                onValueChange={value =>
                  setState(prev => ({ ...prev, filterScore: parseInt(value) }))
                }
              >
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Scores</SelectItem>
                  <SelectItem value="50">50%+ Match</SelectItem>
                  <SelectItem value="70">70%+ Match</SelectItem>
                  <SelectItem value="80">80%+ Match</SelectItem>
                  <SelectItem value="90">90%+ Match</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <Select
                value={state.sortBy}
                onValueChange={(value: "relevance" | "upvotes" | "time" | "fetched" | "posted") =>
                  setState(prev => ({ ...prev, sortBy: value }))
                }
              >
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Best Match</SelectItem>
                  <SelectItem value="upvotes">Highest Score</SelectItem>
                  <SelectItem value="posted">Most Recently Posted</SelectItem>
                  <SelectItem value="fetched">Most Recently Fetched</SelectItem>
                  <SelectItem value="time">Recent Activity</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Comment Length Selector */}
              <div className="ml-4 flex items-center gap-2">
                <Label className="text-sm text-gray-600 dark:text-gray-400">
                  Comment Length:
                </Label>
                <Select
                  value={state.selectedLength}
                  onValueChange={(value: "micro" | "medium" | "verbose") =>
                    setState(prev => ({ ...prev, selectedLength: value }))
                  }
                >
                  <SelectTrigger className="h-9 min-w-fit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="micro">
                      <div className="flex items-center gap-2">
                        <span>⚡</span>
                        <span>Micro (5-15 words)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <span>💼</span>
                        <span>Medium (30-80 words)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="verbose">
                      <div className="flex items-center gap-2">
                        <span>📝</span>
                        <span>Verbose (800-1200 words)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredLeads.length} of {state.leads.length} leads
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Tabs - Moved here from grid section */}
      <Tabs value={state.viewMode} onValueChange={(value) => setState(prev => ({ ...prev, viewMode: value as "comment" | "dm" | "monitor" }))}>
        <TabsList className="grid w-full max-w-[400px] grid-cols-3">
          <TabsTrigger value="comment" className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            Comments
          </TabsTrigger>
          <TabsTrigger value="dm" className="flex items-center gap-2">
            <Mail className="size-4" />
            Direct Messages
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <Eye className="size-4" />
            Monitor
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4">
        {/* Progress Bar - Show when workflow is running or recently completed */}
        {liveFirestoreProgress && (
          liveFirestoreProgress.status === "in_progress" || 
          (liveFirestoreProgress.status === "completed" && liveFirestoreProgress.completedAt && 
           new Date().getTime() - (liveFirestoreProgress.completedAt as any).toDate().getTime() < 10000) // Show for 10 seconds after completion
        ) && (
          <LeadGenerationProgressBar
            progress={liveFirestoreProgress}
            existingLeadsCount={state.leads.length - (liveFirestoreProgress.results?.totalCommentsGenerated || 0)}
            className="mb-4"
          />
        )}

        {/* Find More Leads - Show when campaign is selected */}
        {state.campaignId && (
          <FindMoreLeads
            userId={user?.id || ""}
            campaignId={state.campaignId}
            onFindingLeads={() => {
              updateState({ workflowRunning: true })
            }}
            disabled={state.workflowRunning}
          />
        )}

        {/* Monitoring Settings - Show when campaign is selected */}
        {state.campaignId && currentOrganization && user && (
          <MonitoringSettings
            campaignId={state.campaignId}
            organizationId={currentOrganization.id}
            userId={user.id}
          />
        )}

        {/* Tone Customizer - Show when there are leads */}
        {state.leads.length > 0 && (
          <ToneCustomizer
            toneInstruction={state.toneInstruction}
            onToneInstructionChange={(value: string) =>
              updateState({ toneInstruction: value })
            }
            onRegenerateAll={handleToneRegeneration}
            onRegenerateAllWithNewPrompts={handleRegenerateAllWithNewPrompts}
            isRegeneratingAll={state.regeneratingId === "all"}
            disabled={state.leads.length === 0}
          />
        )}

        {/* Batch Poster - Show only in queue tab */}
        {state.activeTab === "queue" &&
          state.leads.filter(l => l.status === "queued").length > 0 && (
            <BatchPoster
              approvedLeadsCount={
                state.leads.filter(l => l.status === "queued").length
              }
              onBatchPostQueue={handleBatchPostQueue}
              isBatchPosting={state.isBatchPosting}
            />
          )}

        {/* Main Leads Display */}
        <LeadsDisplay
          workflowProgress={liveFirestoreProgress}
          leads={state.leads}
          filteredAndSortedLeads={filteredLeads}
          paginatedLeads={paginatedLeads}
          newLeadIds={newLeadIds.current}
          activeTab={state.activeTab}
          campaignId={state.campaignId}
          campaignStatus={
            state.campaigns.find(c => c.id === state.campaignId)?.status
          }
          isWorkflowRunning={
            state.workflowRunning ||
            liveFirestoreProgress?.status === "in_progress"
          }
          viewMode={state.viewMode}
          selectedLength={state.selectedLength}
          onEditComment={handleCommentEdit}
          onPostComment={handlePostNow}
          onQueueComment={handleAddToQueue}
          onSendDM={handleSendDM}
          onViewComments={lead => {
            setState(prev => ({
              ...prev,
              selectedPost: lead
            }))
          }}
          onRegenerateWithInstructions={handleRegenerateWithInstructions}
          postingLeadId={state.postingLeadId}
          queuingLeadId={state.queuingLeadId}
          sendingDMLeadId={state.sendingDMLeadId}
          toneInstruction={state.toneInstruction}
          onToneInstructionChange={(value: string) =>
            updateState({ toneInstruction: value })
          }
          onRegenerateAllTones={handleToneRegeneration}
          isRegeneratingAllTones={state.regeneratingId === "all"}
          filterKeyword={state.filterKeyword}
          onFilterKeywordChange={(value: string) =>
            updateState({ filterKeyword: value })
          }
          filterScore={state.filterScore}
          onFilterScoreChange={(value: number) =>
            updateState({ filterScore: value })
          }
          sortBy={state.sortBy}
          onSortByChange={(value: "relevance" | "upvotes" | "time" | "fetched" | "posted") =>
            updateState({ sortBy: value })
          }
          approvedLeadsCount={
            state.leads.filter(l => l.status === "queued").length
          }
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
        onSuccess={async () => {
          addDebugLog("New campaign created, refreshing campaigns list...")
          setCreateDialogOpen(false)

          // Refresh the campaigns list to get the new campaign
          if (user?.id && currentOrganization) {
            try {
              const campaignsResult = await getCampaignsByOrganizationIdAction(
                currentOrganization.id
              )

              if (
                campaignsResult.isSuccess &&
                campaignsResult.data.length > 0
              ) {
                // Transform campaigns with lead counts
                const updatedCampaigns: Campaign[] = campaignsResult.data.map(campaign => {
                  return {
                    id: campaign.id,
                    name: campaign.name,
                    businessDescription: campaign.businessDescription,
                    keywords: campaign.keywords || [],
                    status: campaign.status || "draft",
                    totalCommentsGenerated: campaign.totalCommentsGenerated || 0,
                    createdAt:
                      typeof campaign.createdAt === "string"
                        ? campaign.createdAt
                        : (campaign.createdAt as any)?.toDate?.()?.toISOString() ||
                          new Date().toISOString()
                  }
                })
                
                // Get the latest campaign (most recently created)
                const latestCampaign = campaignsResult.data.sort(
                  (a: any, b: any) => {
                    const dateA =
                      typeof a.createdAt === "string"
                        ? new Date(a.createdAt)
                        : (a.createdAt as Timestamp)?.toDate()
                    const dateB =
                      typeof b.createdAt === "string"
                        ? new Date(b.createdAt)
                        : (b.createdAt as Timestamp)?.toDate()
                    return (dateB?.getTime() || 0) - (dateA?.getTime() || 0)
                  }
                )[0]

                addDebugLog("Selected new campaign", {
                  campaignId: latestCampaign.id,
                  status: latestCampaign.status
                })

                // Update state with the new campaign
                setState(prev => ({
                  ...prev,
                  campaigns: updatedCampaigns,
                  campaignId: latestCampaign.id,
                  campaignName: latestCampaign.name || null,
                  workflowRunning: true // Workflow is running in the background
                }))
                
                // Persist the new campaign ID
                if (user && currentOrganization) {
                  localStorage.setItem(`campaign_${currentOrganization.id}_${user.id}`, latestCampaign.id)
                }

                // Update keywords
                const campaignDetailsResult = await getCampaignByIdAction(
                  latestCampaign.id
                )
                if (
                  campaignDetailsResult.isSuccess &&
                  campaignDetailsResult.data
                ) {
                  setCurrentCampaignKeywords(
                    campaignDetailsResult.data.keywords || []
                  )
                }
              }
            } catch (error) {
              addDebugLog("Error refreshing campaigns", { error })
            }
          }
        }}
        organizationId={currentOrganization?.id}
      />

      <FindNewLeadsDialog
        open={findNewLeadsOpen}
        onOpenChange={setFindNewLeadsOpen}
        userId={user?.id || ""}
        campaignId={state.campaignId || ""}
        currentKeywords={currentCampaignKeywords}
        onSuccess={async () => {
          console.log("🔥🔥🔥 [LEAD-FINDER] FindNewLeadsDialog onSuccess called")
          console.log("🔥🔥🔥 [LEAD-FINDER] Setting workflowRunning to true")
          setState(prev => ({ ...prev, workflowRunning: true }))
          console.log("🔥🔥🔥 [LEAD-FINDER] State updated with workflowRunning: true")
          
          // Refresh campaign keywords
          if (state.campaignId) {
            console.log("🔥🔥🔥 [LEAD-FINDER] Refreshing campaign keywords...")
            const campaignResult = await getCampaignByIdAction(state.campaignId)
            if (campaignResult.isSuccess && campaignResult.data) {
              setCurrentCampaignKeywords(campaignResult.data.keywords || [])
              console.log("🔥🔥🔥 [LEAD-FINDER] Campaign keywords refreshed:", campaignResult.data.keywords)
            }
          }
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

      <MassPostDialog
        open={state.showMassPostDialog}
        onOpenChange={open => updateState({ showMassPostDialog: open })}
        leads={state.leads}
        userId={user?.id || ""}
      />

      {/* Edit Campaign Dialog */}
      <EditCampaignDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        campaign={editingCampaignId ? state.campaigns.find(c => c.id === editingCampaignId) || null : null}
        onSuccess={async () => {
          console.log("📝 [LEAD-FINDER] Campaign edited successfully, refreshing...")
          setEditDialogOpen(false)
          setEditingCampaignId(null)
          
          // Refresh campaigns list
          if (currentOrganization) {
            const campaignsResult = await getCampaignsByOrganizationIdAction(
              currentOrganization.id
            )
            
            if (campaignsResult.isSuccess) {
              const transformedCampaigns: Campaign[] = campaignsResult.data.map(campaign => ({
                id: campaign.id,
                name: campaign.name,
                businessDescription: campaign.businessDescription,
                keywords: campaign.keywords || [],
                status: campaign.status || "draft",
                totalCommentsGenerated: campaign.totalCommentsGenerated || 0,
                createdAt:
                  typeof campaign.createdAt === "string"
                    ? campaign.createdAt
                    : (campaign.createdAt as any)?.toDate?.()?.toISOString() ||
                      new Date().toISOString()
              }))
              
              setState(prev => ({ ...prev, campaigns: transformedCampaigns }))
              
              // Update current campaign name if it was edited
              if (editingCampaignId === state.campaignId) {
                const updatedCampaign = transformedCampaigns.find(c => c.id === state.campaignId)
                if (updatedCampaign) {
                  setState(prev => ({ ...prev, campaignName: updatedCampaign.name }))
                }
              }
            }
          }
        }}
      />

      {/* Reddit Re-authentication Dialog */}
      <Dialog
        open={state.showRedditAuthDialog}
        onOpenChange={open => updateState({ showRedditAuthDialog: open })}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reconnect Reddit Account</DialogTitle>
            <DialogDescription>
              Your Reddit authentication has expired or is missing. Please
              reconnect your Reddit account to continue posting comments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This happens when:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400">
              <li>Your Reddit access token has expired</li>
              <li>You haven't connected Reddit during onboarding</li>
              <li>Reddit has revoked your authorization</li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => updateState({ showRedditAuthDialog: false })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateState({ showRedditAuthDialog: false })
                window.location.href =
                  "/api/reddit/auth?return_url=/reddit/lead-finder"
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <MessageSquare className="mr-2 size-4" />
              Reconnect Reddit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Popup for Monitor Tab */}
      {notificationLead && state.viewMode === "monitor" && (
        <Dialog open={!!notificationLead} onOpenChange={(open) => !open && setNotificationLead(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="size-5 text-orange-500" />
                New Lead Found!
              </DialogTitle>
              <DialogDescription>
                A new post matching your keywords was just found. Take action quickly!
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Lead Details */}
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-semibold">{notificationLead.postTitle}</h4>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                  by u/{notificationLead.postAuthor} • {notificationLead.timeAgo}
                </p>
                <p className="text-sm">{notificationLead.postContentSnippet}</p>
                
                <div className="mt-3 flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-sm",
                      notificationLead.relevanceScore >= 80 
                        ? "text-green-600 dark:text-green-400" 
                        : notificationLead.relevanceScore >= 60 
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-gray-600 dark:text-gray-400"
                    )}
                  >
                    {notificationLead.relevanceScore}% Match
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    {notificationLead.keyword}
                  </Badge>
                </div>
              </div>

              {/* Generated Content Preview */}
              <div className="space-y-3">
                <div>
                  <Label className="mb-1 text-sm">Generated Comment:</Label>
                  <div className="rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-800">
                    {notificationLead.mediumComment}
                  </div>
                </div>
                
                {notificationLead.dmMessage && (
                  <div>
                    <Label className="mb-1 text-sm">Generated DM:</Label>
                    <div className="rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-800">
                      <p className="font-medium">Subject: {notificationLead.dmSubject || "Re: Your post"}</p>
                      <p className="mt-1">{notificationLead.dmMessage}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                onClick={handleNotificationIgnore}
              >
                Ignore
              </Button>
              <Button
                variant="outline"
                onClick={handleNotificationSendComment}
                className="gap-2"
              >
                <MessageSquare className="size-4" />
                Send Comment Only
              </Button>
              <Button
                variant="outline"
                onClick={handleNotificationSendDM}
                className="gap-2"
              >
                <Mail className="size-4" />
                Send DM Only
              </Button>
              <Button
                onClick={handleNotificationSendBoth}
                className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Send className="size-4" />
                Send Both
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
