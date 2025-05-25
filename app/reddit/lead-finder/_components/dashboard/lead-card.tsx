"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ExternalLink,
  Edit2,
  Save,
  Send,
  Clock,
  Eye,
  MessageSquare,
  User,
  ThumbsUp,
  TrendingUp,
  Sparkles,
  Copy,
  Check,
  Hash,
  ChevronDown,
  ChevronRight,
  X,
  PlusCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AnimatedCopyButton from "../animated-copy-button";
import PostDetailPopup from "../post-detail-popup";
import { LeadResult } from "./types";

interface LeadCardProps {
  lead: LeadResult;
  onEdit: (leadId: string, newComment: string) => Promise<void>;
  onPost: (lead: LeadResult) => Promise<void>;
  onQueue: (lead: LeadResult) => Promise<void>;
  onViewComments?: (lead: LeadResult) => void;
  isPosting?: boolean;
  isQueueing?: boolean;
  selectedLength: "micro" | "medium" | "verbose";
}

export default function LeadCard({
  lead,
  onEdit,
  onPost,
  onQueue,
  onViewComments,
  isPosting,
  isQueueing,
  selectedLength
}: LeadCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedComment, setEditedComment] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [isAIAnalysisOpen, setIsAIAnalysisOpen] = useState(false);

  const currentComment = lead[`${selectedLength}Comment`] as string || lead.microComment;

  const handleStartEdit = () => {
    setEditedComment(currentComment);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (editedComment.trim() && editedComment !== currentComment) {
      await onEdit(lead.id, editedComment);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedComment("");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentComment);
      setCopied(true);
      toast.success("Comment copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy comment");
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800";
    if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800";
    return "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950 dark:border-gray-800";
  };

  const getStatusBadge = () => {
    switch (lead.status) {
      case "posted":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Posted</Badge>;
      case "queued":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">In Queue</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return null;
    }
  };

  // Format the timeAgo to show actual time
  const formatTimeAgo = () => {
    // If we have createdAt ISO string, use it to show the real time
    if (lead.createdAt) {
      const date = new Date(lead.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffHours < 1) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes}m ago`;
      } else if (diffDays < 1) {
        return `${diffHours}h ago`;
      } else {
        return `${diffDays}d ago`;
      }
    }
    return lead.timeAgo;
  };

  return (
    <>
      <Card className="overflow-hidden transition-all hover:shadow-lg">
        <CardContent className="space-y-4 p-6">
          {/* Header with match score and status */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge 
                variant="outline" 
                className={cn("px-3 py-1 text-sm font-semibold", getMatchColor(lead.relevanceScore))}
              >
                {lead.relevanceScore}% Match
              </Badge>
              {getStatusBadge()}
            </div>
          </div>

          {/* Post Title */}
          <a 
            href={lead.postUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="group cursor-pointer"
          >
            <h3 className="line-clamp-2 text-lg font-semibold text-gray-900 transition-colors group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
              {lead.postTitle}
            </h3>
          </a>

          {/* Generated Comment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Generated Comment</p>
              {!isEditing && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 px-2 text-xs"
                  >
                    {copied ? (
                      <Check className="size-3" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartEdit}
                    className="h-7 px-2 text-xs"
                  >
                    <Edit2 className="size-3" />
                  </Button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedComment}
                  onChange={(e) => setEditedComment(e.target.value)}
                  className="min-h-[100px] resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Save className="mr-1 size-3" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    <X className="mr-1 size-3" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {currentComment}
                </p>
              </div>
            )}
          </div>

          {/* Expandable AI Analysis */}
          <Collapsible open={isAIAnalysisOpen} onOpenChange={setIsAIAnalysisOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="size-3" />
                  AI Analysis
                </span>
                {isAIAnalysisOpen ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {lead.reasoning}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Meta information */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>r/{lead.subreddit}</span>
            <span>•</span>
            <span>u/{lead.postAuthor}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="size-3" />
              {lead.postScore || 0}
            </span>
            <span>•</span>
            <span>{formatTimeAgo()}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPostDetail(true)}
              className="flex-1"
            >
              <Eye className="mr-2 size-4" />
              View Context
            </Button>
            
            {lead.status !== "posted" && lead.status !== "queued" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onQueue(lead)}
                disabled={isQueueing}
                className="flex-1"
              >
                {isQueueing ? (
                  <Clock className="mr-2 size-4 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 size-4" />
                )}
                Add to Queue
              </Button>
            )}
            
            <Button
              size="sm"
              onClick={() => onPost(lead)}
              disabled={isPosting || lead.status === "posted"}
              className={cn(
                "flex-1",
                lead.status === "posted" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {isPosting ? (
                <Clock className="mr-2 size-4 animate-spin" />
              ) : lead.status === "posted" ? (
                <>
                  <Check className="mr-2 size-4" />
                  Posted
                </>
              ) : (
                <>
                  <Send className="mr-2 size-4" />
                  Post Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Post Detail Popup */}
      {showPostDetail && (
        <PostDetailPopup
          open={showPostDetail}
          onOpenChange={setShowPostDetail}
          lead={lead}
        />
      )}
    </>
  );
} 