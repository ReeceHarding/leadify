"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Target, RefreshCw } from "lucide-react";
import { WorkflowProgress } from "./types"; // Import from dashboard types
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardHeaderProps {
  campaignId: string | null;
  leadsCount: number; // To show in queue tab or for other conditional rendering
  approvedLeadsCount: number;
  isPolling: boolean;
  lastPolledAt: Date | null;
  activeTab: "all" | "queue";
  onTabChange: (value: "all" | "queue") => void;
  workflowProgressError?: string; // For the onboarding button
  onCompleteOnboardingClick: () => void;
  selectedCommentLength: "micro" | "medium" | "verbose";
  onCommentLengthChange: (value: "micro" | "medium" | "verbose") => void;
  onNewCampaignClick: () => void;
  workflowRunning?: boolean; // Add this prop
}

export default function DashboardHeader({
  campaignId,
  leadsCount,
  approvedLeadsCount,
  isPolling,
  lastPolledAt,
  activeTab,
  onTabChange,
  workflowProgressError,
  onCompleteOnboardingClick,
  selectedCommentLength,
  onCommentLengthChange,
  onNewCampaignClick,
  workflowRunning = false
}: DashboardHeaderProps) {
  return (
    <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-900">
      {/* Polling Status Indicator - Show only when workflow is running */}
      {campaignId && workflowRunning && (
        <div className="mb-3 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <div className="size-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Finding new leads (real-time updates active)
            </span>
          </div>
          {lastPolledAt && (
            <span className="text-gray-500 dark:text-gray-500">
              Last update: {new Date(lastPolledAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={onTabChange as any}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid grid-cols-2 self-start rounded-lg bg-gray-100 p-1 sm:w-auto dark:bg-gray-800">
            <TabsTrigger
              value="all"
              className="rounded-md px-3 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-gray-100"
            >
              All Leads
            </TabsTrigger>
            <TabsTrigger
              value="queue"
              className="rounded-md px-3 py-1.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-gray-100"
            >
              Posting Queue ({approvedLeadsCount})
            </TabsTrigger>
          </TabsList>

          {/* Campaign Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Onboarding button (only show when no keywords error) */}
            {workflowProgressError?.includes("No keywords found") && (
              <Button
                variant="outline"
                onClick={onCompleteOnboardingClick}
                className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-900/20 dark:hover:text-orange-300"
              >
                <Target className="size-4" />
                Complete Onboarding
              </Button>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Select value={selectedCommentLength} onValueChange={onCommentLengthChange as any}>
                    <SelectTrigger className="h-9 w-[130px] rounded-md border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
                      <SelectValue placeholder="Comment Length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="micro">Micro (5-15 words)</SelectItem>
                      <SelectItem value="medium">Medium (30-80 words)</SelectItem>
                      <SelectItem value="verbose">Verbose (100-200 words)</SelectItem>
                    </SelectContent>
                  </Select>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Choose the default comment length for all leads</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onNewCampaignClick}
                    className="h-9 gap-2 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                  >
                    <RefreshCw className="size-4" />
                    Find New Leads
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Start a fresh search for Reddit posts matching your keywords</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </Tabs>
    </div>
  );
} 