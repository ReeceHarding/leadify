"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThumbsUp, Clock, MessageSquare, User, Hash, Loader2 } from "lucide-react"
import { fetchRedditThreadAction } from "@/actions/integrations/reddit-actions"
import { Skeleton } from "@/components/ui/skeleton"

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
      threadId?: string
    }
  }
}

export default function PostDetailPopup({ 
  open, 
  onOpenChange, 
  lead 
}: PostDetailPopupProps) {
  const [fullContent, setFullContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && lead.postUrl) {
      fetchFullContent()
    }
  }, [open, lead.postUrl])

  const fetchFullContent = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Extract thread ID from URL
      const urlMatch = lead.postUrl.match(/\/comments\/([a-zA-Z0-9]+)/)
      const threadId = urlMatch ? urlMatch[1] : lead.originalData?.threadId
      
      if (!threadId) {
        setFullContent(lead.postContentSnippet)
        return
      }

      console.log(`🔍 Fetching full content for thread: ${threadId}`)
      
      const result = await fetchRedditThreadAction(threadId, lead.subreddit)
      
      if (result.isSuccess) {
        setFullContent(result.data.content || result.data.title)
      } else {
        setError(result.message)
        setFullContent(lead.postContentSnippet)
      }
    } catch (err) {
      console.error("Error fetching full content:", err)
      setError("Failed to load full content")
      setFullContent(lead.postContentSnippet)
    } finally {
      setIsLoading(false)
    }
  }
  
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
                  <Hash className="mr-1 size-3" />
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
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : error ? (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {error}
                  <div className="mt-2 text-gray-700 dark:text-gray-300">
                    <p className="whitespace-pre-wrap">
                      {lead.postContentSnippet}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                    {fullContent || lead.postContentSnippet}
                  </p>
                </div>
              )}
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