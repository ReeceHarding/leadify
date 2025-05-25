"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, RefreshCw, Send, Clock, Edit3, Check, X } from "lucide-react"
import { getWarmupPostsByUserIdAction, updateWarmupPostAction } from "@/actions/db/warmup-actions"
import { generateAndScheduleWarmupPostsAction } from "@/actions/warmup-queue-actions"
import { WarmupAccountDocument, WarmupPostDocument } from "@/db/firestore/warmup-collections"
import { debounce } from "lodash"

interface WarmupPostsListProps {
  userId: string
  warmupAccount: WarmupAccountDocument
}

export default function WarmupPostsList({ userId, warmupAccount }: WarmupPostsListProps) {
  const [posts, setPosts] = useState<WarmupPostDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState<{ [key: string]: { title: string; content: string } }>({})
  const [savingPost, setSavingPost] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadPosts()
  }, [userId])

  const loadPosts = async () => {
    try {
      console.log("🔍 [WARMUP-POSTS] Loading posts")
      const result = await getWarmupPostsByUserIdAction(userId)
      if (result.isSuccess && result.data) {
        setPosts(result.data)
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
    try {
      setIsGenerating(true)
      console.log("🤖 [WARMUP-POSTS] Generating new posts")
      
      const result = await generateAndScheduleWarmupPostsAction(userId)
      
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
          setPosts(posts.map(p => 
            p.id === postId ? { ...p, title, content } : p
          ))
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

  const handleEditPost = (post: WarmupPostDocument) => {
    setEditingPost(post.id)
    setEditedContent({
      ...editedContent,
      [post.id]: { title: post.title, content: post.content }
    })
  }

  const handleContentChange = (postId: string, field: "title" | "content", value: string) => {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>
      case "queued":
        return <Badge variant="default">Queued</Badge>
      case "posted":
        return <Badge variant="default" className="bg-green-500">Posted</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Generated Posts</h3>
          <p className="text-sm text-muted-foreground">
            {warmupAccount.postingMode === "auto" ? "Auto-posting enabled" : "Manual verification required"}
          </p>
        </div>
        <Button
          onClick={handleGeneratePosts}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Posts
            </>
          )}
        </Button>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">No posts generated yet</p>
            <Button onClick={handleGeneratePosts} disabled={isGenerating}>
              Generate Your First Posts
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">r/{post.subreddit}</Badge>
                      {getStatusBadge(post.status)}
                      {savingPost === post.id && (
                        <Badge variant="outline" className="gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Saving...
                        </Badge>
                      )}
                    </div>
                    {editingPost === post.id ? (
                      <Input
                        value={editedContent[post.id]?.title || post.title}
                        onChange={(e) => handleContentChange(post.id, "title", e.target.value)}
                        className="font-semibold text-lg mb-2"
                      />
                    ) : (
                      <CardTitle className="text-lg">{post.title}</CardTitle>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editingPost === post.id ? setEditingPost(null) : handleEditPost(post)}
                  >
                    {editingPost === post.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Edit3 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingPost === post.id ? (
                  <Textarea
                    value={editedContent[post.id]?.content || post.content}
                    onChange={(e) => handleContentChange(post.id, "content", e.target.value)}
                    className="min-h-[150px]"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{post.content}</p>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {post.scheduledFor && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Scheduled: {new Date(post.scheduledFor.toDate()).toLocaleString()}
                      </div>
                    )}
                  </div>
                  
                  {post.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => handleQueuePost(post.id)}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Queue for Posting
                    </Button>
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