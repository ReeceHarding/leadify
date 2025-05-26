"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  Loader2,
  RefreshCw,
  Send,
  Clock,
  Edit3,
  Check,
  X,
  Rocket
} from "lucide-react"
import {
  getWarmupPostsByOrganizationIdAction,
  updateWarmupPostAction
} from "@/actions/db/warmup-actions"
import {
  generateAndScheduleWarmupPostsAction,
  postWarmupImmediatelyAction
} from "@/actions/warmup-queue-actions"
import {
  SerializedWarmupAccountDocument,
  SerializedWarmupPostDocument
} from "@/db/firestore/warmup-collections"
import { debounce } from "lodash"

interface WarmupPostsListProps {
  userId: string
  organizationId: string
  warmupAccount: SerializedWarmupAccountDocument
}

export default function WarmupPostsList({
  userId,
  organizationId,
  warmupAccount
}: WarmupPostsListProps) {
  const [posts, setPosts] = useState<SerializedWarmupPostDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState<{
    [key: string]: { title: string; content: string }
  }>({})
  const [savingPost, setSavingPost] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (organizationId) {
      loadPosts()
    }
  }, [organizationId])

  const loadPosts = async () => {
    if (!organizationId) return
    try {
      console.log("🔍 [WARMUP-POSTS] Loading posts for org:", organizationId)
      const result = await getWarmupPostsByOrganizationIdAction(organizationId)
      if (result.isSuccess && result.data) {
        setPosts(result.data)
      } else {
        setPosts([])
        console.warn(
          "⚠️ [WARMUP-POSTS] Failed to load posts or no posts found:",
          result.message
        )
      }
    } catch (error) {
      console.error("❌ [WARMUP-POSTS] Error loading posts:", error)
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGeneratePosts = async () => {
    if (!organizationId) {
      toast({
        title: "Error",
        description: "Organization not selected for generating posts.",
        variant: "destructive"
      })
      return
    }
    try {
      setIsGenerating(true)
      console.log(
        "🤖 [WARMUP-POSTS] Generating new posts for org:",
        organizationId
      )
      const result = await generateAndScheduleWarmupPostsAction(organizationId)

      if (result.isSuccess) {
        toast({
          title: "Success",
          description: `Generated ${result.data?.postsGenerated || 0} new posts`
        })
        await loadPosts()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("❌ [WARMUP-POSTS] Error generating posts:", error)
      toast({
        title: "Error",
        description: "Failed to generate posts",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Auto-save functionality
  const debouncedSave = useCallback(
    debounce(async (postId: string, title: string, content: string) => {
      try {
        setSavingPost(postId)
        console.log("💾 [WARMUP-POSTS] Auto-saving post:", postId)

        const result = await updateWarmupPostAction(postId, {
          title,
          content
        })

        if (result.isSuccess) {
          // Update local state
          setPosts(
            posts.map(p => (p.id === postId ? { ...p, title, content } : p))
          )
          console.log("✅ [WARMUP-POSTS] Post auto-saved")
        }
      } catch (error) {
        console.error("❌ [WARMUP-POSTS] Error auto-saving:", error)
      } finally {
        setSavingPost(null)
      }
    }, 3000), // 3 seconds delay
    [posts]
  )

  const handleEditPost = (post: SerializedWarmupPostDocument) => {
    setEditingPost(post.id)
    setEditedContent({
      ...editedContent,
      [post.id]: { title: post.title, content: post.content }
    })
  }

  const handleContentChange = (
    postId: string,
    field: "title" | "content",
    value: string
  ) => {
    const current = editedContent[postId] || { title: "", content: "" }
    const updated = { ...current, [field]: value }

    setEditedContent({
      ...editedContent,
      [postId]: updated
    })

    // Trigger auto-save
    debouncedSave(postId, updated.title, updated.content)
  }

  const handleQueuePost = async (postId: string) => {
    try {
      console.log("📤 [WARMUP-POSTS] Queueing post:", postId)

      const result = await updateWarmupPostAction(postId, {
        status: "queued"
      })

      if (result.isSuccess) {
        toast({
          title: "Success",
          description: "Post queued for posting"
        })
        await loadPosts()
      }
    } catch (error) {
      console.error("❌ [WARMUP-POSTS] Error queueing post:", error)
      toast({
        title: "Error",
        description: "Failed to queue post",
        variant: "destructive"
      })
    }
  }

  const handlePostImmediately = async (postId: string) => {
    if (!organizationId) {
      toast({
        title: "Error",
        description: "Organization not selected for posting.",
        variant: "destructive"
      })
      return
    }
    try {
      console.log(
        "🚀 [WARMUP-POSTS] Posting immediately:",
        postId,
        "for org:",
        organizationId
      )
      const result = await postWarmupImmediatelyAction(postId, organizationId)

      if (result.isSuccess && result.data?.url) {
        toast({
          title: "Success!",
          description: "Post submitted to Reddit successfully"
        })
        window.open(result.data.url, "_blank")
        await loadPosts()
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to post",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("❌ [WARMUP-POSTS] Error posting immediately:", error)
      toast({
        title: "Error",
        description: "Failed to post immediately",
        variant: "destructive"
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>
      case "queued":
        return <Badge variant="default">Queued</Badge>
      case "posted":
        return (
          <Badge variant="default" className="bg-green-500">
            Posted
          </Badge>
        )
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Generated Posts</h3>
          <p className="text-muted-foreground text-sm">
            {warmupAccount.postingMode === "auto"
              ? "Auto-posting enabled"
              : "Manual verification required"}
          </p>
        </div>
        <Button onClick={handleGeneratePosts} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 size-4" />
              Generate Posts
            </>
          )}
        </Button>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">No posts generated yet</p>
            <Button onClick={handleGeneratePosts} disabled={isGenerating}>
              Generate Your First Posts
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline">r/{post.subreddit}</Badge>
                      {getStatusBadge(post.status)}
                      {savingPost === post.id && (
                        <Badge variant="outline" className="gap-1">
                          <Loader2 className="size-3 animate-spin" />
                          Saving...
                        </Badge>
                      )}
                    </div>
                    {editingPost === post.id ? (
                      <Input
                        value={editedContent[post.id]?.title || post.title}
                        onChange={e =>
                          handleContentChange(post.id, "title", e.target.value)
                        }
                        className="mb-2 text-lg font-semibold"
                      />
                    ) : (
                      <CardTitle className="text-lg">{post.title}</CardTitle>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      editingPost === post.id
                        ? setEditingPost(null)
                        : handleEditPost(post)
                    }
                  >
                    {editingPost === post.id ? (
                      <Check className="size-4" />
                    ) : (
                      <Edit3 className="size-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingPost === post.id ? (
                  <Textarea
                    value={editedContent[post.id]?.content || post.content}
                    onChange={e =>
                      handleContentChange(post.id, "content", e.target.value)
                    }
                    className="min-h-[150px]"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{post.content}</p>
                  </div>
                )}

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-muted-foreground text-sm">
                    {post.scheduledFor && (
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        Scheduled:{" "}
                        {new Date(post.scheduledFor).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {post.status === "draft" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQueuePost(post.id)}
                      >
                        <Clock className="mr-2 size-4" />
                        Queue
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePostImmediately(post.id)}
                      >
                        <Rocket className="mr-2 size-4" />
                        Post Now
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
