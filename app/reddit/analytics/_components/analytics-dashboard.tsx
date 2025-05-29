"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  Target,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ExternalLink,
  Hash,
  ThumbsUp,
  MessageCircle,
  Award,
  Zap
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { toast } from "sonner"
import { useOrganization } from "@/components/utilities/organization-provider"
import { useUser } from "@clerk/nextjs"
import {
  getOrganizationAnalyticsAction,
  getCampaignAnalyticsAction,
  getLeadsOverTimeAction,
  getRelevanceDistributionAction,
  getKeywordPerformanceAction,
  getTopPerformingCommentsAction,
  type AnalyticsOverview,
  type LeadsOverTimeDataPoint,
  type RelevanceDistribution,
  type KeywordPerformanceData,
  type TopPerformingComment
} from "@/actions/db/analytics-actions"
import { getCampaignsByOrganizationIdAction } from "@/actions/db/campaign-actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

// Chart configuration for consistent theming
const chartConfig = {
  leads: {
    label: "Total Leads",
    color: "hsl(var(--chart-1))"
  },
  highQualityLeads: {
    label: "High Quality Leads",
    color: "hsl(var(--chart-2))"
  },
  upvotes: {
    label: "Upvotes",
    color: "hsl(var(--chart-3))"
  },
  replies: {
    label: "Replies",
    color: "hsl(var(--chart-4))"
  }
}

const relevanceColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"]

interface Campaign {
  id: string
  name: string
  status: string
}

interface AnalyticsDashboardState {
  // Data
  overview: AnalyticsOverview | null
  leadsOverTime: LeadsOverTimeDataPoint[]
  relevanceDistribution: RelevanceDistribution[]
  keywordPerformance: KeywordPerformanceData[]
  topComments: TopPerformingComment[]
  campaigns: Campaign[]

  // Filters
  selectedCampaign: string | null
  dateRange: "today" | "7days" | "30days" | "custom"
  customStartDate: Date | null
  customEndDate: Date | null

  // UI State
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

const initialState: AnalyticsDashboardState = {
  overview: null,
  leadsOverTime: [],
  relevanceDistribution: [],
  keywordPerformance: [],
  topComments: [],
  campaigns: [],
  selectedCampaign: null,
  dateRange: "30days",
  customStartDate: null,
  customEndDate: null,
  isLoading: true,
  error: null,
  lastUpdated: null
}

export default function AnalyticsDashboard() {
  const { user } = useUser()
  const { currentOrganization, isLoading: organizationLoading } = useOrganization()
  const [state, setState] = useState<AnalyticsDashboardState>(initialState)

  // Reset state when organization changes
  useEffect(() => {
    if (currentOrganization?.id) {
      console.log(`📊 [ANALYTICS-DASHBOARD] Organization changed to: ${currentOrganization.id}`)
      setState(prev => ({ ...initialState, isLoading: true }))
    }
  }, [currentOrganization?.id])

  // Load campaigns when organization is available
  const loadCampaigns = React.useCallback(async () => {
    if (!currentOrganization?.id) return

    try {
      console.log(`📊 [ANALYTICS-DASHBOARD] Loading campaigns for organization: ${currentOrganization.id}`)
      
      const result = await getCampaignsByOrganizationIdAction(currentOrganization.id)
      
      if (result.isSuccess) {
        const campaigns = result.data.map(campaign => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status
        }))
        
        setState(prev => ({
          ...prev,
          campaigns
        }))
        
        console.log(`📊 [ANALYTICS-DASHBOARD] Loaded ${campaigns.length} campaigns`)
      } else {
        console.error(`📊 [ANALYTICS-DASHBOARD] Failed to load campaigns:`, result.message)
      }
    } catch (error) {
      console.error(`📊 [ANALYTICS-DASHBOARD] Error loading campaigns:`, error)
    }
  }, [currentOrganization?.id])

  // Load all analytics data
  const loadAnalyticsData = React.useCallback(async () => {
    if (!currentOrganization?.id) return

    try {
      console.log(`📊 [ANALYTICS-DASHBOARD] Loading analytics data...`)
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const organizationId = currentOrganization.id
      const { selectedCampaign, dateRange, customStartDate, customEndDate } = state

      // Prepare date parameters
      const dateParams = dateRange === "custom" && customStartDate && customEndDate
        ? { customStart: customStartDate, customEnd: customEndDate }
        : {}

      // Load all data in parallel
      const [
        overviewResult,
        leadsOverTimeResult,
        relevanceDistributionResult,
        keywordPerformanceResult,
        topCommentsResult
      ] = await Promise.all([
        // Overview analytics
        selectedCampaign 
          ? getCampaignAnalyticsAction(selectedCampaign, dateRange, dateParams.customStart, dateParams.customEnd)
          : getOrganizationAnalyticsAction(organizationId, dateRange, dateParams.customStart, dateParams.customEnd),
        
        // Leads over time
        getLeadsOverTimeAction(organizationId, selectedCampaign || undefined, dateRange, dateParams.customStart, dateParams.customEnd),
        
        // Relevance distribution
        getRelevanceDistributionAction(organizationId, selectedCampaign || undefined, dateRange, dateParams.customStart, dateParams.customEnd),
        
        // Keyword performance
        getKeywordPerformanceAction(organizationId, selectedCampaign || undefined, dateRange, dateParams.customStart, dateParams.customEnd),
        
        // Top performing comments
        getTopPerformingCommentsAction(organizationId, selectedCampaign || undefined, dateRange, "upvotes", 10, dateParams.customStart, dateParams.customEnd)
      ])

      // Update state with results
      setState(prev => ({
        ...prev,
        overview: overviewResult.isSuccess ? overviewResult.data : null,
        leadsOverTime: leadsOverTimeResult.isSuccess ? leadsOverTimeResult.data : [],
        relevanceDistribution: relevanceDistributionResult.isSuccess ? relevanceDistributionResult.data : [],
        keywordPerformance: keywordPerformanceResult.isSuccess ? keywordPerformanceResult.data : [],
        topComments: topCommentsResult.isSuccess ? topCommentsResult.data : [],
        isLoading: false,
        lastUpdated: new Date(),
        error: null
      }))

      console.log(`📊 [ANALYTICS-DASHBOARD] Analytics data loaded successfully`)

    } catch (error) {
      console.error(`📊 [ANALYTICS-DASHBOARD] Error loading analytics data:`, error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load analytics data"
      }))
    }
  }, [currentOrganization?.id, state.selectedCampaign, state.dateRange, state.customStartDate, state.customEndDate])

  // Load campaigns on mount and organization change
  useEffect(() => {
    if (currentOrganization?.id && !organizationLoading) {
      loadCampaigns()
    }
  }, [currentOrganization?.id, organizationLoading, loadCampaigns])

  // Load analytics data when filters change
  useEffect(() => {
    if (currentOrganization?.id && !organizationLoading) {
      loadAnalyticsData()
    }
  }, [currentOrganization?.id, organizationLoading, loadAnalyticsData])

  // Handle filter changes
  const handleCampaignChange = (campaignId: string) => {
    console.log(`📊 [ANALYTICS-DASHBOARD] Campaign filter changed to: ${campaignId}`)
    setState(prev => ({
      ...prev,
      selectedCampaign: campaignId === "all" ? null : campaignId
    }))
  }

  const handleDateRangeChange = (range: "today" | "7days" | "30days" | "custom") => {
    console.log(`📊 [ANALYTICS-DASHBOARD] Date range changed to: ${range}`)
    setState(prev => ({
      ...prev,
      dateRange: range,
      // Reset custom dates if switching away from custom
      customStartDate: range === "custom" ? prev.customStartDate : null,
      customEndDate: range === "custom" ? prev.customEndDate : null
    }))
  }

  const handleRefresh = () => {
    console.log(`📊 [ANALYTICS-DASHBOARD] Manual refresh triggered`)
    loadAnalyticsData()
    toast.success("Analytics data refreshed")
  }

  // Show loading state
  if (organizationLoading || !currentOrganization) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 size-8 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground">Loading organization...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (state.error) {
    return (
      <Alert className="mx-auto max-w-md">
        <AlertDescription>
          <div className="space-y-4">
            <p>Error loading analytics: {state.error}</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={state.selectedCampaign || "all"}
            onValueChange={handleCampaignChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {state.campaigns.map(campaign => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={state.dateRange}
            onValueChange={handleDateRangeChange}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {state.lastUpdated && (
            <span className="text-muted-foreground text-sm">
              Updated {state.lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={state.isLoading}
          >
            <RefreshCw className={`mr-2 size-4 ${state.isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview KPI Cards */}
      {state.overview && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Target className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.overview.totalLeads}</div>
              <p className="text-muted-foreground text-xs">
                {state.overview.timeRange}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Relevance</CardTitle>
              <Award className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.overview.avgRelevanceScore}</div>
              <p className="text-muted-foreground text-xs">
                Out of 100
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Posting Success Rate</CardTitle>
              <Zap className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.overview.postingSuccessRate}%</div>
              <p className="text-muted-foreground text-xs">
                Comments posted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
              <TrendingUp className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.overview.avgEngagement}</div>
              <p className="text-muted-foreground text-xs">
                Upvotes + replies
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Leads Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Leads Generated Over Time</CardTitle>
            <CardDescription>
              Track your lead generation progress and identify trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={state.leadsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="leads" 
                    stroke="var(--color-leads)" 
                    strokeWidth={2}
                    name="Total Leads"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="highQualityLeads" 
                    stroke="var(--color-highQualityLeads)" 
                    strokeWidth={2}
                    name="High Quality Leads"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Relevance Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Relevance Score Distribution</CardTitle>
            <CardDescription>
              Distribution of lead relevance scores across quality ranges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={state.relevanceDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" name="Number of Leads">
                    {state.relevanceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={relevanceColors[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Keyword Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Keyword Performance</CardTitle>
            <CardDescription>
              Monitor how different keywords are performing in lead generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Avg. Score</TableHead>
                  <TableHead className="text-right">Engagement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.keywordPerformance.slice(0, 10).map((keyword) => (
                  <TableRow key={keyword.keyword}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Hash className="text-muted-foreground size-3" />
                        {keyword.keyword}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{keyword.leadsGenerated}</TableCell>
                    <TableCell className="text-right">{keyword.avgRelevanceScore}</TableCell>
                    <TableCell className="text-right">{keyword.avgEngagement}</TableCell>
                  </TableRow>
                ))}
                {state.keywordPerformance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground text-center">
                      No keyword data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Performing Comments */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Comments</CardTitle>
            <CardDescription>
              Your best performing posted comments by engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Post Title</TableHead>
                  <TableHead className="text-right">Upvotes</TableHead>
                  <TableHead className="text-right">Replies</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.topComments.map((comment) => (
                  <TableRow key={comment.id}>
                    <TableCell className="max-w-[200px] truncate font-medium">
                      {comment.postTitle}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ThumbsUp className="text-muted-foreground size-3" />
                        {comment.upvotes}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <MessageCircle className="text-muted-foreground size-3" />
                        {comment.replies}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={comment.relevanceScore >= 70 ? "default" : "secondary"}>
                        {comment.relevanceScore}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {comment.postedCommentUrl && (
                        <Link 
                          href={comment.postedCommentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="size-3" />
                          </Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {state.topComments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground text-center">
                      No posted comments with engagement data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 