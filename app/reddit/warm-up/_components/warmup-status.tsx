"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, Activity, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface WarmupStatusProps {
  userId: string
}

export default function WarmupStatus({ userId }: WarmupStatusProps) {
  const [status, setStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStatus()
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [userId])

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/queue/warmup-status")
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error("Error fetching status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (!status || status.status === "no_account") {
    return null
  }

  const { account, statistics, nextScheduledPost, recentActivity } = status

  // Calculate warm-up progress
  const warmupStart = new Date(account.warmupStartDate)
  const warmupEnd = new Date(account.warmupEndDate)
  const now = new Date()
  const totalDuration = warmupEnd.getTime() - warmupStart.getTime()
  const elapsed = now.getTime() - warmupStart.getTime()
  const progress = Math.min(100, (elapsed / totalDuration) * 100)
  const daysRemaining = Math.max(0, Math.ceil((warmupEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))

  return (
    <div className="space-y-4">
      {/* System Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Real-time warm-up activity</CardDescription>
            </div>
            <Badge variant="default" className="gap-1">
              <Activity className="size-3" />
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warm-up Progress */}
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Warm-up Progress</span>
              <span className="text-muted-foreground">
                {daysRemaining} days remaining
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Posts (24h)</p>
              <p className="text-2xl font-bold">{statistics.posts.last24Hours}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Queued</p>
              <p className="text-2xl font-bold">{statistics.posts.queued}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Posted</p>
              <p className="text-2xl font-bold">{statistics.posts.posted}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Comments</p>
              <p className="text-2xl font-bold">{statistics.comments.posted}</p>
            </div>
          </div>

          {/* Next Scheduled Post */}
          {nextScheduledPost && (
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="size-4" />
                <span className="font-medium">Next Post:</span>
                <Badge variant="outline">r/{nextScheduledPost.subreddit}</Badge>
                <span className="text-muted-foreground">
                  in {formatDistanceToNow(new Date(nextScheduledPost.scheduledFor))}
                </span>
              </div>
            </div>
          )}

          {/* Failed Posts Alert */}
          {statistics.posts.failed > 0 && (
            <div className="bg-destructive/10 flex items-center gap-2 rounded-lg p-3">
              <AlertCircle className="text-destructive size-4" />
              <span className="text-sm">
                {statistics.posts.failed} failed posts need attention
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest posts and comments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.posts.map((post: any) => (
              <div key={post.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {post.status === "posted" ? (
                    <CheckCircle className="text-green-500 size-4" />
                  ) : post.status === "failed" ? (
                    <XCircle className="text-destructive size-4" />
                  ) : (
                    <Clock className="text-muted-foreground size-4" />
                  )}
                  <Badge variant="outline">r/{post.subreddit}</Badge>
                  <span className="text-muted-foreground text-sm">
                    {post.postedAt
                      ? formatDistanceToNow(new Date(post.postedAt), { addSuffix: true })
                      : formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <Badge
                  variant={
                    post.status === "posted"
                      ? "default"
                      : post.status === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {post.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 