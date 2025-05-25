"use client"

import React, { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  MessageSquare,
  ExternalLink,
  Clock,
  ChevronDown,
  ChevronRight,
  Send,
  Edit2,
  Save,
  X,
  Sparkles,
  Loader2,
  ThumbsUp,
  User,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import { toast } from "sonner"
import { getGeneratedCommentsByUserAction } from "@/actions/db/lead-generation-actions"
import { generateReplyToCommentAction } from "@/actions/integrations/openai-actions"
import { postCommentToRedditAction } from "@/actions/integrations/reddit-posting-actions"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import type { SerializedGeneratedCommentDocument } from "@/actions/db/lead-generation-actions"

interface RedditComment {
  id: string
  author: string
  body: string
  score: number
  created_utc: number
  replies?: RedditComment[]
}

interface PostedComment extends SerializedGeneratedCommentDocument {
  redditReplies?: RedditComment[]
  isLoadingReplies?: boolean
  generatedReply?: string
  subreddit?: string
}

interface MyPostsDashboardProps {
  userId: string
}

export default function MyPostsDashboard({ userId }: MyPostsDashboardProps) {
  const [posts, setPosts] = useState<PostedComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())
  const [editingReply, setEditingReply] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [postingReply, setPostingReply] = useState<string | null>(null)
  const [generatingReply, setGeneratingReply] = useState<string | null>(null)

  // Fetch posted comments
  useEffect(() => {
    fetchPosts()
  }, [userId])

  const fetchPosts = async () => {
    try {
      setIsLoading(true)
      const result = await getGeneratedCommentsByUserAction(userId)

      if (result.isSuccess) {
        // Filter only posted comments with URLs and extract subreddit
        const postedComments = result.data
          .filter(
            comment => comment.status === "posted" && comment.postedCommentUrl
          )
          .map(comment => ({
            ...comment,
            subreddit: comment.postUrl?.match(/r\/([^/]+)/)?.[1] || "unknown"
          }))
        setPosts(postedComments)
      } else {
        toast.error("Failed to load your posts")
      }
    } catch (error) {
      console.error("Error fetching posts:", error)
      toast.error("Error loading posts")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRedditReplies = async (postId: string, commentUrl: string) => {
    // This would need a new API endpoint to fetch Reddit comments
    // For now, we'll simulate with mock data
    console.log("Fetching replies for:", commentUrl)

    // Mock implementation - you'll need to implement actual Reddit API call
    setPosts(prev =>
      prev.map(post =>
        post.id === postId
          ? {
              ...post,
              isLoadingReplies: true,
              redditReplies: [] // Will be populated from Reddit API
            }
          : post
      )
    )

    // Simulate API delay
    setTimeout(() => {
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                isLoadingReplies: false,
                redditReplies: [
                  {
                    id: "mock1",
                    author: "reddit_user",
                    body: "Thanks for the suggestion! This looks really helpful.",
                    score: 5,
                    created_utc: Date.now() / 1000 - 3600
                  }
                ]
              }
            : post
        )
      )
    }, 1000)
  }

  const generateAIReply = async (
    postId: string,
    originalComment: string,
    replyToComment: RedditComment
  ) => {
    setGeneratingReply(postId)

    try {
      // Get user's website info for context
      const profileResult = await getProfileByUserIdAction(userId)
      if (!profileResult.isSuccess) {
        throw new Error("Failed to get profile data")
      }

      const result = await generateReplyToCommentAction(
        originalComment,
        replyToComment.body,
        replyToComment.author,
        profileResult.data.website || "",
        "" // websiteContent is not available in profile, pass empty string
      )

      if (result.isSuccess) {
        setPosts(prev =>
          prev.map(post =>
            post.id === postId
              ? { ...post, generatedReply: result.data.reply }
              : post
          )
        )
        setReplyText(result.data.reply)
        setEditingReply(postId)
      } else {
        toast.error("Failed to generate reply")
      }
    } catch (error) {
      console.error("Error generating reply:", error)
      toast.error("Error generating AI reply")
    } finally {
      setGeneratingReply(null)
    }
  }

  const postReply = async (postId: string, parentId: string) => {
    if (!replyText.trim()) {
      toast.error("Reply cannot be empty")
      return
    }

    setPostingReply(postId)

    try {
      const result = await postCommentToRedditAction({
        parentId,
        text: replyText
      })

      if (result.isSuccess) {
        toast.success("Reply posted successfully!")
        setEditingReply(null)
        setReplyText("")
        // Refresh replies
        const post = posts.find(p => p.id === postId)
        if (post?.postedCommentUrl) {
          fetchRedditReplies(postId, post.postedCommentUrl)
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error posting reply:", error)
      toast.error("Failed to post reply")
    } finally {
      setPostingReply(null)
    }
  }

  const togglePost = (postId: string) => {
    const newExpanded = new Set(expandedPosts)
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId)
    } else {
      newExpanded.add(postId)
      // Fetch replies when expanding
      const post = posts.find(p => p.id === postId)
      if (post?.postedCommentUrl && !post.redditReplies) {
        fetchRedditReplies(postId, post.postedCommentUrl)
      }
    }
    setExpandedPosts(newExpanded)
  }

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <Alert>
        <MessageSquare className="size-4" />
        <AlertTitle>No Posts Yet</AlertTitle>
        <AlertDescription>
          You haven't posted any comments to Reddit yet. Head to the Lead Finder
          to start posting!
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Reddit Posts</h1>
        <p className="text-muted-foreground">
          View and manage all your posted Reddit comments in one place
        </p>
      </div>

      <div className="space-y-4">
        {posts.map(post => {
          const isExpanded = expandedPosts.has(post.id)
          const selectedComment =
            post[`${post.selectedLength || "medium"}Comment`]

          return (
            <Card key={post.id} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer"
                onClick={() => togglePost(post.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="text-muted-foreground size-4" />
                      ) : (
                        <ChevronRight className="text-muted-foreground size-4" />
                      )}
                      <CardTitle className="line-clamp-2 text-base">
                        {post.postTitle}
                      </CardTitle>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-4 text-sm">
                      <span>r/{post.subreddit || "unknown"}</span>
                      <span>•</span>
                      <span>
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <Badge variant="secondary" className="text-xs">
                        {post.relevanceScore}% Match
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={e => {
                        e.stopPropagation()
                        window.open(post.postedCommentUrl, "_blank")
                      }}
                    >
                      <ExternalLink className="mr-2 size-3" />
                      View on Reddit
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4 pt-0">
                  <Separator />

                  {/* Original Post Context */}
                  <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
                    <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
                      <User className="size-3" />
                      <span>u/{post.postAuthor}</span>
                    </div>
                    <p className="text-sm">{post.postContentSnippet}</p>
                  </div>

                  {/* Your Comment */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Your Comment</h4>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm">{selectedComment}</p>
                    </div>
                  </div>

                  {/* Reddit Replies */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Replies</h4>

                    {post.isLoadingReplies ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="size-4 animate-spin" />
                        <span className="text-muted-foreground ml-2 text-sm">
                          Loading replies...
                        </span>
                      </div>
                    ) : post.redditReplies && post.redditReplies.length > 0 ? (
                      <div className="space-y-3">
                        {post.redditReplies.map(reply => (
                          <div key={reply.id} className="rounded-lg border p-4">
                            <div className="mb-2 flex items-center justify-between">
                              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                <User className="size-3" />
                                <span>u/{reply.author}</span>
                                <span>•</span>
                                <span>{formatTimeAgo(reply.created_utc)}</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm">
                                <ArrowUp className="size-3" />
                                <span>{reply.score}</span>
                              </div>
                            </div>
                            <p className="mb-3 text-sm">{reply.body}</p>

                            {/* Reply Actions */}
                            <div className="flex items-center gap-2">
                              {editingReply === post.id ? (
                                <>
                                  <div className="flex-1 space-y-2">
                                    <Textarea
                                      value={replyText}
                                      onChange={e =>
                                        setReplyText(e.target.value)
                                      }
                                      placeholder="Type your reply..."
                                      className="min-h-[80px] text-sm"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingReply(null)
                                          setReplyText("")
                                        }}
                                      >
                                        <X className="mr-1 size-3" />
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          postReply(post.id, `t1_${reply.id}`)
                                        }
                                        disabled={postingReply === post.id}
                                      >
                                        {postingReply === post.id ? (
                                          <>
                                            <Loader2 className="mr-1 size-3 animate-spin" />
                                            Posting...
                                          </>
                                        ) : (
                                          <>
                                            <Send className="mr-1 size-3" />
                                            Post Reply
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      generateAIReply(
                                        post.id,
                                        selectedComment,
                                        reply
                                      )
                                    }
                                    disabled={generatingReply === post.id}
                                  >
                                    {generatingReply === post.id ? (
                                      <>
                                        <Loader2 className="mr-1 size-3 animate-spin" />
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="mr-1 size-3" />
                                        Generate AI Reply
                                      </>
                                    )}
                                  </Button>
                                  {post.generatedReply && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setReplyText(post.generatedReply || "")
                                        setEditingReply(post.id)
                                      }}
                                    >
                                      <Edit2 className="mr-1 size-3" />
                                      Edit & Send
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Show generated reply preview */}
                            {post.generatedReply &&
                              editingReply !== post.id && (
                                <div className="mt-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                    AI Generated Reply:
                                  </p>
                                  <p className="mt-1 text-sm">
                                    {post.generatedReply}
                                  </p>
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No replies yet. Check back later!
                      </p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
