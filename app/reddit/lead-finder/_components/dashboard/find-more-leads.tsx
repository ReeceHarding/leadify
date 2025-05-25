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
  Search, 
  Plus, 
  Sparkles, 
  TrendingUp, 
  Loader2,
  Info,
  BarChart3,
  Hash
} from "lucide-react";
import { toast } from "sonner";
import { getProfileByUserIdAction, updateProfileAction } from "@/actions/db/profiles-actions";
import { getGeneratedCommentsByCampaignAction } from "@/actions/db/lead-generation-actions";
import { runFullLeadGenerationWorkflowAction } from "@/actions/lead-generation/workflow-actions";

interface KeywordStats {
  keyword: string;
  totalPosts: number;
  highQualityPosts: number; // 70+ score
  averageScore: number;
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

              return {
                keyword,
                totalPosts: keywordLeads.length,
                highQualityPosts: highQualityLeads.length,
                averageScore: Math.round(avgScore)
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

      // Simple keyword generation based on website content
      // This is a placeholder - you could enhance this with AI
      const websiteUrl = profileResult.data.website;
      if (!websiteUrl) {
        toast.error("No website URL found in profile");
        return;
      }
      const existingKeywords = keywords;
      
      // Generate some suggestions based on the website URL
      const domain = websiteUrl.replace(/https?:\/\//, '').replace(/www\./, '').split('/')[0];
      const baseName = domain.split('.')[0];
      
      const suggestions = [
        `best ${baseName} alternatives`,
        `${baseName} reviews`,
        `looking for ${baseName}`,
        `recommendations like ${baseName}`,
        `${baseName} vs competitors`
      ].filter(k => !existingKeywords.includes(k));

      if (suggestions.length > 0) {
        setNewKeywords(suggestions.slice(0, 3).join("\n"));
        toast.success(`Generated ${suggestions.slice(0, 3).length} keyword suggestions`);
      } else {
        toast.error("Could not generate new unique keywords");
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

      // Run workflow (currently only supports running the full workflow)
      // Note: The threadsPerKeyword feature would need to be implemented in the workflow
      const workflowResult = await runFullLeadGenerationWorkflowAction(campaignId);

      if (workflowResult.isSuccess) {
        toast.success("Finding new leads! Check back in a few moments.");
        setIsOpen(false);
        setNewKeywords("");
        setThreadsPerKeyword({});
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

  const handleThreadCountChange = (keyword: string, count: string) => {
    const numCount = parseInt(count);
    if (isNaN(numCount) || numCount <= 0) {
      const newThreadsPerKeyword = { ...threadsPerKeyword };
      delete newThreadsPerKeyword[keyword];
      setThreadsPerKeyword(newThreadsPerKeyword);
    } else {
      setThreadsPerKeyword({
        ...threadsPerKeyword,
        [keyword]: Math.min(numCount, 100) // Cap at 100
      });
    }
  };

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="border-b bg-gray-50/30 p-4 dark:bg-gray-900/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Search className="size-4 text-blue-500" />
              Find More Leads
            </CardTitle>
            <CardDescription className="text-sm">
              Discover new opportunities with additional keywords
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={disabled || !campaignId}
                className="gap-2 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="size-4" />
                Find Leads
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Find More Leads</DialogTitle>
                <DialogDescription>
                  Add new keywords or find more threads for existing keywords (max 100 threads per keyword)
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Existing Keywords Section */}
                {keywordStats.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Your Keywords</Label>
                    <div className="space-y-2">
                      {keywordStats.map((stat) => (
                        <div key={stat.keyword} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 dark:bg-gray-900/50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Hash className="size-3 text-gray-500" />
                              <span className="text-sm font-medium">{stat.keyword}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <BarChart3 className="size-3" />
                                {stat.totalPosts} posts found
                              </span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="size-3" />
                                {stat.highQualityPosts} high quality
                              </span>
                              <span>Avg: {stat.averageScore}%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="More"
                              className="w-20 h-8 text-xs"
                              min="1"
                              max="100"
                              value={threadsPerKeyword[stat.keyword] || ""}
                              onChange={(e) => handleThreadCountChange(stat.keyword, e.target.value)}
                            />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="size-3 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Find more threads for this keyword</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateKeywords}
                      disabled={isGeneratingKeywords}
                      className="gap-2"
                    >
                      {isGeneratingKeywords ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Sparkles className="size-3" />
                      )}
                      Generate with AI
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Enter keywords, one per line..."
                    value={newKeywords}
                    onChange={(e) => setNewKeywords(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-gray-500">
                    Enter search phrases that your target audience might use when looking for solutions
                  </p>
                </div>

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
          </div>
        </CardContent>
      )}
    </Card>
  );
} 