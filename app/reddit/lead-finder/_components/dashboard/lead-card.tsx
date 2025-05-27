"use client"

import React, { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  ExternalLink,
  Edit2,
  Save,
  Send,
  Clock,
  Eye,
  MessageSquare,
  User,
  ThumbsUp,
  TrendingUp,
  Sparkles,
  Copy,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  CirclePlus,
  Loader2,
  Calendar
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import PostDetailPopup from "@/app/reddit/lead-finder/_components/post-detail-popup"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { fetchRedditThreadAction } from "@/actions/integrations/reddit/reddit-actions"

interface LeadCardProps {
  lead: any
  selectedLength: "micro" | "medium" | "verbose"
  onEdit: (leadId: string, newComment: string) => Promise<void>
  onPost: (lead: any) => Promise<void>
  onQueue: (lead: any) => Promise<void>
  onViewComments?: (lead: any) => void
  onRegenerateWithInstructions?: (
    leadId: string,
    instructions: string
  ) => Promise<void>
  isPosting?: boolean
  isQueueing?: boolean
}

// Add date formatting helper
const formatPostDate = (dateString?: string): string => {
  if (!dateString) return "Date unknown"

  const date = new Date(dateString)
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

export default function LeadCard({
  lead,
  selectedLength,
  onEdit,
  onPost,
  onQueue,
  onViewComments,
  onRegenerateWithInstructions,
  isPosting = false,
  isQueueing = false
}: LeadCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedComment, setEditedComment] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const [showPostDetail, setShowPostDetail] = useState(false)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [regenerateInstructions, setRegenerateInstructions] = useState("")
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isPostBodyOpen, setIsPostBodyOpen] = useState(false)

  // New state for full content in LeadCard
  const [fullCardContent, setFullCardContent] = useState<string>("")
  const [isCardLoading, setIsCardLoading] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)

  const comment = lead[`${selectedLength}Comment`] || lead.mediumComment || ""

  useEffect(() => {
    const fetchFullContentForCard = async () => {
      if (isPostBodyOpen && !fullCardContent && lead.postUrl) {
        setIsCardLoading(true)
        setCardError(null)
        try {
          const urlMatch = lead.postUrl.match(/\/comments\/([a-zA-Z0-9]+)/)
          const postThreadId = lead.threadId || (urlMatch ? urlMatch[1] : null)

          if (!postThreadId) {
            console.warn(`[LeadCard] No threadId available for fetching full content. Lead ID: ${lead.id}`)
            setFullCardContent(lead.postContentSnippet || "Full content not available (no thread ID).")
            setIsCardLoading(false)
            return
          }

          if (!lead.organizationId) {
            console.error(`[LeadCard] organizationId is missing on lead object. Lead ID: ${lead.id}`)
            setCardError("Configuration error: Organization ID missing for this lead.")
            setFullCardContent(lead.postContentSnippet || "Full content not available due to configuration error.")
            setIsCardLoading(false)
            return
          }
          
          console.log(`🔍 [LeadCard] Fetching full content for org: ${lead.organizationId}, thread: ${postThreadId}, sub: ${lead.subreddit}`)
          const result = await fetchRedditThreadAction(
            lead.organizationId,
            postThreadId,
            lead.subreddit
          )

          if (result.isSuccess) {
            setFullCardContent(result.data.content || result.data.title || "Content not found in fetched data.")
          } else {
            setCardError(result.message || "Failed to load full post content from action.")
            console.error(`[LeadCard] Error fetching full content via action: ${result.message}. Lead ID: ${lead.id}, Thread ID: ${postThreadId}`)
            setFullCardContent(lead.postContentSnippet || "Snippet (full content fetch failed).")
          }
        } catch (err: any) {
          console.error("[LeadCard] Exception fetching full content for card:", err)
          setCardError(`Client-side error: ${err.message || "Unknown error"}`)
          setFullCardContent(lead.postContentSnippet || "Snippet (full content fetch failed due to client exception).")
        } finally {
          setIsCardLoading(false)
        }
      }
    }

    fetchFullContentForCard()
  }, [isPostBodyOpen, fullCardContent, lead.postUrl, lead.postContentSnippet, lead.threadId, lead.subreddit, lead.organizationId, lead.id])

  const handleStartEdit = () => {
    setEditedComment(comment)
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    await onEdit(lead.id, editedComment)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedComment("")
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(comment)
    setIsCopied(true)
    toast.success("Comment copied to clipboard")
    setTimeout(() => setIsCopied(false), 2000)
  }

  const getMatchBadgeColor = (score: number) => {
    if (score >= 80)
      return "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800"
    if (score >= 60)
      return "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800"
    return "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950 dark:border-gray-800"
  }

  // Handle post button - adds to queue or posts immediately
  const handlePostClick = async () => {
    // This will now always add to queue - the parent component will handle immediate posting if queue is empty
    await onQueue(lead)
  }

  const handleRegenerate = async () => {
    if (!regenerateInstructions.trim() || !onRegenerateWithInstructions) {
      toast.error("Please provide instructions for regeneration")
      return
    }

    setIsRegenerating(true)
    try {
      await onRegenerateWithInstructions(lead.id, regenerateInstructions)
      setShowRegenerateDialog(false)
      setRegenerateInstructions("")
      toast.success("Comment regenerated successfully")
    } catch (error) {
      toast.error("Failed to regenerate comment")
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden transition-all duration-300",
          lead.status === "posted" && "opacity-75"
        )}
      >
        <CardContent className="space-y-4 p-6">
          {/* Header with Match Score */}
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className={cn(
                  "px-3 py-1 text-sm font-semibold",
                  getMatchBadgeColor(lead.relevanceScore)
                )}
              >
                {lead.relevanceScore}% Match
              </Badge>
              {lead.status === "posted" && (
                <Badge variant="default" className="bg-green-600 text-white">
                  Posted
                </Badge>
              )}
            </div>
            {/* Post Date */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="size-4" />
              <span>{formatPostDate(lead.postCreatedAt)}</span>
            </div>
          </div>

          {/* Post Title */}
          <a
            href={lead.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group cursor-pointer"
          >
            <h3 className="line-clamp-2 text-lg font-semibold text-gray-900 transition-colors group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
              {lead.postTitle}
            </h3>
          </a>

          {/* Post Body Dropdown */}
          {lead.postContentSnippet && (
            <Collapsible
              open={isPostBodyOpen}
              onOpenChange={setIsPostBodyOpen}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  {isPostBodyOpen ? (
                    <ChevronDown className="size-3" />
                  ) : (
                    <ChevronRight className="size-3" />
                  )}
                  View post content
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
                  {isCardLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="size-5 animate-spin text-gray-400" />
                    </div>
                  ) : cardError ? (
                    <div className="text-red-600 dark:text-red-400">
                      <p>Error loading full content: {cardError}</p>
                      <p className="mt-2 whitespace-pre-wrap">
                        Showing snippet: {lead.postContentSnippet}
                      </p>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">
                      {fullCardContent || lead.postContentSnippet}
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* AI Generated Comment Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                AI Generated Comment
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 px-2 text-xs"
                >
                  {isCopied ? (
                    <Check className="size-3" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </Button>
                {!isEditing && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartEdit}
                      className="h-7 px-2 text-xs"
                    >
                      <Edit2 className="size-3" />
                    </Button>
                    <Dialog
                      open={showRegenerateDialog}
                      onOpenChange={setShowRegenerateDialog}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                        >
                          <Sparkles className="size-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="size-4 text-blue-500" />
                            Regenerate with AI
                          </DialogTitle>
                          <DialogDescription>
                            Describe how you'd like this comment to be changed.
                            Be specific about tone, focus, or style adjustments.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Textarea
                              placeholder="e.g., Focus more on our seclusion and make it less salesy..."
                              value={regenerateInstructions}
                              onChange={e =>
                                setRegenerateInstructions(e.target.value)
                              }
                              className="min-h-[100px]"
                            />
                            <p className="text-xs text-gray-500">
                              The AI will use your instructions along with the
                              original comment and website context.
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowRegenerateDialog(false)
                              setRegenerateInstructions("")
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleRegenerate}
                            disabled={
                              isRegenerating || !regenerateInstructions.trim()
                            }
                            className="gap-2"
                          >
                            {isRegenerating ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Regenerating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="size-4" />
                                Regenerate
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            </div>

            {/* Comment Display/Edit Area - Now clickable when not editing */}
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedComment}
                  onChange={e => setEditedComment(e.target.value)}
                  className="min-h-[100px] resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    <X className="mr-1 size-3" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Save className="mr-1 size-3" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="cursor-text rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:bg-gray-900/50 dark:hover:bg-gray-900/70"
                onClick={handleStartEdit}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {comment}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPostDetail(true)}
              className="flex-1"
            >
              <Eye className="mr-2 size-4" />
              View Context
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(lead.postUrl, "_blank")}
              className="flex-1"
            >
              <ExternalLink className="mr-2 size-4" />
              View on Reddit
            </Button>
            {lead.status === "posted" && lead.postedCommentUrl ? (
              <Button
                size="sm"
                onClick={() => window.open(lead.postedCommentUrl, "_blank")}
                className="flex-1 bg-green-600 text-white hover:bg-green-700"
              >
                <MessageSquare className="mr-2 size-4" />
                View Comment
              </Button>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={handlePostClick}
                      disabled={isPosting || isQueueing}
                      className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {isPosting || isQueueing ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          {isPosting ? "Posting..." : "Adding..."}
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 size-4" />
                          Post
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Post to Reddit or add to queue</p>
                    <p className="text-xs text-gray-400">
                      Some subreddits have posting restrictions
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Post Detail Popup */}
      {showPostDetail && (
        <PostDetailPopup
          open={showPostDetail}
          onOpenChange={setShowPostDetail}
          lead={lead}
        />
      )}
    </>
  )
}
