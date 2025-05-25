"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Target, RefreshCw } from "lucide-react";
import { WorkflowProgress } from "./types"; // Import from dashboard types
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Plus,
  Sparkles,
  ChevronDown,
  Edit2
} from "lucide-react";

interface DashboardHeaderProps {
  campaignName?: string;
  campaignId: string | null;
  totalLeads: number;
  queuedLeads: number;
  postedLeads: number;
  onCreateCampaign: () => void;
  onRunWorkflow: () => void;
  isWorkflowRunning: boolean;
  onGenerateComments?: () => void;
}

export default function DashboardHeader({
  campaignName,
  campaignId,
  totalLeads,
  queuedLeads,
  postedLeads,
  onCreateCampaign,
  onRunWorkflow,
  isWorkflowRunning,
  onGenerateComments
}: DashboardHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Campaign Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Lead Finder</h1>
            {campaignId && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 border border-blue-200 dark:border-blue-800">
                <Sparkles className="size-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {campaignName || "Untitled Campaign"}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ChevronDown className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Campaign Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => toast.info("Campaign editing coming soon!")}>
                      <Edit2 className="mr-2 size-4" />
                      Edit Campaign
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onCreateCampaign}>
                      <Plus className="mr-2 size-4" />
                      New Campaign
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          <p className="text-muted-foreground">
            Find and engage with potential customers on Reddit
          </p>
        </div>
        <div className="flex gap-2">
          {onGenerateComments && (
            <Button
              onClick={onGenerateComments}
              variant="outline"
              className="gap-2"
            >
              <MessageSquare className="size-4" />
              Generate Comments
            </Button>
          )}
          <Button
            onClick={onRunWorkflow}
            disabled={!campaignId || isWorkflowRunning}
            className="gap-2"
          >
            <Play className="size-4" />
            {isWorkflowRunning ? "Running..." : "Find New Leads"}
          </Button>
          <Button
            onClick={onCreateCampaign}
            variant="outline"
            className="gap-2"
          >
            <Plus className="size-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Total Leads</p>
              <p className="text-2xl font-bold">{totalLeads}</p>
            </div>
            <Target className="text-muted-foreground size-8" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">In Queue</p>
              <p className="text-2xl font-bold">{queuedLeads}</p>
            </div>
            <Clock className="text-muted-foreground size-8" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Posted</p>
              <p className="text-2xl font-bold">{postedLeads}</p>
            </div>
            <CheckCircle2 className="text-muted-foreground size-8" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 