"use client";

import React from "react";
import {
  Card,  CardContent,  CardHeader} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ThumbsUp,
  Clock,
  Hash,
  PlusCircle,
  MinusCircle,
  Send,
  Loader2,
  Edit2,
  ExternalLink
} from "lucide-react";
import AnimatedCopyButton from "../animated-copy-button"; // Relative path to existing component
import CommentEditor from "../comment-editor"; // Relative path to existing component
import { LeadResult } from "./types"; // Import from dashboard types

interface LeadCardProps {
  lead: LeadResult;
  selectedLength: "micro" | "medium" | "verbose";
  getDisplayComment: (lead: LeadResult) => string;
  isNew: boolean;
  editingCommentId: string | null;
  onEditClick: (leadId: string) => void;
  onSaveComment: (leadId: string, newComment: string) => void;
  onCancelEdit: () => void;
  removingLeadId: string | null;
  queuingLeadId: string | null;
  postingLeadId: string | null;
  onRemoveFromQueue: (lead: LeadResult) => void;
  onAddToQueue: (lead: LeadResult) => void;
  onPostNow: (lead: LeadResult) => void;
  onCardClick: (lead: LeadResult) => void;
}

export default function LeadCard({ 
    lead,
    selectedLength, 
    getDisplayComment, 
    isNew, 
    editingCommentId,
    onEditClick,
    onSaveComment,
    onCancelEdit,
    removingLeadId,
    queuingLeadId,
    postingLeadId,
    onRemoveFromQueue,
    onAddToQueue,
    onPostNow,
    onCardClick
}: LeadCardProps) {
  return (
    <Card
      key={lead.id}
      className={`flex flex-col rounded-xl border bg-white shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-2xl dark:border-gray-700 dark:bg-gray-800 ${
        isNew
          ? "animate-in fade-in slide-in-from-bottom-4 ring-2 ring-green-400/60 duration-700"
          : ""
      }`}
      onClick={() => onCardClick(lead)}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="size-8 border-2 border-gray-200 dark:border-gray-600">
              <AvatarFallback className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground text-sm font-semibold">
                {lead.postAuthor.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-base font-semibold text-gray-800 dark:text-gray-100">
              u/{lead.postAuthor}
            </span>
          </div>
          <div
            className="flex items-center gap-2"
            onClick={e => e.stopPropagation()} // Prevent card click when interacting with buttons
          >
            <AnimatedCopyButton text={getDisplayComment(lead)} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex grow flex-col space-y-5">
        {/* Post Content */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold leading-tight text-gray-900 dark:text-gray-50">
            {lead.postTitle}
          </h3>
          <p className="line-clamp-3 text-sm text-gray-600 dark:text-gray-400">
            {lead.postContentSnippet}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-gray-500 dark:text-gray-400">
            {lead.postScore !== undefined && (
              <span className="flex items-center gap-1.5">
                <ThumbsUp className="size-3.5" />
                {lead.postScore}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {lead.timeAgo}
            </span>
            {lead.keyword && (
              <Badge
                variant="secondary"
                className="rounded-md px-2 py-0.5 text-xs font-medium"
              >
                <Hash className="mr-1.5 size-3" />
                {lead.keyword}
              </Badge>
            )}
          </div>
        </div>

        {/* Score Rationale */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/30">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              Why this score?
            </span>
            <Badge className="bg-blue-600 text-xs text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-gray-900 dark:hover:bg-blue-600">
              Score: {lead.relevanceScore}
            </Badge>
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-300">
            {lead.reasoning}
          </p>
        </div>

        {/* Generated Comment Section */}
        <div className="grow space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Generated Comment
            </span>
            <div className="flex items-center gap-2">
              {lead.status === "approved" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={removingLeadId === lead.id}
                  className="gap-1.5 rounded-md border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-900/20"
                  onClick={e => {
                    e.stopPropagation();
                    onRemoveFromQueue(lead);
                  }}
                >
                  {removingLeadId === lead.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <MinusCircle className="size-3.5" />
                  )}
                  Remove
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={queuingLeadId === lead.id}
                  className="gap-1.5 rounded-md border-sky-500 text-sky-600 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50 dark:border-sky-400 dark:text-sky-300 dark:hover:bg-sky-900/50 dark:hover:text-sky-200"
                  onClick={e => {
                    e.stopPropagation();
                    onAddToQueue(lead);
                  }}
                >
                  {queuingLeadId === lead.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <PlusCircle className="size-3.5" />
                  )}
                  Queue
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                disabled={postingLeadId === lead.id}
                className="gap-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
                onClick={e => {
                  e.stopPropagation();
                  onPostNow(lead);
                }}
              >
                {postingLeadId === lead.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                Post Now
              </Button>
            </div>
          </div>

          {editingCommentId === lead.id ? (
            <CommentEditor
              initialValue={getDisplayComment(lead)}
              onSave={value => onSaveComment(lead.id, value)}
              onCancel={onCancelEdit}
            />
          ) : (
            <div
              className="group relative cursor-text rounded-lg bg-gray-100 p-3.5 text-sm text-gray-800 transition-colors hover:bg-gray-200/70 dark:bg-gray-700/50 dark:text-gray-200 dark:hover:bg-gray-700/80"
              onClick={() => onEditClick(lead.id)}
            >
              <p className="whitespace-pre-wrap">
                {getDisplayComment(lead)}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1.5 size-7 text-gray-500 opacity-0 transition-all hover:bg-gray-300/50 group-hover:opacity-100 dark:text-gray-400 dark:hover:bg-gray-600/50"
              >
                <Edit2 className="size-3.5" />
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs capitalize text-gray-500 dark:text-gray-400">
              {lead.selectedLength || selectedLength} length
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-gray-500 hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-700/50"
              asChild
            >
              <a
                href={lead.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 