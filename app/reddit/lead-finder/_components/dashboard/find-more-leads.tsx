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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Search,
  Plus,
  Sparkles,
  TrendingUp,
  Loader2,
  Info,
  BarChart3,
  Hash,
  TrendingDown,
  Star,
  Activity,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Target,
  Calendar,
  Brain
} from "lucide-react"
import { toast } from "sonner"
import { useOrganization } from "@/components/utilities/organization-provider"
import { getGeneratedCommentsByCampaignAction } from "@/actions/db/lead-generation-actions"
import { runLeadGenerationWorkflowWithLimitsAction } from "@/actions/lead-generation/workflow-actions"
import { generateKeywordsAction } from "@/actions/lead-generation/keywords-actions"
import { getKnowledgeBaseByOrganizationIdAction } from "@/actions/db/personalization-actions"
import { cn } from "@/lib/utils"

interface KeywordStats {
  keyword: string
  totalPosts: number
  highQualityPosts: number // 70+ score
  averageScore: number
  topPerformer: {
    title: string
    score: number
  } | null
  lowestPerformer: {
    title: string
    score: number
  } | null
  recentPostsCount: number // posts in last 24h
}

interface FindMoreLeadsProps {
  userId: string
  campaignId: string | null
  onFindingLeads?: () => void
  disabled?: boolean
}

export default function FindMoreLeads({
  userId,
  campaignId,
  onFindingLeads,
  disabled
}: FindMoreLeadsProps) {
  const { currentOrganization } = useOrganization()
  const [isOpen, setIsOpen] = useState(false)
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordStats, setKeywordStats] = useState<KeywordStats[]>([])
  const [newKeywords, setNewKeywords] = useState("")
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false)
  const [isGeneratingFromKnowledgeBase, setIsGeneratingFromKnowledgeBase] = useState(false)
  const [isFindingLeads, setIsFindingLeads] = useState(false)
  const [threadsPerKeyword, setThreadsPerKeyword] = useState<
    Record<string, number>
  >({})
  const [aiRefinementInput, setAiRefinementInput] = useState("")
  const [selectedKeywords, setSelectedKeywords] = useState<
    Record<string, number>
  >({})
  const [aiDescription, setAiDescription] = useState("")
  const [generatedKeywords, setGeneratedKeywords] = useState("")
  const [manualKeywords, setManualKeywords] = useState("")
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [timeFilter, setTimeFilter] = useState<"hour" | "day" | "week" | "month" | "year" | "all">("all")
  const [postsPerKeyword, setPostsPerKeyword] = useState(10)
  const [keywordCount, setKeywordCount] = useState(5)

  // Load existing keywords and calculate stats
  useEffect(() => {
    const loadKeywordsAndStats = async () => {
      if (!userId || !campaignId) return

      try {
        // Get campaign for keywords
        const { getCampaignByIdAction } = await import(
          "@/actions/db/campaign-actions"
        )
        const campaignResult = await getCampaignByIdAction(campaignId)
        if (campaignResult.isSuccess && campaignResult.data) {
          const campaignKeywords = campaignResult.data.keywords || []
          setKeywords(campaignKeywords)

          // Calculate stats for each keyword
          const leadsResult =
            await getGeneratedCommentsByCampaignAction(campaignId)
          if (leadsResult.isSuccess && leadsResult.data) {
            const stats: KeywordStats[] = campaignKeywords.map(
              (keyword: string) => {
                const keywordLeads = leadsResult.data.filter(
                  lead => lead.keyword === keyword
                )
                const highQualityLeads = keywordLeads.filter(
                  lead => lead.relevanceScore >= 70
                )
                const avgScore =
                  keywordLeads.length > 0
                    ? keywordLeads.reduce(
                        (sum, lead) => sum + lead.relevanceScore,
                        0
                      ) / keywordLeads.length
                    : 0

                // Find top and lowest performers
                const sortedByScore = [...keywordLeads].sort(
                  (a, b) => b.relevanceScore - a.relevanceScore
                )
                const topPerformer = sortedByScore[0] || null
                const lowestPerformer =
                  sortedByScore[sortedByScore.length - 1] || null

                // Count recent posts (for demo, we'll just estimate)
                const recentPostsCount = Math.floor(keywordLeads.length * 0.3)

                return {
                  keyword,
                  totalPosts: keywordLeads.length,
                  highQualityPosts: highQualityLeads.length,
                  averageScore: Math.round(avgScore),
                  topPerformer: topPerformer
                    ? {
                        title: topPerformer.postTitle,
                        score: topPerformer.relevanceScore
                      }
                    : null,
                  lowestPerformer: lowestPerformer
                    ? {
                        title: lowestPerformer.postTitle,
                        score: lowestPerformer.relevanceScore
                      }
                    : null,
                  recentPostsCount
                }
              }
            )
            setKeywordStats(stats)
          }
        }
      } catch (error) {
        console.error("Error loading keywords:", error)
      }
    }

    loadKeywordsAndStats()
  }, [userId, campaignId])

  // Calculate recommendations based on performance
  const getRecommendation = (stats: KeywordStats) => {
    const ratio = stats.highQualityPosts / stats.totalPosts

    if (ratio >= 0.9) {
      return {
        posts: 50,
        color: "text-green-600",
        icon: CheckCircle2,
        text: "Excellent performance! Score 50 more threads"
      }
    } else if (ratio >= 0.8) {
      return {
        posts: 25,
        color: "text-green-600",
        icon: CheckCircle2,
        text: "Great performance! Score 25 more threads"
      }
    } else if (ratio >= 0.7) {
      return {
        posts: 10,
        color: "text-amber-600",
        icon: AlertCircle,
        text: "Good performance. Score 10 more threads"
      }
    } else {
      return {
        posts: 0,
        color: "text-red-600",
        icon: XCircle,
        text: "Low performance. Consider stopping this keyword"
      }
    }
  }

  // Get keywords with recommendations
  const recommendedKeywords = keywordStats
    .map(stats => ({
      ...stats,
      recommendation: getRecommendation(stats)
    }))
    .filter(k => k.recommendation.posts > 0)

  // Auto-select recommended keywords
  useEffect(() => {
    if (isOpen && Object.keys(selectedKeywords).length === 0) {
      const initial: Record<string, number> = {}
      recommendedKeywords.forEach(k => {
        initial[k.keyword] = k.recommendation.posts
      })
      setSelectedKeywords(initial)
    }
  }, [isOpen])

  const handleGenerateKeywords = async () => {
    if (!aiDescription.trim()) {
      toast.error("Please describe what kind of customers you're looking for")
      return
    }

    setIsGeneratingKeywords(true)
    try {
      if (!currentOrganization?.website) {
        toast.error("Organization website not found")
        return
      }

      // Generate keywords with custom refinement
      const refinement = `${aiDescription}. Generate keywords for finding these specific types of customers.`

      const keywordsResult = await generateKeywordsAction({
        website: currentOrganization.website,
        refinement: refinement,
        organizationId: currentOrganization.id
      })

      if (keywordsResult.isSuccess) {
        setGeneratedKeywords(keywordsResult.data.keywords.join("\n"))
        toast.success("Keywords generated! Edit as needed.")
      } else {
        throw new Error("Failed to generate keywords")
      }
    } catch (error) {
      console.error("Error generating keywords:", error)
      toast.error("Failed to generate keywords")
    } finally {
      setIsGeneratingKeywords(false)
    }
  }

  const handleGenerateKeywordsFromKnowledgeBase = async () => {
    console.log("🧠 [KB-KEYWORDS] Starting knowledge base keyword generation")
    
    if (!currentOrganization) {
      toast.error("Organization not found")
      return
    }

    setIsGeneratingFromKnowledgeBase(true)
    try {
      console.log("🧠 [KB-KEYWORDS] Fetching knowledge base for organization:", currentOrganization.id)
      
      // Get the knowledge base for this organization
      const knowledgeBaseResult = await getKnowledgeBaseByOrganizationIdAction(currentOrganization.id)
      
      if (!knowledgeBaseResult.isSuccess || !knowledgeBaseResult.data) {
        toast.error("No knowledge base found. Please add business information in your Knowledge Base first.")
        return
      }

      const knowledgeBase = knowledgeBaseResult.data
      console.log("🧠 [KB-KEYWORDS] Found knowledge base with custom info:", !!knowledgeBase.customInformation)
      
      // Build comprehensive business description from knowledge base
      const businessDescriptionParts = []
      
      if (knowledgeBase.brandNameOverride) {
        businessDescriptionParts.push(`Business Name: ${knowledgeBase.brandNameOverride}`)
      }
      
      if (knowledgeBase.customInformation) {
        businessDescriptionParts.push("Business Information:")
        businessDescriptionParts.push(knowledgeBase.customInformation)
      }
      
      if (knowledgeBase.summary) {
        businessDescriptionParts.push("Summary:")
        businessDescriptionParts.push(knowledgeBase.summary)
      }
      
      if (knowledgeBase.keyFacts && knowledgeBase.keyFacts.length > 0) {
        businessDescriptionParts.push("Key Facts:")
        businessDescriptionParts.push("- " + knowledgeBase.keyFacts.join("\n- "))
      }

      if (businessDescriptionParts.length === 0) {
        toast.error("Knowledge base is empty. Please add business information first.")
        return
      }

      const businessDescription = businessDescriptionParts.join("\n\n")
      console.log("🧠 [KB-KEYWORDS] Generated business description length:", businessDescription.length)

      // Create refinement text that focuses on customer targeting
      const refinement = aiDescription.trim() 
        ? `Based on our knowledge base, generate keywords to find customers who ${aiDescription}. Focus on problems our business solves.`
        : "Based on our knowledge base, generate keywords to find potential customers who might need our products or services. Focus on problems we solve and customer pain points."

      console.log("🧠 [KB-KEYWORDS] Refinement text:", refinement)

      // Generate keywords using the knowledge base info as business description
      const keywordsResult = await generateKeywordsAction({
        website: currentOrganization.website || "",
        businessDescription: businessDescription,
        refinement: refinement,
        organizationId: currentOrganization.id
      })

      if (keywordsResult.isSuccess) {
        console.log("🧠 [KB-KEYWORDS] ✅ Generated", keywordsResult.data.keywords.length, "keywords from knowledge base")
        setGeneratedKeywords(keywordsResult.data.keywords.join("\n"))
        toast.success(`Generated ${keywordsResult.data.keywords.length} keywords from your knowledge base!`)
      } else {
        throw new Error(keywordsResult.message || "Failed to generate keywords")
      }
    } catch (error) {
      console.error("🧠 [KB-KEYWORDS] Error:", error)
      toast.error("Failed to generate keywords from knowledge base")
    } finally {
      setIsGeneratingFromKnowledgeBase(false)
    }
  }

  const handleFindLeads = async () => {
    const keywordLimits: Record<string, number> = { ...selectedKeywords }

    // Add manual keywords if provided
    const manualKeywordsList = manualKeywords
      .split("\n")
      .map(k => k.trim())
      .filter(k => k.length > 0)

    // Add generated keywords if provided
    const generatedKeywordsList = generatedKeywords
      .split("\n")
      .map(k => k.trim())
      .filter(k => k.length > 0)

    // Add new keywords with the selected posts per keyword count
    ;[...manualKeywordsList, ...generatedKeywordsList].forEach(keyword => {
      if (!keywordLimits[keyword]) {
        keywordLimits[keyword] = postsPerKeyword
      }
    })

    if (Object.keys(keywordLimits).length === 0) {
      toast.error("Please select keywords or add new ones")
      return
    }

    if (!campaignId) {
      toast.error("Please select a campaign first")
      return
    }

    setIsFindingLeads(true)
    // Close the dialog immediately so the user can see the progress bar
    setIsOpen(false)
    onFindingLeads?.()

    try {
      console.log("🔍 Finding leads with limits:", keywordLimits)
      console.log("🔍 Time filter:", timeFilter)

      const result = await runLeadGenerationWorkflowWithLimitsAction(
        campaignId,
        keywordLimits,
        timeFilter
      )

      if (result.isSuccess) {
        const totalPosts = Object.values(keywordLimits).reduce(
          (a, b) => a + b,
          0
        )
        toast.success(`Scoring ${totalPosts} threads!`, {
          description: "New leads will appear as they're discovered"
        })
        setNewKeywords("")
        setThreadsPerKeyword({})
        setAiRefinementInput("")
        setSelectedKeywords({})
        setGeneratedKeywords("")
        setManualKeywords("")

        // Reload the keyword stats after a delay
        setTimeout(() => {
          window.location.reload()
        }, 3000)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("Error finding leads:", error)
      toast.error("Failed to start lead generation")
    } finally {
      setIsFindingLeads(false)
    }
  }

  const handleThreadCountChange = (keyword: string, value: string) => {
    if (value === "0") {
      const newThreadsPerKeyword = { ...threadsPerKeyword }
      delete newThreadsPerKeyword[keyword]
      setThreadsPerKeyword(newThreadsPerKeyword)
    } else {
      setThreadsPerKeyword({
        ...threadsPerKeyword,
        [keyword]: parseInt(value)
      })
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-amber-600"
    return "text-gray-600"
  }

  const totalThreadsToScore =
    Object.values(selectedKeywords).reduce((a, b) => a + b, 0) +
    manualKeywords.split("\n").filter(k => k.trim()).length * postsPerKeyword +
    generatedKeywords.split("\n").filter(k => k.trim()).length * postsPerKeyword

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="border-b bg-gray-50/30 p-4 dark:bg-gray-900/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="size-4 text-blue-500" />
              Keyword Insights
            </CardTitle>
            <CardDescription className="text-sm">
              Monitor keyword performance and discover new opportunities
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={disabled || !campaignId}
                className="gap-2 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              >
                <Activity className="size-4" />
                Find More Posts
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Generate Keywords & Find Posts</DialogTitle>
                <DialogDescription>
                  Generate new keywords with AI and find more Reddit posts for your leads
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-6">
                {/* Current Campaign Info */}
                {keywords.length > 0 && (
                  <Alert>
                    <Info className="size-4" />
                    <AlertDescription>
                      <strong>Current keywords:</strong> {keywords.join(", ")}
                      <br />
                      <span className="text-muted-foreground mt-1 text-xs">
                        New posts will be added to your existing collection
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                {/* AI Keyword Generation Section */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="size-4" />
                    Generate Keywords from Scratch w/ AI
                  </Label>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">
                      Describe what kind of customers you're looking for (optional)
                    </Label>
                    <Textarea
                      placeholder="E.g., people looking for recommendations for large group event venues in the Dominican Republic like weddings and large family get togethers"
                      value={aiDescription}
                      onChange={e => setAiDescription(e.target.value)}
                      className="min-h-[80px] text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={keywordCount}
                      onChange={(e) => setKeywordCount(parseInt(e.target.value) || 5)}
                      className="w-20"
                      placeholder="5"
                    />
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={handleGenerateKeywords}
                      disabled={isGeneratingKeywords || isGeneratingFromKnowledgeBase || !aiDescription.trim()}
                    >
                      {isGeneratingKeywords ? (
                        <>
                          <Loader2 className="size-3 animate-spin" />
                          Generating keywords...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3" />
                          Generate {keywordCount} keywords with AI
                        </>
                      )}
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleGenerateKeywordsFromKnowledgeBase}
                    disabled={isGeneratingFromKnowledgeBase || isGeneratingKeywords}
                  >
                    {isGeneratingFromKnowledgeBase ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        Generating from knowledge base...
                      </>
                    ) : (
                      <>
                        <Brain className="size-3" />
                        Generate from Knowledge Base
                      </>
                    )}
                  </Button>
                </div>

                {/* Generated Keywords Section */}
                {generatedKeywords && (
                  <div className="space-y-3">
                    <Label>Generated Keywords (Click to Edit)</Label>
                    <div className="space-y-2">
                      {generatedKeywords.split("\n").filter(k => k.trim()).map((keyword, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={keyword}
                            onChange={(e) => {
                              const keywords = generatedKeywords.split("\n")
                              keywords[index] = e.target.value
                              setGeneratedKeywords(keywords.join("\n"))
                            }}
                            className="flex-1 text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const keywords = generatedKeywords.split("\n").filter(k => k.trim())
                              keywords.splice(index, 1)
                              setGeneratedKeywords(keywords.join("\n"))
                            }}
                          >
                            <XCircle className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGeneratedKeywords(generatedKeywords + "\n")}
                      className="gap-2"
                    >
                      <Plus className="size-3" />
                      Add keyword
                    </Button>
                  </div>
                )}

                {/* Manual Entry Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Manual Keywords</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowManualEntry(!showManualEntry)}
                    >
                      {showManualEntry ? "Hide" : "Show"} Manual Entry
                    </Button>
                  </div>

                  {showManualEntry && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="budget travel tips Dominican Republic
luxury beach resorts DR
Dominican Republic vacation planning
best time to visit DR beaches"
                        value={manualKeywords}
                        onChange={e => setManualKeywords(e.target.value)}
                        className="min-h-[100px] font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500">
                        Enter one keyword per line. Each keyword will score posts.
                      </p>
                    </div>
                  )}
                </div>

                {/* Posts per keyword selector */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Hash className="size-4" />
                    Posts per keyword
                  </Label>
                  <Select
                    value={postsPerKeyword.toString()}
                    onValueChange={(value) => setPostsPerKeyword(parseInt(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 post per keyword</SelectItem>
                      <SelectItem value="5">5 posts per keyword</SelectItem>
                      <SelectItem value="10">10 posts per keyword (Recommended)</SelectItem>
                      <SelectItem value="15">15 posts per keyword</SelectItem>
                      <SelectItem value="20">20 posts per keyword</SelectItem>
                      <SelectItem value="25">25 posts per keyword</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    How many Reddit posts to analyze for each keyword
                  </p>
                </div>

                {/* Time Filter Section - moved lower */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Calendar className="size-4" />
                    Time Period
                  </Label>
                  <Select
                    value={timeFilter}
                    onValueChange={(value: any) => setTimeFilter(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">Past Hour</SelectItem>
                      <SelectItem value="day">Past 24 Hours</SelectItem>
                      <SelectItem value="week">Past Week</SelectItem>
                      <SelectItem value="month">Past Month</SelectItem>
                      <SelectItem value="year">Past Year</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Only search for posts within this time period
                  </p>
                </div>

                {/* Performance Recommendations - collapsed by default */}
                {recommendedKeywords.length > 0 && (
                  <div className="space-y-3">
                    <details className="group">
                      <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                        <Target className="size-4" />
                        Performance Recommendations ({recommendedKeywords.length})
                        <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="mt-3 space-y-2">
                        <Alert>
                          <CheckCircle2 className="size-4" />
                          <AlertDescription>
                            Based on performance, we recommend scoring more threads
                            for these high-performing keywords:
                          </AlertDescription>
                        </Alert>
                        {recommendedKeywords.map(({ keyword, recommendation }) => (
                          <div
                            key={keyword}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-2">
                              <recommendation.icon
                                className={`size-4 ${recommendation.color}`}
                              />
                              <span className="text-sm font-medium">
                                {keyword}
                              </span>
                            </div>
                            <Badge variant="secondary" className="gap-1">
                              +{recommendation.posts} threads
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}

                <Alert>
                  <Info className="size-4" />
                  <AlertDescription className="text-xs">
                    Reddit API allows 100 requests per minute. We'll
                    automatically pace requests to stay within limits.
                  </AlertDescription>
                </Alert>

                {/* Summary */}
                {totalThreadsToScore > 0 && (
                  <Alert>
                    <Search className="size-4" />
                    <AlertDescription>
                      <strong>Ready to score:</strong> {totalThreadsToScore}{" "}
                      threads total
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleFindLeads}
                  disabled={isFindingLeads}
                  className="gap-2"
                >
                  {isFindingLeads ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Finding Leads...
                    </>
                  ) : (
                    <>
                      <Search className="size-4" />
                      Find Leads
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      {campaignId && keywordStats.length > 0 && (
        <CardContent className="p-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Hash className="size-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {keywords.length} keywords active
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-green-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {keywordStats.reduce(
                  (sum, stat) => sum + stat.highQualityPosts,
                  0
                )}{" "}
                high-quality leads
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="size-4 text-amber-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {Math.round(
                  keywordStats.reduce(
                    (sum, stat) => sum + stat.averageScore,
                    0
                  ) / keywordStats.length
                )}
                % avg score
              </span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
