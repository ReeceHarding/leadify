"use client"

import React, { useState } from "react"
import {
  MessageSquare,
  Send,
  Loader2,
  ExternalLink,
  User,
  Calendar,
  ThumbsUp,
  Copy,
  Check,
  Edit2,
  X,
  MoreVertical,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Hash
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { toast } from "sonner"
import { DMPost } from "./types"
import { cn } from "@/lib/utils"

interface DMCardProps {
  post: DMPost
  isEditing: boolean
  isSending: boolean
  isQueuing: boolean
  isRemoving: boolean
  isRegenerating: boolean
  selectedLength: "micro" | "medium" | "verbose"
  onGenerateDM: (post: DMPost) => void
  onSendDM: (post: DMPost) => void
  onEditDM: (postId: string, newContent: string) => void
  onCancelEdit: () => void
  onAddToQueue: (post: DMPost) => void
  onRemoveFromQueue: (post: DMPost) => void
  onCopyDM: (content: string) => void
  onRegenerateDM: (post: DMPost, instructions?: string) => void
  onDeleteDM: (postId: string) => void
  onViewReddit: (url: string) => void
  onLengthChange: (postId: string, length: "micro" | "medium" | "verbose") => void
}

export default function DMCard({
  post,
  isEditing,
  isSending,
  isQueuing,
  isRemoving,
  isRegenerating,
  selectedLength,
  onGenerateDM,
  onSendDM,
  onEditDM,
  onCancelEdit,
  onAddToQueue,
  onRemoveFromQueue,
  onCopyDM,
  onRegenerateDM,
  onDeleteDM,
  onViewReddit,
  onLengthChange
}: DMCardProps) {
  const [editedContent, setEditedContent] = useState(post.dmContent || "")
  const [isExpanded, setIsExpanded] = useState(false)
  const [regenerateInstructions, setRegenerateInstructions] = useState("")
  const [showRegenerateInput, setShowRegenerateInput] = useState(false)

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "queued":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    if (score >= 60) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    if (score >= 40) return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  }

  const handleSaveDM = () => {
    if (editedContent.trim()) {
      onEditDM(post.id, editedContent)
    }
  }

  const handleRegenerateDM = () => {
    if (regenerateInstructions.trim()) {
      onRegenerateDM(post, regenerateInstructions)
      setRegenerateInstructions("")
      setShowRegenerateInput(false)
    } else {
      onRegenerateDM(post)
    }
  }

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <ThumbsUp className="size-3" />
              {post.score}
            </Badge>
            <Badge variant="outline">r/{post.subreddit}</Badge>
            {post.relevanceScore !== undefined && (
              <Badge className={cn("gap-1", getScoreColor(post.relevanceScore))}>
                {post.relevanceScore}% match
              </Badge>
            )}
            {post.keywords?.map((keyword, index) => (
              <Badge key={index} variant="outline" className="gap-1">
                <Hash className="size-3" />
                {keyword}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {post.dmStatus && (
              <Badge className={cn("gap-1", getStatusColor(post.dmStatus))}>
                {post.dmStatus === "sent" && <Check className="size-3" />}
                {post.dmStatus === "queued" && <MessageSquare className="size-3" />}
                {post.dmStatus}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewReddit(post.url)}>
                  <ExternalLink className="mr-2 size-4" />
                  View on Reddit
                </DropdownMenuItem>
                {post.dmContent && (
                  <>
                    <DropdownMenuItem onClick={() => onCopyDM(post.dmContent!)}>
                      <Copy className="mr-2 size-4" />
                      Copy DM
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowRegenerateInput(true)}
                      className="text-orange-600 dark:text-orange-400"
                    >
                      <RefreshCw className="mr-2 size-4" />
                      Regenerate DM
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteDM(post.id)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Post Title */}
        <h3 className="mb-2 line-clamp-2 text-lg font-semibold">
          {post.title}
        </h3>

        {/* Post Meta */}
        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <User className="size-4" />
            <span>u/{post.author}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="size-4" />
            <span>{post.timeAgo}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="size-4" />
            <span>{post.num_comments} comments</span>
          </div>
        </div>

        {/* Post Content Preview */}
        {post.selftext && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="mb-3 gap-1 px-2">
                {isExpanded ? (
                  <>
                    <ChevronUp className="size-3" />
                    Hide content
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3" />
                    Show content
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900/50">
                <p className="whitespace-pre-wrap">{post.selftext}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* DM Content */}
        {post.dmContent ? (
          <div className="space-y-3">
            {/* Length Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">DM Length:</span>
              <div className="flex gap-1">
                {(["micro", "medium", "verbose"] as const).map((length) => (
                  <Button
                    key={length}
                    variant={post.selectedLength === length ? "default" : "outline"}
                    size="sm"
                    onClick={() => onLengthChange(post.id, length)}
                    className="h-7 px-2 text-xs capitalize"
                  >
                    {length}
                  </Button>
                ))}
              </div>
            </div>

            {/* DM Edit/Display */}
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[120px]"
                  placeholder="Edit your DM..."
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancelEdit}
                    disabled={isSending}
                  >
                    <X className="mr-1 size-3" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveDM}
                    disabled={isSending || !editedContent.trim()}
                  >
                    <Check className="mr-1 size-3" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-gray-50 p-3 dark:bg-gray-900/50">
                <p className="whitespace-pre-wrap text-sm">{post.dmContent}</p>
              </div>
            )}

            {/* Regenerate Input */}
            {showRegenerateInput && (
              <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/30">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Regenerate with specific instructions:
                </p>
                <Textarea
                  value={regenerateInstructions}
                  onChange={(e) => setRegenerateInstructions(e.target.value)}
                  placeholder="e.g., Make it more casual, focus on their specific problem..."
                  className="min-h-[80px]"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowRegenerateInput(false)
                      setRegenerateInstructions("")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleRegenerateDM}
                    disabled={isRegenerating}
                    className="gap-1"
                  >
                    {isRegenerating ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3" />
                    )}
                    Regenerate
                  </Button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {post.dmStatus === "queued" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveFromQueue(post)}
                  disabled={isRemoving}
                  className="flex-1"
                >
                  {isRemoving ? (
                    <Loader2 className="mr-1 size-3 animate-spin" />
                  ) : (
                    <X className="mr-1 size-3" />
                  )}
                  Remove from Queue
                </Button>
              ) : post.dmStatus !== "sent" ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddToQueue(post)}
                    disabled={isQueuing}
                    className="flex-1"
                  >
                    {isQueuing ? (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    ) : (
                      <MessageSquare className="mr-1 size-3" />
                    )}
                    Add to Queue
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onSendDM(post)}
                    disabled={isSending}
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {isSending ? (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    ) : (
                      <Send className="mr-1 size-3" />
                    )}
                    Send Now
                  </Button>
                </>
              ) : null}
              {!isEditing && post.dmStatus !== "sent" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditDM(post.id, post.dmContent!)}
                  className="gap-1"
                >
                  <Edit2 className="size-3" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Generate DM Button */
          <Button
            onClick={() => onGenerateDM(post)}
            disabled={post.hasDM}
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            {post.hasDM ? (
              <>
                <Check className="mr-2 size-4" />
                DM Already Sent
              </>
            ) : (
              <>
                <MessageSquare className="mr-2 size-4" />
                Generate DM
              </>
            )}
          </Button>
        )}

        {/* Reasoning */}
        {post.reasoning && (
          <div className="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">AI Analysis:</span> {post.reasoning}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 