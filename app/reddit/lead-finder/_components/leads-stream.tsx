"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  getDoc
} from "firebase/firestore"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ExternalLink,
  MessageSquare,
  ThumbsUp,
  Clock,
  CheckCircle,
  Copy,
  Loader2,
  Search,
  Sparkles,
  Globe,
  Database,
  Brain,
  MessageCircle,
  CheckCircle2,
  XCircle
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface Lead {
  id: string
  campaignId: string
  postId: string
  postTitle: string
  postBody: string
  postUrl: string
  subreddit: string
  authorUsername: string
  score: number
  numComments: number
  relevanceScore: number
  generatedComment: string
  commentTone: string
  status: "pending" | "posted" | "failed" | "approved"
  createdAt: any
  updatedAt: any
}

interface LeadGenerationProgress {
  campaignId: string
  status: "pending" | "in_progress" | "completed" | "error"
  currentStage: string
  stages: {
    name: string
    status: "pending" | "in_progress" | "completed" | "error"
    startedAt?: any
    completedAt?: any
    message?: string
    progress?: number
  }[]
  totalProgress: number
  startedAt: any
  completedAt?: any
  error?: string
  results?: {
    totalThreadsFound: number
    totalThreadsAnalyzed: number
    totalCommentsGenerated: number
    averageRelevanceScore: number
  }
}

interface Props {
  campaignId: string
}

const STAGE_ICONS = {
  Initializing: Search,
  "Analyzing Business": Database,
  "Scraping Website": Globe,
  "Searching Reddit": Search,
  "Retrieving Threads": MessageSquare,
  "Analyzing Relevance": Brain,
  "Generating Comments": MessageCircle,
  "Finalizing Results": CheckCircle2
}

export default function LeadsStream({ campaignId }: Props) {
  console.log(
    "🔥🔥🔥 [LEADS-STREAM] Component mounted with campaignId:",
    campaignId
  )

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<LeadGenerationProgress | null>(null)

  console.log(
    "🔥🔥🔥 [LEADS-STREAM] Initial state - leads count:",
    leads.length,
    "loading:",
    loading
  )

  useEffect(() => {
    console.log(
      "🔥🔥🔥 [LEADS-STREAM] useEffect triggered, campaignId:",
      campaignId
    )

    if (!campaignId) {
      console.log("🔥🔥🔥 [LEADS-STREAM] No campaignId, returning early")
      return
    }

    console.log("🔥🔥🔥 [LEADS-STREAM] Setting up Firestore listener")
    console.log("🔥🔥🔥 [LEADS-STREAM] Firebase db instance:", !!db)
    console.log("🔥🔥🔥 [LEADS-STREAM] Collection name: generated_comments")

    try {
      const q = query(
        collection(db, "generated_comments"),
        where("campaignId", "==", campaignId),
        orderBy("createdAt", "desc")
      )

      console.log("🔥🔥🔥 [LEADS-STREAM] Query created successfully")

      const unsubscribe = onSnapshot(
        q,
        snapshot => {
          console.log("🔥🔥🔥 [LEADS-STREAM] Snapshot received!")
          console.log("🔥🔥🔥 [LEADS-STREAM] Snapshot size:", snapshot.size)
          console.log("🔥🔥🔥 [LEADS-STREAM] Snapshot empty:", snapshot.empty)
          console.log("🔥🔥🔥 [LEADS-STREAM] Snapshot metadata:", {
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites: snapshot.metadata.hasPendingWrites
          })

          const docs = snapshot.docs.map((doc, index) => {
            const data = doc.data()
            console.log(`🔥🔥🔥 [LEADS-STREAM] Document ${index}:`, {
              id: doc.id,
              campaignId: data.campaignId,
              postTitle: data.postTitle,
              status: data.status,
              createdAt: data.createdAt
            })

            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt || null,
              updatedAt: data.updatedAt || null
            } as Lead
          })

          console.log(
            "🔥🔥🔥 [LEADS-STREAM] Processed docs count:",
            docs.length
          )
          console.log("🔥🔥🔥 [LEADS-STREAM] Setting leads state")
          setLeads(docs)
          setLoading(false)

          console.log(
            "🔥🔥🔥 [LEADS-STREAM] State updated - loading: false, leads:",
            docs.length
          )
        },
        error => {
          console.error("🔥🔥🔥 [LEADS-STREAM] Firestore error:", error)
          console.error("🔥🔥🔥 [LEADS-STREAM] Error code:", error.code)
          console.error("🔥🔥🔥 [LEADS-STREAM] Error message:", error.message)
          console.error("🔥🔥🔥 [LEADS-STREAM] Error stack:", error.stack)
          toast.error("Failed to load leads")
          setLoading(false)
        }
      )

      // Also listen to progress updates
      const progressRef = doc(db, "lead_generation_progress", campaignId)
      const unsubscribeProgress = onSnapshot(progressRef, doc => {
        if (doc.exists()) {
          const data = doc.data() as LeadGenerationProgress
          console.log("🔥🔥🔥 [LEADS-STREAM] Progress update:", data)
          setProgress(data)
        } else {
          setProgress(null)
        }
      })

      console.log("🔥🔥🔥 [LEADS-STREAM] Listener setup complete")

      return () => {
        console.log(
          "🔥🔥🔥 [LEADS-STREAM] Cleanup function called, unsubscribing listeners"
        )
        unsubscribe()
        unsubscribeProgress()
      }
    } catch (error) {
      console.error("🔥🔥🔥 [LEADS-STREAM] Error setting up listener:", error)
      console.error("🔥🔥🔥 [LEADS-STREAM] Error type:", typeof error)
      console.error("🔥🔥🔥 [LEADS-STREAM] Error details:", error)
      setLoading(false)
    }
  }, [campaignId])

  const copyToClipboard = async (text: string) => {
    console.log("🔥🔥🔥 [LEADS-STREAM] copyToClipboard called")
    try {
      await navigator.clipboard.writeText(text)
      console.log("🔥🔥🔥 [LEADS-STREAM] Text copied successfully")
      toast.success("Comment copied to clipboard!")
    } catch (error) {
      console.error("🔥🔥🔥 [LEADS-STREAM] Failed to copy:", error)
      toast.error("Failed to copy comment")
    }
  }

  const renderProgressStage = (stage: LeadGenerationProgress["stages"][0]) => {
    const Icon = STAGE_ICONS[stage.name as keyof typeof STAGE_ICONS] || Search
    const isActive = progress?.currentStage === stage.name
    const isCompleted = stage.status === "completed"
    const isError = stage.status === "error"
    const isPending = stage.status === "pending"

    return (
      <motion.div
        key={stage.name}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-3 rounded-lg p-3 transition-all",
          isActive &&
            "border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20",
          isCompleted && !isActive && "opacity-60",
          isPending && "opacity-40"
        )}
      >
        <div
          className={cn(
            "relative flex size-10 items-center justify-center rounded-full",
            isActive && "bg-blue-100 dark:bg-blue-900/50",
            isCompleted && !isActive && "bg-green-100 dark:bg-green-900/50",
            isError && "bg-red-100 dark:bg-red-900/50",
            isPending && "bg-gray-100 dark:bg-gray-800"
          )}
        >
          {isActive && (
            <motion.div
              className="absolute inset-0 rounded-full bg-blue-400/20"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          {isCompleted ? (
            <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
          ) : isError ? (
            <XCircle className="size-5 text-red-600 dark:text-red-400" />
          ) : (
            <Icon
              className={cn(
                "size-5",
                isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400"
              )}
            />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-medium",
                isActive && "text-blue-900 dark:text-blue-100",
                isCompleted &&
                  !isActive &&
                  "text-green-700 dark:text-green-300",
                isError && "text-red-700 dark:text-red-300"
              )}
            >
              {stage.name}
            </span>
            {isActive && (
              <Loader2 className="size-3 animate-spin text-blue-600 dark:text-blue-400" />
            )}
          </div>
          {stage.message && (
            <p className="text-muted-foreground mt-0.5 text-xs">
              {stage.message}
            </p>
          )}
          {stage.progress !== undefined && isActive && (
            <Progress value={stage.progress} className="mt-1 h-1" />
          )}
        </div>
      </motion.div>
    )
  }

  console.log(
    "🔥🔥🔥 [LEADS-STREAM] Rendering component - loading:",
    loading,
    "leads:",
    leads.length,
    "progress:",
    progress?.status
  )

  return (
    <div className="space-y-6">
      {loading
        ? (() => {
            console.log("🔥🔥🔥 [LEADS-STREAM] Rendering loading state")
            return (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            )
          })()
        : leads.length === 0 && progress?.status === "in_progress"
          ? (() => {
              console.log("🔥🔥🔥 [LEADS-STREAM] Rendering progress state")
              return (
                <Card className="p-8">
                  <div className="space-y-6">
                    <div className="space-y-2 text-center">
                      <h3 className="text-lg font-semibold">
                        Finding Your Perfect Leads
                      </h3>
                      <p className="text-muted-foreground mx-auto max-w-md text-sm">
                        Our AI is analyzing Reddit to find the most relevant
                        discussions for your business. This typically takes
                        about 60 seconds.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Overall Progress
                        </span>
                        <span className="font-medium">
                          {progress.totalProgress}%
                        </span>
                      </div>
                      <Progress
                        value={progress.totalProgress}
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <AnimatePresence mode="sync">
                        {progress.stages.map(stage =>
                          renderProgressStage(stage)
                        )}
                      </AnimatePresence>
                    </div>

                    {progress.results && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-muted/50 space-y-2 rounded-lg p-4"
                      >
                        <p className="text-sm font-medium">Progress Summary</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">
                              Threads Found:
                            </span>
                            <span className="ml-1 font-medium">
                              {progress.results.totalThreadsFound}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Analyzed:
                            </span>
                            <span className="ml-1 font-medium">
                              {progress.results.totalThreadsAnalyzed}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Comments Generated:
                            </span>
                            <span className="ml-1 font-medium">
                              {progress.results.totalCommentsGenerated}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Avg. Score:
                            </span>
                            <span className="ml-1 font-medium">
                              {progress.results.averageRelevanceScore}%
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </Card>
              )
            })()
          : leads.length === 0 && progress?.status === "error"
            ? (() => {
                console.log("🔥🔥🔥 [LEADS-STREAM] Rendering error state")
                return (
                  <Card className="border-red-200 p-12 text-center dark:border-red-800">
                    <XCircle className="mx-auto mb-4 size-12 text-red-600 dark:text-red-400" />
                    <h3 className="mb-2 text-lg font-semibold">
                      Lead Generation Failed
                    </h3>
                    <p className="text-muted-foreground mx-auto max-w-md text-sm">
                      {progress.error ||
                        "An error occurred during lead generation. Please try again."}
                    </p>
                  </Card>
                )
              })()
            : leads.length === 0
              ? (() => {
                  console.log("🔥🔥🔥 [LEADS-STREAM] Rendering empty state")
                  return (
                    <Card className="p-12 text-center">
                      <MessageSquare className="text-muted-foreground mx-auto mb-4 size-12" />
                      <h3 className="mb-2 text-lg font-semibold">
                        No leads generated yet
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Click "Start Lead Generation" to begin finding leads
                      </p>
                    </Card>
                  )
                })()
              : (() => {
                  console.log(
                    "🔥🔥🔥 [LEADS-STREAM] Rendering leads list with",
                    leads.length,
                    "leads"
                  )
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-muted-foreground text-sm">
                          Showing {leads.length} lead
                          {leads.length !== 1 ? "s" : ""}
                        </p>
                        {progress?.status === "completed" &&
                          progress.results && (
                            <div className="text-muted-foreground flex items-center gap-4 text-xs">
                              <span>
                                Avg. Score:{" "}
                                {progress.results.averageRelevanceScore}%
                              </span>
                              <span>•</span>
                              <span>
                                From {progress.results.totalThreadsAnalyzed}{" "}
                                threads
                              </span>
                            </div>
                          )}
                      </div>
                      {leads.map((lead, index) => {
                        console.log(
                          `🔥🔥🔥 [LEADS-STREAM] Rendering lead ${index}:`,
                          lead.id,
                          lead.postTitle
                        )
                        return (
                          <Card key={lead.id} className="overflow-hidden">
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-1">
                                  <CardTitle className="line-clamp-2 text-lg">
                                    {lead.postTitle}
                                  </CardTitle>
                                  <CardDescription className="flex items-center gap-4 text-sm">
                                    <span>r/{lead.subreddit}</span>
                                    <span>•</span>
                                    <span>u/{lead.authorUsername}</span>
                                    <span>•</span>
                                    <span>
                                      {lead.createdAt?.toDate
                                        ? formatDistanceToNow(
                                            lead.createdAt.toDate(),
                                            { addSuffix: true }
                                          )
                                        : "Just now"}
                                    </span>
                                  </CardDescription>
                                </div>
                                <Badge
                                  variant={
                                    lead.status === "posted"
                                      ? "default"
                                      : lead.status === "failed"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {lead.status === "posted" && (
                                    <CheckCircle className="mr-1 size-3" />
                                  )}
                                  {lead.status}
                                </Badge>
                              </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                              {lead.postBody && (
                                <div className="text-muted-foreground line-clamp-3 text-sm">
                                  {lead.postBody}
                                </div>
                              )}

                              <div className="text-muted-foreground flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <ThumbsUp className="size-3" />
                                  <span>{lead.score} upvotes</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="size-3" />
                                  <span>{lead.numComments} comments</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  Relevance:{" "}
                                  {Math.round(lead.relevanceScore * 100)}%
                                </Badge>
                              </div>

                              <div className="bg-muted/30 rounded-lg border p-4">
                                <div className="mb-2 flex items-center justify-between">
                                  <p className="text-sm font-medium">
                                    Generated Comment
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {lead.commentTone || "professional"}
                                  </Badge>
                                </div>
                                <p className="whitespace-pre-wrap text-sm">
                                  {lead.generatedComment}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    copyToClipboard(lead.generatedComment)
                                  }
                                >
                                  <Copy className="mr-2 size-3" />
                                  Copy Comment
                                </Button>
                                <Button size="sm" variant="outline" asChild>
                                  <a
                                    href={lead.postUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="mr-2 size-3" />
                                    View Post
                                  </a>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )
                })()}
    </div>
  )
}
