"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, MessageSquare, ThumbsUp, Clock, CheckCircle, Copy } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

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

interface Props {
  campaignId: string
}

export default function LeadsStream({ campaignId }: Props) {
  console.log("🔥🔥🔥 [LEADS-STREAM] Component mounted with campaignId:", campaignId)
  
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  
  console.log("🔥🔥🔥 [LEADS-STREAM] Initial state - leads count:", leads.length, "loading:", loading)

  useEffect(() => {
    console.log("🔥🔥🔥 [LEADS-STREAM] useEffect triggered, campaignId:", campaignId)
    
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
        (snapshot) => {
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
          
          console.log("🔥🔥🔥 [LEADS-STREAM] Processed docs count:", docs.length)
          console.log("🔥🔥🔥 [LEADS-STREAM] Setting leads state")
          setLeads(docs)
          setLoading(false)
          console.log("🔥🔥🔥 [LEADS-STREAM] State updated - loading: false, leads:", docs.length)
        },
        (error) => {
          console.error("🔥🔥🔥 [LEADS-STREAM] Firestore error:", error)
          console.error("🔥🔥🔥 [LEADS-STREAM] Error code:", error.code)
          console.error("🔥🔥🔥 [LEADS-STREAM] Error message:", error.message)
          console.error("🔥🔥🔥 [LEADS-STREAM] Error stack:", error.stack)
          toast.error("Failed to load leads")
          setLoading(false)
        }
      )
      
      console.log("🔥🔥🔥 [LEADS-STREAM] Listener setup complete")

      return () => {
        console.log("🔥🔥🔥 [LEADS-STREAM] Cleanup function called, unsubscribing listener")
        unsubscribe()
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

  console.log("🔥🔥🔥 [LEADS-STREAM] Rendering component - loading:", loading, "leads:", leads.length)

  return (
    <div className="space-y-6">
      {loading ? (
        (() => {
          console.log("🔥🔥🔥 [LEADS-STREAM] Rendering loading state")
          return (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          )
        })()
      ) : leads.length === 0 ? (
        (() => {
          console.log("🔥🔥🔥 [LEADS-STREAM] Rendering empty state")
          return (
            <Card className="p-12 text-center">
              <MessageSquare className="text-muted-foreground mx-auto mb-4 size-12" />
              <h3 className="mb-2 text-lg font-semibold">No leads generated yet</h3>
              <p className="text-muted-foreground text-sm">
                Click "Start Lead Generation" to begin finding leads
              </p>
            </Card>
          )
        })()
      ) : (
        (() => {
          console.log("🔥🔥🔥 [LEADS-STREAM] Rendering leads list with", leads.length, "leads")
          return (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}
              </p>
              {leads.map((lead, index) => {
                console.log(`🔥🔥🔥 [LEADS-STREAM] Rendering lead ${index}:`, lead.id, lead.postTitle)
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
                            <span>{lead.createdAt?.toDate ? formatDistanceToNow(lead.createdAt.toDate(), { addSuffix: true }) : 'Just now'}</span>
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={lead.status === "posted" ? "default" : lead.status === "failed" ? "destructive" : "secondary"}
                        >
                          {lead.status === "posted" && <CheckCircle className="mr-1 size-3" />}
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
                          Relevance: {Math.round(lead.relevanceScore * 100)}%
                        </Badge>
                      </div>

                      <div className="bg-muted/30 rounded-lg border p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-medium">Generated Comment</p>
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
                          onClick={() => copyToClipboard(lead.generatedComment)}
                        >
                          <Copy className="mr-2 size-3" />
                          Copy Comment
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a href={lead.postUrl} target="_blank" rel="noopener noreferrer">
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
        })()
      )}
    </div>
  )
} 