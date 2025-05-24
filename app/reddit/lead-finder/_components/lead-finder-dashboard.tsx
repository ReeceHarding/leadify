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

// Import newly created types and utils
import { LeadResult, WorkflowProgress } from "./dashboard/types"
import { getTimeAgo, serializeTimestampToISO } from "./dashboard/utils"

const ITEMS_PER_PAGE = 10

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
    isLoading: true,
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
  
  const latestLeadsRef = useRef<LeadResult[]>([])
  const isFirstFetchRef = useRef(true)
  const initialLoadAttemptedRef = useRef(false)

  // Reset first-fetch and initial load trackers when campaignId changes
  useEffect(() => {
    console.log(`🔄 [CAMPAIGN-CHANGE-EFFECT] Campaign ID changed to: ${campaignId}. Resetting fetch trackers.`)
    isFirstFetchRef.current = true
    initialLoadAttemptedRef.current = false
    setLeads([]) // Clear previous leads
    latestLeadsRef.current = []
    // Set loading to true when campaign changes, until first fetch attempt completes
    if (campaignId) {
      console.log("🔄 [isLoading] Setting isLoading: true (campaignId changed)")
      setWorkflowProgress(prev => ({
        ...prev,
        isLoading: true,
        error: undefined,
        currentStep: "Loading campaign data..."
      }))
    }
  }, [campaignId])

  // Debug: Test direct query on mount (REVERTED - no longer hardcoding or doing direct getDoc)
  useEffect(() => {
    const testServerActionFetch = async () => {
      if (!campaignId) {
        console.log("🧪 [DEBUG-TEST-ACTION] No campaignId yet for server action test.")
        return
      }
      console.log(`\n🧪 [DEBUG-TEST-ACTION] ====== SERVER ACTION TEST FOR CURRENT CAMPAIGN ======`)
      console.log(`🧪 [DEBUG-TEST-ACTION] Testing with current campaign ID: ${campaignId}`)

      try {
        console.log(`🧪 [DEBUG-TEST-ACTION] Calling getGeneratedCommentsByCampaignAction for campaign: ${campaignId}`)
        const resultAction = await getGeneratedCommentsByCampaignAction(campaignId)
        console.log(`🧪 [DEBUG-TEST-ACTION] Result from getGeneratedCommentsByCampaignAction:`, {
          isSuccess: resultAction.isSuccess,
          dataLength: resultAction.data?.length || 0,
          firstItemCampaignId: resultAction.data?.[0]?.campaignId,
          error: resultAction.isSuccess ? undefined : resultAction.message
        })
      } catch (error) {
        console.error(`🧪 [DEBUG-TEST-ACTION] Error calling getGeneratedCommentsByCampaignAction:`, error)
      }
      
      console.log(`🧪 [DEBUG-TEST-ACTION] ====== SERVER ACTION TEST COMPLETE ======\n`)
    }
    
    // Run this test when campaignId is set and user is available
    if (user?.id && campaignId) {
      // testServerActionFetch(); // Intentionally commented out for now to reduce log noise, enable if needed.
      console.log("🧪 [DEBUG-TEST-ACTION] testServerActionFetch is available but currently commented out.")
    }
  }, [user?.id, campaignId])

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
      console.log("🔄 [isLoading] Setting isLoading: true (initializeLeadGeneration start)")
      setWorkflowProgress({
        currentStep: "Initializing profile...",
        completedSteps: 0,
        totalSteps: 6,
        isLoading: true,
        error: undefined
      })

      try {
        // Get user profile to retrieve keywords
        const profileResult = await getProfileByUserIdAction(user.id)

        if (!profileResult.isSuccess) {
          console.error(
            "🔍 [LEAD-FINDER] Failed to get profile:",
            profileResult.message
          )
          console.log("🔄 [isLoading] Setting isLoading: false (initializeLeadGeneration - profile fetch failed)")
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
      console.log("🚫 [POLLING] No campaignId, clearing leads and stopping polling effect.")
      setLeads([]) 
      setWorkflowProgress(prev => ({ ...prev, isLoading: false, currentStep: "No campaign selected.", error: undefined }));
      return
    }

    console.log(`🔄 [POLLING] Starting polling for campaign: ${campaignId}`)
    console.log(`🔄 [POLLING] Will poll every 5 seconds`)
    console.log(`🔄 [POLLING] User ID: ${user?.id}`)
    console.log(`🔄 [POLLING] Collection path will be: generated_comments`)
    console.log(`🔄 [POLLING] Expected campaign IDs: nGUkAfdPyTxgYUE7AzD7 or Bn8qNlX5NPgyFrvwBTgB`)

    const fetchLeads = async () => {
      console.log(`\n🔄 [POLLING] ====== FETCHING LEADS ======`)
      console.log(`🔄 [POLLING] Campaign ID: ${campaignId}`)
      console.log(`🔄 [POLLING] User ID: ${user?.id}`)
      console.log(`🔄 [POLLING] Time: ${new Date().toISOString()}`)
      console.log(`🔄 [POLLING] isFirstFetchRef.current: ${isFirstFetchRef.current}`)
      console.log(`🔄 [POLLING] initialLoadAttemptedRef.current: ${initialLoadAttemptedRef.current}`)

      setIsPolling(true);

      if (isFirstFetchRef.current && !initialLoadAttemptedRef.current) {
        console.log("🔄 [POLLING] First fetch attempt for this campaign, ensuring isLoading is true.");
        setWorkflowProgress((prev: any) => ({
          ...prev,
          isLoading: true, 
          error: undefined
        }));
      }

      try {
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
            isLoading: false, // Always set loading to false on error after initial attempt
            error: result.message || "Failed to fetch leads"
          }))
          initialLoadAttemptedRef.current = true; // Mark that an attempt was made
          setIsPolling(false);
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
          if ((isFirstFetchRef.current && index < 3) || !currentLeadIds.has(comment.id)) {
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

        // Manage loading state and isFirstFetchRef
        if (isFirstFetchRef.current) {
            console.log("🔄 [POLLING] Processing first successful fetch for this campaign.");
            isFirstFetchRef.current = false;
            // Always turn off global loading after the first fetch attempt completes, regardless of data found.
            // The presence of data is handled by showing leads or an empty state.
            setWorkflowProgress(prev => ({
                ...prev,
                isLoading: false,
                currentStep: fetchedLeads.length > 0 ? `Found ${fetchedLeads.length} leads` : "No leads found yet for this campaign.",
                error: undefined
            }));
        } else {
            // For subsequent polls, just update currentStep if needed, isLoading should already be false.
            setWorkflowProgress(prev => ({
                ...prev,
                currentStep: fetchedLeads.length > 0 ? `Found ${fetchedLeads.length} leads (polled)` : "Still no leads found (polled).",
                error: undefined,
                isLoading: false // Ensure it stays false
            }));
        }
        initialLoadAttemptedRef.current = true; // Mark that an attempt was made

      } catch (error) {
        console.error("❌ [POLLING] Error fetching leads:", error)
        setWorkflowProgress((prev: any) => ({
          ...prev,
          isLoading: false, // Always set loading to false on error
          error: "Failed to load leads. Please refresh or try again."
        }))
        initialLoadAttemptedRef.current = true; // Mark that an attempt was made
      } finally {
        setIsPolling(false);
        setLastPolledAt(new Date());
        console.log(`🔄 [POLLING] ====== FETCH COMPLETE / FINALLY BLOCK ======\n`);
      }
    }

    fetchLeads(); // Initial fetch
    const interval = setInterval(fetchLeads, 5000);
    return () => {
      console.log(`🔄 [POLLING-EFFECT] Cleanup: Stopping polling for campaign: ${campaignId}`)
      clearInterval(interval);
    };
  }, [campaignId, user?.id]); // user?.id is important if action depends on it implicitly or for re-auth

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
            relevanceScore: result.relevanceScore,
            reasoning: result.reasoning,
            microComment: result.microComment,
            mediumComment: result.mediumComment,
            verboseComment: result.verboseComment,
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

  const approvedLeadsCount = useMemo(() => leads.filter(l => l.status === "approved").length, [leads]);

  return (
    <div className="flex h-full bg-black">
      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 md:p-8">
        <DashboardHeader 
          campaignId={campaignId}
          leadsCount={leads.length}
          approvedLeadsCount={approvedLeadsCount}
          isPolling={isPolling}
          lastPolledAt={lastPolledAt}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          workflowProgressError={workflowProgress.error}
          onCompleteOnboardingClick={() => window.location.href = "/onboarding"}
          selectedCommentLength={selectedLength}
          onCommentLengthChange={setSelectedLength}
          onNewCampaignClick={() => setCreateDialogOpen(true)}
        />

        {/* Tone Regeneration Box - Show only if leads exist */}
        {leads.length > 0 && (
          <ToneCustomizer 
            toneInstruction={toneInstruction}
            onToneInstructionChange={setToneInstruction}
            onRegenerateAll={handleToneRegeneration}
            isRegeneratingAll={regeneratingId === "all"}
            disabled={leads.length === 0} // Disable if no leads
          />
        )}

        {/* Filters and Sorting - Show only if leads exist */}
        {leads.length > 0 && (
          <FiltersAndSorting 
            filterKeyword={filterKeyword}
            onFilterKeywordChange={setFilterKeyword}
            filterScore={filterScore}
            onFilterScoreChange={setFilterScore}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            paginatedLeadsCount={paginatedLeads.length}
            totalFilteredLeadsCount={filteredAndSortedLeads.length}
            disabled={leads.length === 0}
          />
        )}

        {/* Batch Posting UI - Show only in queue tab */}
        {activeTab === "queue" && (
          <BatchPoster 
            approvedLeadsCount={approvedLeadsCount}
            onBatchPostQueue={handleBatchPostQueue}
            isBatchPosting={isBatchPosting}
          />
        )}

        {/* Results Grid or Empty State for leads */}
        {(workflowProgress.isLoading && leads.length === 0 && !workflowProgress.error) ? (
          renderWorkflowProgress()
        ) : workflowProgress.error && leads.length === 0 ? (
          <EnhancedErrorState
            error={workflowProgress.error}
            onRetry={() => window.location.reload()}
          />
        ) : (
          <>
            {/* Tone Regeneration Box - show if leads exist - as before */}
            {/* ... */}

            {/* Filters and Sorting - show if leads exist - as before */}
            {/* ... */}
            
            {/* Batch Posting UI - show if in queue tab and approved leads exist - as before */}
            {/* ... */}

            {/* Results Grid or Empty State for leads */}
            {filteredAndSortedLeads.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
                {paginatedLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    selectedLength={selectedLength}
                    getDisplayComment={getDisplayComment}
                    isNew={newLeadIds.has(lead.id)}
                    editingCommentId={editingCommentId}
                    onEditClick={() => setEditingCommentId(lead.id)}
                    onSaveComment={handleCommentEdit}
                    onCancelEdit={() => setEditingCommentId(null)}
                    removingLeadId={removingLeadId}
                    queuingLeadId={queuingLeadId}
                    postingLeadId={postingLeadId}
                    onRemoveFromQueue={handleRemoveFromQueue}
                    onAddToQueue={handleAddToQueue}
                    onPostNow={handlePostNow}
                    onCardClick={() => setSelectedPost(lead)}
                  />
                ))}
              </div>
            ) : (
              !workflowProgress.isLoading && !workflowProgress.error && (
                <EmptyState
                  title="No leads found"
                  description={campaignId ? "No leads match your current filters or the campaign is still processing." : "Select or create a campaign to start finding leads."}
                  icon={<MessageSquare className="size-12" />}
                  action={!campaignId ? {
                    label: "Create New Campaign",
                    onClick: () => setCreateDialogOpen(true)
                  } : filterKeyword || filterScore > 0 ? {
                    label: "Clear Filters",
                    onClick: () => {
                      setFilterKeyword("");
                      setFilterScore(0);
                    }
                  } : undefined}
                />
              )
            )}

            <PaginationControls 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
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
          console.log("🎉 New campaign created successfully (dialog callback).");
          setCreateDialogOpen(false);
        }}
      />
    </div>
  )
}
