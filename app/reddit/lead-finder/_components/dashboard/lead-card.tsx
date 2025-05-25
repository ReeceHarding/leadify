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
  Hash
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
  const [isSaving, setIsSaving] = useState(false);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  const getDisplayComment = () => {
    switch (selectedLength) {
      case "micro":
        return lead.microComment;
      case "verbose":
        return lead.verboseComment;
      default:
        return lead.mediumComment;
    }
  };

  const currentComment = getDisplayComment();

  const handleStartEdit = () => {
    setEditedComment(currentComment);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editedComment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      await onEdit(lead.id, editedComment);
      setIsEditing(false);
      toast.success("Comment updated successfully");
    } catch (error) {
      toast.error("Failed to save comment");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedComment("");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentComment);
    setCopied(true);
    toast.success("Comment copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-500/10 text-green-500 border-green-500/20";
    if (score >= 70) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    if (score >= 50) return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    return "bg-red-500/10 text-red-500 border-red-500/20";
  };

  const getStatusBadge = () => {
    switch (lead.status) {
      case "posted":
        return <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-500">Posted</Badge>
      case "queued":
        return <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-500">Queued</Badge>
      case "rejected":
        return <Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-500">Rejected</Badge>
      default:
        return <Badge variant="outline" className="border-gray-500/20 bg-gray-500/10 text-gray-500">New</Badge>
    }
  };

  return (
    <>
      <Card className="group overflow-hidden border-gray-200 transition-all duration-300 hover:shadow-lg dark:border-gray-800">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  r/{lead.subreddit}
                </Badge>
                {getStatusBadge()}
                <Badge variant="outline" className={cn("text-xs", getScoreBadgeColor(lead.relevanceScore))}>
                  <TrendingUp className="mr-1 size-3" />
                  {lead.relevanceScore}% Match
                </Badge>
                {lead.keyword && (
                  <Badge variant="outline" className="text-xs">
                    <Hash className="mr-1 size-3" />
                    {lead.keyword}
                  </Badge>
                )}
              </div>
              
              <CardTitle className="line-clamp-2 pr-2 text-lg">
                {lead.postTitle}
              </CardTitle>
              
              <div className="text-muted-foreground flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <User className="size-3" />
                  <span>u/{lead.postAuthor}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsUp className="size-3" />
                  <span>{lead.postScore || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="size-3" />
                  <span>{lead.timeAgo}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowPostDetail(true)}
                className="hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Eye className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(lead.postUrl, "_blank")}
                className="hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ExternalLink className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Score Rationale */}
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-yellow-500" />
              <div className="flex-1">
                <p className="mb-1 text-sm font-medium">AI Analysis</p>
                <p className="text-muted-foreground text-sm">{lead.reasoning}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Generated Comment Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="size-4" />
                Generated Comment ({selectedLength})
              </h4>
              <div className="flex gap-2">
                {!isEditing && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-8"
                    >
                      {copied ? (
                        <Check className="mr-1 size-3" />
                      ) : (
                        <Copy className="mr-1 size-3" />
                      )}
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartEdit}
                      className="h-8"
                    >
                      <Edit2 className="mr-1 size-3" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editedComment}
                  onChange={(e) => setEditedComment(e.target.value)}
                  className="min-h-[120px] resize-none"
                  placeholder="Edit your comment..."
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Save className="mr-1 size-3 animate-pulse" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-1 size-3" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
                <p className="whitespace-pre-wrap text-sm">{currentComment}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            {onViewComments && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewComments(lead)}
                className="flex-1 sm:flex-initial"
              >
                <MessageSquare className="mr-2 size-4" />
                View Context
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQueue(lead)}
              disabled={isQueueing || lead.status === "queued" || lead.status === "posted"}
              className="flex-1 sm:flex-initial"
            >
              <Clock className="mr-2 size-4" />
              {isQueueing ? "Adding..." : "Add to Queue"}
            </Button>
            
            <Button
              size="sm"
              onClick={() => onPost(lead)}
              disabled={isPosting || lead.status === "posted"}
              className="flex-1 sm:flex-initial"
            >
              <Send className="mr-2 size-4" />
              {isPosting ? "Posting..." : "Post Now"}
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