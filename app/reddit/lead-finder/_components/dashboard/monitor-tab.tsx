"use client"

/*
<ai_context>
Real-time monitor tab component for displaying potential leads feed.
Shows new posts found by the scanning system before they're qualified.
</ai_context>
*/

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CheckCircle,
  X,
  Zap,
  Clock,
  MessageSquare,
  ExternalLink,
  Loader2,
  AlertCircle,
  Eye,
  TrendingUp
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/nextjs"
import { useOrganization } from "@/components/utilities/organization-provider"
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp
} from "firebase/firestore"
import { db } from "@/db/db"
import {
  SerializedPotentialLeadDocument,
  PotentialLeadStatus
} from "@/db/schema"

interface MonitorTabProps {
  campaignId: string | null
  organizationId: string
}

interface PotentialLead extends Omit<SerializedPotentialLeadDocument, "discovered_at" | "createdAt" | "updatedAt"> {
  discovered_at: string
  createdAt: string
  updatedAt: string
  timeAgo?: string
}

export default function MonitorTab({ campaignId, organizationId }: MonitorTabProps) {
  const { user } = useUser()
  const { currentOrganization } = useOrganization()
  
  const [potentialLeads, setPotentialLeads] = useState<PotentialLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [qualifyingLeads, setQualifyingLeads] = useState<Set<string>>(new Set())
  const [ignoringLeads, setIgnoringLeads] = useState<Set<string>>(new Set())
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<PotentialLeadStatus | "all">("new")
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null)

  // Real-time listener for potential leads
  useEffect(() => {
    if (!organizationId) return

    console.log("🎯 [MONITOR-TAB] Setting up real-time listener for organization:", organizationId)

    let leadsQuery = query(
      collection(db, "potential_leads_feed"),
      where("organizationId", "==", organizationId),
      orderBy("discovered_at", "desc"),
      limit(100)
    )

    // Add campaign filter if specified
    if (campaignId) {
      leadsQuery = query(
        collection(db, "potential_leads_feed"),
        where("organizationId", "==", organizationId),
        where("campaignId", "==", campaignId),
        orderBy("discovered_at", "desc"),
        limit(100)
      )
    }

    const unsubscribe = onSnapshot(
      leadsQuery,
      (snapshot) => {
        console.log("🎯 [MONITOR-TAB] Received real-time update:", snapshot.docs.length, "leads")
        
        const leads = snapshot.docs.map(doc => {
          const data = doc.data()
          
          // Calculate time ago
          const discoveredAt = data.discovered_at
          let timeAgo = "Unknown"
          
          if (discoveredAt) {
            let discoveredDate: Date
            if (discoveredAt.toDate) {
              // Firestore Timestamp
              discoveredDate = discoveredAt.toDate()
            } else if (typeof discoveredAt === "string") {
              // ISO string
              discoveredDate = new Date(discoveredAt)
            } else {
              discoveredDate = new Date()
            }
            
            const now = new Date()
            const diffMs = now.getTime() - discoveredDate.getTime()
            const diffMins = Math.floor(diffMs / (1000 * 60))
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
            
            if (diffMins < 1) {
              timeAgo = "Just now"
            } else if (diffMins < 60) {
              timeAgo = `${diffMins}m ago`
            } else if (diffHours < 24) {
              timeAgo = `${diffHours}h ago`
            } else {
              timeAgo = `${Math.floor(diffHours / 24)}d ago`
            }
          }
          
          return {
            ...data,
            discovered_at: discoveredAt?.toDate?.()?.toISOString() || discoveredAt,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
            timeAgo
          } as PotentialLead
        })
        
        setPotentialLeads(leads)
        setIsLoading(false)
        
        // Show notification for new leads (only for "new" status)
        const newLeads = leads.filter(lead => lead.status === "new")
        if (newLeads.length > 0 && !isLoading) {
          // Don't show notification on initial load
          setTimeout(() => {
            const recentLeads = newLeads.filter(lead => {
              const discoveredAt = new Date(lead.discovered_at)
              const now = new Date()
              const diffMins = (now.getTime() - discoveredAt.getTime()) / (1000 * 60)
              return diffMins < 5 // Only notify for leads discovered in last 5 minutes
            })
            
            if (recentLeads.length > 0) {
              toast.success(`🎯 ${recentLeads.length} new potential leads found!`, {
                description: recentLeads[0]?.title || "Check the Monitor tab",
                duration: 5000
              })
            }
          }, 1000)
        }
      },
      (error) => {
        console.error("🎯 [MONITOR-TAB] Real-time listener error:", error)
        setIsLoading(false)
        toast.error("Failed to load potential leads")
      }
    )

    return () => {
      console.log("🎯 [MONITOR-TAB] Cleaning up real-time listener")
      unsubscribe()
    }
  }, [organizationId, campaignId, isLoading])

  // Filter leads based on status and keyword
  const filteredLeads = potentialLeads.filter(lead => {
    if (statusFilter !== "all" && lead.status !== statusFilter) return false
    if (selectedKeyword && !lead.matchedKeywords.includes(selectedKeyword)) return false
    return true
  })

  // Get unique keywords for filter
  const uniqueKeywords = Array.from(
    new Set(potentialLeads.flatMap(lead => lead.matchedKeywords))
  ).sort()

  // Handle qualifying a lead
  const handleQualifyLead = async (leadId: string) => {
    if (!currentOrganization) return
    
    setQualifyingLeads(prev => new Set([...prev, leadId]))
    
    try {
      console.log("🎯 [MONITOR-TAB] Qualifying lead:", leadId)
      
      const response = await fetch("/api/monitoring/qualify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          leadIds: [leadId],
          organizationId: currentOrganization.id
        })
      })
      
      if (!response.ok) {
        throw new Error("Failed to qualify lead")
      }
      
      const result = await response.json()
      console.log("🎯 [MONITOR-TAB] Qualification result:", result)
      
      if (result.qualifiedLeads > 0) {
        toast.success("Lead qualified and comment generated!", {
          description: "Check the Comments tab to view the generated content",
          duration: 5000
        })
      } else {
        toast.info("Lead analyzed but did not meet qualification threshold", {
          description: "The AI determined this lead isn't a good fit",
          duration: 5000
        })
      }
    } catch (error) {
      console.error("🎯 [MONITOR-TAB] Error qualifying lead:", error)
      toast.error("Failed to qualify lead")
    } finally {
      setQualifyingLeads(prev => {
        const newSet = new Set(prev)
        newSet.delete(leadId)
        return newSet
      })
    }
  }

  // Handle ignoring a lead
  const handleIgnoreLead = async (leadId: string) => {
    setIgnoringLeads(prev => new Set([...prev, leadId]))
    
    try {
      console.log("🎯 [MONITOR-TAB] Ignoring lead:", leadId)
      
      // Update lead status to ignored
      const { updatePotentialLeadAction } = await import("@/actions/db/potential-leads-actions")
      const result = await updatePotentialLeadAction(leadId, {
        status: "ignored"
      })
      
      if (result.isSuccess) {
        toast.success("Lead ignored")
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("🎯 [MONITOR-TAB] Error ignoring lead:", error)
      toast.error("Failed to ignore lead")
    } finally {
      setIgnoringLeads(prev => {
        const newSet = new Set(prev)
        newSet.delete(leadId)
        return newSet
      })
    }
  }

  // Handle qualifying all new leads
  const handleQualifyAllNew = async () => {
    const newLeads = filteredLeads.filter(lead => lead.status === "new")
    if (newLeads.length === 0) return
    
    if (!currentOrganization) return
    
    try {
      console.log("🎯 [MONITOR-TAB] Qualifying all new leads:", newLeads.length)
      
      const response = await fetch("/api/monitoring/qualify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          leadIds: newLeads.map(lead => lead.id),
          organizationId: currentOrganization.id
        })
      })
      
      if (!response.ok) {
        throw new Error("Failed to qualify leads")
      }
      
      const result = await response.json()
      console.log("🎯 [MONITOR-TAB] Batch qualification result:", result)
      
      toast.success(`Processed ${result.leadsProcessed} leads`, {
        description: `${result.qualifiedLeads} qualified, ${result.ignoredLeads} ignored`,
        duration: 5000
      })
    } catch (error) {
      console.error("🎯 [MONITOR-TAB] Error qualifying all leads:", error)
      toast.error("Failed to qualify leads")
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            <span>Loading potential leads...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with stats and actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="size-5" />
                Real-Time Lead Monitor
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                New posts found by the scanning system, awaiting qualification
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="size-3" />
                {filteredLeads.filter(l => l.status === "new").length} New
              </Badge>
              <Badge variant="secondary">
                {filteredLeads.length} Total
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PotentialLeadStatus | "all")}
                className="rounded border px-2 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="new">New</option>
                <option value="qualifying">Qualifying</option>
                <option value="qualified_lead">Qualified</option>
                <option value="ignored">Ignored</option>
              </select>
            </div>

            {/* Keyword Filter */}
            {uniqueKeywords.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Keyword:</label>
                <select
                  value={selectedKeyword || "all"}
                  onChange={(e) => setSelectedKeyword(e.target.value === "all" ? null : e.target.value)}
                  className="rounded border px-2 py-1 text-sm"
                >
                  <option value="all">All Keywords</option>
                  {uniqueKeywords.map(keyword => (
                    <option key={keyword} value={keyword}>{keyword}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Qualify All Button */}
            {filteredLeads.filter(l => l.status === "new").length > 0 && (
              <Button
                onClick={handleQualifyAllNew}
                size="sm"
                className="gap-2"
              >
                <Zap className="size-4" />
                Qualify All New ({filteredLeads.filter(l => l.status === "new").length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Potential Leads List */}
      {filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="text-muted-foreground mx-auto mb-4 size-12" />
            <h3 className="mb-2 text-lg font-semibold">No potential leads found</h3>
            <p className="text-muted-foreground text-sm">
              {statusFilter === "new" 
                ? "No new potential leads are available. The scanning system will find new leads automatically."
                : `No leads with status "${statusFilter}" found.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {filteredLeads.map((lead, index) => (
              <Card 
                key={lead.id} 
                className={cn(
                  "transition-all duration-200",
                  lead.status === "new" && "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/30"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Title and Status */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium leading-tight">
                          {lead.title}
                        </h4>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge 
                            variant={
                              lead.status === "new" ? "default" :
                              lead.status === "qualified_lead" ? "secondary" :
                              lead.status === "qualifying" ? "outline" :
                              "destructive"
                            }
                            className="text-xs"
                          >
                            {lead.status.replace("_", " ")}
                          </Badge>
                          {lead.timeAgo && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Clock className="size-3" />
                              {lead.timeAgo}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Content snippet */}
                      <p className="text-muted-foreground line-clamp-2 text-sm">
                        {lead.content_snippet}
                      </p>

                      {/* Metadata */}
                      <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                        <span>r/{lead.subreddit}</span>
                        <span>•</span>
                        <span>u/{lead.author}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          {lead.matchedKeywords.map(keyword => (
                            <Badge key={keyword} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Qualification results */}
                      {lead.relevance_score && (
                        <div className="text-sm">
                          <span className="font-medium">AI Score: </span>
                          <Badge 
                            variant={lead.relevance_score >= 70 ? "secondary" : "outline"}
                          >
                            {lead.relevance_score}%
                          </Badge>
                          {lead.reasoning && (
                            <p className="text-muted-foreground mt-1 text-xs">
                              {lead.reasoning}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`https://reddit.com${lead.permalink}`, "_blank")}
                        className="gap-2"
                      >
                        <ExternalLink className="size-3" />
                        View
                      </Button>

                      {lead.status === "new" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleQualifyLead(lead.id)}
                            disabled={qualifyingLeads.has(lead.id)}
                            className="gap-2"
                          >
                            {qualifyingLeads.has(lead.id) ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <CheckCircle className="size-3" />
                            )}
                            Qualify
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleIgnoreLead(lead.id)}
                            disabled={ignoringLeads.has(lead.id)}
                            className="gap-2"
                          >
                            {ignoringLeads.has(lead.id) ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <X className="size-3" />
                            )}
                            Ignore
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
} 