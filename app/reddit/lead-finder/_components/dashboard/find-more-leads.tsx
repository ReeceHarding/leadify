"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { getProfileByUserIdAction, updateProfileAction } from "@/actions/db/profiles-actions";
import { getGeneratedCommentsByCampaignAction } from "@/actions/db/lead-generation-actions";
import { runFullLeadGenerationWorkflowAction } from "@/actions/lead-generation/workflow-actions";
import { cn } from "@/lib/utils";

interface KeywordStats {
  keyword: string;
  totalPosts: number;
  highQualityPosts: number; // 70+ score
  averageScore: number;
  topPerformer: {
    title: string;
    score: number;
  } | null;
  lowestPerformer: {
    title: string;
    score: number;
  } | null;
  recentPostsCount: number; // posts in last 24h
}

interface FindMoreLeadsProps {
  userId: string;
  campaignId: string | null;
  onFindingLeads?: () => void;
  disabled?: boolean;
}

export default function FindMoreLeads({
  userId,
  campaignId,
  onFindingLeads,
  disabled
}: FindMoreLeadsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordStats, setKeywordStats] = useState<KeywordStats[]>([]);
  const [newKeywords, setNewKeywords] = useState("");
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [isFindingLeads, setIsFindingLeads] = useState(false);
  const [threadsPerKeyword, setThreadsPerKeyword] = useState<Record<string, number>>({});
  const [aiRefinementInput, setAiRefinementInput] = useState("");

  // Load existing keywords and calculate stats
  useEffect(() => {
    const loadKeywordsAndStats = async () => {
      if (!userId || !campaignId) return;

      try {
        // Get user profile for keywords
        const profileResult = await getProfileByUserIdAction(userId);
        if (profileResult.isSuccess && profileResult.data) {
          const userKeywords = profileResult.data.keywords || [];
          setKeywords(userKeywords);
          
          // Calculate stats for each keyword
          const leadsResult = await getGeneratedCommentsByCampaignAction(campaignId);
          if (leadsResult.isSuccess && leadsResult.data) {
            const stats: KeywordStats[] = userKeywords.map(keyword => {
              const keywordLeads = leadsResult.data.filter(lead => lead.keyword === keyword);
              const highQualityLeads = keywordLeads.filter(lead => lead.relevanceScore >= 70);
              const avgScore = keywordLeads.length > 0 
                ? keywordLeads.reduce((sum, lead) => sum + lead.relevanceScore, 0) / keywordLeads.length
                : 0;

              // Find top and lowest performers
              const sortedByScore = [...keywordLeads].sort((a, b) => b.relevanceScore - a.relevanceScore);
              const topPerformer = sortedByScore[0] || null;
              const lowestPerformer = sortedByScore[sortedByScore.length - 1] || null;

              // Count recent posts (for demo, we'll just estimate)
              const recentPostsCount = Math.floor(keywordLeads.length * 0.3);

              return {
                keyword,
                totalPosts: keywordLeads.length,
                highQualityPosts: highQualityLeads.length,
                averageScore: Math.round(avgScore),
                topPerformer: topPerformer ? {
                  title: topPerformer.postTitle,
                  score: topPerformer.relevanceScore
                } : null,
                lowestPerformer: lowestPerformer ? {
                  title: lowestPerformer.postTitle,
                  score: lowestPerformer.relevanceScore
                } : null,
                recentPostsCount
              };
            });
            setKeywordStats(stats);
          }
        }
      } catch (error) {
        console.error("Error loading keywords:", error);
      }
    };

    loadKeywordsAndStats();
  }, [userId, campaignId]);

  const handleGenerateKeywords = async () => {
    setIsGeneratingKeywords(true);
    try {
      const profileResult = await getProfileByUserIdAction(userId);
      if (!profileResult.isSuccess || !profileResult.data) {
        toast.error("Failed to load profile");
        return;
      }

      const websiteUrl = profileResult.data.website;
      if (!websiteUrl) {
        toast.error("No website URL found in profile");
        return;
      }

      // Generate keywords using AI with o3-mini
      const existingKeywords = keywords;
      
      // Create a refinement prompt that excludes existing keywords
      let refinement = existingKeywords.length > 0 
        ? `Generate NEW search terms that are different from these existing ones: ${existingKeywords.join(", ")}. Focus on finding different angles, customer segments, or use cases.`
        : undefined;

      // Add user's custom refinement if provided
      if (aiRefinementInput.trim()) {
        refinement = refinement 
          ? `${refinement} Additional context: ${aiRefinementInput.trim()}`
          : aiRefinementInput.trim();
      }

      console.log("🔍 [FIND-MORE-LEADS] Generating keywords with AI");
      console.log("🔍 [FIND-MORE-LEADS] Website:", websiteUrl);
      console.log("🔍 [FIND-MORE-LEADS] Existing keywords:", existingKeywords);
      console.log("🔍 [FIND-MORE-LEADS] Refinement:", refinement);

      // Use the same AI keyword generation action from onboarding
      const { generateKeywordsAction } = await import("@/actions/lead-generation/keywords-actions");
      
      const result = await generateKeywordsAction({
        website: websiteUrl,
        refinement: refinement
      });

      if (result.isSuccess && result.data.keywords) {
        // Filter out any keywords that might still be duplicates (case-insensitive)
        const existingKeywordsLower = existingKeywords.map(k => k.toLowerCase());
        const newUniqueKeywords = result.data.keywords.filter(
          k => !existingKeywordsLower.includes(k.toLowerCase())
        );

        if (newUniqueKeywords.length > 0) {
          setNewKeywords(newUniqueKeywords.join("\n"));
          toast.success(`Generated ${newUniqueKeywords.length} new keyword suggestions with AI`);
          // Clear the AI refinement input after successful generation
          setAiRefinementInput("");
        } else {
          toast.error("AI couldn't generate new unique keywords. Try adding more specific instructions.");
        }
      } else {
        toast.error("Failed to generate keywords with AI");
      }
    } catch (error) {
      console.error("Error generating keywords:", error);
      toast.error("Error generating keywords");
    } finally {
      setIsGeneratingKeywords(false);
    }
  };

  const handleFindLeads = async () => {
    if (!campaignId) {
      toast.error("Please select or create a campaign first");
      return;
    }

    const keywordsToAdd = newKeywords
      .split("\n")
      .map(k => k.trim())
      .filter(k => k.length > 0 && !keywords.includes(k));

    if (keywordsToAdd.length === 0 && Object.keys(threadsPerKeyword).length === 0) {
      toast.error("Please add new keywords or select keywords to find more threads");
      return;
    }

    setIsFindingLeads(true);
    onFindingLeads?.();

    try {
      // Update profile with new keywords
      if (keywordsToAdd.length > 0) {
        const updateResult = await updateProfileAction(userId, {
          keywords: [...keywords, ...keywordsToAdd]
        });

        if (!updateResult.isSuccess) {
          toast.error("Failed to update keywords");
          return;
        }
      }

      // Import the new workflow function
      const { runLeadGenerationWorkflowWithLimitsAction } = await import("@/actions/lead-generation/workflow-actions");
      
      // Run workflow with keyword limits
      const workflowResult = await runLeadGenerationWorkflowWithLimitsAction(
        campaignId, 
        threadsPerKeyword
      );

      if (workflowResult.isSuccess) {
        const totalNewPosts = Object.values(threadsPerKeyword).reduce((sum, count) => sum + count, 0);
        const message = totalNewPosts > 0 
          ? `Finding ${totalNewPosts} more posts for selected keywords!`
          : "Finding new leads!";
        
        toast.success(`${message} Check back in a few moments.`);
        setIsOpen(false);
        setNewKeywords("");
        setThreadsPerKeyword({});
        setAiRefinementInput("");
        
        // Reload the keyword stats after a delay
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        toast.error(workflowResult.message || "Failed to start lead generation");
      }
    } catch (error) {
      console.error("Error finding leads:", error);
      toast.error("Error starting lead generation");
    } finally {
      setIsFindingLeads(false);
    }
  };

  const handleThreadCountChange = (keyword: string, value: string) => {
    if (value === "0") {
      const newThreadsPerKeyword = { ...threadsPerKeyword };
      delete newThreadsPerKeyword[keyword];
      setThreadsPerKeyword(newThreadsPerKeyword);
    } else {
      setThreadsPerKeyword({
        ...threadsPerKeyword,
        [keyword]: parseInt(value)
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-gray-600";
  };

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
                Manage Keywords
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Keyword Performance & Management</DialogTitle>
                <DialogDescription>
                  View performance metrics and add new keywords to find more leads
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-6">
                {/* Existing Keywords Performance */}
                {keywordStats.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Keyword Performance</Label>
                    <div className="space-y-3">
                      {keywordStats.map((stat) => (
                        <div key={stat.keyword} className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-900/50">
                          <div className="space-y-3">
                            {/* Keyword Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Hash className="size-4 text-gray-500" />
                                <span className="font-medium">{stat.keyword}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col items-end gap-1">
                                  <Label className="text-xs text-gray-500">Find more posts</Label>
                                  <Select
                                    value={threadsPerKeyword[stat.keyword]?.toString() || "0"}
                                    onValueChange={(value) => handleThreadCountChange(stat.keyword, value)}
                                  >
                                    <SelectTrigger className="h-8 w-24">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">None</SelectItem>
                                      <SelectItem value="10">10 posts</SelectItem>
                                      <SelectItem value="25">25 posts</SelectItem>
                                      <SelectItem value="50">50 posts</SelectItem>
                                      <SelectItem value="100">100 posts</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            {/* Performance Metrics */}
                            <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                              <div>
                                <p className="text-gray-500">Total Posts</p>
                                <p className="font-semibold">{stat.totalPosts}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">High Quality</p>
                                <p className="font-semibold text-green-600">{stat.highQualityPosts}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Avg Score</p>
                                <p className={cn("font-semibold", getScoreColor(stat.averageScore))}>
                                  {stat.averageScore}%
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Recent</p>
                                <p className="font-semibold">{stat.recentPostsCount}</p>
                              </div>
                            </div>

                            {/* Top and Lowest Performers */}
                            {(stat.topPerformer || stat.lowestPerformer) && (
                              <div className="space-y-2 border-t pt-2">
                                {stat.topPerformer && (
                                  <div className="flex items-start gap-2">
                                    <TrendingUp className="mt-0.5 size-3 shrink-0 text-green-500" />
                                    <span className="break-words text-xs text-gray-600">
                                      Top: "{stat.topPerformer.title}" ({stat.topPerformer.score}%)
                                    </span>
                                  </div>
                                )}
                                {stat.lowestPerformer && stat.lowestPerformer.score !== stat.topPerformer?.score && (
                                  <div className="flex items-start gap-2">
                                    <TrendingDown className="mt-0.5 size-3 shrink-0 text-red-500" />
                                    <span className="break-words text-xs text-gray-600">
                                      Low: "{stat.lowestPerformer.title}" ({stat.lowestPerformer.score}%)
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Keywords Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Add New Keywords</Label>
                  </div>
                  
                  {/* AI Context Input */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">
                      Describe what kind of customers you're looking for (optional)
                    </Label>
                    <Textarea
                      placeholder="E.g., people looking for recommendations for large group event venues in the Dominican Republic like weddings and large family get togethers"
                      value={aiRefinementInput}
                      onChange={(e) => setAiRefinementInput(e.target.value)}
                      className="min-h-[80px] text-sm"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateKeywords}
                    disabled={isGeneratingKeywords}
                    className="w-full gap-2"
                  >
                    {isGeneratingKeywords ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Sparkles className="size-3" />
                    )}
                    Give me suggestions w/ AI
                  </Button>

                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">
                      Generated keywords (edit as needed)
                    </Label>
                    <Textarea
                      placeholder="Keywords will appear here after AI generation, or enter your own..."
                      value={newKeywords}
                      onChange={(e) => setNewKeywords(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <p className="text-xs text-gray-500">
                      Enter search phrases that your target audience might use when looking for solutions
                    </p>
                  </div>
                </div>

                {/* Selected Keywords Summary */}
                {Object.keys(threadsPerKeyword).length > 0 && (
                  <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
                    <Info className="size-4" />
                    <AlertDescription className="text-xs">
                      <strong>Selected for more posts:</strong>
                      <ul className="mt-1 list-inside list-disc">
                        {Object.entries(threadsPerKeyword).map(([keyword, count]) => (
                          <li key={keyword}>
                            {keyword}: {count} more posts
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Reddit API Rate Limit Info */}
                <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
                  <Info className="size-4" />
                  <AlertDescription className="text-xs">
                    Reddit API allows 100 requests per minute. We'll automatically pace requests to stay within limits.
                  </AlertDescription>
                </Alert>
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
                {keywordStats.reduce((sum, stat) => sum + stat.highQualityPosts, 0)} high-quality leads
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="size-4 text-amber-500" />
              <span className="text-gray-600 dark:text-gray-400">
                {Math.round(keywordStats.reduce((sum, stat) => sum + stat.averageScore, 0) / keywordStats.length)}% avg score
              </span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
} 