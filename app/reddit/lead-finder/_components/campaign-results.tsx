"use client"

import { useState, useEffect } from "react"
import {
  Copy,
  ExternalLink,
  MessageSquare,
  TrendingUp,
  Star,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface GeneratedComment {
  id: string
  campaignId: string
  threadId: string
  relevanceScore: number
  reasoning: string
  microComment: string
  mediumComment: string
  verboseComment: string
  approved: boolean
  used: boolean
}

interface RedditThread {
  id: string
  title: string
  subreddit: string
  author: string
  score: number
  numComments: number
  url: string
  content: string
}

interface CampaignResultsProps {
  selectedCampaign: string | null
}

export default function CampaignResults({
  selectedCampaign
}: CampaignResultsProps) {
  const [results, setResults] = useState<{
    threads: RedditThread[]
    comments: GeneratedComment[]
  }>({ threads: [], comments: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (selectedCampaign) {
      loadCampaignResults(selectedCampaign)
    }
  }, [selectedCampaign])

  const loadCampaignResults = async (campaignId: string) => {
    setIsLoading(true)
    try {
      // TODO: Implement actual data loading
      // For now, show empty state
      setResults({ threads: [], comments: [] })
    } catch (error) {
      console.error("Error loading campaign results:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleThread = (threadId: string) => {
    const newExpanded = new Set(expandedThreads)
    if (newExpanded.has(threadId)) {
      newExpanded.delete(threadId)
    } else {
      newExpanded.add(threadId)
    }
    setExpandedThreads(newExpanded)
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${type} comment copied to clipboard!`)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100"
    if (score >= 70) return "text-blue-600 bg-blue-100"
    if (score >= 50) return "text-yellow-600 bg-yellow-100"
    return "text-red-600 bg-red-100"
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent"
    if (score >= 70) return "Good"
    if (score >= 50) return "Fair"
    return "Poor"
  }

  if (!selectedCampaign) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Results</CardTitle>
          <CardDescription>
            Select a campaign to view its results and generated comments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-blue-100 p-3">
              <TrendingUp className="size-6 text-blue-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No campaign selected</h3>
            <p className="text-muted-foreground max-w-sm">
              Choose a campaign from the campaigns tab to view detailed results
              and AI-generated comments.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Results</CardTitle>
          <CardDescription>Loading campaign results...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-lg border p-4">
                <Skeleton className="mb-2 h-6 w-3/4" />
                <Skeleton className="mb-4 h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (results.comments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Results</CardTitle>
          <CardDescription>
            No results available for this campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-3">
              <MessageSquare className="size-6 text-gray-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No results yet</h3>
            <p className="text-muted-foreground max-w-sm">
              This campaign hasn't generated any results yet. Run the campaign
              to start finding leads.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const highQualityLeads = results.comments.filter(c => c.relevanceScore >= 70)
  const averageScore =
    results.comments.reduce((sum, c) => sum + c.relevanceScore, 0) /
    results.comments.length

  return (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <MessageSquare className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.comments.length}</div>
            <p className="text-muted-foreground text-xs">
              Reddit opportunities found
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Leads</CardTitle>
            <Star className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {highQualityLeads.length}
            </div>
            <p className="text-muted-foreground text-xs">
              Score 70+ opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore.toFixed(1)}</div>
            <p className="text-muted-foreground text-xs">Lead quality rating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <TrendingUp className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {results.comments.length > 0
                ? (
                    (highQualityLeads.length / results.comments.length) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-muted-foreground text-xs">Quality lead rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Results List */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Opportunities</CardTitle>
          <CardDescription>
            Reddit threads with AI-generated comments and relevance scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.comments.map(comment => {
              const thread = results.threads.find(
                t => t.id === comment.threadId
              )
              const isExpanded = expandedThreads.has(comment.threadId)

              return (
                <Collapsible key={comment.id} className="rounded-lg border">
                  <CollapsibleTrigger
                    className="hover:bg-muted/50 flex w-full items-center justify-between p-4"
                    onClick={() => toggleThread(comment.threadId)}
                  >
                    <div className="flex items-start space-x-4 text-left">
                      <div
                        className={`rounded-full px-3 py-1 text-sm font-medium ${getScoreColor(comment.relevanceScore)}`}
                      >
                        {comment.relevanceScore}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">
                            {thread?.title || "Thread Title"}
                          </h3>
                          <Badge variant="outline">
                            r/{thread?.subreddit || "unknown"}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground line-clamp-2 text-sm">
                          {comment.reasoning}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </CollapsibleTrigger>

                  <CollapsibleContent className="px-4 pb-4">
                    <div className="space-y-4 border-t pt-4">
                      {/* Thread Details */}
                      <div className="flex items-center justify-between">
                        <div className="text-muted-foreground flex items-center space-x-4 text-sm">
                          <span>By u/{thread?.author}</span>
                          <span>{thread?.score} upvotes</span>
                          <span>{thread?.numComments} comments</span>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={thread?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 size-3" />
                            View on Reddit
                          </a>
                        </Button>
                      </div>

                      {/* Generated Comments */}
                      <Tabs defaultValue="micro" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="micro">⚡ Micro</TabsTrigger>
                          <TabsTrigger value="medium">💼 Medium</TabsTrigger>
                          <TabsTrigger value="verbose">📝 Verbose</TabsTrigger>
                        </TabsList>

                        <TabsContent value="micro" className="space-y-3">
                          <div className="rounded-lg border bg-green-50 p-4">
                            <div className="mb-2 flex items-center justify-between">
                              <Badge variant="secondary">5-15 words</Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(comment.microComment, "Micro")
                                }
                              >
                                <Copy className="mr-2 size-3" />
                                Copy
                              </Button>
                            </div>
                            <p className="text-sm font-medium">
                              {comment.microComment}
                            </p>
                          </div>
                        </TabsContent>

                        <TabsContent value="medium" className="space-y-3">
                          <div className="rounded-lg border bg-blue-50 p-4">
                            <div className="mb-2 flex items-center justify-between">
                              <Badge variant="secondary">30-80 words</Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(
                                    comment.mediumComment,
                                    "Medium"
                                  )
                                }
                              >
                                <Copy className="mr-2 size-3" />
                                Copy
                              </Button>
                            </div>
                            <p className="text-sm">{comment.mediumComment}</p>
                          </div>
                        </TabsContent>

                        <TabsContent value="verbose" className="space-y-3">
                          <div className="rounded-lg border bg-purple-50 p-4">
                            <div className="mb-2 flex items-center justify-between">
                              <Badge variant="secondary">100-200 words</Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(
                                    comment.verboseComment,
                                    "Verbose"
                                  )
                                }
                              >
                                <Copy className="mr-2 size-3" />
                                Copy
                              </Button>
                            </div>
                            <p className="text-sm">{comment.verboseComment}</p>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
