"use client"

import React, { useState, useEffect, useMemo } from "react"
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
  Send
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import CreateCampaignDialog from "./create-campaign-dialog"
import CampaignsList from "./campaigns-list"
import PostDetailPopup from "./post-detail-popup"
import CommentEditor from "./comment-editor"
import AnimatedCopyButton from "./animated-copy-button"
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
import { useUser } from "@clerk/nextjs"
import { db } from "@/db/db"
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from "firebase/firestore"
import { LEAD_COLLECTIONS } from "@/db/schema"
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
    isLoading: false
  })
  const [campaignId, setCampaignId] = useState<string | null>(null)
  
  // New state variables
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<"relevance" | "upvotes" | "time">("relevance")
  const [filterKeyword, setFilterKeyword] = useState<string>("")
  const [filterScore, setFilterScore] = useState<number>(0)
  const [selectedPost, setSelectedPost] = useState<LeadResult | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [toneInstruction, setToneInstruction] = useState("")
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [websiteContent, setWebsiteContent] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"all" | "queue">("all")
  const [newLeadIds, setNewLeadIds] = useState<Set<string>>(new Set())

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

  // Real-time listener for leads
  useEffect(() => {
    if (!campaignId) {
      console.log("🚫 [FRONTEND] No campaignId, clearing leads")
      setLeads([]) // Clear leads if no campaign is selected
      return
    }

    setWorkflowProgress((prev: any) => ({ ...prev, isLoading: true, error: null }))
    console.log(`🔥 [FRONTEND] Setting up real-time listener for campaign: ${campaignId}`)
    console.log(`🔥 [FRONTEND] Collection path: ${LEAD_COLLECTIONS.GENERATED_COMMENTS}`)

    const q = query(
      collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS),
      where("campaignId", "==", campaignId),
      orderBy("createdAt", "desc") // Show newest leads first
    )

    console.log(`🔥 [FRONTEND] Firestore query created, subscribing to real-time updates...`)

    const unsubscribe = onSnapshot(
      q,
      querySnapshot => {
        console.log(`\n🔥 [FRONTEND] ====== FIRESTORE SNAPSHOT RECEIVED ======`)
        console.log(`🔥 [FRONTEND] Campaign ID: ${campaignId}`)
        console.log(`🔥 [FRONTEND] Number of documents: ${querySnapshot.docs.length}`)
        console.log(`🔥 [FRONTEND] Query metadata:`, {
          fromCache: querySnapshot.metadata.fromCache,
          hasPendingWrites: querySnapshot.metadata.hasPendingWrites
        })
        
        // Track new leads for animation
        const currentLeadIds = new Set(leads.map(l => l.id))
        const newIds = new Set<string>()
        
        const fetchedLeads: LeadResult[] = querySnapshot.docs.map((doc, index) => {
          const data = doc.data() as SerializedGeneratedCommentDocument
          
          console.log(`🔍 [FRONTEND] Processing document ${index + 1}/${querySnapshot.docs.length}:`)
          console.log(`🔍 [FRONTEND] Doc ID: ${doc.id}`)
          console.log(`🔍 [FRONTEND] Doc data:`, {
            campaignId: data.campaignId,
            postTitle: data.postTitle,
            relevanceScore: data.relevanceScore,
            status: data.status,
            createdAt: data.createdAt,
            keyword: data.keyword,
            postScore: data.postScore
          })
          
          // Check if this is a new lead
          if (!currentLeadIds.has(doc.id)) {
            newIds.add(doc.id)
            console.log(`✨ [FRONTEND] New lead detected: ${data.postTitle}`)
          }
          
          // Derive subreddit from postUrl if possible, or use a placeholder
          let subreddit = "unknown"
          try {
            const url = new URL(data.postUrl)
            const match = url.pathname.match(/\/r\/([^\/]+)/)
            if (match && match[1]) {
              subreddit = match[1]
            }
          } catch (e) {
            console.warn("Could not parse subreddit from URL:", data.postUrl)
          }

          return {
            id: doc.id,
            campaignId: data.campaignId,
            postUrl: data.postUrl,
            postTitle: data.postTitle,
            postAuthor: data.postAuthor,
            postContentSnippet: data.postContentSnippet,
            subreddit: subreddit, 
            relevanceScore: data.relevanceScore,
            reasoning: data.reasoning,
            microComment: data.microComment,
            mediumComment: data.mediumComment,
            verboseComment: data.verboseComment,
            status: data.status,
            selectedLength: data.selectedLength || selectedLength,
            timeAgo: getTimeAgo(data.createdAt),
            originalData: data,
            postScore: data.postScore,
            keyword: data.keyword
          }
        })
        
        console.log(`🎯 [FRONTEND] Setting ${fetchedLeads.length} leads in state`)
        setLeads(fetchedLeads)
        setNewLeadIds(newIds)
        
        // Clear new lead indicators after animation
        if (newIds.size > 0) {
          console.log(`✨ [FRONTEND] ${newIds.size} new leads detected`)
          // Show toast for new leads
          const newLeadsArray = Array.from(newIds)
          const firstNewLead = fetchedLeads.find(l => l.id === newLeadsArray[0])
          if (firstNewLead) {
            toast.success(
              `New lead found: ${firstNewLead.postTitle.substring(0, 50)}...`,
              {
                description: `Score: ${firstNewLead.relevanceScore} - ${firstNewLead.keyword || 'Unknown keyword'}`
              }
            )
          }
          
          setTimeout(() => {
            setNewLeadIds(new Set())
          }, 3000)
        }
        
        setWorkflowProgress((prev: any) => ({
          ...prev,
          isLoading: false,
        }))
        if (fetchedLeads.length === 0 && !workflowProgress.isLoading) {
            console.log("🔥 [FRONTEND] No leads found in snapshot, workflow might be running or no results yet.")
        }
        console.log(`🔥 [FRONTEND] ====== SNAPSHOT PROCESSING COMPLETE ======\n`)
      },
      error => {
        console.error("❌ [FRONTEND] Error fetching real-time leads:", error)
        setWorkflowProgress((prev: any) => ({
          ...prev,
          isLoading: false,
          error: "Failed to load real-time results. Please refresh or try again."
        }))
      }
    )

    // Cleanup listener on component unmount or when campaignId changes
    return () => {
      console.log(`🔥 Unsubscribing from real-time listener for campaign: ${campaignId}`)
      unsubscribe()
    }
  }, [campaignId, selectedLength])

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

      console.log(`🎯 [FRONTEND] Setting campaign ID: ${realCampaignId}`)
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
    try {
      const results = await getGeneratedCommentsByCampaignAction(campaignId)
      if (results.isSuccess && results.data.length > 0) {
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
    let then: number;
    if (typeof timestamp === 'string') {
      then = new Date(timestamp).getTime();
    } else if (timestamp && typeof timestamp.seconds === 'number') { // Firestore Timestamp like
      then = timestamp.seconds * 1000;
    } else {
      then = now - 7200000; // Default to 2h ago if invalid
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
        return lead.microComment;
      case "verbose":
        return lead.verboseComment;
      case "medium":
      default:
        return lead.mediumComment;
    }
  };

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
    } else {
      toast.error("Failed to update comment")
    }
  }

  // Handle adding to queue
  const handleAddToQueue = async (lead: LeadResult) => {
    const result = await updateGeneratedCommentAction(lead.id, {
      status: "approved",
      selectedLength: lead.selectedLength || selectedLength
    })
    
    if (result.isSuccess) {
      toast.success("Added to posting queue")
    } else {
      toast.error("Failed to add to queue")
    }
  }

  // Handle posting comment now
  const handlePostNow = async (lead: LeadResult) => {
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
      
      // Post comment and update status
      const result = await postCommentAndUpdateStatusAction(
        lead.id,
        threadId,
        comment
      )
      
      if (result.isSuccess) {
        toast.success("Comment posted successfully!")
        // Optionally open the posted comment in a new tab
        if (result.data.link) {
          window.open(result.data.link, "_blank")
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to post comment")
      console.error("Error posting comment:", error)
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

  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[...Array(6)].map((_, index) => (
        <Card key={index} className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-4 w-20" />
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
            {workflowProgress.isLoading && workflowProgress.currentStep.includes("Scoring") && leads.length > 0 && (
              <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                • {leads.length} leads processed
              </span>
            )}
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
      
      {/* Live Progress Indicator */}
      {workflowProgress.isLoading && leads.length > 0 && (
        <div className="mt-4 animate-pulse rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              Finding and analyzing new leads... ({leads.length} found so far)
            </span>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="space-y-6">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="all">All Leads</TabsTrigger>
                <TabsTrigger value="queue">
                  Queue ({leads.filter(l => l.status === "approved").length})
                </TabsTrigger>
              </TabsList>
              
              {/* Campaign Controls */}
              <div className="flex items-center gap-4">
                {/* Onboarding button (only show when no keywords error) */}
                {workflowProgress.error?.includes("No keywords found") && (
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = "/onboarding")}
                    className="border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-900/20 dark:hover:text-orange-300"
                  >
                    <Target className="mr-2 size-4" />
                    Start Onboarding Here
                  </Button>
                )}

                {/* Right side - Existing controls */}
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
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  <Plus className="mr-2 size-4" />
                  New Campaign
                </Button>
              </div>
            </div>
          </Tabs>

          {/* Tone Regeneration Box */}
          {leads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Regenerate All Comments</CardTitle>
                <CardDescription>
                  Adjust the tone of all generated comments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., make the comments less salesy, more casual, more technical..."
                    value={toneInstruction}
                    onChange={(e) => setToneInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleToneRegeneration()
                      }
                    }}
                  />
                  <Button
                    onClick={handleToneRegeneration}
                    disabled={regeneratingId === "all" || !toneInstruction.trim()}
                  >
                    {regeneratingId === "all" ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 size-4" />
                    )}
                    Regenerate
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters and Sorting */}
          {leads.length > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-gray-500" />
                <Input
                  placeholder="Filter by keyword..."
                  value={filterKeyword}
                  onChange={(e) => setFilterKeyword(e.target.value)}
                  className="w-48"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Min Score:</span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={filterScore}
                  onChange={(e) => setFilterScore(Number(e.target.value))}
                  className="w-20"
                />
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="size-4 text-gray-500" />
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="upvotes">Upvotes</SelectItem>
                    <SelectItem value="time">Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="ml-auto text-sm text-gray-500">
                Showing {paginatedLeads.length} of {filteredAndSortedLeads.length} results
              </div>
            </div>
          )}

          {/* Show progress or results */}
          {workflowProgress.isLoading || (leads.length === 0 && !workflowProgress.error) ? (
            renderWorkflowProgress()
          ) : (
            <>
              {/* Results Grid */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {paginatedLeads.map(lead => (
                  <Card
                    key={lead.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      newLeadIds.has(lead.id) 
                        ? "animate-in fade-in slide-in-from-bottom-2 duration-500 ring-2 ring-green-500 ring-opacity-50" 
                        : ""
                    }`}
                    onClick={() => setSelectedPost(lead)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6">
                            <AvatarFallback className="text-xs">
                              {lead.postAuthor.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium dark:text-gray-100">
                            u/{lead.postAuthor}
                          </span>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <AnimatedCopyButton text={getDisplayComment(lead)} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Post Content */}
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium dark:text-gray-100">
                          {lead.postTitle}
                        </h3>
                        <p className="line-clamp-3 text-sm text-gray-600 dark:text-gray-400">
                          {lead.postContentSnippet}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          {lead.postScore !== undefined && (
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="size-3" />
                              {lead.postScore}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {lead.timeAgo}
                          </span>
                          {lead.keyword && (
                            <Badge variant="secondary" className="text-xs">
                              <Hash className="mr-1 size-3" />
                              {lead.keyword}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Score Rationale */}
                      <div className="border-t pt-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Why this score?
                          </span>
                          <Badge 
                            variant={lead.relevanceScore >= 70 ? "default" : "secondary"} 
                            className="text-xs"
                          >
                            Score: {lead.relevanceScore}
                          </Badge>
                        </div>
                        <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
                          {lead.reasoning || "AI analysis of relevance to your business"}
                        </p>
                      </div>

                      {/* Generated Comment */}
                      <div className="space-y-2 border-t pt-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Generated Comment
                            {lead.status === "used" && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                <CheckCircle2 className="mr-1 size-3" />
                                Posted
                              </Badge>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            {lead.status !== "used" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAddToQueue(lead)}
                                  disabled={lead.status === "approved"}
                                >
                                  <PlusCircle className="mr-1 size-3" />
                                  {lead.status === "approved" ? "In Queue" : "Queue"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePostNow(lead)}
                                >
                                  <Send className="mr-1 size-3" />
                                  Post Now
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {editingCommentId === lead.id ? (
                          <CommentEditor
                            initialValue={getDisplayComment(lead)}
                            onSave={(value) => handleCommentEdit(lead.id, value)}
                            onCancel={() => setEditingCommentId(null)}
                          />
                        ) : (
                          <div 
                            className="group relative cursor-text rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-800 dark:text-gray-200"
                            onClick={() => setEditingCommentId(lead.id)}
                          >
                            <p>{getDisplayComment(lead)}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <Edit2 className="size-3" />
                            </Button>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs capitalize text-gray-500 dark:text-gray-400">
                            {lead.selectedLength || selectedLength} length
                          </span>
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={lead.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first, last, current, and adjacent pages
                        return page === 1 || 
                               page === totalPages || 
                               Math.abs(page - currentPage) <= 1
                      })
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="text-gray-400">...</span>
                          )}
                          <Button
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Post Detail Popup */}
      {selectedPost && (
        <PostDetailPopup
          open={!!selectedPost}
          onOpenChange={(open) => !open && setSelectedPost(null)}
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