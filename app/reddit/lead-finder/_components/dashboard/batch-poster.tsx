"use client"

import React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlayCircle, Send, Loader2, Clock, AlertCircle } from "lucide-react"

interface BatchPosterProps {
  approvedLeadsCount: number
  onBatchPostQueue: () => void
  isBatchPosting: boolean
}

export default function BatchPoster({
  approvedLeadsCount,
  onBatchPostQueue,
  isBatchPosting
}: BatchPosterProps) {
  if (approvedLeadsCount === 0) {
    return null // Don't render if no approved leads
  }

  return (
    <Card className="overflow-hidden shadow-lg dark:border-gray-700">
      <CardHeader className="border-b bg-amber-50/50 p-4 dark:border-gray-700 dark:bg-amber-900/20">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100">
          <PlayCircle className="size-5 text-amber-600 dark:text-amber-400" />
          Async Queue Posting
        </CardTitle>
        <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
          Queue all approved comments for automatic posting with 5-7 minute
          randomized delays.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium">
                {approvedLeadsCount} comments ready to queue
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                Posts will be sent automatically with 5-7 minute randomized
                delays to comply with Reddit's rate limits.
              </p>
            </div>
            <Button
              onClick={onBatchPostQueue}
              disabled={isBatchPosting}
              className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md transition-all hover:from-amber-600 hover:to-amber-700 hover:shadow-lg disabled:opacity-50"
            >
              {isBatchPosting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Queueing...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Queue All Posts
                </>
              )}
            </Button>
          </div>

          {/* Rate Limit Info */}
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                <p className="font-medium">Rate Limiting Protection:</p>
                <ul className="ml-4 list-disc space-y-0.5 text-gray-600 dark:text-gray-400">
                  <li>Maximum 1 post per account every 5 minutes</li>
                  <li>
                    Randomized delays between 5-7 minutes to avoid patterns
                  </li>
                  <li>Posts are queued and processed asynchronously</li>
                  <li>You'll be notified when all posts are completed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Estimated Time */}
          {approvedLeadsCount > 0 && (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <Clock className="mb-1 mr-2 inline-block size-4" />
                <span className="font-medium">
                  Estimated completion time:
                </span>{" "}
                {Math.ceil(approvedLeadsCount * 6)} minutes
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
