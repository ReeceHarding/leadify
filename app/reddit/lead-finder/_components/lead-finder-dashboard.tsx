"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
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
  updateGeneratedCommentAction
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
import { SerializedGeneratedCommentDocument } from "@/actions/db/lead-generation-actions"

interface LeadResult {
  id: string
  campaignId: string
  postUrl: string
  postTitle: string
  postAuthor: string
  postContentSnippet: string
  subreddit: string
  relevanceScore: number
  reasoning: string
  microComment: string
  mediumComment: string
  verboseComment: string
  status: "new" | "viewed" | "approved" | "rejected" | "used"
  selectedLength: "micro" | "medium" | "verbose"
  timeAgo: string
  originalData?: SerializedGeneratedCommentDocument
  postScore?: number
  keyword?: string
}

interface WorkflowProgress {
  currentStep: string
  completedSteps: number
  totalSteps: number
  isLoading: boolean
  error?: string
}

const ITEMS_PER_PAGE = 10

// Helper function to robustly serialize Firestore Timestamps or plain timestamp objects
const serializeTimestampToISO = (timestamp: any): string | undefined => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString()
  }
  if (typeof timestamp === "string") {
    // Already serialized
    try {
      // Validate if it's a valid ISO string by trying to parse it
      new Date(timestamp).toISOString()
      return timestamp
    } catch (e) {
      // Not a valid ISO string, treat as invalid
      console.warn(
        "[SERIALIZE_TIMESTAMP] Invalid date string provided:",
        timestamp
      )
      return undefined
    }
  }
  if (
    timestamp &&
    typeof timestamp.seconds === "number" &&
    typeof timestamp.nanoseconds === "number"
  ) {
    // It's a plain object from Firestore, convert to Date then ISO string
    return new Date(
      timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000
    ).toISOString()
  }
  if (timestamp) {
    // Log if it's an unexpected type but not undefined/null
    console.warn(
      "[SERIALIZE_TIMESTAMP] Unexpected timestamp format:",
      timestamp
    )
  }
  return undefined
}

export default function LeadFinderDashboard() {
  const { user } = useUser()
  const [selectedLength, setSelectedLength] = useState<
    "micro" | "medium" | "verbose"
  >("medium")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [leads, setLeads] = useState<LeadResult[]>([])
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowProgress>({
    currentStep: "Initializing...",
    completedSteps: 0,
    totalSteps: 6,
    isLoading: false,
    error: undefined
  })
  
  // Log workflow progress changes
  useEffect(() => {
    console.log(`🔧 [WORKFLOW-PROGRESS] State changed:`, workflowProgress)
  }, [workflowProgress])
  const [campaignId, setCampaignId] = useState<string | null>(null)

  // New state variables
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<"relevance" | "upvotes" | "time">(
    "relevance"
  )
  const [filterKeyword, setFilterKeyword] = useState<string>("")
  const [filterScore, setFilterScore] = useState<number>(0)
  const [selectedPost, setSelectedPost] = useState<LeadResult | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [toneInstruction, setToneInstruction] = useState("")
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [websiteContent, setWebsiteContent] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"all" | "queue">("all")
  const [newLeadIds, setNewLeadIds] = useState<Set<string>>(new Set())

  // State for async queue posting
  const [isBatchPosting, setIsBatchPosting] = useState(false)

  // State for individual loading operations
  const [postingLeadId, setPostingLeadId] = useState<string | null>(null)
  const [queuingLeadId, setQueuingLeadId] = useState<string | null>(null)
  const [removingLeadId, setRemovingLeadId] = useState<string | null>(null)

  // State for polling indicator
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  // Track when the very first lead arrives so we can hide the skeleton immediately
  const hasFirstLead = useRef(false)
  
  // Debug: Test direct query on mount
  useEffect(() => {
    const testDirectQuery = async () => {
      console.log(`\n🧪 [DEBUG-TEST] ====== DIRECT FIRESTORE TEST ======`)
      console.log(`🧪 [DEBUG-TEST] Testing with known campaign ID: nGUkAfdPyTxgYUE7AzD7`)
      
      try {
        const result = await getGeneratedCommentsByCampaignAction("nGUkAfdPyTxgYUE7AzD7")
        console.log(`🧪 [DEBUG-TEST] Direct query result:`, {
          isSuccess: result.isSuccess,
          dataLength: result.data?.length || 0,
          firstItem: result.data?.[0]
        })
      } catch (error) {
        console.error(`🧪 [DEBUG-TEST] Direct query error:`, error)
      }
      
      console.log(`🧪 [DEBUG-TEST] ====== TEST COMPLETE ======\n`)
    }
    
    if (user?.id) {
      testDirectQuery()
    }
  }, [user?.id])

  // Keep an always-up-to-date reference to the leads array for snapshot diffing
  const latestLeadsRef = useRef<LeadResult[]>([])

  // Get keywords from profile and start real workflow
  useEffect(() => {
    const initializeLeadGeneration = async () => {
      if (!user?.id) {
        console.log("🔍 [LEAD-FINDER] No user ID available yet")
        return
      }

      console.log(
        "🔍 [LEAD-FINDER] Initializing lead generation for user:",
        user.id
      )

      try {
        // Get user profile to retrieve keywords
        const profileResult = await getProfileByUserIdAction(user.id)

        if (!profileResult.isSuccess) {
          console.error(
            "🔍 [LEAD-FINDER] Failed to get profile:",
            profileResult.message
          )
          setWorkflowProgress({
            currentStep: "Error occurred",
            completedSteps: 0,
            totalSteps: 6,
            isLoading: false,
            error: "Failed to load user profile"
          })
          return
        }

        const profile = profileResult.data
        console.log("🔍 [LEAD-FINDER] Profile loaded:", profile)
        console.log("🔍 [LEAD-FINDER] Profile keywords:", profile.keywords)
        console.log(
          "🔍 [LEAD-FINDER] Profile keywords length:",
          profile.keywords?.length || 0
        )

        const keywords = profile.keywords || []

        if (keywords.length > 0) {
          console.log(
            "🔍 [LEAD-FINDER] Starting lead generation with keywords:",
            keywords
          )
          await startRealLeadGeneration(keywords)
        } else {
          console.log("🔍 [LEAD-FINDER] No keywords found in profile")
          setWorkflowProgress({
            currentStep: "No keywords found",
            completedSteps: 0,
            totalSteps: 6,
            isLoading: false,
            error:
              "No keywords found in your profile. Please complete onboarding first."
          })
        }
      } catch (error) {
        console.error(
          "🔍 [LEAD-FINDER] Error initializing lead generation:",
          error
        )
        setWorkflowProgress({
          currentStep: "Error occurred",
          completedSteps: 0,
          totalSteps: 6,
          isLoading: false,
          error: "Failed to initialize lead generation"
        })
      }
    }

    initializeLeadGeneration()
  }, [user?.id])

  // Reset first-lead tracker and latest leads reference whenever the campaign changes
  useEffect(() => {
    hasFirstLead.current = false
    latestLeadsRef.current = []
  }, [campaignId])

  // Polling mechanism for leads - polls every 5 seconds
  useEffect(() => {
    console.log(`\n🔄 [POLLING-EFFECT] ====== STARTING POLLING EFFECT ======`)
    console.log(`🔄 [POLLING-EFFECT] Campaign ID: ${campaignId}`)
    console.log(`🔄 [POLLING-EFFECT] User ID: ${user?.id}`)
    
    if (!campaignId) {
      console.log("🚫 [POLLING] No campaignId, clearing leads")
      setLeads([]) // Clear leads if no campaign is selected
      return
    }

    console.log(`🔄 [POLLING] Starting polling for campaign: ${campaignId}`)
    console.log(`🔄 [POLLING] Will poll every 5 seconds`)
    console.log(`🔄 [POLLING] User ID: ${user?.id}`)
    console.log(`🔄 [POLLING] Collection path will be: generated_comments`)
    console.log(`🔄 [POLLING] Expected campaign IDs: nGUkAfdPyTxgYUE7AzD7 or Bn8qNlX5NPgyFrvwBTgB`)

    // Track if this is the first fetch for this campaign
    let isFirstFetch = true

    // Function to fetch leads
    const fetchLeads = async () => {
      try {
        console.log(`\n🔄 [POLLING] ====== FETCHING LEADS ======`)
        console.log(`🔄 [POLLING] Campaign ID: ${campaignId}`)
        console.log(`🔄 [POLLING] User ID: ${user?.id}`)
        console.log(`🔄 [POLLING] Time: ${new Date().toISOString()}`)
        console.log(`🔄 [POLLING] Is first fetch: ${isFirstFetch}`)
        console.log(`🔄 [POLLING] Current leads count: ${latestLeadsRef.current.length}`)
        console.log(`🔄 [POLLING] hasFirstLead: ${hasFirstLead.current}`)

        // Set polling indicator
        setIsPolling(true)

        // Only show loading on the very first fetch
        if (isFirstFetch && latestLeadsRef.current.length === 0) {
          console.log(`🔄 [POLLING] Setting loading state to true`)
          setWorkflowProgress((prev: any) => ({
            ...prev,
            isLoading: true,
            error: null
          }))
        }

        console.log(`🔄 [POLLING] Calling getGeneratedCommentsByCampaignAction with campaignId: ${campaignId}`)
        const result = await getGeneratedCommentsByCampaignAction(campaignId)
        
        console.log(`🔄 [POLLING] Action returned:`, {
          isSuccess: result.isSuccess,
          message: result.message,
          dataLength: result.data?.length || 0,
          data: result.data?.slice(0, 2) // Log first 2 items
        })

        if (!result.isSuccess) {
          console.error(`❌ [POLLING] Failed to fetch leads: ${result.message}`)
          console.error(`❌ [POLLING] Full error result:`, result)
          setWorkflowProgress((prev: any) => ({
            ...prev,
            isLoading: false,
            error: result.message || "Failed to fetch leads"
          }))
          return
        }

        console.log(
          `🔄 [POLLING] Fetched ${result.data.length} leads from server`
        )
        
        // Log the actual campaign IDs of the fetched data
        if (result.data.length > 0) {
          const campaignIds = new Set(result.data.map((item: any) => item.campaignId))
          console.log(`🔄 [POLLING] Campaign IDs in fetched data:`, Array.from(campaignIds))
          console.log(`🔄 [POLLING] Our campaign ID: ${campaignId}`)
          console.log(`🔄 [POLLING] Do they match? ${Array.from(campaignIds).includes(campaignId)}`)
        }

        // Track new leads for animation
        const currentLeadIds = new Set(latestLeadsRef.current.map(l => l.id))
        const newIds = new Set<string>()

        // Transform the data
        const fetchedLeads: LeadResult[] = result.data.map((comment, index) => {
          // Only log first few or new leads to reduce console spam
          if ((isFirstFetch && index < 3) || !currentLeadIds.has(comment.id)) {
            console.log(
              `🔄 [POLLING] Lead: ${comment.postTitle} (Score: ${comment.relevanceScore})`
            )
          }

          // Check if this is a new lead
          if (!currentLeadIds.has(comment.id)) {
            newIds.add(comment.id)
            console.log(`✨ [POLLING] New lead detected: ${comment.postTitle}`)
          }

          let subreddit = "unknown"
          try {
            const url = new URL(comment.postUrl)
            const match = url.pathname.match(/\/r\/([^\/]+)/)
            if (match && match[1]) {
              subreddit = match[1]
            }
          } catch (e) {
            // Silent fail for URL parsing
          }

          return {
            id: comment.id,
            campaignId: comment.campaignId,
            postUrl: comment.postUrl,
            postTitle: comment.postTitle,
            postAuthor: comment.postAuthor,
            postContentSnippet: comment.postContentSnippet,
            subreddit: subreddit,
            relevanceScore: comment.relevanceScore,
            reasoning: comment.reasoning,
            microComment: comment.microComment,
            mediumComment: comment.mediumComment,
            verboseComment: comment.verboseComment,
            status: comment.status || "new",
            selectedLength: comment.selectedLength || selectedLength,
            timeAgo: getTimeAgo(comment.createdAt),
            originalData: comment,
            postScore: comment.postScore,
            keyword: comment.keyword
          }
        })

        // Sort by newest first
        fetchedLeads.sort((a, b) => {
          const aTime = new Date(a.originalData?.createdAt || 0).getTime()
          const bTime = new Date(b.originalData?.createdAt || 0).getTime()
          return bTime - aTime
        })

        console.log(
          `🎯 [POLLING] Updating UI with ${fetchedLeads.length} leads (${newIds.size} new)`
        )
        setLeads(fetchedLeads)
        latestLeadsRef.current = fetchedLeads
        setNewLeadIds(newIds)

        // Mark first fetch as complete
        isFirstFetch = false

        // Hide skeleton after first successful fetch
        if (fetchedLeads.length > 0 && !hasFirstLead.current) {
          console.log(`🔄 [POLLING] First lead detected, hiding skeleton`)
          hasFirstLead.current = true
          setWorkflowProgress(prev => {
            console.log(`🔄 [POLLING] Previous workflow progress:`, prev)
            const newProgress = { ...prev, isLoading: false }
            console.log(`🔄 [POLLING] New workflow progress:`, newProgress)
            return newProgress
          })
        }

        // Show toast for new leads (but not on first fetch)
        if (newIds.size > 0 && !isFirstFetch) {
          console.log(`✨ [POLLING] Showing toast for ${newIds.size} new leads`)
          const newLeadsArray = Array.from(newIds)
          const firstNewLead = fetchedLeads.find(l => l.id === newLeadsArray[0])
          if (firstNewLead) {
            toast.success(
              `New lead found: ${firstNewLead.postTitle.substring(0, 50)}...`,
              {
                description: `Score: ${firstNewLead.relevanceScore} - ${firstNewLead.keyword || "Unknown keyword"}`
              }
            )
          }

          // Clear new lead indicators after animation
          setTimeout(() => {
            setNewLeadIds(new Set())
          }, 3000)
        }

        // Update workflow progress without changing loading state
        if (fetchedLeads.length > 0) {
          setWorkflowProgress((prev: any) => ({
            ...prev,
            currentStep: `Found ${fetchedLeads.length} leads`,
            error: null,
            isLoading: false
          }))
        } else if (fetchedLeads.length === 0) {
          setWorkflowProgress((prev: any) => ({
            ...prev,
            currentStep: "No leads found yet",
            isLoading: isFirstFetch, // Only show loading on first fetch
            error: null
          }))
        }

        // Update polling status
        setLastPolledAt(new Date())
        setIsPolling(false)

        console.log(`🔄 [POLLING] ====== FETCH COMPLETE ======\n`)
      } catch (error) {
        console.error("❌ [POLLING] Error fetching leads:", error)
        setWorkflowProgress((prev: any) => ({
          ...prev,
          isLoading: false,
          error: "Failed to load leads. Please refresh or try again."
        }))
        setIsPolling(false)
      }
    }

    // Fetch immediately
    fetchLeads()

    // Then poll every 5 seconds
    const interval = setInterval(fetchLeads, 5000)
    console.log(`🔄 [POLLING] Polling interval started (ID: ${interval})`)

    // Cleanup interval on component unmount or when campaignId changes
    return () => {
      console.log(`🔄 [POLLING] Stopping polling for campaign: ${campaignId}`)
      clearInterval(interval)
    }
  }, [campaignId]) // Removed selectedLength from dependencies to prevent re-runs

  // Load website content when campaign is set
  useEffect(() => {
    const loadWebsiteContent = async () => {
      if (!campaignId) return

      try {
        const campaignResult = await getCampaignByIdAction(campaignId)
        if (campaignResult.isSuccess && campaignResult.data.websiteContent) {
          setWebsiteContent(campaignResult.data.websiteContent)
        }
      } catch (error) {
        console.error("Error loading website content:", error)
      }
    }

    loadWebsiteContent()
  }, [campaignId])

  const startRealLeadGeneration = async (keywords: string[]) => {
    if (!user?.id) {
      setWorkflowProgress({
        currentStep: "Error occurred",
        completedSteps: 0,
        totalSteps: 6,
        isLoading: false,
        error: "User not authenticated"
      })
      return
    }

    try {
      setWorkflowProgress({
        currentStep: "Getting user profile...",
        completedSteps: 0,
        totalSteps: 6,
        isLoading: true
      })

      // Step 1: Get real user profile data
      const profileResult = await getProfileByUserIdAction(user.id)
      if (!profileResult.isSuccess) {
        throw new Error("Failed to get user profile")
      }

      const profile = profileResult.data
      if (!profile.website) {
        throw new Error(
          "User profile missing website - please complete onboarding"
        )
      }

      setWorkflowProgress({
        currentStep: "Checking for existing campaigns...",
        completedSteps: 1,
        totalSteps: 6,
        isLoading: true
      })

      // Step 2: Check for existing campaigns first
      const existingCampaignsResult = await getCampaignsByUserIdAction(user.id)
      let realCampaignId: string | null = null
      let shouldRunWorkflow = false

      if (
        existingCampaignsResult.isSuccess &&
        existingCampaignsResult.data.length > 0
      ) {
        // Find the most recent completed campaign or use the latest one
        const campaigns = existingCampaignsResult.data
        console.log(`🔍 [LEAD-FINDER] Found ${campaigns.length} existing campaigns:`)
        campaigns.forEach((c, i) => {
          console.log(`🔍 [LEAD-FINDER] Campaign ${i + 1}:`, {
            id: c.id,
            name: c.name,
            status: c.status,
            totalCommentsGenerated: c.totalCommentsGenerated,
            createdAt: c.createdAt
          })
        })
        
        const completedCampaign = campaigns.find(c => c.status === "completed")
        const latestCampaign = campaigns[0] // Assuming they're ordered by creation date

        if (completedCampaign) {
          console.log(
            "🔍 [LEAD-FINDER] Found existing completed campaign:",
            completedCampaign.id
          )
          realCampaignId = completedCampaign.id
          shouldRunWorkflow = false // Use existing results
        } else if (latestCampaign) {
          console.log(
            "🔍 [LEAD-FINDER] Found existing campaign:",
            latestCampaign.id
          )
          realCampaignId = latestCampaign.id

          // Only re-run if campaign failed or is still running
          shouldRunWorkflow =
            latestCampaign.status === "error" ||
            latestCampaign.status === "running"
            
          console.log(`🔍 [LEAD-FINDER] Should run workflow: ${shouldRunWorkflow}`)
        }
      }

      // Step 3: Create new campaign only if no suitable existing campaign found
      if (!realCampaignId) {
        console.log(
          "🔍 [LEAD-FINDER] No suitable existing campaign found, creating new one"
        )
        setWorkflowProgress({
          currentStep: "Creating new campaign...",
          completedSteps: 2,
          totalSteps: 6,
          isLoading: true
        })

        const campaignResult = await createCampaignAction({
          userId: user.id,
          name: `Lead Generation - ${new Date().toLocaleDateString()}`,
          website: profile.website,
          keywords: keywords
        })

        if (!campaignResult.isSuccess) {
          throw new Error("Failed to create campaign")
        }

        realCampaignId = campaignResult.data.id
        shouldRunWorkflow = true // New campaign needs workflow
      } else {
        console.log(
          "🔍 [LEAD-FINDER] Using existing campaign, skipping creation"
        )
      }

      console.log(`\n🎯 [FRONTEND] ====== SETTING CAMPAIGN ID ======`)
      console.log(`🎯 [FRONTEND] Setting campaign ID: ${realCampaignId}`)
      console.log(`🎯 [FRONTEND] User ID: ${user.id}`)
      console.log(`🎯 [FRONTEND] Campaign name: ${realCampaignId ? (existingCampaignsResult.data?.find(c => c.id === realCampaignId)?.name || 'New campaign') : 'Unknown'}`)
      console.log(`🎯 [FRONTEND] ============================\n`)
      setCampaignId(realCampaignId)

      // Step 4: Run workflow only if needed
      if (shouldRunWorkflow) {
        console.log(
          "🔍 [LEAD-FINDER] Running workflow for campaign:",
          realCampaignId
        )
        setWorkflowProgress({
          currentStep: "Starting lead generation workflow...",
          completedSteps: 3,
          totalSteps: 6,
          isLoading: true
        })

        const workflowResult =
          await runFullLeadGenerationWorkflowAction(realCampaignId)

        if (!workflowResult.isSuccess) {
          throw new Error(workflowResult.message || "Workflow failed")
        }
      } else {
        console.log(
          "🔍 [LEAD-FINDER] Using existing campaign results, skipping workflow"
        )
        setWorkflowProgress({
          currentStep: "Using existing results...",
          completedSteps: 5,
          totalSteps: 6,
          isLoading: true
        })
      }

      // Step 5: Fetch results (existing or new)
      setWorkflowProgress({
        currentStep: "Loading results...",
        completedSteps: 5,
        totalSteps: 6,
        isLoading: true
      })
      
      console.log(`🔍 [LEAD-FINDER] About to fetch results for campaign: ${realCampaignId}`)
      await fetchRealResults(realCampaignId)

      setWorkflowProgress({
        currentStep: "Complete!",
        completedSteps: 6,
        totalSteps: 6,
        isLoading: false
      })
    } catch (error) {
      console.error("Error in lead generation:", error)
      setWorkflowProgress({
        currentStep: "Error occurred",
        completedSteps: 0,
        totalSteps: 6,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to start lead generation"
      })
    }
  }

  const fetchRealResults = async (campaignId: string) => {
    console.log(`\n🎯 [FETCH-REAL-RESULTS] ====== STARTING ======`)
    console.log(`🎯 [FETCH-REAL-RESULTS] Campaign ID: ${campaignId}`)
    
    try {
      const results = await getGeneratedCommentsByCampaignAction(campaignId)
      console.log(`🎯 [FETCH-REAL-RESULTS] Results:`, {
        isSuccess: results.isSuccess,
        dataLength: results.data?.length || 0,
        message: results.message
      })
      
      if (results.isSuccess && results.data.length > 0) {
        console.log(`🎯 [FETCH-REAL-RESULTS] Found ${results.data.length} results, transforming...`)
        // Transform the real results into our display format
        const transformedLeads: LeadResult[] = results.data.map(
          (result: any) => ({
            id: result.id,
            campaignId: result.campaignId,
            postUrl: result.postUrl,
            postTitle: result.postTitle,
            postAuthor: result.postAuthor,
            postContentSnippet: result.postContentSnippet,
            subreddit: result.subreddit || "entrepreneur",
            relevanceScore: result.relevanceScore || 85,
            reasoning: result.reasoning || "",
            microComment: result.microComment || "",
            mediumComment: result.mediumComment || "",
            verboseComment: result.verboseComment || "",
            status: result.status || "new",
            selectedLength: result.selectedLength || "medium",
            timeAgo: getTimeAgo(result.createdAt),
            originalData: result as SerializedGeneratedCommentDocument,
            postScore: result.postScore,
            keyword: result.keyword
          })
        )
        setLeads(transformedLeads)
      } else {
        // If no results yet, show a message
        setWorkflowProgress(prev => ({
          ...prev,
          error:
            "No lead generation results found. The workflow may still be processing."
        }))
      }
    } catch (error) {
      console.error("Error fetching results:", error)
      setWorkflowProgress(prev => ({
        ...prev,
        error: "Failed to fetch results"
      }))
    }
  }

  const getTimeAgo = (timestamp: any): string => {
    // Simple time ago calculation
    const now = Date.now()
    let then: number
    if (typeof timestamp === "string") {
      then = new Date(timestamp).getTime()
    } else if (timestamp && typeof timestamp.seconds === "number") {
      // Firestore Timestamp like
      then = timestamp.seconds * 1000
    } else {
      then = now - 7200000 // Default to 2h ago if invalid
    }
    const diff = now - then
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  // Function to determine which comment to display based on selected length
  const getDisplayComment = (lead: LeadResult): string => {
    switch (lead.selectedLength || selectedLength) {
      case "micro":
        return lead.microComment
      case "verbose":
        return lead.verboseComment
      case "medium":
      default:
        return lead.mediumComment
    }
  }

  // Handle comment editing
  const handleCommentEdit = async (leadId: string, newComment: string) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return

    const updateData: any = {}
    const currentLength = lead.selectedLength || selectedLength

    switch (currentLength) {
      case "micro":
        updateData.microComment = newComment
        break
      case "verbose":
        updateData.verboseComment = newComment
        break
      case "medium":
      default:
        updateData.mediumComment = newComment
    }

    const result = await updateGeneratedCommentAction(leadId, updateData)

    if (result.isSuccess) {
      toast.success("Comment updated successfully")
      setEditingCommentId(null)
      // Track analytics
      posthog.capture("lead_comment_edited", {
        lead_id: leadId,
        comment_length: currentLength,
        campaign_id: campaignId
      })
    } else {
      toast.error("Failed to update comment")
    }
  }

  // Handle adding to queue
  const handleAddToQueue = async (lead: LeadResult) => {
    setQueuingLeadId(lead.id)
    try {
      const result = await updateGeneratedCommentAction(lead.id, {
        status: "approved",
        selectedLength: lead.selectedLength || selectedLength
      })

      if (result.isSuccess) {
        toast.success("Added to posting queue")
      } else {
        toast.error("Failed to add to queue")
      }
    } finally {
      setQueuingLeadId(null)
    }
  }

  // Handle removing from queue
  const handleRemoveFromQueue = async (lead: LeadResult) => {
    setRemovingLeadId(lead.id)
    try {
      const result = await updateGeneratedCommentAction(lead.id, {
        status: "new",
        selectedLength: lead.selectedLength || selectedLength
      })

      if (result.isSuccess) {
        toast.success("Removed from queue")
      } else {
        toast.error("Failed to remove from queue")
      }
    } finally {
      setRemovingLeadId(null)
    }
  }

  // Handle posting comment now with rate limiting
  const handlePostNow = async (lead: LeadResult) => {
    if (!user?.id) {
      toast.error("Please log in to post comments")
      return
    }

    setPostingLeadId(lead.id)
    try {
      // Extract thread ID from URL
      const urlMatch = lead.postUrl.match(/\/comments\/([a-zA-Z0-9]+)/)
      const threadId = urlMatch ? urlMatch[1] : lead.originalData?.threadId

      if (!threadId) {
        toast.error("Could not extract thread ID from URL")
        return
      }

      // Check if user is authenticated with Reddit
      const testResult = await testRedditPostingAction()
      if (!testResult.isSuccess) {
        toast.error("Please authenticate with Reddit first")
        // Redirect to Reddit auth
        window.location.href = "/api/reddit/auth"
        return
      }

      const comment = getDisplayComment(lead)

      // Post comment with rate limiting
      const result = await processPostWithRateLimit(
        user.id,
        lead.id,
        threadId,
        comment
      )

      if (result.isSuccess) {
        toast.success("Comment posted successfully!")
        // Track analytics
        posthog.capture("lead_posted", {
          lead_id: lead.id,
          relevance_score: lead.relevanceScore,
          keyword: lead.keyword,
          comment_length: lead.selectedLength || selectedLength,
          campaign_id: lead.campaignId,
          subreddit: lead.subreddit,
          rate_limited: false
        })
        // Optionally open the posted comment in a new tab
        if (result.data?.link) {
          window.open(result.data.link, "_blank")
        }
      } else {
        toast.error(result.message)
        // Track failure or rate limit
        posthog.capture("lead_post_failed", {
          lead_id: lead.id,
          error_message: result.message,
          campaign_id: lead.campaignId,
          rate_limited: result.message.includes("Rate limited")
        })
      }
    } catch (error) {
      toast.error("Failed to post comment")
      console.error("Error posting comment:", error)
    } finally {
      setPostingLeadId(null)
    }
  }

  // Handle tone regeneration for all comments
  const handleToneRegeneration = async () => {
    if (!toneInstruction.trim() || !websiteContent) {
      toast.error("Please enter tone instructions")
      return
    }

    setRegeneratingId("all")

    try {
      // Regenerate comments for each lead
      for (const lead of leads) {
        const result = await regenerateCommentsWithToneAction(
          lead.postTitle,
          lead.postContentSnippet,
          lead.subreddit,
          websiteContent,
          toneInstruction
        )

        if (result.isSuccess) {
          await updateGeneratedCommentAction(lead.id, {
            microComment: result.data.microComment,
            mediumComment: result.data.mediumComment,
            verboseComment: result.data.verboseComment
          })
        }
      }

      toast.success("All comments regenerated with new tone")
      setToneInstruction("")
    } catch (error) {
      toast.error("Failed to regenerate comments")
    } finally {
      setRegeneratingId(null)
    }
  }

  // Async batch posting functionality with rate limiting
  const handleBatchPostQueue = async () => {
    if (!user?.id) {
      toast.error("Please log in to post comments")
      return
    }

    console.log("🚀 [BATCH-POST] Starting async batch posting of queue")

    const queuedLeads = leads.filter(lead => lead.status === "approved")
    if (queuedLeads.length === 0) {
      toast.error("No leads in queue to post")
      return
    }

    // Check Reddit auth first
    const testResult = await testRedditPostingAction()
    if (!testResult.isSuccess) {
      toast.error("Please authenticate with Reddit first")
      window.location.href = "/api/reddit/auth"
      return
    }

    // Prepare posts for queueing
    const postsToQueue = queuedLeads
      .map(lead => {
        const urlMatch = lead.postUrl.match(/\/comments\/([a-zA-Z0-9]+)/)
        const threadId = urlMatch
          ? urlMatch[1]
          : lead.originalData?.threadId || ""

        return {
          leadId: lead.id,
          threadId,
          comment: getDisplayComment(lead)
        }
      })
      .filter(post => post.threadId) // Filter out posts without thread IDs

    if (postsToQueue.length === 0) {
      toast.error("No valid posts to queue")
      return
    }

    setIsBatchPosting(true)

    try {
      // Queue all posts for async processing
      const result = await queuePostsForAsyncProcessing(user.id, postsToQueue)

      if (result.isSuccess) {
        const { queuedCount, estimatedTime } = result.data
        toast.success(`Queued ${queuedCount} posts for processing`, {
          description: `Estimated completion time: ${estimatedTime} minutes. Posts will be sent automatically with 5-7 minute delays.`
        })

        // Track batch posting queued
        posthog.capture("batch_posting_queued", {
          total_posts: queuedCount,
          estimated_minutes: estimatedTime,
          campaign_id: campaignId
        })

        // Update UI to show posts are queued
        setIsBatchPosting(false)

        // Optionally refresh queue status
        checkQueueStatus()
      } else {
        toast.error(result.message)
        setIsBatchPosting(false)
      }
    } catch (error) {
      console.error("❌ [BATCH-POST] Error queueing posts:", error)
      toast.error("Failed to queue posts")
      setIsBatchPosting(false)
    }
  }

  // Check posting queue status
  const checkQueueStatus = async () => {
    if (!user?.id) return

    const result = await getPostingQueueStatus(user.id)
    if (result.isSuccess) {
      const { pending, processing, completed, failed, nextPostTime } =
        result.data
      console.log(
        `📊 [QUEUE-STATUS] Pending: ${pending}, Processing: ${processing}, Completed: ${completed}, Failed: ${failed}`
      )

      if (nextPostTime && nextPostTime > new Date()) {
        const waitMinutes = Math.ceil(
          (nextPostTime.getTime() - Date.now()) / 60000
        )
        console.log(
          `⏳ [QUEUE-STATUS] Next post allowed in ${waitMinutes} minutes`
        )
      }
    }
  }

  // Filter and sort leads
  const filteredAndSortedLeads = useMemo(() => {
    let filtered = leads

    // Filter by tab
    if (activeTab === "queue") {
      filtered = filtered.filter(lead => lead.status === "approved")
    }

    // Filter by keyword
    if (filterKeyword) {
      filtered = filtered.filter(lead =>
        lead.keyword?.toLowerCase().includes(filterKeyword.toLowerCase())
      )
    }

    // Filter by minimum score
    if (filterScore > 0) {
      filtered = filtered.filter(lead => lead.relevanceScore >= filterScore)
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "relevance":
          return b.relevanceScore - a.relevanceScore
        case "upvotes":
          return (b.postScore || 0) - (a.postScore || 0)
        case "time":
          // Assuming newer items have higher index in original array
          return leads.indexOf(b) - leads.indexOf(a)
        default:
          return 0
      }
    })

    return sorted
  }, [leads, filterKeyword, filterScore, sortBy, activeTab])

  // Paginated leads
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredAndSortedLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredAndSortedLeads, currentPage])

  const totalPages = Math.ceil(filteredAndSortedLeads.length / ITEMS_PER_PAGE)

  const renderLoadingSkeleton = () => <EnhancedLeadSkeleton />

  const renderWorkflowProgress = () => (
    <div className="space-y-6">
      {workflowProgress.error ? (
        <EnhancedErrorState
          error={workflowProgress.error}
          onRetry={() => window.location.reload()}
        />
      ) : (
        <GenerationProgress
          currentStep={workflowProgress.currentStep}
          completedSteps={workflowProgress.completedSteps}
          totalSteps={workflowProgress.totalSteps}
          foundLeads={leads.length}
        />
      )}

      {workflowProgress.isLoading && renderLoadingSkeleton()}
    </div>
  )

  return (
    <div className="flex h-full bg-black">
      {/* Main Content */}
      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 md:p-8">
        {/* Header Section: Tabs and Main Actions */}
        <div className="bg-card mb-6 rounded-lg border p-4 shadow-sm dark:border-gray-700">
          {/* Polling Status Indicator */}
          {campaignId && leads.length > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <div
                  className={`size-2 rounded-full ${isPolling ? "animate-pulse bg-green-500" : "bg-gray-400"}`}
                />
                <span className="text-gray-600 dark:text-gray-400">
                  {isPolling
                    ? "Checking for new leads..."
                    : "Auto-refresh active (every 5 seconds)"}
                </span>
              </div>
              {lastPolledAt && (
                <span className="text-gray-500 dark:text-gray-500">
                  Last checked: {new Date(lastPolledAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(value: any) => setActiveTab(value)}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="grid grid-cols-2 self-start rounded-lg bg-gray-100 p-1 sm:w-auto dark:bg-gray-800">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-md px-3 py-1.5 text-sm font-medium data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700"
                >
                  All Leads
                </TabsTrigger>
                <TabsTrigger
                  value="queue"
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-md px-3 py-1.5 text-sm font-medium data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700"
                >
                  Queue ({leads.filter(l => l.status === "approved").length})
                </TabsTrigger>
              </TabsList>

              {/* Campaign Controls */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                {/* Onboarding button (only show when no keywords error) */}
                {workflowProgress.error?.includes("No keywords found") && (
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = "/onboarding")}
                    className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-900/20 dark:hover:text-orange-300"
                  >
                    <Target className="size-4" />
                    Complete Onboarding
                  </Button>
                )}

                <Select
                  value={selectedLength}
                  onValueChange={(value: any) => setSelectedLength(value)}
                >
                  <SelectTrigger className="h-9 w-[130px] rounded-md border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700">
                    <SelectValue placeholder="Comment Length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="micro">Micro</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="verbose">Verbose</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="h-9 gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow-lg"
                >
                  <Plus className="size-4" />
                  New Campaign
                </Button>
              </div>
            </div>
          </Tabs>
        </div>

        {/* Tone Regeneration Box */}
        {leads.length > 0 && (
          <Card className="overflow-hidden shadow-lg dark:border-gray-700">
            <CardHeader className="border-b bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100">
                <Sparkles className="size-5 text-purple-500" />
                Customize Comment Tone
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                Refine the tone of all generated comments below based on your
                brand's voice or specific instructions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  placeholder="e.g., 'Make comments more enthusiastic and add a CTA'"
                  value={toneInstruction}
                  onChange={e => setToneInstruction(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && toneInstruction.trim()) {
                      handleToneRegeneration()
                    }
                  }}
                  className="grow rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:border-blue-400"
                />
                <Button
                  onClick={handleToneRegeneration}
                  disabled={regeneratingId === "all" || !toneInstruction.trim()}
                  className="w-full gap-2 rounded-md bg-purple-600 text-white shadow-md transition-all hover:bg-purple-700 hover:shadow-lg disabled:opacity-70 sm:w-auto"
                >
                  {regeneratingId === "all" ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Regenerate All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters and Sorting */}
        {leads.length > 0 && (
          <div className="bg-card rounded-lg border p-3 shadow-sm dark:border-gray-700">
            <div className="flex flex-col flex-wrap items-stretch gap-3 sm:flex-row sm:items-center">
              <div className="flex grow items-center gap-2">
                <Filter className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
                <Input
                  placeholder="Filter by keyword..."
                  value={filterKeyword}
                  onChange={e => setFilterKeyword(e.target.value)}
                  className="h-9 grow rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-nowrap text-sm text-gray-600 dark:text-gray-400">
                  Min. Score:
                </span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={filterScore}
                  onChange={e => setFilterScore(Number(e.target.value))}
                  className="h-9 w-20 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
                <Select
                  value={sortBy}
                  onValueChange={(value: any) => setSortBy(value)}
                >
                  <SelectTrigger className="h-9 w-[130px] rounded-md border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="upvotes">Upvotes</SelectItem>
                    <SelectItem value="time">Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-2 text-right text-sm text-gray-500 sm:ml-auto sm:mt-0 dark:text-gray-400">
                {paginatedLeads.length} of {filteredAndSortedLeads.length}
              </div>
            </div>
          </div>
        )}

        {/* Batch Posting UI - Show only in queue tab */}
        {activeTab === "queue" &&
          leads.filter(l => l.status === "approved").length > 0 && (
            <Card className="overflow-hidden shadow-lg dark:border-gray-700">
              <CardHeader className="border-b bg-amber-50/50 p-4 dark:border-gray-700 dark:bg-amber-900/20">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100">
                  <PlayCircle className="size-5 text-amber-600 dark:text-amber-400" />
                  Async Queue Posting
                </CardTitle>
                <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                  Queue all comments for automatic posting with 5-7 minute
                  randomized delays
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p className="font-medium">
                        {leads.filter(l => l.status === "approved").length}{" "}
                        comments ready to queue
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                        Posts will be sent automatically with 5-7 minute
                        randomized delays to comply with Reddit's rate limits
                      </p>
                    </div>
                    <Button
                      onClick={handleBatchPostQueue}
                      disabled={isBatchPosting}
                      className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md transition-all hover:from-amber-600 hover:to-amber-700 hover:shadow-lg disabled:opacity-50"
                    >
                      {isBatchPosting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Queueing...
                        </>
                      ) : (
                        <>
                          <Send className="size-4" />
                          Queue All Posts
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Rate Limit Info */}
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/20">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                      <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                        <p className="font-medium">Rate Limiting Protection:</p>
                        <ul className="ml-4 list-disc space-y-0.5 text-gray-600 dark:text-gray-400">
                          <li>Maximum 1 post per account every 5 minutes</li>
                          <li>
                            Randomized delays between 5-7 minutes to avoid
                            patterns
                          </li>
                          <li>Posts are queued and processed asynchronously</li>
                          <li>
                            You'll be notified when all posts are completed
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Estimated Time */}
                  {leads.filter(l => l.status === "approved").length > 0 && (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="mb-1 mr-2 inline-block size-4" />
                        <span className="font-medium">
                          Estimated completion time:
                        </span>{" "}
                        {Math.ceil(
                          leads.filter(l => l.status === "approved").length * 6
                        )}{" "}
                        minutes
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Show progress or results */}
        {leads.length === 0 && !workflowProgress.error ? (
          // Only show progress if no leads yet
          renderWorkflowProgress()
        ) : (
          <>
            {/* Show progress bar at top if still loading */}
            {workflowProgress.isLoading && (
              <Card className="shadow-lg dark:border-gray-700">
                <CardHeader className="border-b p-4 dark:border-gray-700">
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-800 dark:text-gray-100">
                    <Loader2 className="size-5 animate-spin text-blue-500" />
                    Lead Generation In Progress
                  </CardTitle>
                  <CardDescription className="pt-1 text-sm text-gray-600 dark:text-gray-400">
                    {workflowProgress.currentStep}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <Progress
                    value={
                      (workflowProgress.completedSteps /
                        workflowProgress.totalSteps) *
                      100
                    }
                    className="h-2.5 w-full [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-blue-600 dark:[&>div]:from-blue-500 dark:[&>div]:to-blue-700"
                  />
                </CardContent>
              </Card>
            )}

            {/* Show error if any */}
            {workflowProgress.error && (
              <EnhancedErrorState
                error={workflowProgress.error}
                onRetry={() => window.location.reload()}
              />
            )}

            {/* Results Grid - Always show if we have leads */}
            {leads.length > 0 ? (
              filteredAndSortedLeads.length > 0 ? (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
                  {paginatedLeads.map(lead => (
                    <Card
                      key={lead.id}
                      className={`flex flex-col rounded-xl border bg-white shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl dark:border-gray-700 dark:bg-gray-800 ${
                        newLeadIds.has(lead.id)
                          ? "animate-in fade-in slide-in-from-bottom-4 ring-2 ring-green-400/60 duration-700"
                          : ""
                      }`}
                      onClick={() => setSelectedPost(lead)}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 border-2 border-gray-200 dark:border-gray-600">
                              <AvatarFallback className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground text-sm font-semibold">
                                {lead.postAuthor.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-base font-semibold text-gray-800 dark:text-gray-100">
                              u/{lead.postAuthor}
                            </span>
                          </div>
                          <div
                            className="flex items-center gap-2"
                            onClick={e => e.stopPropagation()}
                          >
                            <AnimatedCopyButton
                              text={getDisplayComment(lead)}
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex grow flex-col space-y-5">
                        {/* Post Content */}
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold leading-tight text-gray-900 dark:text-gray-50">
                            {lead.postTitle}
                          </h3>
                          <p className="line-clamp-3 text-sm text-gray-600 dark:text-gray-400">
                            {lead.postContentSnippet}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-gray-500 dark:text-gray-400">
                            {lead.postScore !== undefined && (
                              <span className="flex items-center gap-1.5">
                                <ThumbsUp className="size-3.5" />
                                {lead.postScore}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <Clock className="size-3.5" />
                              {lead.timeAgo}
                            </span>
                            {lead.keyword && (
                              <Badge
                                variant="secondary"
                                className="rounded-md px-2 py-0.5 text-xs font-medium"
                              >
                                <Hash className="mr-1.5 size-3" />
                                {lead.keyword}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Score Rationale */}
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/30">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                              Why this score?
                            </span>
                            <Badge className="bg-blue-600 text-xs text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-gray-900 dark:hover:bg-blue-600">
                              Score: {lead.relevanceScore}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-700 dark:text-gray-300">
                            {lead.reasoning}
                          </p>
                        </div>

                        {/* Generated Comment Section */}
                        <div className="grow space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              Generated Comment
                            </span>
                            <div className="flex items-center gap-2">
                              {lead.status === "approved" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={removingLeadId === lead.id}
                                  className="gap-1.5 rounded-md border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-900/20"
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleRemoveFromQueue(lead)
                                  }}
                                >
                                  {removingLeadId === lead.id ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <MinusCircle className="size-3.5" />
                                  )}
                                  Remove
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={queuingLeadId === lead.id}
                                  className="gap-1.5 rounded-md border-sky-500 text-sky-600 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50 dark:border-sky-400 dark:text-sky-300 dark:hover:bg-sky-900/50 dark:hover:text-sky-200"
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleAddToQueue(lead)
                                  }}
                                >
                                  {queuingLeadId === lead.id ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <PlusCircle className="size-3.5" />
                                  )}
                                  Queue
                                </Button>
                              )}
                              <Button
                                variant="default"
                                size="sm"
                                disabled={postingLeadId === lead.id}
                                className="gap-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
                                onClick={e => {
                                  e.stopPropagation()
                                  handlePostNow(lead)
                                }}
                              >
                                {postingLeadId === lead.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Send className="size-3.5" />
                                )}
                                Post Now
                              </Button>
                            </div>
                          </div>

                          {editingCommentId === lead.id ? (
                            <CommentEditor
                              initialValue={getDisplayComment(lead)}
                              onSave={value =>
                                handleCommentEdit(lead.id, value)
                              }
                              onCancel={() => setEditingCommentId(null)}
                            />
                          ) : (
                            <div
                              className="group relative cursor-text rounded-lg bg-gray-100 p-3.5 text-sm text-gray-800 transition-colors hover:bg-gray-200/70 dark:bg-gray-700/50 dark:text-gray-200 dark:hover:bg-gray-700/80"
                              onClick={() => setEditingCommentId(lead.id)}
                            >
                              <p className="whitespace-pre-wrap">
                                {getDisplayComment(lead)}
                              </p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1.5 top-1.5 size-7 text-gray-500 opacity-0 transition-all hover:bg-gray-300/50 group-hover:opacity-100 dark:text-gray-400 dark:hover:bg-gray-600/50"
                              >
                                <Edit2 className="size-3.5" />
                              </Button>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs capitalize text-gray-500 dark:text-gray-400">
                              {lead.selectedLength || selectedLength} length
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-gray-500 hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-700/50"
                              asChild
                            >
                              <a
                                href={lead.postUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                              >
                                <ExternalLink className="size-3.5" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No leads match your filters"
                  description="Try adjusting your keyword filter or minimum score"
                  icon={<MessageSquare className="size-12" />}
                  action={{
                    label: "Clear Filters",
                    onClick: () => {
                      setFilterKeyword("")
                      setFilterScore(0)
                    }
                  }}
                />
              )
            ) : null}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center space-x-2 pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-9 rounded-md border-gray-300 px-3 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      const showEllipsis =
                        Math.abs(page - currentPage) > 2 &&
                        page !== 1 &&
                        page !== totalPages
                      const showPage =
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      return (
                        showPage ||
                        (showEllipsis &&
                          (page === currentPage - 3 ||
                            page === currentPage + 3))
                      )
                    })
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 &&
                          array[index - 1] !== page - 1 &&
                          page !== array[index - 1] + 1 && (
                            <span className="px-1.5 py-1 text-sm text-gray-400 dark:text-gray-500">
                              ...
                            </span>
                          )}
                        <Button
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={`size-9 rounded-md border-gray-300 px-0 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 ${page === currentPage ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600" : "bg-white dark:bg-gray-800"}`}
                        >
                          {page}
                        </Button>
                      </React.Fragment>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(p => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="h-9 rounded-md border-gray-300 px-3 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Post Detail Popup */}
      {selectedPost && (
        <PostDetailPopup
          open={!!selectedPost}
          onOpenChange={open => !open && setSelectedPost(null)}
          lead={selectedPost}
        />
      )}

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
