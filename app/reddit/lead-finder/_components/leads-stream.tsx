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
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!campaignId) return

    console.log("🔥 [LEADS-STREAM] Setting up Firestore listener for campaign:", campaignId)
    
    const q = query(
      collection(db, "generated_comments"), 
      where("campaignId", "==", campaignId),
      orderBy("createdAt", "desc")
    )
    
    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        console.log("🔥 [LEADS-STREAM] Snapshot received, docs:", snapshot.docs.length)
        const docs = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null
          } as Lead
        })
        setLeads(docs)
        setLoading(false)
      },
      (error) => {
        console.error("🔥 [LEADS-STREAM] Error:", error)
        toast.error("Failed to load leads")
        setLoading(false)
      }
    )

    return () => {
      console.log("🔥 [LEADS-STREAM] Cleaning up listener")
      unsubscribe()
    }
  }, [campaignId])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Comment copied to clipboard!")
    } catch (error) {
      toast.error("Failed to copy comment")
    }
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No leads generated yet</h3>
          <p className="text-sm text-muted-foreground">
            Click "Start Lead Generation" to begin finding leads
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}
          </p>
          {leads.map((lead) => (
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
          ))}
        </div>
      )}
    </div>
  )
} 