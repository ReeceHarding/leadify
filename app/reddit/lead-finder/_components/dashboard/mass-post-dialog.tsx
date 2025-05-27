"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Send,
  AlertCircle,
  Info,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react"
import { toast } from "sonner"
import { updateGeneratedCommentAction } from "@/actions/db/lead-generation-actions"
import { getSubredditPostingHistoryAction } from "@/actions/db/posting-history-actions"

interface SubredditPostingHistory {
  subreddit: string
  lastPostedAt: string | null
  postCount: number
}

interface MassPostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leads: any[] // LeadResult[]
  userId: string
}

interface SubredditLimit {
  subreddit: string
  lastPostedAt: Date | null
  canPostAt: Date
  canPostNow: boolean
}

export default function MassPostDialog({
  open,
  onOpenChange,
  leads,
  userId
}: MassPostDialogProps) {
  const [scoreThreshold, setScoreThreshold] = useState(80)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isQueueing, setIsQueueing] = useState(false)
  const [subredditLimits, setSubredditLimits] = useState<SubredditLimit[]>([])
  const [eligibleLeads, setEligibleLeads] = useState<any[]>([])

  const HOURS_BETWEEN_POSTS = 4

  const analyzeLeads = async () => {
    setIsAnalyzing(true)
    try {
      // Get leads above threshold that aren't already posted
      const qualifiedLeads = leads.filter(
        lead =>
          lead.relevanceScore >= scoreThreshold && lead.status !== "posted"
      )

      // Get posting history for all subreddits
      const subreddits = [
        ...new Set(qualifiedLeads.map(lead => lead.subreddit))
      ]
      const historyResult = await getSubredditPostingHistoryAction(
        userId,
        subreddits
      )

      const now = new Date()
      const limits: SubredditLimit[] = []
      const eligible: any[] = []

      // Check each subreddit's posting limit
      for (const subreddit of subreddits) {
        const history = historyResult.isSuccess
          ? historyResult.data.find(
              (h: SubredditPostingHistory) => h.subreddit === subreddit
            )
          : null

        const lastPostedAt = history?.lastPostedAt
          ? new Date(history.lastPostedAt)
          : null

        const canPostAt = lastPostedAt
          ? new Date(
              lastPostedAt.getTime() + HOURS_BETWEEN_POSTS * 60 * 60 * 1000
            )
          : now

        const canPostNow = canPostAt <= now

        limits.push({
          subreddit,
          lastPostedAt,
          canPostAt,
          canPostNow
        })

        // Add eligible leads from this subreddit
        if (canPostNow) {
          const subredditLeads = qualifiedLeads.filter(
            lead => lead.subreddit === subreddit
          )
          // Only take the highest scoring lead from each subreddit
          if (subredditLeads.length > 0) {
            const bestLead = subredditLeads.sort(
              (a, b) => b.relevanceScore - a.relevanceScore
            )[0]
            eligible.push(bestLead)
          }
        }
      }

      setSubredditLimits(limits)
      setEligibleLeads(eligible)
    } catch (error) {
      console.error("Error analyzing leads:", error)
      toast.error("Failed to analyze posting limits")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleMassQueue = async () => {
    if (eligibleLeads.length === 0) {
      toast.error("No eligible leads to queue")
      return
    }

    setIsQueueing(true)
    try {
      // Queue all eligible leads
      const updatePromises = eligibleLeads.map(lead =>
        updateGeneratedCommentAction(lead.id, { status: "queued" })
      )

      const results = await Promise.all(updatePromises)
      const successCount = results.filter(r => r.isSuccess).length

      if (successCount > 0) {
        toast.success(`Queued ${successCount} leads for posting!`, {
          description: "They'll be posted respecting the 4-hour subreddit limit"
        })
        onOpenChange(false)
        // Refresh the page to show updated statuses
        window.location.reload()
      }
    } catch (error) {
      console.error("Error queueing leads:", error)
      toast.error("Failed to queue leads")
    } finally {
      setIsQueueing(false)
    }
  }

  // Auto-analyze when dialog opens or threshold changes
  useEffect(() => {
    if (open) {
      analyzeLeads()
    }
  }, [open, scoreThreshold])

  const formatTimeUntil = (date: Date) => {
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="size-5 text-blue-600" />
            Mass Queue Posts
          </DialogTitle>
          <DialogDescription>
            Queue multiple posts at once based on relevance score, respecting
            subreddit posting limits.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 -mx-6 space-y-6 py-4">
          {/* Score Threshold Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Minimum Relevance Score</Label>
              <span className="text-2xl font-bold text-blue-600">
                {scoreThreshold}
              </span>
            </div>
            <Slider
              value={[scoreThreshold]}
              onValueChange={([value]) => setScoreThreshold(value)}
              min={50}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-muted-foreground text-xs">
              Only posts scoring {scoreThreshold} or higher will be queued
            </p>
          </div>

          {/* Analysis Results */}
          {isAnalyzing ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="text-muted-foreground text-sm">
                Analyzing posting limits...
              </p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <Alert>
                <Info className="size-4" />
                <AlertDescription>
                  <strong>{eligibleLeads.length} posts</strong> can be queued
                  from{" "}
                  <strong>
                    {
                      leads.filter(
                        l =>
                          l.relevanceScore >= scoreThreshold &&
                          l.status !== "posted"
                      ).length
                    }{" "}
                    qualified posts
                  </strong>{" "}
                  (score ≥ {scoreThreshold})
                </AlertDescription>
              </Alert>

              {/* Subreddit Limits */}
              {subredditLimits.length > 0 && (
                <div className="space-y-3">
                  <Label>Subreddit Posting Status</Label>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {subredditLimits.map(limit => (
                      <div
                        key={limit.subreddit}
                        className="bg-card flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`size-2 rounded-full ${
                              limit.canPostNow
                                ? "bg-green-500"
                                : "bg-yellow-500"
                            }`}
                          />
                          <span className="font-medium">
                            r/{limit.subreddit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {limit.canPostNow ? (
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle2 className="size-3" />
                              Ready to post
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="gap-1 text-yellow-600"
                            >
                              <Clock className="size-3" />
                              Wait {formatTimeUntil(limit.canPostAt)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Eligible Leads Preview */}
              {eligibleLeads.length > 0 && (
                <div className="space-y-3">
                  <Label>Posts to Queue ({eligibleLeads.length})</Label>
                  <div className="max-h-32 space-y-2 overflow-y-auto">
                    {eligibleLeads.slice(0, 5).map(lead => (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="flex-1 truncate">
                          {lead.postTitle}
                        </span>
                        <div className="ml-2 flex items-center gap-2">
                          <Badge variant="secondary">r/{lead.subreddit}</Badge>
                          <Badge variant="outline">
                            {lead.relevanceScore}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {eligibleLeads.length > 5 && (
                      <p className="text-muted-foreground text-center text-xs">
                        +{eligibleLeads.length - 5} more posts
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Warning about limits */}
              <Alert>
                <AlertCircle className="size-4" />
                <AlertDescription className="text-xs">
                  Posts are limited to one per subreddit every 4 hours to avoid
                  spam detection. Only the highest scoring post from each
                  subreddit will be queued.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isQueueing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMassQueue}
            disabled={isQueueing || eligibleLeads.length === 0}
            className="gap-2"
          >
            <Send className="size-4" />
            Queue {eligibleLeads.length} Posts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
