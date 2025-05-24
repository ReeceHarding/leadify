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
    console.log("🔥 [LEADS-STREAM] Setting up Firestore listener for campaign:", campaignId)
    
    if (!campaignId) {
      console.log("🔥 [LEADS-STREAM] No campaign ID, skipping listener setup")
      setLoading(false)
      return
    }

    const leadsQuery = query(
      collection(db, "generated_comments"),
      where("campaignId", "==", campaignId),
      orderBy("createdAt", "desc")
    )

    const unsubscribe = onSnapshot(
      leadsQuery,
      (snapshot) => {
        console.log("🔥 [LEADS-STREAM] Received snapshot with", snapshot.size, "documents")
        
        const newLeads = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Lead))

        console.log("🔥 [LEADS-STREAM] Processed leads:", newLeads.length)
        setLeads(newLeads)
        setLoading(false)

        // Show toast for new leads
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" && !loading) {
            const lead = change.doc.data() as Lead
            toast.success(`New lead found in r/${lead.subreddit}!`)
          }
        })
      },
      (error) => {
        console.error("🔥 [LEADS-STREAM] Firestore listener error:", error)
        toast.error("Failed to load leads")
        setLoading(false)
      }
    )

    return () => {
      console.log("🔥 [LEADS-STREAM] Cleaning up Firestore listener")
      unsubscribe()
    }
  }, [campaignId, loading])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Comment copied to clipboard!")
    } catch (error) {
      toast.error("Failed to copy comment")
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">
            No leads found yet. The system is actively searching for relevant posts.
          </p>
          <p className="text-center text-sm text-muted-foreground mt-2">
            New leads will appear here in real-time as they're discovered.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Found {leads.length} lead{leads.length !== 1 ? 's' : ''}
        </p>
        <Badge variant="secondary" className="animate-pulse">
          <Clock className="mr-1 h-3 w-3" />
          Live Updates
        </Badge>
      </div>

      {leads.map((lead) => (
        <Card key={lead.id} className="overflow-hidden">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <CardTitle className="text-lg line-clamp-2">
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
                {lead.status === "posted" && <CheckCircle className="mr-1 h-3 w-3" />}
                {lead.status}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {lead.postBody && (
              <div className="text-sm text-muted-foreground line-clamp-3">
                {lead.postBody}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                <span>{lead.score} upvotes</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{lead.numComments} comments</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Relevance: {Math.round(lead.relevanceScore * 100)}%
              </Badge>
            </div>

            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Generated Comment</p>
                <Badge variant="outline" className="text-xs">
                  {lead.commentTone || "professional"}
                </Badge>
              </div>
              <p className="text-sm whitespace-pre-wrap">
                {lead.generatedComment}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(lead.generatedComment)}
              >
                <Copy className="mr-2 h-3 w-3" />
                Copy Comment
              </Button>
              <Button
                size="sm"
                variant="outline"
                asChild
              >
                <a href={lead.postUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-3 w-3" />
                  View Post
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 