"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, Send, MessageSquare, Search, Clock, CheckCircle, XCircle, AlertCircle, Plus, Trash2, Edit } from "lucide-react"
import { toast } from "sonner"
import { OrganizationDocument, SerializedOrganizationDocument } from "@/db/schema"
import { searchRedditAction } from "@/actions/integrations/reddit/reddit-search-actions"
import { generateDMAction } from "@/actions/integrations/openai/dm-generation-actions"
import { sendRedditDMAction, checkCanSendDMAction } from "@/actions/integrations/reddit/dm-actions"
import { 
  createDMAction, 
  getDMsByOrganizationAction, 
  updateDMAction,
  createDMTemplateAction,
  getDMTemplatesByOrganizationAction,
  updateDMTemplateAction,
  deleteDMTemplateAction,
  createDMAutomationAction,
  getDMAutomationsByOrganizationAction,
  updateDMAutomationAction,
  deleteDMAutomationAction,
  checkDMAlreadySentAction,
  createDMHistoryAction
} from "@/actions/db/dm-actions"
import { DMDocument, DMTemplateDocument, DMAutomationDocument } from "@/db/schema"
import { Timestamp } from "firebase/firestore"

interface DMFinderDashboardProps {
  organizationId: string
  userId: string
  organization: SerializedOrganizationDocument
}

interface RedditPost {
  id: string
  title: string
  author: string
  subreddit: string
  url: string
  created_utc: number
  selftext: string
  score: number
  num_comments: number
}

export default function DMFinderDashboard({
  organizationId,
  userId,
  organization
}: DMFinderDashboardProps) {
  console.log("📨 [DM-DASHBOARD] Rendering DM finder dashboard")
  console.log("📨 [DM-DASHBOARD] Organization:", organizationId)
  console.log("📨 [DM-DASHBOARD] User:", userId)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [subreddit, setSubreddit] = useState("")
  const [timeFilter, setTimeFilter] = useState("month")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<RedditPost[]>([])
  
  // DM state
  const [selectedPost, setSelectedPost] = useState<RedditPost | null>(null)
  const [dmContent, setDmContent] = useState("")
  const [followUpContent, setFollowUpContent] = useState("")
  const [isGeneratingDM, setIsGeneratingDM] = useState(false)
  const [isSendingDM, setIsSendingDM] = useState(false)
  const [showDMPreview, setShowDMPreview] = useState(false)
  
  // Templates state
  const [templates, setTemplates] = useState<DMTemplateDocument[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<DMTemplateDocument | null>(null)
  const [templateName, setTemplateName] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [templateMessage, setTemplateMessage] = useState("")
  const [templateFollowUp, setTemplateFollowUp] = useState("")
  
  // Automation state
  const [automations, setAutomations] = useState<DMAutomationDocument[]>([])
  const [showAutomationDialog, setShowAutomationDialog] = useState(false)
  const [automationName, setAutomationName] = useState("")
  const [automationKeywords, setAutomationKeywords] = useState("")
  const [automationSubreddits, setAutomationSubreddits] = useState("")
  const [automationTemplateId, setAutomationTemplateId] = useState("")
  const [automationMaxDaily, setAutomationMaxDaily] = useState("10")
  
  // DM history state
  const [dmHistory, setDmHistory] = useState<DMDocument[]>([])
  const [activeTab, setActiveTab] = useState("search")
  
  // Load templates and automations on mount
  useEffect(() => {
    loadTemplates()
    loadAutomations()
    loadDMHistory()
  }, [organizationId])
  
  const loadTemplates = async () => {
    console.log("📋 [DM-DASHBOARD] Loading templates...")
    const result = await getDMTemplatesByOrganizationAction(organizationId)
    if (result.isSuccess) {
      setTemplates(result.data)
      console.log("📋 [DM-DASHBOARD] Loaded templates:", result.data.length)
    }
  }
  
  const loadAutomations = async () => {
    console.log("🤖 [DM-DASHBOARD] Loading automations...")
    const result = await getDMAutomationsByOrganizationAction(organizationId)
    if (result.isSuccess) {
      setAutomations(result.data)
      console.log("🤖 [DM-DASHBOARD] Loaded automations:", result.data.length)
    }
  }
  
  const loadDMHistory = async () => {
    console.log("📜 [DM-DASHBOARD] Loading DM history...")
    const result = await getDMsByOrganizationAction(organizationId)
    if (result.isSuccess) {
      setDmHistory(result.data)
      console.log("📜 [DM-DASHBOARD] Loaded DM history:", result.data.length)
    }
  }
  
  const handleSearch = async () => {
    console.log("🔍 [DM-DASHBOARD] Starting search...")
    console.log("🔍 [DM-DASHBOARD] Query:", searchQuery)
    console.log("🔍 [DM-DASHBOARD] Subreddit:", subreddit)
    console.log("🔍 [DM-DASHBOARD] Time filter:", timeFilter)
    
    setIsSearching(true)
    try {
      const result = await searchRedditAction(
        organizationId,
        searchQuery,
        {
          subreddit: subreddit || undefined,
          sort: "relevance",
          time: timeFilter as any,
          limit: 25
        }
      )
      
      if (result.isSuccess) {
        // Filter posts from last 30 days
        const thirtyDaysAgo = Date.now() / 1000 - (30 * 24 * 60 * 60)
        const recentPosts = result.data.filter((post: any) => post.created_utc > thirtyDaysAgo)
        
        setSearchResults(recentPosts)
        console.log("🔍 [DM-DASHBOARD] Found posts:", recentPosts.length)
        toast.success(`Found ${recentPosts.length} recent posts`)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("🔍 [DM-DASHBOARD] Search error:", error)
      toast.error("Failed to search posts")
    } finally {
      setIsSearching(false)
    }
  }
  
  const handleGenerateDM = async (post: RedditPost) => {
    console.log("💬 [DM-DASHBOARD] Generating DM for post:", post.id)
    setSelectedPost(post)
    setIsGeneratingDM(true)
    setShowDMPreview(true)
    
    try {
      // Check if already sent DM to this user
      const alreadySentResult = await checkDMAlreadySentAction(organizationId, post.author)
      if (alreadySentResult.isSuccess && alreadySentResult.data) {
        toast.warning("You've already sent a DM to this user")
      }
      
      const result = await generateDMAction({
        postTitle: post.title,
        postContent: post.selftext || "",
        postAuthor: post.author,
        postCreatedAt: Timestamp.fromMillis(post.created_utc * 1000),
        subreddit: post.subreddit,
        businessContext: organization.businessDescription || "We help businesses grow",
        targetAudience: "businesses looking for growth",
        valueProposition: "affordable and effective solutions"
      })
      
      if (result.isSuccess) {
        setDmContent(result.data.message)
        setFollowUpContent(result.data.followUp)
        console.log("💬 [DM-DASHBOARD] DM generated successfully")
      } else {
        toast.error(result.message)
        setShowDMPreview(false)
      }
    } catch (error) {
      console.error("💬 [DM-DASHBOARD] Generate error:", error)
      toast.error("Failed to generate DM")
      setShowDMPreview(false)
    } finally {
      setIsGeneratingDM(false)
    }
  }
  
  const handleSendDM = async () => {
    if (!selectedPost) return
    
    console.log("📨 [DM-DASHBOARD] Sending DM to:", selectedPost.author)
    setIsSendingDM(true)
    
    try {
      // Check if user can receive DMs
      const canSendResult = await checkCanSendDMAction(organizationId, selectedPost.author)
      if (!canSendResult.isSuccess || !canSendResult.data) {
        toast.error("This user cannot receive DMs")
        return
      }
      
      // Create DM record
      const dmResult = await createDMAction({
        organizationId,
        userId,
        postId: selectedPost.id,
        postTitle: selectedPost.title,
        postUrl: selectedPost.url,
        postAuthor: selectedPost.author,
        postCreatedAt: Timestamp.fromMillis(selectedPost.created_utc * 1000),
        subreddit: selectedPost.subreddit,
        messageContent: dmContent,
        followUpContent: followUpContent
      })
      
      if (!dmResult.isSuccess) {
        toast.error(dmResult.message)
        return
      }
      
      // Send the actual DM
      const sendResult = await sendRedditDMAction({
        organizationId,
        recipientUsername: selectedPost.author,
        subject: `Re: ${selectedPost.title.substring(0, 50)}...`,
        message: dmContent
      })
      
      if (sendResult.isSuccess) {
        // Update DM status
        await updateDMAction(dmResult.data.id, {
          status: "sent",
          sentAt: Timestamp.now()
        })
        
        // Record in history
        await createDMHistoryAction({
          organizationId,
          userId,
          dmId: dmResult.data.id,
          postId: selectedPost.id,
          postAuthor: selectedPost.author,
          messageContent: dmContent,
          followUpContent: followUpContent,
          sentAt: Timestamp.now()
        })
        
        toast.success("DM sent successfully!")
        setShowDMPreview(false)
        loadDMHistory()
      } else {
        // Update DM status to failed
        await updateDMAction(dmResult.data.id, {
          status: "failed",
          error: sendResult.message
        })
        toast.error(sendResult.message)
      }
    } catch (error) {
      console.error("📨 [DM-DASHBOARD] Send error:", error)
      toast.error("Failed to send DM")
    } finally {
      setIsSendingDM(false)
    }
  }
  
  const handleSaveTemplate = async () => {
    console.log("📋 [DM-DASHBOARD] Saving template...")
    
    if (editingTemplate) {
      // Update existing template
      const result = await updateDMTemplateAction(editingTemplate.id, {
        name: templateName,
        description: templateDescription,
        messageTemplate: templateMessage,
        followUpTemplate: templateFollowUp
      })
      
      if (result.isSuccess) {
        toast.success("Template updated")
        loadTemplates()
        setShowTemplateDialog(false)
        setEditingTemplate(null)
      } else {
        toast.error(result.message)
      }
    } else {
      // Create new template
      const result = await createDMTemplateAction({
        organizationId,
        userId,
        name: templateName,
        description: templateDescription,
        messageTemplate: templateMessage,
        followUpTemplate: templateFollowUp
      })
      
      if (result.isSuccess) {
        toast.success("Template created")
        loadTemplates()
        setShowTemplateDialog(false)
      } else {
        toast.error(result.message)
      }
    }
  }
  
  const handleDeleteTemplate = async (templateId: string) => {
    console.log("🗑️ [DM-DASHBOARD] Deleting template:", templateId)
    
    const result = await deleteDMTemplateAction(templateId)
    if (result.isSuccess) {
      toast.success("Template deleted")
      loadTemplates()
    } else {
      toast.error(result.message)
    }
  }
  
  const handleSaveAutomation = async () => {
    console.log("🤖 [DM-DASHBOARD] Saving automation...")
    
    const result = await createDMAutomationAction({
      organizationId,
      userId,
      name: automationName,
      keywords: automationKeywords.split(",").map(k => k.trim()).filter(Boolean),
      subreddits: automationSubreddits.split(",").map(s => s.trim()).filter(Boolean),
      templateId: automationTemplateId,
      maxDailyDMs: parseInt(automationMaxDaily)
    })
    
    if (result.isSuccess) {
      toast.success("Automation created")
      loadAutomations()
      setShowAutomationDialog(false)
    } else {
      toast.error(result.message)
    }
  }
  
  const handleToggleAutomation = async (automation: DMAutomationDocument) => {
    console.log("🤖 [DM-DASHBOARD] Toggling automation:", automation.id)
    
    const result = await updateDMAutomationAction(automation.id, {
      isActive: !automation.isActive
    })
    
    if (result.isSuccess) {
      toast.success(automation.isActive ? "Automation paused" : "Automation activated")
      loadAutomations()
    } else {
      toast.error(result.message)
    }
  }
  
  const handleDeleteAutomation = async (automationId: string) => {
    console.log("🗑️ [DM-DASHBOARD] Deleting automation:", automationId)
    
    const result = await deleteDMAutomationAction(automationId)
    if (result.isSuccess) {
      toast.success("Automation deleted")
      loadAutomations()
    } else {
      toast.error(result.message)
    }
  }
  
  const getTimeAgo = (timestamp: number) => {
    const now = Date.now() / 1000
    const diff = now - timestamp
    
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
    return `${Math.floor(diff / 604800)} weeks ago`
  }
  
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total DMs Sent</CardTitle>
            <Send className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dmHistory.filter(dm => dm.status === "sent").length}
            </div>
            <p className="text-muted-foreground text-xs">
              All time
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending DMs</CardTitle>
            <Clock className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dmHistory.filter(dm => dm.status === "pending").length}
            </div>
            <p className="text-muted-foreground text-xs">
              Ready to send
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Automations</CardTitle>
            <AlertCircle className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {automations.filter(a => a.isActive).length}
            </div>
            <p className="text-muted-foreground text-xs">
              Running now
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <MessageSquare className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-muted-foreground text-xs">
              Saved templates
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="search">Search Posts</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Reddit Posts</CardTitle>
              <CardDescription>
                Find recent posts (last 30 days) to send DMs to
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="search-query">Search Keywords</Label>
                  <Input
                    id="search-query"
                    placeholder="e.g., looking for developer"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subreddit">Subreddit (optional)</Label>
                  <Input
                    id="subreddit"
                    placeholder="e.g., startups"
                    value={subreddit}
                    onChange={(e) => setSubreddit(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="time-filter">Time Range</Label>
                  <Select value={timeFilter} onValueChange={setTimeFilter}>
                    <SelectTrigger id="time-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Past 24 hours</SelectItem>
                      <SelectItem value="week">Past week</SelectItem>
                      <SelectItem value="month">Past month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !searchQuery}
                className="w-full"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 size-4" />
                    Search Posts
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  {searchResults.length} posts found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {searchResults.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-start justify-between space-x-4 rounded-lg border p-4"
                    >
                      <div className="flex-1 space-y-1">
                        <h4 className="font-medium">{post.title}</h4>
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          <span>r/{post.subreddit}</span>
                          <span>•</span>
                          <span>u/{post.author}</span>
                          <span>•</span>
                          <span>{getTimeAgo(post.created_utc)}</span>
                        </div>
                        {post.selftext && (
                          <p className="text-muted-foreground line-clamp-2 text-sm">
                            {post.selftext}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <span>{post.score} upvotes</span>
                          <span>{post.num_comments} comments</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleGenerateDM(post)}
                        disabled={isGeneratingDM}
                      >
                        <MessageSquare className="mr-2 size-4" />
                        Generate DM
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DM Templates</CardTitle>
              <CardDescription>
                Create and manage reusable DM templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  setEditingTemplate(null)
                  setTemplateName("")
                  setTemplateDescription("")
                  setTemplateMessage("")
                  setTemplateFollowUp("")
                  setShowTemplateDialog(true)
                }}
              >
                <Plus className="mr-2 size-4" />
                Create Template
              </Button>
              
              <div className="mt-4 space-y-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-start justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1 space-y-1">
                      <h4 className="font-medium">{template.name}</h4>
                      {template.description && (
                        <p className="text-muted-foreground text-sm">
                          {template.description}
                        </p>
                      )}
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTemplate(template)
                          setTemplateName(template.name)
                          setTemplateDescription(template.description || "")
                          setTemplateMessage(template.messageTemplate)
                          setTemplateFollowUp(template.followUpTemplate || "")
                          setShowTemplateDialog(true)
                        }}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="automations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DM Automations</CardTitle>
              <CardDescription>
                Automatically send DMs when new posts match your criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  setAutomationName("")
                  setAutomationKeywords("")
                  setAutomationSubreddits("")
                  setAutomationTemplateId("")
                  setAutomationMaxDaily("10")
                  setShowAutomationDialog(true)
                }}
              >
                <Plus className="mr-2 size-4" />
                Create Automation
              </Button>
              
              <div className="mt-4 space-y-4">
                {automations.map((automation) => (
                  <div
                    key={automation.id}
                    className="flex items-start justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{automation.name}</h4>
                        <Badge variant={automation.isActive ? "default" : "secondary"}>
                          {automation.isActive ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        <p>Keywords: {automation.keywords.join(", ")}</p>
                        <p>Subreddits: {automation.subreddits.join(", ")}</p>
                        <p>Daily limit: {automation.maxDailyDMs} DMs</p>
                        <p>Sent today: {automation.dmsSentToday}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={automation.isActive}
                        onCheckedChange={() => handleToggleAutomation(automation)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAutomation(automation.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DM History</CardTitle>
              <CardDescription>
                View all sent and pending DMs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dmHistory.map((dm) => (
                  <div
                    key={dm.id}
                    className="flex items-start justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1 space-y-1">
                      <h4 className="font-medium">{dm.postTitle}</h4>
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <span>To: u/{dm.postAuthor}</span>
                        <span>•</span>
                        <span>r/{dm.subreddit}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            dm.status === "sent"
                              ? "default"
                              : dm.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {dm.status === "sent" && <CheckCircle className="mr-1 size-3" />}
                          {dm.status === "failed" && <XCircle className="mr-1 size-3" />}
                          {dm.status === "pending" && <Clock className="mr-1 size-3" />}
                          {dm.status}
                        </Badge>
                        {dm.sentAt && (
                          <span className="text-muted-foreground text-xs">
                            Sent {new Date(dm.sentAt.toMillis()).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* DM Preview Dialog */}
      <Dialog open={showDMPreview} onOpenChange={setShowDMPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>DM Preview</DialogTitle>
            <DialogDescription>
              Review and edit your DM before sending
            </DialogDescription>
          </DialogHeader>
          
          {isGeneratingDM ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>To: u/{selectedPost?.author}</Label>
                <div className="bg-muted rounded-lg p-3 text-sm">
                  Re: {selectedPost?.title}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dm-content">Message</Label>
                <Textarea
                  id="dm-content"
                  value={dmContent}
                  onChange={(e) => setDmContent(e.target.value)}
                  rows={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="followup-content">Follow-up Message</Label>
                <Textarea
                  id="followup-content"
                  value={followUpContent}
                  onChange={(e) => setFollowUpContent(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDMPreview(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendDM}
              disabled={isSendingDM || isGeneratingDM || !dmContent}
            >
              {isSendingDM ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 size-4" />
                  Send DM
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              Create a reusable DM template with variables
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Developer Outreach"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template-description">Description (optional)</Label>
              <Input
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Brief description of when to use this template"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template-message">Message Template</Label>
              <Textarea
                id="template-message"
                value={templateMessage}
                onChange={(e) => setTemplateMessage(e.target.value)}
                rows={6}
                placeholder="Use {{author}}, {{title}}, {{subreddit}}, {{timeAgo}} as variables"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template-followup">Follow-up Template</Label>
              <Textarea
                id="template-followup"
                value={templateFollowUp}
                onChange={(e) => setTemplateFollowUp(e.target.value)}
                rows={2}
                placeholder="Short follow-up message"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!templateName || !templateMessage}
            >
              {editingTemplate ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Automation Dialog */}
      <Dialog open={showAutomationDialog} onOpenChange={setShowAutomationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Automation</DialogTitle>
            <DialogDescription>
              Automatically send DMs when new posts match your criteria
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="automation-name">Automation Name</Label>
              <Input
                id="automation-name"
                value={automationName}
                onChange={(e) => setAutomationName(e.target.value)}
                placeholder="e.g., Developer Leads"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="automation-keywords">Keywords (comma-separated)</Label>
              <Input
                id="automation-keywords"
                value={automationKeywords}
                onChange={(e) => setAutomationKeywords(e.target.value)}
                placeholder="looking for developer, need programmer, hiring dev"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="automation-subreddits">Subreddits (comma-separated)</Label>
              <Input
                id="automation-subreddits"
                value={automationSubreddits}
                onChange={(e) => setAutomationSubreddits(e.target.value)}
                placeholder="startups, entrepreneur, smallbusiness"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="automation-template">DM Template</Label>
              <Select value={automationTemplateId} onValueChange={setAutomationTemplateId}>
                <SelectTrigger id="automation-template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="automation-max-daily">Max DMs per day</Label>
              <Input
                id="automation-max-daily"
                type="number"
                value={automationMaxDaily}
                onChange={(e) => setAutomationMaxDaily(e.target.value)}
                min="1"
                max="50"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutomationDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAutomation}
              disabled={
                !automationName ||
                !automationKeywords ||
                !automationSubreddits ||
                !automationTemplateId
              }
            >
              Create Automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 