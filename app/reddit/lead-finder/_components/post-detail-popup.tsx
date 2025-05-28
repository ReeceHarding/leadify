"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import {
  ThumbsUp,
  Clock,
  MessageSquare,
  User,
  Hash,
  Loader2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Award,
  Sparkles
} from "lucide-react"
import { fetchRedditThreadAction } from "@/actions/integrations/reddit/reddit-actions"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useOrganization } from "@/components/utilities/organization-provider"

interface PostDetailPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: {
    postTitle: string
    postAuthor: string
    postContentSnippet: string
    postContent?: string
    subreddit: string
    relevanceScore: number
    timeAgo: string
    postScore?: number
    keyword?: string
    postUrl: string
    microComment?: string
    mediumComment?: string
    verboseComment?: string
    selectedLength?: "micro" | "medium" | "verbose"
    reasoning?: string
    originalData?: {
      postContentSnippet: string
      postContent?: string
      threadId?: string
    }
  }
}

interface RedditComment {
  id: string
  author: string
  body: string
  score: number
  created: string
  isOP?: boolean
  replies?: RedditComment[]
  depth?: number
}

export default function PostDetailPopup({
  open,
  onOpenChange,
  lead
}: PostDetailPopupProps) {
  const [fullContent, setFullContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<RedditComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false)
  const { currentOrganization } = useOrganization()

  useEffect(() => {
    if (open && lead.postUrl) {
      fetchFullContent()
    }
  }, [open, lead.postUrl])

  const fetchFullContent = async () => {
    // Check if we already have full content stored
    if (lead.postContent || lead.originalData?.postContent) {
      console.log(`📄 Using stored full content for post`)
      setFullContent(lead.postContent || lead.originalData?.postContent || lead.postContentSnippet)
      setIsLoading(false)
      return
    }

    // Check if we have organization context
    if (!currentOrganization) {
      console.error("❌ No organization context available")
      setError("Organization context not available")
      setFullContent(lead.postContentSnippet)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const urlMatch = lead.postUrl.match(/\/comments\/([a-zA-Z0-9]+)/)
      const threadId = urlMatch ? urlMatch[1] : lead.originalData?.threadId

      if (!threadId) {
        setFullContent(lead.postContentSnippet)
        return
      }

      console.log(`🔍 Fetching full content for thread: ${threadId} in org: ${currentOrganization.id}`)

      const result = await fetchRedditThreadAction(
        currentOrganization.id,
        threadId,
        lead.subreddit
      )

      if (result.isSuccess) {
        setFullContent(result.data.content || result.data.title)
      } else {
        setError(result.message)
        setFullContent(lead.postContentSnippet)
      }
    } catch (err) {
      console.error("Error fetching full content:", err)
      setError("Failed to load full content")
      setFullContent(lead.postContentSnippet)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchComments = async () => {
    setLoadingComments(true)

    // Simulate fetching comments - in production this would call a real API
    setTimeout(() => {
      const mockComments: RedditComment[] = [
        {
          id: "1",
          author: "RedditUser123",
          body: "Great question! I've been wondering about this too.",
          score: 42,
          created: "2 hours ago",
          replies: [
            {
              id: "2",
              author: "AnotherUser",
              body: "Same here, following for recommendations.",
              score: 15,
              created: "1 hour ago",
              depth: 1
            }
          ]
        },
        {
          id: "generated",
          author: "YourUsername",
          body: getGeneratedComment(),
          score: 0,
          created: "Just now",
          isOP: false
        },
        {
          id: "3",
          author: "ExperiencedUser",
          body: "I've tried several options in the area. Here's my take...",
          score: 28,
          created: "3 hours ago"
        }
      ]

      setComments(mockComments)
      setLoadingComments(false)
    }, 1000)
  }

  const getGeneratedComment = () => {
    const length = lead.selectedLength || "medium"
    switch (length) {
      case "micro":
        return lead.microComment || ""
      case "verbose":
        return lead.verboseComment || ""
      default:
        return lead.mediumComment || ""
    }
  }

  const handleShowComments = () => {
    setShowComments(true)
    if (comments.length === 0) {
      fetchComments()
    }
  }

  const renderComment = (comment: RedditComment, isGenerated = false) => (
    <div
      key={comment.id}
      className={cn(
        "relative border-l-2 pl-4",
        isGenerated
          ? "rounded-r-lg border-blue-500 bg-blue-50/50 py-3 pr-4 dark:bg-blue-950/20"
          : "border-gray-200 dark:border-gray-700",
        comment.depth && `ml-${comment.depth * 6}`
      )}
    >
      {isGenerated && (
        <div className="absolute -left-[9px] top-4 flex size-4 items-center justify-center rounded-full bg-blue-500">
          <div className="size-2 rounded-full bg-white" />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Avatar className="size-6">
            <AvatarFallback className="text-xs">
              {comment.author.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "font-medium",
              isGenerated && "text-blue-600 dark:text-blue-400"
            )}
          >
            u/{comment.author}
          </span>
          {isGenerated && (
            <Badge
              variant="outline"
              className="border-blue-300 bg-blue-100 text-xs text-blue-700"
            >
              Your Comment
            </Badge>
          )}
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{comment.created}</span>
        </div>

        <p className="whitespace-pre-wrap text-sm">{comment.body}</p>

        <div className="text-muted-foreground flex items-center gap-4 text-xs">
          <button className="flex items-center gap-1 hover:text-orange-500">
            <ThumbsUp className="size-3" />
            {comment.score}
          </button>
          <button className="hover:text-foreground">Reply</button>
          <button className="hover:text-foreground">Share</button>
          {isGenerated && (
            <Badge variant="outline" className="text-xs">
              Preview
            </Badge>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.replies.map(reply => renderComment(reply))}
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle className="pr-8 text-xl font-bold">
            {lead.postTitle}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <User className="size-3" />
                u/{lead.postAuthor}
              </span>
              <span className="flex items-center gap-1">
                r/{lead.subreddit}
              </span>
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
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Hash className="mr-1 size-3" />
                  {lead.keyword}
                </Badge>
              )}
              <Badge
                variant={lead.relevanceScore >= 70 ? "default" : "secondary"}
                className="text-xs"
              >
                {lead.relevanceScore}% Match
              </Badge>
            </div>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="mt-4 max-h-[60vh]">
          <div className="space-y-4">
            {!showComments ? (
              <>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Post Content</h3>
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : error ? (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {error}
                      <div className="mt-2 text-gray-700 dark:text-gray-300">
                        <p className="whitespace-pre-wrap">
                          {lead.postContentSnippet}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                        {fullContent || lead.postContentSnippet}
                      </p>
                    </div>
                  )}
                </div>

                {/* AI Analysis Section */}
                <Collapsible
                  open={isAnalysisOpen}
                  onOpenChange={setIsAnalysisOpen}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-9 w-full justify-between rounded-md bg-gray-50/50 px-3 text-xs text-gray-600 hover:bg-gray-100/50 hover:text-gray-900 dark:bg-gray-900/30 dark:text-gray-400 dark:hover:bg-gray-900/50 dark:hover:text-gray-100"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="size-3" />
                        AI Analysis
                      </span>
                      {isAnalysisOpen ? (
                        <ChevronDown className="size-3" />
                      ) : (
                        <ChevronRight className="size-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-900/50 dark:text-gray-400">
                      {lead.reasoning ||
                        "AI analysis for why this is a good match for your business."}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Separator />

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handleShowComments}
                    className="gap-2"
                  >
                    <MessageSquare className="size-4" />
                    View Comments with Your Response
                    <ChevronRight className="size-4" />
                  </Button>

                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={lead.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gap-2"
                    >
                      <ExternalLink className="size-4" />
                      Open in Reddit
                    </a>
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <MessageSquare className="size-4" />
                    Comments Preview
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowComments(false)}
                  >
                    Back to Post
                  </Button>
                </div>

                <div className="rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950/30">
                  <p className="text-blue-700 dark:text-blue-300">
                    Preview showing how your comment will appear in the thread
                  </p>
                </div>

                {loadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="text-muted-foreground size-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map(comment =>
                      renderComment(comment, comment.id === "generated")
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
