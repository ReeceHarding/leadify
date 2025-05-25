"use client"

import React, { useState, useEffect } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ThumbsUp, 
  ThumbsDown,
  MessageSquare,
  Share,
  Award,
  MoreHorizontal,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RedditComment {
  id: string
  author: string
  body: string
  score: number
  created: string
  isOP?: boolean
  isGenerated?: boolean
  replies?: RedditComment[]
  depth?: number
  awards?: number
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
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchComments()
  }, [postId])

  const fetchComments = async () => {
    setLoading(true)
    
    // Simulate fetching comments - in production this would call Reddit API
    setTimeout(() => {
      const mockComments: RedditComment[] = [
        {
          id: "c1",
          author: "reddit_veteran",
          body: "Great question! I've been researching this myself lately. There are definitely some hidden gems in the DR that most tourists don't know about.",
          score: 127,
          created: "4 hours ago",
          awards: 2,
          replies: [
            {
              id: "c1-1",
              author: "travel_enthusiast",
              body: "Could you share some of those hidden gems? I'm planning a trip next month!",
              score: 45,
              created: "3 hours ago",
              depth: 1
            },
            {
              id: "c1-2",
              author: "DR_local",
              body: "As someone who lives here, I can confirm there are amazing spots off the beaten path. The north coast has some incredible beaches.",
              score: 89,
              created: "2 hours ago",
              depth: 1,
              awards: 1
            }
          ]
        },
        {
          id: "generated",
          author: generatedCommentAuthor,
          body: generatedComment,
          score: 1,
          created: "Just now",
          isGenerated: true
        },
        {
          id: "c2",
          author: "beach_lover_23",
          body: "I stayed at an all-inclusive last year but felt like I missed out on the authentic experience. Next time I want to explore more local spots.",
          score: 64,
          created: "6 hours ago",
          replies: [
            {
              id: "c2-1",
              author: "adventure_seeker",
              body: "Same here! The resort was nice but I barely left. What areas would you recommend exploring?",
              score: 23,
              created: "5 hours ago",
              depth: 1
            }
          ]
        },
        {
          id: "c3",
          author: "budget_traveler",
          body: "For anyone on a budget, there are some fantastic local guesthouses that give you a much more authentic experience than the big resorts.",
          score: 156,
          created: "8 hours ago",
          awards: 3
        }
      ]
      
      setComments(mockComments)
      setLoading(false)
    }, 1500)
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
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-xs text-white">
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
                {comment.isOP && (
                  <Badge variant="outline" className="border-blue-300 bg-blue-100 text-xs text-blue-700">
                    OP
                  </Badge>
                )}
                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-muted-foreground text-xs">{comment.created}</span>
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