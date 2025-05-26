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
import { getGeneratedCommentsByOrganizationIdAction } from "@/actions/db/lead-generation-actions"
import { getCampaignByIdAction } from "@/actions/db/campaign-actions"
import { generateReplyToCommentAction } from "@/actions/integrations/openai/openai-actions"
import { postCommentToRedditAction } from "@/actions/integrations/reddit/reddit-posting-actions"

import type { SerializedGeneratedCommentDocument } from "@/types"
import { fetchRedditCommentRepliesAction } from "@/actions/integrations/reddit/reddit-actions"
import { useOrganization } from "@/components/utilities/organization-provider"
import Link from "next/link"

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
  const { activeOrganization, isLoading: orgLoading } = useOrganization()
  const [posts, setPosts] = useState<PostedComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())
  const [editingReply, setEditingReply] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [postingReply, setPostingReply] = useState<string | null>(null)
  const [generatingReply, setGeneratingReply] = useState<string | null>(null)

  // Fetch posted comments
  useEffect(() => {
    if (activeOrganization && !orgLoading) {
      fetchPosts()
    }
  }, [activeOrganization, orgLoading])

  const fetchPosts = async () => {
    if (!activeOrganization) return

    try {
      setIsLoading(true)
      const result = await getGeneratedCommentsByOrganizationIdAction(
        activeOrganization.id
      )

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
    if (!activeOrganization) return

    console.log("🔍 [MY-POSTS] Fetching replies for:", commentUrl)

    // Set loading state
    setPosts(prev =>
      prev.map(post =>
        post.id === postId
          ? {
              ...post,
              isLoadingReplies: true,
              redditReplies: undefined
            }
          : post
      )
    )

    try {
      const result = await fetchRedditCommentRepliesAction(
        activeOrganization.id,
        commentUrl
      )

      if (result.isSuccess) {
        console.log(`✅ [MY-POSTS] Fetched ${result.data.length} replies`)
        setPosts(prev =>
          prev.map(post =>
            post.id === postId
              ? {
                  ...post,
                  isLoadingReplies: false,
                  redditReplies: result.data
                }
              : post
          )
        )
      } else {
        console.error("❌ [MY-POSTS] Failed to fetch replies:", result.message)
        setPosts(prev =>
          prev.map(post =>
            post.id === postId
              ? {
                  ...post,
                  isLoadingReplies: false,
                  redditReplies: []
                }
              : post
          )
        )

        // Show user-friendly error message
        if (result.message.includes("authentication")) {
          toast.error("Reddit authentication required to view replies")
        } else if (result.message.includes("rate limit")) {
          toast.error("Reddit API rate limit exceeded. Please try again later.")
        } else if (result.message.includes("not found")) {
          toast.error("Comment not found or may have been deleted")
        } else {
          toast.error("Failed to load replies from Reddit")
        }
      }
    } catch (error) {
      console.error("❌ [MY-POSTS] Error fetching replies:", error)
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                isLoadingReplies: false,
                redditReplies: []
              }
            : post
        )
      )
      toast.error("Error loading replies")
    }
  }

  const generateAIReply = async (
    postId: string,
    originalComment: string,
    replyToComment: RedditComment
  ) => {
    setGeneratingReply(postId)

    try {
      // Find the post to get campaign ID
      const post = posts.find(p => p.id === postId)
      if (!post || !post.campaignId) {
        throw new Error("Campaign information not found for this post")
      }

      // Get campaign's website info for context
      const campaignResult = await getCampaignByIdAction(post.campaignId)
      if (!campaignResult.isSuccess) {
        throw new Error("Failed to get campaign data")
      }

      const result = await generateReplyToCommentAction(
        originalComment,
        replyToComment.body,
        replyToComment.author,
        campaignResult.data.website || "",
        campaignResult.data.websiteContent || ""
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

  const postReply = async (postId: string, parentCommentId: string) => {
    if (!replyText.trim()) {
      toast.error("Reply cannot be empty")
      return
    }

    setPostingReply(postId)

    try {
      // Ensure parent ID has proper Reddit format (t1_ prefix for comments)
      const parentId = parentCommentId.startsWith("t1_")
        ? parentCommentId
        : `t1_${parentCommentId}`

      console.log(`📤 [MY-POSTS] Posting reply to comment: ${parentId}`)

      const result = await postCommentToRedditAction({
        organizationId: activeOrganization?.id || "",
        parentId,
        text: replyText
      })

      if (result.isSuccess) {
        console.log(
          `✅ [MY-POSTS] Reply posted successfully: ${result.data.link}`
        )
        toast.success("Reply posted successfully!")
        setEditingReply(null)
        setReplyText("")

        // Refresh replies to show the new comment
        const post = posts.find(p => p.id === postId)
        if (post?.postedCommentUrl) {
          fetchRedditReplies(postId, post.postedCommentUrl)
        }
      } else {
        console.error("❌ [MY-POSTS] Failed to post reply:", result.message)

        // Show user-friendly error messages
        if (result.message.includes("authentication")) {
          toast.error("Reddit authentication required to post replies")
        } else if (result.message.includes("rate limit")) {
          toast.error("Reddit API rate limit exceeded. Please try again later.")
        } else if (result.message.includes("permission")) {
          toast.error("You don't have permission to reply in this subreddit")
        } else {
          toast.error(result.message || "Failed to post reply")
        }
      }
    } catch (error) {
      console.error("❌ [MY-POSTS] Error posting reply:", error)
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
      <div className="space-y-4">
        <Alert>
          <MessageSquare className="size-4" />
          <AlertTitle>No Posts Yet</AlertTitle>
          <AlertDescription>
            You haven't posted any comments to Reddit yet. Head to the Lead
            Finder to start posting!
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button asChild>
            <Link href="/reddit/lead-finder">
              <MessageSquare className="mr-2 size-4" />
              Go to Lead Finder
            </Link>
          </Button>
        </div>
      </div>
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
                  <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                      <User className="size-3" />
                      <span>Original Post by u/{post.postAuthor}</span>
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {post.postContentSnippet}
                    </p>
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                      This is what you replied to
                    </div>
                  </div>

                  {/* Your Comment */}
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                      <MessageSquare className="size-3" />
                      Your Comment
                    </h4>
                    <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        {selectedComment}
                      </p>
                    </div>
                  </div>

                  {/* Reddit Replies */}
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                      <MessageSquare className="size-3" />
                      Replies to Your Comment
                    </h4>

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
                          <div
                            key={reply.id}
                            className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-300">
                                <User className="size-3" />
                                <span>u/{reply.author} replied</span>
                                <span>•</span>
                                <span className="text-orange-600 dark:text-orange-400">
                                  {formatTimeAgo(reply.created_utc)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400">
                                <ArrowUp className="size-3" />
                                <span>{reply.score}</span>
                              </div>
                            </div>
                            <p className="mb-3 text-sm text-orange-800 dark:text-orange-200">
                              {reply.body}
                            </p>

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
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-800/50">
                        <MessageSquare className="mx-auto mb-2 size-8 text-gray-400" />
                        <p className="text-muted-foreground text-sm font-medium">
                          No replies yet
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Your comment is live on Reddit. Check back later for
                          responses!
                        </p>
                      </div>
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
