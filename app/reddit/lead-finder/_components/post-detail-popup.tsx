"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThumbsUp, Clock, MessageSquare, User, Hash } from "lucide-react"

interface PostDetailPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: {
    postTitle: string
    postAuthor: string
    postContentSnippet: string
    subreddit: string
    relevanceScore: number
    timeAgo: string
    postScore?: number
    keyword?: string
    postUrl: string
    originalData?: {
      postContentSnippet: string
    }
  }
}

export default function PostDetailPopup({ 
  open, 
  onOpenChange, 
  lead 
}: PostDetailPopupProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-3xl">
        <DialogHeader>
          <DialogTitle className="pr-8 text-xl font-bold">
            {lead.postTitle}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <User className="size-3" />
                u/{lead.postAuthor}
              </span>
              <span className="flex items-center gap-1">
                r/{lead.subreddit}
              </span>
              {lead.postScore !== undefined && (
                <span className="flex items-center gap-1">
                  <ThumbsUp className="size-3" />
                  {lead.postScore}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {lead.timeAgo}
              </span>
              {lead.keyword && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Hash className="size-3" />
                  {lead.keyword}
                </Badge>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="mt-4 max-h-[50vh]">
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Post Content</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                  {lead.originalData?.postContentSnippet || lead.postContentSnippet}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t pt-4">
              <Badge 
                variant={lead.relevanceScore >= 70 ? "default" : "secondary"}
                className="text-xs"
              >
                Relevance Score: {lead.relevanceScore}
              </Badge>
              <a
                href={lead.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                View on Reddit →
              </a>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
} 