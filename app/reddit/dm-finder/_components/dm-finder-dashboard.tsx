"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react"
import {
  Search,
  MessageSquare,
  Send,
  Loader2,
  ExternalLink,
  User,
  Calendar,
  ThumbsUp,
  Copy,
  Check,
  Eye,
  Filter,
  ArrowUpDown,
  Hash,
  CalendarDays,
  ChevronRight,
  ChevronDown,
  RefreshCw
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { toast } from "sonner"
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
import { searchRedditUsersAction } from "@/actions/integrations/reddit/reddit-search-actions"
import { generatePersonalizedDMAction } from "@/actions/dm-generation/dm-generation-actions"
import { sendRedditDMAction } from "@/actions/integrations/reddit/dm-actions"
import { 
  createDMHistoryAction,
  getDMHistoryByOrganizationAction,
  checkDMAlreadySentAction
} from "@/actions/db/dm-actions"
import { fetchRedditThreadAction } from "@/actions/integrations/reddit/reddit-actions"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { 
  getRedditThreadsByOrganizationAction,
  upsertRedditThreadAction,
  updateThreadInteractionAction,
  checkThreadInteractionAction,
  recordThreadInteractionAction
} from "@/actions/db/reddit-threads-actions"

interface RedditPost {
  id: string
  threadId: string
  title: string
  author: string
  subreddit: string
  url: string
  created_utc: number
  selftext: string
  score: number
  num_comments: number
  timeAgo?: string
  relevanceScore?: number
  reasoning?: string
  hasComment?: boolean
  hasDM?: boolean
}

interface DMResult {
  id: string
  postId: string
  postTitle: string
  postAuthor: string
  postContentSnippet: string
  postContent?: string
  subreddit: string
  dmContent: string
  status: "draft" | "sent" | "failed"
  createdAt: string
  sentAt?: string
  error?: string
  timeAgo: string
}

interface DashboardState {
  // Search state
  searchQuery: string
  subreddit: string
  timeFilter: "day" | "week" | "month" | "year" | "all"
  isSearching: boolean
  searchResults: RedditPost[]
  
  // DM state
  selectedPost: RedditPost | null
  dmContent: string
  isGeneratingDM: boolean
  isSendingDM: boolean
  
  // History state
  dmHistory: DMResult[]
  isLoadingHistory: boolean
  
  // UI state
  currentPage: number
  sortBy: "recent" | "upvotes"
  dateFilter: "all" | "today" | "week" | "month"
  searchPostsQuery: string
}

const initialState: DashboardState = {
  searchQuery: "",
  subreddit: "",
  timeFilter: "month",
  isSearching: false,
  searchResults: [],
  selectedPost: null,
  dmContent: "",
  isGeneratingDM: false,
  isSendingDM: false,
  dmHistory: [],
  isLoadingHistory: true,
  currentPage: 1,
  sortBy: "recent",
  dateFilter: "all",
  searchPostsQuery: ""
}

const ITEMS_PER_PAGE = 20

// Helper functions
const getTimeAgo = (timestamp: number | string): string => {
  const date = typeof timestamp === 'number' 
    ? new Date(timestamp * 1000) 
    : new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`
    }
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
  } else if (diffDays === 1) {
    return "Yesterday"
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} week${weeks !== 1 ? "s" : ""} ago`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months} month${months !== 1 ? "s" : ""} ago`
  } else {
    const years = Math.floor(diffDays / 365)
    return `${years} year${years !== 1 ? "s" : ""} ago`
  }
}

const filterByDate = (item: { createdAt?: string }, dateFilter: string): boolean => {
  if (dateFilter === "all") return true
  if (!item.createdAt) return true

  const itemDate = new Date(item.createdAt)
  const now = new Date()
  const daysDiff = Math.floor(
    (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  switch (dateFilter) {
    case "today":
      return daysDiff === 0
    case "week":
      return daysDiff <= 7
    case "month":
      return daysDiff <= 30
    default:
      return true
  }
}

const matchesSearchQuery = (item: RedditPost | DMResult, query: string): boolean => {
  if (!query.trim()) return true

  const lowerQuery = query.toLowerCase()
  const searchableFields = [
    'postTitle' in item ? item.postTitle : item.title,
    'postAuthor' in item ? item.postAuthor : item.author,
    'postContentSnippet' in item ? item.postContentSnippet : item.selftext,
    item.subreddit,
    'dmContent' in item ? item.dmContent : ''
  ]
    .filter(Boolean)
    .map(field => field!.toLowerCase())

  return searchableFields.some(field => field.includes(lowerQuery))
}

export default function DMFinderDashboard({
  organizationId,
  userId,
  organization
}: {
  organizationId: string
  userId: string
  organization: any
}) {
  const { user, isLoaded: userLoaded } = useUser()
  const [state, setState] = useState<DashboardState>(initialState)
  const [fullPostContent, setFullPostContent] = useState<Map<string, string>>(new Map())
  const [loadingPostContent, setLoadingPostContent] = useState<Set<string>>(new Set())
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())

  // Update state helper
  const updateState = (updates: Partial<DashboardState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  // Load threads from shared collection
  const loadSharedThreads = async () => {
    updateState({ isSearching: true, searchResults: [] })
    
    try {
      console.log("🧵 [DM-FINDER] Loading threads from shared collection...")
      
      const result = await getRedditThreadsByOrganizationAction(
        organizationId,
        {
          minScore: 50, // Only show threads with decent relevance
          limitCount: 50
        }
      )

      if (result.isSuccess) {
        console.log("🧵 [DM-FINDER] Found", result.data.length, "threads")
        
        const postsWithTimeAgo = result.data.map((thread) => ({
          id: thread.id,
          threadId: thread.id,
          title: thread.title,
          author: thread.author,
          subreddit: thread.subreddit,
          url: thread.url,
          created_utc: thread.createdUtc,
          selftext: thread.content,
          score: thread.score,
          num_comments: thread.numComments,
          timeAgo: getTimeAgo(thread.createdUtc),
          relevanceScore: thread.relevanceScore,
          reasoning: thread.reasoning,
          hasComment: thread.hasComment,
          hasDM: thread.hasDM
        }))
        
        updateState({ searchResults: postsWithTimeAgo })
        toast.success(`Found ${result.data.length} relevant threads`)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Load threads error:", error)
      toast.error("Failed to load threads")
    } finally {
      updateState({ isSearching: false })
    }
  }

  // Load shared threads on mount
  useEffect(() => {
    loadSharedThreads()
    loadDMHistory()
  }, [organizationId])

  const loadDMHistory = async () => {
    updateState({ isLoadingHistory: true })
    try {
      const result = await getDMHistoryByOrganizationAction(organizationId)
      if (result.isSuccess) {
        const transformedHistory: DMResult[] = result.data.map(dm => ({
          id: dm.id,
          postId: dm.postId,
          postTitle: "DM to " + dm.postAuthor,
          postAuthor: dm.postAuthor,
          postContentSnippet: dm.messageContent.substring(0, 200),
          subreddit: "Unknown",
          dmContent: dm.messageContent,
          status: "sent" as const,
          createdAt: dm.sentAt.toDate().toISOString(),
          sentAt: dm.sentAt.toDate().toISOString(),
          timeAgo: getTimeAgo(dm.sentAt.toDate().toISOString())
        }))
        updateState({ dmHistory: transformedHistory })
      }
    } catch (error) {
      console.error("Error loading DM history:", error)
      toast.error("Failed to load DM history")
    } finally {
      updateState({ isLoadingHistory: false })
    }
  }

  // Search Reddit posts
  const handleSearch = async () => {
    if (!state.searchQuery.trim()) {
      toast.error("Please enter a search query")
      return
    }

    updateState({ isSearching: true, searchResults: [] })
    
    try {
      const result = await searchRedditUsersAction(
        organizationId,
        state.searchQuery,
        {
          subreddit: state.subreddit || undefined,
          sort: "relevance",
          time: state.timeFilter,
          limit: 25
        }
      )

      if (result.isSuccess) {
        const postsWithTimeAgo = result.data.map((post: any) => ({
          ...post,
          threadId: post.id,
          timeAgo: getTimeAgo(post.created_utc)
        }))
        updateState({ searchResults: postsWithTimeAgo })
        toast.success(`Found ${result.data.length} posts`)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Search error:", error)
      toast.error("Failed to search posts")
    } finally {
      updateState({ isSearching: false })
    }
  }

  // Fetch full post content
  const fetchFullPostContent = async (post: RedditPost) => {
    const postId = post.id
    
    if (fullPostContent.has(postId) || loadingPostContent.has(postId)) {
      return
    }

    setLoadingPostContent(prev => new Set(prev).add(postId))
    
    try {
      const result = await fetchRedditThreadAction(
        organizationId,
        post.threadId || post.id,
        post.subreddit
      )

      if (result.isSuccess) {
        setFullPostContent(prev => new Map(prev).set(postId, result.data.content || result.data.title || ""))
      }
    } catch (error) {
      console.error("Error fetching full content:", error)
    } finally {
      setLoadingPostContent(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
    }
  }

  // Toggle post expansion
  const togglePostExpansion = (postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  // Generate DM for a post
  const handleGenerateDM = async (post: RedditPost) => {
    updateState({ selectedPost: post, isGeneratingDM: true })

    try {
      // Check if already sent DM to this user
      const alreadySentResult = await checkDMAlreadySentAction(organizationId, post.author)
      if (alreadySentResult.isSuccess && alreadySentResult.data) {
        toast.warning("You've already sent a DM to this user")
      }

      const result = await generatePersonalizedDMAction({
        postTitle: post.title,
        postContent: fullPostContent.get(post.id) || post.selftext || "",
        postAuthor: post.author,
        postCreatedAt: new Date(post.created_utc * 1000).toISOString(),
        subreddit: post.subreddit,
        businessContext: organization.businessDescription || organization.website || "We help businesses grow",
        targetAudience: "Reddit users",
        valueProposition: organization.businessDescription || "our solution"
      })

      if (result.isSuccess) {
        updateState({ dmContent: result.data.message })
        toast.success("DM generated successfully")
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Generate DM error:", error)
      toast.error("Failed to generate DM")
    } finally {
      updateState({ isGeneratingDM: false })
    }
  }

  // Send DM
  const handleSendDM = async () => {
    if (!state.selectedPost || !state.dmContent.trim()) return

    updateState({ isSendingDM: true })

    try {
      // Create DM history record first
      const historyResult = await createDMHistoryAction({
        organizationId,
        userId,
        dmId: `dm_${Date.now()}`,
        postId: state.selectedPost.id,
        postAuthor: state.selectedPost.author,
        messageContent: state.dmContent,
        sentAt: Timestamp.now()
      })

      if (!historyResult.isSuccess) {
        throw new Error(historyResult.message)
      }

      // Send the actual DM
      const sendResult = await sendRedditDMAction({
        organizationId,
        recipientUsername: state.selectedPost.author,
        subject: `Re: ${state.selectedPost.title.substring(0, 50)}...`,
        message: state.dmContent
      })

      if (sendResult.isSuccess) {
        toast.success("DM sent successfully!")
        
        // Update shared thread to mark it as having a DM
        console.log("🧵 [DM-FINDER] Marking thread as having a DM...")
        await updateThreadInteractionAction(state.selectedPost.id, {
          hasDM: true,
          dmHistoryId: historyResult.data.id
        })
        
        // Record the interaction
        await recordThreadInteractionAction({
          organizationId,
          threadId: state.selectedPost.id,
          userId,
          type: "dm",
          details: {
            dmHistoryId: historyResult.data.id,
            status: "sent"
          }
        })
        
        updateState({ 
          selectedPost: null, 
          dmContent: "",
          searchResults: state.searchResults.filter(p => p.id !== state.selectedPost!.id)
        })
        loadDMHistory()
        loadSharedThreads() // Reload to show updated status
      } else {
        toast.error(sendResult.message)
      }
    } catch (error) {
      console.error("Send DM error:", error)
      toast.error("Failed to send DM")
    } finally {
      updateState({ isSendingDM: false })
    }
  }

  // Copy DM content
  const handleCopyDM = () => {
    navigator.clipboard.writeText(state.dmContent)
    toast.success("DM copied to clipboard")
  }

  // Filtered and sorted results
  const filteredResults = useMemo(() => {
    let filtered = [...state.searchResults]

    // Apply search filter
    filtered = filtered.filter(post => matchesSearchQuery(post, state.searchPostsQuery))

    // Sort
    if (state.sortBy === "upvotes") {
      filtered.sort((a, b) => b.score - a.score)
    }

    return filtered
  }, [state.searchResults, state.searchPostsQuery, state.sortBy])

  // Filtered history
  const filteredHistory = useMemo(() => {
    let filtered = [...state.dmHistory]

    // Apply date filter
    filtered = filtered.filter(dm => filterByDate(dm, state.dateFilter))

    // Apply search filter
    filtered = filtered.filter(dm => matchesSearchQuery(dm, state.searchPostsQuery))

    return filtered
  }, [state.dmHistory, state.dateFilter, state.searchPostsQuery])

  // Paginated results
  const paginatedResults = useMemo(() => {
    const startIndex = (state.currentPage - 1) * ITEMS_PER_PAGE
    return filteredResults.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredResults, state.currentPage])

  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE)

  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Reddit Posts for DMs</CardTitle>
          <CardDescription>
            View posts from Lead Finder to send personalized DMs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={loadSharedThreads} 
              disabled={state.isSearching}
              className="gap-2"
            >
              {state.isSearching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Load Posts from Lead Finder
            </Button>
            
            <div className="ml-auto text-sm text-gray-500">
              {state.searchResults.length > 0 && (
                <span>Showing posts with 50%+ relevance score</span>
              )}
            </div>
          </div>

          {/* Advanced Search (Optional) */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Search className="size-4" />
                Advanced Search
                <ChevronDown className="size-3" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search keywords (e.g., 'looking for software developers')"
                    value={state.searchQuery}
                    onChange={e => updateState({ searchQuery: e.target.value })}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <Input
                  placeholder="Subreddit (optional)"
                  value={state.subreddit}
                  onChange={e => updateState({ subreddit: e.target.value })}
                  className="w-48"
                />
                <Select
                  value={state.timeFilter}
                  onValueChange={(value: any) => updateState({ timeFilter: value })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Past Day</SelectItem>
                    <SelectItem value="week">Past Week</SelectItem>
                    <SelectItem value="month">Past Month</SelectItem>
                    <SelectItem value="year">Past Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleSearch} 
                  disabled={state.isSearching}
                  className="gap-2"
                >
                  {state.isSearching ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  Search
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Filters */}
          {state.searchResults.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-gray-500" />
                <Input
                  placeholder="Filter results..."
                  value={state.searchPostsQuery}
                  onChange={e => updateState({ searchPostsQuery: e.target.value })}
                  className="w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="size-4 text-gray-500" />
                <Select
                  value={state.sortBy}
                  onValueChange={(value: any) => updateState({ sortBy: value })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="upvotes">Most Upvotes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="ml-auto text-sm text-gray-500">
                Showing {filteredResults.length} of {state.searchResults.length} posts
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {state.isSearching ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="mb-2 h-6 w-3/4" />
                <Skeleton className="mb-4 h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredResults.length > 0 ? (
        <div className="space-y-4">
          {paginatedResults.map(post => (
            <Card key={post.id} className="overflow-hidden">
              <CardContent className="space-y-4 p-6">
                {/* Post Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="gap-1">
                      <ThumbsUp className="size-3" />
                      {post.score}
                    </Badge>
                    <Badge variant="outline">r/{post.subreddit}</Badge>
                    {post.relevanceScore !== undefined && (
                      <Badge 
                        variant={post.relevanceScore >= 70 ? "default" : post.relevanceScore >= 50 ? "secondary" : "outline"}
                        className="gap-1"
                      >
                        {post.relevanceScore}% match
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {post.hasComment && (
                      <Badge variant="secondary" className="gap-1">
                        <MessageSquare className="size-3" />
                        Comment posted
                      </Badge>
                    )}
                    {post.hasDM && (
                      <Badge variant="secondary" className="gap-1">
                        <Send className="size-3" />
                        DM sent
                      </Badge>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="size-4" />
                      <span>{post.timeAgo}</span>
                    </div>
                  </div>
                </div>

                {/* Post Title */}
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group cursor-pointer"
                >
                  <h3 className="line-clamp-2 text-lg font-semibold text-gray-900 transition-colors group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
                    {post.title}
                  </h3>
                </a>

                {/* Post Author */}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <User className="size-4" />
                  <span>u/{post.author}</span>
                  <span>•</span>
                  <span>{post.num_comments} comments</span>
                </div>

                {/* Post Body */}
                {post.selftext && (
                  <Collapsible
                    open={expandedPosts.has(post.id)}
                    onOpenChange={() => {
                      togglePostExpansion(post.id)
                      if (!fullPostContent.has(post.id)) {
                        fetchFullPostContent(post)
                      }
                    }}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1 px-2 py-1 text-xs"
                      >
                        {expandedPosts.has(post.id) ? (
                          <ChevronDown className="size-3" />
                        ) : (
                          <ChevronRight className="size-3" />
                        )}
                        View post content
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
                        {loadingPostContent.has(post.id) ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="size-5 animate-spin text-gray-400" />
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">
                            {fullPostContent.get(post.id) || post.selftext}
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* DM Section */}
                {state.selectedPost?.id === post.id ? (
                  <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Generated DM</p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyDM}
                          className="h-7 px-2 text-xs"
                        >
                          <Copy className="size-3" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={state.dmContent}
                      onChange={e => updateState({ dmContent: e.target.value })}
                      className="min-h-[120px]"
                      placeholder="Generating DM..."
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateState({ selectedPost: null, dmContent: "" })}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSendDM}
                        disabled={state.isSendingDM || !state.dmContent.trim()}
                        className="gap-2"
                      >
                        {state.isSendingDM ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="size-4" />
                            Send DM
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(post.url, "_blank")}
                      className="flex-1"
                    >
                      <ExternalLink className="mr-2 size-4" />
                      View on Reddit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleGenerateDM(post)}
                      disabled={state.isGeneratingDM}
                      className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {state.isGeneratingDM && state.selectedPost?.id === post.id ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="mr-2 size-4" />
                          Generate DM
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

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
              <span className="text-sm text-gray-600">
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
      ) : state.searchResults.length === 0 && !state.isSearching ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="mb-4 size-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold">No posts found</h3>
            <p className="text-sm text-gray-600">
              Try adjusting your search query or filters
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* DM History */}
      {state.dmHistory.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">DM History</h2>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-gray-500" />
              <Select
                value={state.dateFilter}
                onValueChange={(value: any) => updateState({ dateFilter: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Past Week</SelectItem>
                  <SelectItem value="month">Past Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredHistory.map(dm => (
            <Card key={dm.id} className="overflow-hidden">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{dm.postTitle}</h4>
                    <p className="text-sm text-gray-600">
                      to u/{dm.postAuthor} • {dm.timeAgo}
                    </p>
                  </div>
                  <Badge
                    variant={dm.status === "sent" ? "default" : dm.status === "failed" ? "destructive" : "secondary"}
                  >
                    {dm.status === "sent" && <CheckCircle2 className="mr-1 size-3" />}
                    {dm.status === "failed" && <AlertCircle className="mr-1 size-3" />}
                    {dm.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {dm.dmContent}
                </p>
                {dm.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertDescription>{dm.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 