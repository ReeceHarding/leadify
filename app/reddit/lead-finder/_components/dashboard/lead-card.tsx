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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
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
  X,
  ChevronRight,
  ChevronDown,
  CirclePlus,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import PostDetailPopup from "../post-detail-popup";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"

interface LeadCardProps {
  lead: any;
  selectedLength: "micro" | "medium" | "verbose";
  onEdit: (leadId: string, newComment: string) => Promise<void>;
  onPost: (lead: any) => Promise<void>;
  onQueue: (lead: any) => Promise<void>;
  onViewComments?: (lead: any) => void;
  onRegenerateWithInstructions?: (leadId: string, instructions: string) => Promise<void>;
  isPosting?: boolean;
  isQueueing?: boolean;
}

export default function LeadCard({
  lead,
  selectedLength,
  onEdit,
  onPost,
  onQueue,
  onViewComments,
  onRegenerateWithInstructions,
  isPosting = false,
  isQueueing = false
}: LeadCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedComment, setEditedComment] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenerateInstructions, setRegenerateInstructions] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);

  const comment = lead[`${selectedLength}Comment`] || lead.mediumComment || "";

  const handleStartEdit = () => {
    setEditedComment(comment);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    await onEdit(lead.id, editedComment);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedComment("");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(comment);
    setIsCopied(true);
    toast.success("Comment copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getMatchBadgeColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800";
    if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800";
    return "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950 dark:border-gray-800";
  };

  // Handle post button - adds to queue or posts immediately
  const handlePostClick = async () => {
    // This will now always add to queue - the parent component will handle immediate posting if queue is empty
    await onQueue(lead);
  };

  const handleRegenerate = async () => {
    if (!regenerateInstructions.trim() || !onRegenerateWithInstructions) {
      toast.error("Please provide instructions for regeneration");
      return;
    }

    setIsRegenerating(true);
    try {
      await onRegenerateWithInstructions(lead.id, regenerateInstructions);
      setShowRegenerateDialog(false);
      setRegenerateInstructions("");
      toast.success("Comment regenerated successfully");
    } catch (error) {
      toast.error("Failed to regenerate comment");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden border shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="space-y-4 p-6">
          {/* Header with Match Score */}
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge 
                variant="secondary" 
                className={cn("px-3 py-1 text-sm font-semibold", getMatchBadgeColor(lead.relevanceScore))}
              >
                {lead.relevanceScore}% Match
              </Badge>
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

          {/* AI Generated Comment Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                AI Generated Comment
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 px-2 text-xs"
                >
                  {isCopied ? <Check className="size-3" /> : <Copy className="size-3" />}
                </Button>
                {!isEditing && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartEdit}
                      className="h-7 px-2 text-xs"
                    >
                      <Edit2 className="size-3" />
                    </Button>
                    <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                        >
                          <Sparkles className="size-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="size-4 text-blue-500" />
                            Regenerate with AI
                          </DialogTitle>
                          <DialogDescription>
                            Describe how you'd like this comment to be changed. Be specific about tone, focus, or style adjustments.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Textarea
                              placeholder="e.g., Focus more on our seclusion and make it less salesy..."
                              value={regenerateInstructions}
                              onChange={(e) => setRegenerateInstructions(e.target.value)}
                              className="min-h-[100px]"
                            />
                            <p className="text-xs text-gray-500">
                              The AI will use your instructions along with the original comment and website context.
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowRegenerateDialog(false);
                              setRegenerateInstructions("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleRegenerate}
                            disabled={isRegenerating || !regenerateInstructions.trim()}
                            className="gap-2"
                          >
                            {isRegenerating ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Regenerating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="size-4" />
                                Regenerate
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            </div>

            {/* Comment Display/Edit Area - Now clickable when not editing */}
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedComment}
                  onChange={(e) => setEditedComment(e.target.value)}
                  className="min-h-[100px] resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    <X className="mr-1 size-3" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                  >
                    <Save className="mr-1 size-3" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className="cursor-text rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:bg-gray-900/50 dark:hover:bg-gray-900/70"
                onClick={handleStartEdit}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {comment}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(lead.postUrl, '_blank')}
              className="flex-1"
            >
              <ExternalLink className="mr-2 size-4" />
              View on Reddit
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={handlePostClick}
                    disabled={isPosting || isQueueing}
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {isPosting || isQueueing ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        {isPosting ? "Posting..." : "Adding..."}
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 size-4" />
                        Post
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Post to Reddit or add to queue</p>
                  <p className="text-xs text-gray-400">Some subreddits have posting restrictions</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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