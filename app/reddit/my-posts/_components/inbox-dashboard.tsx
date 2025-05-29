"use client"

import { useState, useEffect } from "react"
import { useOrganization } from "@/components/utilities/organization-provider"
import { 
  SerializedGeneratedCommentDocument, 
  SerializedInboxItemDocument
} from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  MessageSquare, 
  Clock, 
  User, 
  ArrowUp,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  Archive,
  Bell,
  Heart,
  ThumbsDown,
  ThumbsUp,
  ExternalLink,
  Sparkles,
  Edit2,
  X
} from "lucide-react"
import { toast } from "sonner"
import { getGeneratedCommentsByOrganizationIdAction } from "@/actions/db/lead-generation-actions"
import { ListLoadingSkeleton } from "@/components/ui/loading-skeleton"
import { generateReplyToCommentAction } from "@/actions/integrations/openai/openai-actions"
import { getCampaignByIdAction } from "@/actions/db/campaign-actions"

interface ConversationWithReplies extends SerializedGeneratedCommentDocument {
  inboxItems?: SerializedInboxItemDocument[]
  isLoadingReplies?: boolean
  subreddit?: string
}

interface InboxDashboardProps {
  userId: string
}

export default function InboxDashboard({ userId }: InboxDashboardProps) {
  const { currentOrganization, isLoading: orgLoading } = useOrganization()
  
  // Data state
  const [conversations, setConversations] = useState<ConversationWithReplies[]>([])
  const [inboxItems, setInboxItems] = useState<SerializedInboxItemDocument[]>([])
  
  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isComposing, setIsComposing] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const [isGeneratingReply, setIsGeneratingReply] = useState(false)
  const [selectedInboxItemId, setSelectedInboxItemId] = useState<string | null>(null)

  // Load conversations and inbox items
  useEffect(() => {
    if (currentOrganization && !orgLoading) {
      loadConversations()
      loadInboxItems()
    }
  }, [currentOrganization, orgLoading])

  const loadConversations = async () => {
    if (!currentOrganization) return

    try {
      console.log("📧 [INBOX-DASHBOARD] Loading conversations...")
      setIsLoading(true)
      
      const result = await getGeneratedCommentsByOrganizationIdAction(currentOrganization.id)
      
      if (result.isSuccess) {
        // Filter only posted comments that have URLs
        const postedComments = result.data
          .filter(comment => comment.status === "posted" && comment.postedCommentUrl)
          .map(comment => ({
            ...comment,
            subreddit: comment.postUrl?.match(/r\/([^/]+)/)?.[1] || "unknown"
          }))
          
        setConversations(postedComments)
        console.log(`✅ [INBOX-DASHBOARD] Loaded ${postedComments.length} conversations`)
        
        // Auto-select first conversation if none selected
        if (postedComments.length > 0 && !selectedConversationId) {
          setSelectedConversationId(postedComments[0].id)
        }
      } else {
        toast.error("Failed to load conversations")
        console.error("❌ [INBOX-DASHBOARD] Failed to load conversations:", result.message)
      }
    } catch (error) {
      toast.error("Error loading conversations")
    } finally {
      setIsLoading(false)
    }
  }

  const loadInboxItems = async () => {
    if (!currentOrganization) return

    try {
      console.log("📧 [INBOX-DASHBOARD] Loading inbox items...")
      
      const response = await fetch(`/api/inbox/items?${statusFilter !== "all" ? `status=${statusFilter}` : ""}`)
      const data = await response.json()
      
      if (data.success) {
        setInboxItems(data.data)
        console.log(`✅ [INBOX-DASHBOARD] Loaded ${data.data.length} inbox items`)
      } else {
        toast.error("Failed to load inbox items")
        console.error("❌ [INBOX-DASHBOARD] Failed to load inbox items:", data.error)
      }
    } catch (error) {
      toast.error("Error loading inbox items")
    }
  }

  const generateAIReply = async (inboxItem: SerializedInboxItemDocument) => {
    if (!currentOrganization) return

    setIsGeneratingReply(true)
    setSelectedInboxItemId(inboxItem.id)

    try {
      // Find the parent conversation
      const conversation = conversations.find(c => c.id === inboxItem.parent_leadify_comment_id)
      if (!conversation) {
        throw new Error("Parent conversation not found")
      }

      // Get campaign data for context
      const campaignResult = await getCampaignByIdAction(conversation.campaignId)
      if (!campaignResult.isSuccess) {
        throw new Error("Failed to get campaign data")
      }

      const selectedComment = conversation[(conversation.selectedLength || "medium") + "Comment" as keyof SerializedGeneratedCommentDocument] as string
      
      const result = await generateReplyToCommentAction(
        selectedComment,
        inboxItem.body,
        inboxItem.author,
        campaignResult.data.website || "",
        campaignResult.data.websiteContent || ""
      )

      if (result.isSuccess) {
        setReplyText(result.data.reply)
        setIsComposing(true)
        toast.success("AI reply generated successfully!")
      } else {
        toast.error("Failed to generate AI reply")
      }
    } catch (error) {
      toast.error("Error generating AI reply")
    } finally {
      setIsGeneratingReply(false)
      setSelectedInboxItemId(null)
    }
  }

  const postReply = async (inboxItemId: string) => {
    if (!replyText.trim()) {
      toast.error("Reply cannot be empty")
      return
    }

    setIsPosting(true)

    try {
      console.log(`📧 [INBOX-DASHBOARD] Posting reply to item: ${inboxItemId}`)
      
      const response = await fetch(`/api/inbox/items/${inboxItemId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          replyText: replyText.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Reply posted successfully!")
        setReplyText("")
        setIsComposing(false)
        
        // Refresh inbox items to show updated status
        loadInboxItems()
        
        console.log(`✅ [INBOX-DASHBOARD] Reply posted: ${data.data.commentUrl}`)
      } else {
        toast.error(data.error || "Failed to post reply")
        console.error("❌ [INBOX-DASHBOARD] Failed to post reply:", data.error)
      }
    } catch (error) {
      toast.error("Failed to post reply")
    } finally {
      setIsPosting(false)
    }
  }

  const updateItemStatus = async (
    inboxItemId: string, 
    status: string, 
    notes?: string
  ) => {
    try {
      console.log(`📧 [INBOX-DASHBOARD] Updating item status: ${inboxItemId} -> ${status}`)
      
      const response = await fetch(`/api/inbox/items/${inboxItemId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status, notes })
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Status updated successfully")
        loadInboxItems() // Refresh to show updated status
        console.log(`✅ [INBOX-DASHBOARD] Status updated successfully`)
      } else {
        toast.error(data.error || "Failed to update status")
        console.error("❌ [INBOX-DASHBOARD] Failed to update status:", data.error)
      }
    } catch (error) {
      toast.error("Failed to update status")
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return <ThumbsUp className="size-3 text-green-600" />
      case "negative":
        return <ThumbsDown className="size-3 text-red-600" />
      default:
        return <Heart className="size-3 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unread":
        return <Badge variant="default">Unread</Badge>
      case "read":
        return <Badge variant="secondary">Read</Badge>
      case "action_needed":
        return <Badge variant="destructive">Action Needed</Badge>
      case "archived":
        return <Badge variant="outline">Archived</Badge>
      case "replied":
        return <Badge variant="default" className="bg-green-600">Replied</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Get inbox items for selected conversation
  const selectedConversation = conversations.find(c => c.id === selectedConversationId)
  const conversationInboxItems = inboxItems.filter(item => 
    item.parent_leadify_comment_id === selectedConversationId
  )

  // Filter conversations based on status
  const filteredConversations = conversations.filter(conversation => {
    const conversationItems = inboxItems.filter(item => 
      item.parent_leadify_comment_id === conversation.id
    )
    
    if (statusFilter === "all") return true
    if (statusFilter === "unread") {
      return conversationItems.some(item => item.status === "unread")
    }
    if (statusFilter === "action_needed") {
      return conversationItems.some(item => item.status === "action_needed")
    }
    return conversationItems.some(item => item.status === statusFilter)
  })

  if (isLoading) {
    return <ListLoadingSkeleton items={5} className="space-y-4" />
  }

  if (conversations.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <MessageSquare className="size-4" />
          <AlertTitle>No Conversations Yet</AlertTitle>
          <AlertDescription>
            You haven't posted any comments to Reddit yet. Head to the Lead
            Finder to start posting and generating conversations!
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button asChild>
            <a href="/reddit/lead-finder">
              <MessageSquare className="mr-2 size-4" />
              Go to Lead Finder
            </a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Left Pane - Conversations List */}
      <div className="flex w-1/3 flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Conversations</h2>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conversations</SelectItem>
              <SelectItem value="unread">Has Unread</SelectItem>
              <SelectItem value="action_needed">Action Needed</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-3">
            {filteredConversations.map(conversation => {
              const conversationItems = inboxItems.filter(item => 
                item.parent_leadify_comment_id === conversation.id
              )
              const unreadCount = conversationItems.filter(item => item.status === "unread").length
              const hasActionNeeded = conversationItems.some(item => item.status === "action_needed")
              const latestReply = conversationItems.sort((a, b) => b.created_utc - a.created_utc)[0]

              return (
                <Card
                  key={conversation.id}
                  className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    selectedConversationId === conversation.id ? "ring-2 ring-blue-500" : ""
                  }`}
                  onClick={() => setSelectedConversationId(conversation.id)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="line-clamp-2 text-sm font-medium">
                          {conversation.postTitle}
                        </h3>
                        {(unreadCount > 0 || hasActionNeeded) && (
                          <div className="flex items-center gap-1">
                            {hasActionNeeded && (
                              <AlertCircle className="size-3 text-red-500" />
                            )}
                            {unreadCount > 0 && (
                              <Badge variant="default" className="text-xs">
                                {unreadCount}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        r/{conversation.subreddit} • {conversation.relevanceScore}% match
                      </div>
                      
                      {latestReply && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <User className="size-3" />
                            <span>u/{latestReply.author}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(latestReply.created_utc)}</span>
                            {getSentimentIcon(latestReply.sentiment)}
                          </div>
                          <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
                            {latestReply.body}
                          </p>
                        </div>
                      )}
                      
                      {conversationItems.length === 0 && (
                        <div className="text-xs text-gray-500">
                          No replies yet
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Right Pane - Conversation Details */}
      <div className="flex flex-1 flex-col">
        {selectedConversation ? (
          <>
            {/* Conversation Header */}
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {selectedConversation.postTitle}
                    </CardTitle>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                      <span>r/{selectedConversation.subreddit}</span>
                      <span>•</span>
                      <span>by u/{selectedConversation.postAuthor}</span>
                      <span>•</span>
                      <Badge variant="secondary" className="text-xs">
                        {selectedConversation.relevanceScore}% Match
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(selectedConversation.postedCommentUrl, "_blank")}
                  >
                    <ExternalLink className="mr-2 size-3" />
                    View on Reddit
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Conversation Thread */}
            <ScrollArea className="mb-4 flex-1">
              <div className="space-y-4">
                {/* Original Post Context */}
                <Card className="bg-blue-50 dark:bg-blue-900/20">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                      <User className="size-3" />
                      <span>Original Post by u/{selectedConversation.postAuthor}</span>
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {selectedConversation.postContentSnippet}
                    </p>
                  </CardContent>
                </Card>

                {/* Your Comment */}
                <Card className="bg-green-50 dark:bg-green-900/20">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                      <MessageSquare className="size-3" />
                      <span>Your Comment</span>
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      {selectedConversation[(selectedConversation.selectedLength || "medium") + "Comment" as keyof SerializedGeneratedCommentDocument] as string}
                    </p>
                  </CardContent>
                </Card>

                {/* Replies */}
                {conversationInboxItems.length > 0 ? (
                  <div className="space-y-3">
                    {conversationInboxItems
                      .sort((a, b) => a.created_utc - b.created_utc)
                      .map(item => (
                        <Card 
                          key={item.id}
                          className={`${
                            item.status === "unread" ? "ring-2 ring-blue-200" : ""
                          } ${
                            item.status === "action_needed" ? "ring-2 ring-red-200" : ""
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {/* Reply Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                  <User className="size-3" />
                                  <span className="font-medium">u/{item.author}</span>
                                  <span>•</span>
                                  <span>{formatTimeAgo(item.created_utc)}</span>
                                  {item.score !== undefined && (
                                    <>
                                      <span>•</span>
                                      <div className="flex items-center gap-1">
                                        <ArrowUp className="size-3" />
                                        <span>{item.score}</span>
                                      </div>
                                    </>
                                  )}
                                  {getSentimentIcon(item.sentiment)}
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(item.status)}
                                </div>
                              </div>

                              {/* Reply Content */}
                              <p className="text-sm">{item.body}</p>

                              {/* Action Buttons */}
                              {item.status !== "replied" && (
                                <div className="flex items-center gap-2 border-t pt-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => generateAIReply(item)}
                                    disabled={isGeneratingReply && selectedInboxItemId === item.id}
                                  >
                                    {isGeneratingReply && selectedInboxItemId === item.id ? (
                                      <>
                                        <Loader2 className="mr-1 size-3 animate-spin" />
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="mr-1 size-3" />
                                        AI Reply
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setIsComposing(true)
                                      setSelectedInboxItemId(item.id)
                                    }}
                                  >
                                    <Edit2 className="mr-1 size-3" />
                                    Manual Reply
                                  </Button>
                                  {item.status === "unread" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => updateItemStatus(item.id, "read")}
                                    >
                                      <CheckCircle className="mr-1 size-3" />
                                      Mark Read
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updateItemStatus(item.id, "archived")}
                                  >
                                    <Archive className="mr-1 size-3" />
                                    Archive
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <Alert>
                    <Bell className="size-4" />
                    <AlertTitle>No Replies Yet</AlertTitle>
                    <AlertDescription>
                      This conversation hasn't received any replies yet. Replies will appear here automatically when they come in.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>

            {/* Reply Composer */}
            {isComposing && (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Compose Reply</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsComposing(false)
                          setReplyText("")
                          setSelectedInboxItemId(null)
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="min-h-24"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsComposing(false)
                          setReplyText("")
                          setSelectedInboxItemId(null)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          if (selectedInboxItemId) {
                            postReply(selectedInboxItemId)
                          }
                        }}
                        disabled={isPosting || !replyText.trim() || !selectedInboxItemId}
                      >
                        {isPosting ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Posting...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 size-4" />
                            Post Reply
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="space-y-2 text-center">
              <MessageSquare className="mx-auto size-12 text-gray-400" />
              <h3 className="text-lg font-medium">Select a Conversation</h3>
              <p className="text-gray-600">
                Choose a conversation from the left to view and manage replies
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 