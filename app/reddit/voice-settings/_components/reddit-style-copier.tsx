"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Loader2,
  Search,
  Copy,
  ExternalLink,
  TrendingUp,
  Users,
  MessageSquare,
  CheckCircle,
  Eye
} from "lucide-react"
import { toast } from "sonner"
import { searchSubredditsAction } from "@/actions/integrations/reddit/subreddit-search-actions"
import {
  getTopPostsFromSubredditAction,
  analyzePostWritingStyleAction,
  type RedditPost
} from "@/actions/integrations/reddit/reddit-posts-actions"
import type { SubredditData } from "@/actions/integrations/reddit/subreddit-search-actions"

interface RedditStyleCopierProps {
  onStyleCopied: (analysis: string, postSource: any) => void
}

export default function RedditStyleCopier({
  onStyleCopied
}: RedditStyleCopierProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSubreddit, setSelectedSubreddit] =
    useState<SubredditData | null>(null)
  const [timeframe, setTimeframe] = useState<
    "day" | "week" | "month" | "year" | "all"
  >("week")

  const [subredditResults, setSubredditResults] = useState<SubredditData[]>([])
  const [isSearchingSubreddits, setIsSearchingSubreddits] = useState(false)

  const [posts, setPosts] = useState<RedditPost[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)

  const [analyzingPostId, setAnalyzingPostId] = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<RedditPost | null>(null)

  const searchSubreddits = useCallback(
    async (query?: string) => {
      const searchTerm = query || searchQuery
      if (!searchTerm.trim() || searchTerm.length < 2) {
        setSubredditResults([])
        return
      }

      setIsSearchingSubreddits(true)
      try {
        console.log("🔍 [REDDIT-STYLE] Searching subreddits:", searchTerm)
        const result = await searchSubredditsAction(searchTerm, 20)

        if (result.isSuccess) {
          setSubredditResults(result.data)
          console.log("🔍 [REDDIT-STYLE] Found subreddits:", result.data.length)
          console.log(
            "🔍 [REDDIT-STYLE] First few results:",
            result.data.slice(0, 3).map(s => s.subreddit_name)
          )
        } else {
          toast.error(result.message)
          setSubredditResults([])
        }
      } catch (error) {
        console.error("🔍 [REDDIT-STYLE] Search error:", error)
        toast.error("Failed to search subreddits")
        setSubredditResults([])
      } finally {
        setIsSearchingSubreddits(false)
      }
    },
    [searchQuery]
  )

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchSubreddits(searchQuery)
      } else {
        setSubredditResults([])
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchSubreddits])

  const selectSubreddit = async (subreddit: SubredditData) => {
    setSelectedSubreddit(subreddit)
    setSubredditResults([])
    setSearchQuery("")

    // Automatically load top posts
    await loadTopPosts(subreddit.subreddit_name)
  }

  const loadTopPosts = async (subredditName: string) => {
    setIsLoadingPosts(true)
    try {
      console.log("📰 [REDDIT-STYLE] Loading top posts from:", subredditName)
      const result = await getTopPostsFromSubredditAction(
        subredditName,
        timeframe,
        10
      )

      if (result.isSuccess) {
        setPosts(result.data)
        console.log("📰 [REDDIT-STYLE] Loaded posts:", result.data.length)
        if (result.data.length === 0) {
          toast.warning(
            "No posts with substantial text content found in this timeframe"
          )
        }
      } else {
        toast.error(result.message)
        setPosts([])
      }
    } catch (error) {
      console.error("📰 [REDDIT-STYLE] Load posts error:", error)
      toast.error("Failed to load posts")
      setPosts([])
    } finally {
      setIsLoadingPosts(false)
    }
  }

  const analyzeAndCopyStyle = async (post: RedditPost) => {
    setAnalyzingPostId(post.id)
    try {
      console.log("✍️ [REDDIT-STYLE] Analyzing post:", post.id)
      const result = await analyzePostWritingStyleAction(post)

      if (result.isSuccess) {
        const analysis = result.data
        const postSource = {
          subreddit: post.subreddit,
          postId: post.id,
          postTitle: post.title,
          author: post.author,
          score: post.score
        }

        // Call the parent callback with the analysis
        onStyleCopied(analysis.writingStyleAnalysis, postSource)

        toast.success("Writing style copied successfully!")
        console.log("✍️ [REDDIT-STYLE] Style analysis completed")
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("✍️ [REDDIT-STYLE] Analysis error:", error)
      toast.error("Failed to analyze writing style")
    } finally {
      setAnalyzingPostId(null)
    }
  }

  const formatScore = (score: number) => {
    if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}k`
    }
    return score.toString()
  }

  const formatSubscribers = (count: string) => {
    const num = parseInt(count)
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`
    }
    return count
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Search Subreddits */}
      <div className="space-y-4">
        <Label className="text-gray-900 dark:text-white">
          Step 1: Search for a Subreddit
        </Label>
        <div className="flex gap-2">
          <Input
            placeholder="Search subreddits (e.g., 'entrepreneur', 'technology')"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyPress={e => {
              if (e.key === "Enter") {
                searchSubreddits()
              }
            }}
            className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          />
          <Button
            onClick={() => searchSubreddits()}
            disabled={isSearchingSubreddits || searchQuery.length < 2}
          >
            {isSearchingSubreddits ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
          </Button>
        </div>

        {/* Subreddit Search Results */}
        {subredditResults.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-gray-600 dark:text-gray-400">
              Select a subreddit:
            </Label>
            <div className="grid max-h-60 gap-2 overflow-y-auto">
              {subredditResults.map(subreddit => (
                <div
                  key={subreddit.base10_id}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                  onClick={() => selectSubreddit(subreddit)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        r/{subreddit.subreddit_name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Users className="size-3" />
                    <span>
                      {formatSubscribers(subreddit.subscribers_count)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Selected Subreddit & Timeframe */}
      {selectedSubreddit && (
        <div className="space-y-4">
          <Label className="text-gray-900 dark:text-white">
            Step 2: Selected Subreddit
          </Label>
          <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/30">
            <div className="flex items-center gap-3">
              <div>
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  r/{selectedSubreddit.subreddit_name}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {formatSubscribers(selectedSubreddit.subscribers_count)}{" "}
                  subscribers
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={timeframe}
                onValueChange={(
                  value: "day" | "week" | "month" | "year" | "all"
                ) => {
                  setTimeframe(value)
                  loadTopPosts(selectedSubreddit.subreddit_name)
                }}
              >
                <SelectTrigger className="w-32 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedSubreddit(null)
                  setPosts([])
                }}
                className="border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                Change
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Top Posts */}
      {selectedSubreddit && (
        <div className="space-y-4">
          <Label className="text-gray-900 dark:text-white">
            Step 3: Choose a Post to Copy Writing Style From
          </Label>

          {isLoadingPosts ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : posts.length > 0 ? (
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {posts.map(post => (
                <div
                  key={post.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                >
                  <div className="space-y-3">
                    {/* Post Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="mb-1 line-clamp-2 text-sm font-medium text-gray-900 dark:text-white">
                          {post.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span>u/{post.author}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="size-3" />
                            <span>{formatScore(post.score)}</span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="size-3" />
                            <span>{post.num_comments}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPost(post)}
                              className="border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                            >
                              <Eye className="size-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                            <DialogHeader>
                              <DialogTitle className="text-gray-900 dark:text-white">
                                {selectedPost?.title}
                              </DialogTitle>
                              <DialogDescription className="text-gray-600 dark:text-gray-400">
                                by u/{selectedPost?.author} •{" "}
                                {formatScore(selectedPost?.score || 0)} upvotes
                                • {selectedPost?.num_comments} comments
                              </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4">
                              <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                {selectedPost?.selftext}
                              </div>
                              <div className="mt-4 flex gap-2">
                                <Button
                                  onClick={() =>
                                    selectedPost &&
                                    window.open(
                                      `https://reddit.com${selectedPost.permalink}`,
                                      "_blank"
                                    )
                                  }
                                  variant="outline"
                                  className="border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                                >
                                  <ExternalLink className="mr-2 size-4" />
                                  View on Reddit
                                </Button>
                                <Button
                                  onClick={() =>
                                    selectedPost &&
                                    analyzeAndCopyStyle(selectedPost)
                                  }
                                  disabled={
                                    analyzingPostId === selectedPost?.id
                                  }
                                >
                                  {analyzingPostId === selectedPost?.id ? (
                                    <>
                                      <Loader2 className="mr-2 size-4 animate-spin" />
                                      Analyzing...
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="mr-2 size-4" />
                                      Copy Style
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(
                              `https://reddit.com${post.permalink}`,
                              "_blank"
                            )
                          }
                          className="border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                        >
                          <ExternalLink className="size-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => analyzeAndCopyStyle(post)}
                          disabled={analyzingPostId === post.id}
                        >
                          {analyzingPostId === post.id ? (
                            <>
                              <Loader2 className="mr-1 size-3 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1 size-3" />
                              Copy Style
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Post Preview */}
                    <div className="rounded border-l-4 border-blue-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-blue-800 dark:bg-gray-800 dark:text-gray-300">
                      <p className="line-clamp-6">
                        {post.selftext.substring(0, 400)}
                        {post.selftext.length > 400 && "..."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : selectedSubreddit && !isLoadingPosts ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              <MessageSquare className="mx-auto mb-2 size-8" />
              <p>No posts with substantial text found for this timeframe.</p>
              <p className="text-sm">Try a different timeframe or subreddit.</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
