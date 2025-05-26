"use client"

import { useState } from "react"
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
  CheckCircle
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
  const [selectedSubreddit, setSelectedSubreddit] = useState<SubredditData | null>(null)
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month" | "year">("week")
  
  const [subredditResults, setSubredditResults] = useState<SubredditData[]>([])
  const [isSearchingSubreddits, setIsSearchingSubreddits] = useState(false)
  
  const [posts, setPosts] = useState<RedditPost[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  
  const [analyzingPostId, setAnalyzingPostId] = useState<string | null>(null)

  const searchSubreddits = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      toast.error("Please enter at least 2 characters to search")
      return
    }

    setIsSearchingSubreddits(true)
    try {
      console.log("🔍 [REDDIT-STYLE] Searching subreddits:", searchQuery)
      const result = await searchSubredditsAction(searchQuery, 20)
      
      if (result.isSuccess) {
        setSubredditResults(result.data)
        console.log("🔍 [REDDIT-STYLE] Found subreddits:", result.data.length)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("🔍 [REDDIT-STYLE] Search error:", error)
      toast.error("Failed to search subreddits")
    } finally {
      setIsSearchingSubreddits(false)
    }
  }

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
      const result = await getTopPostsFromSubredditAction(subredditName, timeframe, 10)
      
      if (result.isSuccess) {
        setPosts(result.data)
        console.log("📰 [REDDIT-STYLE] Loaded posts:", result.data.length)
        if (result.data.length === 0) {
          toast.warning("No posts with substantial text content found in this timeframe")
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
    <Card className="bg-white shadow-sm dark:bg-gray-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Copy className="size-5" />
          Copy Writing Style from Reddit Posts
        </CardTitle>
        <CardDescription>
          Search for subreddits, browse top posts, and copy the exact writing style from popular posts to make your comments feel more human and authentic.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Search Subreddits */}
        <div className="space-y-4">
          <Label>Step 1: Search for a Subreddit</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Search subreddits (e.g., 'entrepreneur', 'technology')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  searchSubreddits()
                }
              }}
            />
            <Button
              onClick={searchSubreddits}
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
              <Label className="text-sm text-gray-600">Select a subreddit:</Label>
              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {subredditResults.map((subreddit) => (
                  <div
                    key={subreddit.base10_id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => selectSubreddit(subreddit)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">r/{subreddit.subreddit_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Users className="size-3" />
                      <span>{formatSubscribers(subreddit.subscribers_count)}</span>
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
            <Label>Step 2: Selected Subreddit</Label>
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-medium">r/{selectedSubreddit.subreddit_name}</div>
                  <div className="text-sm text-gray-600">
                    {formatSubscribers(selectedSubreddit.subscribers_count)} subscribers
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={timeframe}
                  onValueChange={(value: "day" | "week" | "month" | "year") => {
                    setTimeframe(value)
                    loadTopPosts(selectedSubreddit.subreddit_name)
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedSubreddit(null)
                    setPosts([])
                  }}
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
            <Label>Step 3: Choose a Post to Copy Writing Style From</Label>
            
            {isLoadingPosts ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="space-y-3">
                      {/* Post Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2 mb-1">
                            {post.title}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://reddit.com${post.permalink}`, "_blank")}
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
                      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border-l-4 border-blue-200">
                        <p className="line-clamp-3">
                          {post.selftext.substring(0, 200)}
                          {post.selftext.length > 200 && "..."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedSubreddit && !isLoadingPosts ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="mx-auto mb-2 size-8" />
                <p>No posts with substantial text found for this timeframe.</p>
                <p className="text-sm">Try a different timeframe or subreddit.</p>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 