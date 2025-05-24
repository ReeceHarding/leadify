"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";
import { WorkflowProgress } from "./types"; // Import from dashboard types

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
  onNewCampaignClick
}: DashboardHeaderProps) {
  return (
    <div className="bg-card mb-6 rounded-lg border p-4 shadow-sm dark:border-gray-700">
      {/* Polling Status Indicator - Show only if a campaign is active */}
      {campaignId && (
        <div className="mb-3 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <div
              className={`size-2 rounded-full ${
                isPolling ? "animate-pulse bg-green-500" : "bg-gray-400"
              }`}
            />
            <span className="text-gray-600 dark:text-gray-400">
              {isPolling
                ? "Checking for new leads..."
                : "Auto-refresh active (every 5 seconds)"}
            </span>
          </div>
          {lastPolledAt && (
            <span className="text-gray-500 dark:text-gray-500">
              Last checked: {new Date(lastPolledAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={onTabChange as any}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid grid-cols-2 self-start rounded-lg bg-gray-100 p-1 sm:w-auto dark:bg-gray-800">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-md px-3 py-1.5 text-sm font-medium data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700"
            >
              All Leads
            </TabsTrigger>
            <TabsTrigger
              value="queue"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-md px-3 py-1.5 text-sm font-medium data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700"
            >
              Queue ({approvedLeadsCount})
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

            <Select value={selectedCommentLength} onValueChange={onCommentLengthChange as any}>
              <SelectTrigger className="h-9 w-[130px] rounded-md border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700">
                <SelectValue placeholder="Comment Length" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="micro">Micro</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="verbose">Verbose</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={onNewCampaignClick}
              className="h-9 gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow-lg"
            >
              <Plus className="size-4" />
              New Campaign
            </Button>
          </div>
        </div>
      </Tabs>
    </div>
  );
} 