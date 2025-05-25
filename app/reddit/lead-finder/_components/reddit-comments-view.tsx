"use client"

import React, { useState, useEffect } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ThumbsUp, 
  ThumbsDown,
  MessageSquare,
  Share,
  Award,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface RedditComment {
  id: string
  author: string
  body: string
  score: number
  created_utc: number
  is_submitter?: boolean
  replies?: RedditComment[]
  depth?: number
  awards?: number
  distinguished?: string
  stickied?: boolean
  isGenerated?: boolean
}

interface RedditCommentsViewProps {
  postId: string
  subreddit: string
  generatedComment: string
  generatedCommentAuthor?: string
  onClose?: () => void
}

export default function RedditCommentsView({
  postId,
  subreddit,
  generatedComment,
  generatedCommentAuthor = "YourUsername",
  onClose
}: RedditCommentsViewProps) {
  const [comments, setComments] = useState<RedditComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requiresAuth, setRequiresAuth] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    fetchComments()
  }, [postId, subreddit])

  const fetchComments = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log(`🔍 [REDDIT-COMMENTS-VIEW] Fetching comments for ${postId} in r/${subreddit}`)
      
      const response = await fetch(
        `/api/reddit/comments?threadId=${postId}&subreddit=${subreddit}&sort=best&limit=100`
      )

      if (!response.ok) {
        const errorData = await response.json()
        
        if (response.status === 403 && errorData.requiresAuth) {
          console.log("🔐 [REDDIT-COMMENTS-VIEW] Reddit authentication required")
          setRequiresAuth(true)
          setError("Reddit authentication required to view comments")
          return
        }
        
        if (response.status === 429) {
          setError("Reddit API rate limit exceeded. Please try again in a few minutes.")
          return
        }
        
        throw new Error(errorData.error || "Failed to fetch comments")
      }

      const data = await response.json()
      console.log(`✅ [REDDIT-COMMENTS-VIEW] Fetched ${data.comments.length} comments`)

      // Transform Reddit API comments to our format and insert generated comment
      const transformedComments = transformComments(data.comments)
      
      // Insert the generated comment at a strategic position (after first 2 comments)
      const generatedCommentObj: RedditComment = {
        id: "generated",
        author: generatedCommentAuthor,
        body: generatedComment,
        score: 1,
        created_utc: Date.now() / 1000,
        isGenerated: true
      }

      // Find a good position for the generated comment
      const insertPosition = Math.min(2, transformedComments.length)
      transformedComments.splice(insertPosition, 0, generatedCommentObj)

      setComments(transformedComments)
    } catch (err) {
      console.error("❌ [REDDIT-COMMENTS-VIEW] Error fetching comments:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch comments")
    } finally {
      setLoading(false)
    }
  }

  const transformComments = (redditComments: any[]): RedditComment[] => {
    return redditComments.map(comment => ({
      ...comment,
      // Convert any nested replies
      replies: comment.replies ? transformComments(comment.replies) : []
    }))
  }

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now() / 1000
    const diff = now - timestamp
    
    if (diff < 60) return "Just now"
    if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) > 1 ? 's' : ''} ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`
    if (diff < 2592000) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`
    if (diff < 31536000) return `${Math.floor(diff / 2592000)} month${Math.floor(diff / 2592000) > 1 ? 's' : ''} ago`
    return `${Math.floor(diff / 31536000)} year${Math.floor(diff / 31536000) > 1 ? 's' : ''} ago`
  }

  const toggleCommentExpansion = (commentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  const handleRedditAuth = () => {
    router.push("/reddit-auth")
  }

  const renderComment = (comment: RedditComment, isNested = false) => {
    const isExpanded = expandedComments.has(comment.id)
    const hasReplies = comment.replies && comment.replies.length > 0

    return (
      <div
        key={comment.id}
        className={cn(
          "relative",
          isNested && "ml-4 border-l-2 border-gray-200 pl-4 dark:border-gray-700",
          comment.isGenerated && "rounded-lg bg-blue-50/50 ring-2 ring-blue-500 ring-offset-2 dark:bg-blue-950/20"
        )}
      >
        {comment.isGenerated && (
          <div className="absolute -right-2 -top-2 z-10">
            <Badge className="bg-blue-500 px-2 py-0.5 text-xs text-white">
              Your Comment (Preview)
            </Badge>
          </div>
        )}

        <div className={cn("py-3", comment.isGenerated && "px-4")}>
          <div className="flex items-start gap-3">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className={cn(
                "text-xs text-white",
                comment.isGenerated 
                  ? "bg-gradient-to-br from-blue-500 to-purple-600"
                  : "bg-gradient-to-br from-orange-500 to-red-600"
              )}>
                {comment.author.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn(
                  "text-sm font-medium",
                  comment.isGenerated && "text-blue-600 dark:text-blue-400"
                )}>
                  u/{comment.author}
                </span>
                {comment.is_submitter && (
                  <Badge variant="outline" className="border-blue-300 bg-blue-100 text-xs text-blue-700">
                    OP
                  </Badge>
                )}
                {comment.distinguished === "moderator" && (
                  <Badge variant="outline" className="border-green-300 bg-green-100 text-xs text-green-700">
                    MOD
                  </Badge>
                )}
                {comment.stickied && (
                  <Badge variant="outline" className="border-purple-300 bg-purple-100 text-xs text-purple-700">
                    PINNED
                  </Badge>
                )}
                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-muted-foreground text-xs">
                  {formatTimestamp(comment.created_utc)}
                </span>
                {comment.awards && comment.awards > 0 && (
                  <>
                    <span className="text-muted-foreground text-xs">•</span>
                    <div className="flex items-center gap-1">
                      <Award className="size-3 text-yellow-500" />
                      <span className="text-xs text-yellow-600">{comment.awards}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {comment.body}
              </div>

              <div className="mt-3 flex items-center gap-4">
                <button className="text-muted-foreground group flex items-center gap-1.5 text-xs transition-colors hover:text-orange-500">
                  <ThumbsUp className="size-3.5" />
                  <span className="font-medium">{comment.score}</span>
                </button>
                <button className="text-muted-foreground flex items-center gap-1.5 text-xs transition-colors hover:text-blue-500">
                  <ThumbsDown className="size-3.5" />
                </button>
                <button className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors">
                  <MessageSquare className="size-3.5" />
                  <span>Reply</span>
                </button>
                <button className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors">
                  <Share className="size-3.5" />
                  <span>Share</span>
                </button>
                <button className="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1.5 text-xs transition-colors">
                  <MoreHorizontal className="size-3.5" />
                </button>
              </div>

              {hasReplies && (
                <button
                  onClick={() => toggleCommentExpansion(comment.id)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {isExpanded ? "Hide" : "Show"} {comment.replies!.length} {comment.replies!.length === 1 ? "reply" : "replies"}
                </button>
              )}
            </div>
          </div>

          {hasReplies && isExpanded && (
            <div className="mt-4 space-y-2">
              {comment.replies!.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full max-w-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant={requiresAuth ? "default" : "destructive"}>
          <AlertCircle className="size-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex gap-2">
          {requiresAuth && (
            <Button onClick={handleRedditAuth} variant="default" size="sm">
              Authenticate with Reddit
            </Button>
          )}
          <Button onClick={fetchComments} variant="outline" size="sm">
            <RefreshCw className="mr-2 size-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[600px] w-full">
      <div className="p-4">
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Preview Mode:</strong> This shows how your comment will appear in the Reddit thread. 
            The actual position may vary based on upvotes and timing.
          </p>
        </div>

        <div className="space-y-1 divide-y divide-gray-200 dark:divide-gray-700">
          {comments.map(comment => (
            <div key={comment.id} className="py-2">
              {renderComment(comment)}
            </div>
          ))}
        </div>

        {comments.length === 0 && (
          <div className="text-muted-foreground py-8 text-center">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
    </ScrollArea>
  )
} 