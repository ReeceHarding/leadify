"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Timestamp } from "firebase/firestore"
import {
  Clock,
  Calendar,
  Building2,
  Target,
  MessageSquare,
  ExternalLink,
  Edit3,
  Trash2,
  Save,
  X,
  GripVertical,
  Zap,
  Shield,
  Settings,
  Loader2,
  RefreshCw,
  Play,
  Pause,
  SkipForward,
  Info,
  Plus,
  Filter,
  Eye,
  EyeOff
} from "lucide-react"
import {
  getUnifiedQueueByRedditAccountAction,
  reorderUnifiedQueueAction,
  updateUnifiedQueueItemAction,
  getRedditAccountsByOrganizationAction,
  getQueueSettingsAction,
  createOrUpdateQueueSettingsAction
} from "@/actions/db/unified-queue-actions"
import { useOrganization } from "@/components/utilities/organization-provider"
import {
  SerializedUnifiedPostQueueDocument,
  SerializedRedditAccountDocument,
  SerializedQueueSettingsDocument
} from "@/db/schema"

interface QueueManagementProps {
  userId: string
}

interface QueueItemProps {
  item: SerializedUnifiedPostQueueDocument
  onEdit: (item: SerializedUnifiedPostQueueDocument) => void
  onDelete: (itemId: string) => void
  onMove: (itemId: string, direction: "up" | "down") => void
  onPostNow: (itemId: string) => void
  isFirst: boolean
  isLast: boolean
}

const QueueItem: React.FC<QueueItemProps> = ({
  item,
  onEdit,
  onDelete,
  onMove,
  onPostNow,
  isFirst,
  isLast
}) => {
  const getBadgeColor = (type: string) => {
    switch (type) {
      case "warmup":
        return "bg-blue-500"
      case "lead_generation":
        return "bg-green-500"
      case "comment":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-200 bg-red-50"
      case "normal":
        return "border-gray-200 bg-white"
      case "low":
        return "border-gray-100 bg-gray-50"
      default:
        return "border-gray-200 bg-white"
    }
  }

  const getTimeUntilScheduled = (scheduledFor: string) => {
    const now = new Date()
    const scheduled = new Date(scheduledFor)
    const diffMs = scheduled.getTime() - now.getTime()
    
    if (diffMs <= 0) return "Ready to post"
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  return (
    <Card className={`transition-all hover:shadow-md ${getPriorityColor(item.priority)}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <GripVertical className="size-4 cursor-move text-gray-400" />
            <span className="font-mono text-xs text-gray-500">#{item.queuePosition}</span>
          </div>
          
          {/* Content */}
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`${getBadgeColor(item.type)} text-white`}>
                  {item.type.replace("_", " ")}
                </Badge>
                <Badge variant="outline">r/{item.subreddit}</Badge>
                {item.organizationName && (
                  <Badge variant="secondary" className="gap-1">
                    <Building2 className="size-3" />
                    {item.organizationName}
                  </Badge>
                )}
                {item.campaignName && (
                  <Badge variant="outline" className="gap-1">
                    <Target className="size-3" />
                    {item.campaignName}
                  </Badge>
                )}
                {item.relevanceScore && (
                  <Badge variant="outline">
                    {item.relevanceScore}% match
                  </Badge>
                )}
              </div>
              
              {/* Priority Badge */}
              {item.priority !== "normal" && (
                <Badge 
                  variant={item.priority === "high" ? "destructive" : "secondary"}
                  className="capitalize"
                >
                  {item.priority}
                </Badge>
              )}
            </div>

            {/* Title & Content */}
            {item.title && (
              <h4 className="line-clamp-2 font-medium">{item.title}</h4>
            )}
            <p className="line-clamp-3 text-sm text-gray-600">{item.content}</p>

            {/* Scheduling Info */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="size-3" />
                <span>
                  {new Date(item.scheduledFor).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="size-3" />
                <span className="font-medium">
                  {getTimeUntilScheduled(item.scheduledFor)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMove(item.id, "up")}
                disabled={isFirst}
                title="Move up"
              >
                <SkipForward className="size-3 rotate-[-90deg]" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onMove(item.id, "down")}
                disabled={isLast}
                title="Move down"
              >
                <SkipForward className="size-3 rotate-90" />
              </Button>
            </div>
            
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(item)}
                title="Edit"
              >
                <Edit3 className="size-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onPostNow(item.id)}
                title="Post now"
                className="text-green-600 hover:text-green-700"
              >
                <Play className="size-3" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Delete"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Queue Item</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove this item from the queue? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(item.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function QueueManagement({ userId }: QueueManagementProps) {
  const { currentOrganization } = useOrganization()
  const [redditAccounts, setRedditAccounts] = useState<SerializedRedditAccountDocument[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>("")
  const [queueItems, setQueueItems] = useState<SerializedUnifiedPostQueueDocument[]>([])
  const [queueSettings, setQueueSettings] = useState<SerializedQueueSettingsDocument | null>(null)
  
  // UI State
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showAllOrganizations, setShowAllOrganizations] = useState(true)
  const [filterType, setFilterType] = useState<string>("all")
  const [editingItem, setEditingItem] = useState<SerializedUnifiedPostQueueDocument | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const { toast } = useToast()

  // Load Reddit accounts for current organization
  useEffect(() => {
    if (currentOrganization) {
      loadRedditAccounts()
    }
  }, [currentOrganization])

  // Load queue when account is selected
  useEffect(() => {
    if (selectedAccount) {
      loadQueue()
      loadQueueSettings()
    }
  }, [selectedAccount])

  const loadRedditAccounts = async () => {
    if (!currentOrganization) return
    
    try {
      console.log("🔍 [QUEUE-MGMT] Loading Reddit accounts for org:", currentOrganization.id)
      
      const result = await getRedditAccountsByOrganizationAction(currentOrganization.id)
      
      if (result.isSuccess) {
        console.log("✅ [QUEUE-MGMT] Found Reddit accounts:", result.data.length)
        setRedditAccounts(result.data)
        
        // Auto-select first account if only one
        if (result.data.length === 1) {
          setSelectedAccount(result.data[0].redditUsername)
        }
      }
    } catch (error) {
      console.error("❌ [QUEUE-MGMT] Error loading Reddit accounts:", error)
      toast({
        title: "Error",
        description: "Failed to load Reddit accounts",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadQueue = async () => {
    if (!selectedAccount) return
    
    try {
      setIsUpdating(true)
      console.log("🔍 [QUEUE-MGMT] Loading queue for account:", selectedAccount)
      
      const result = await getUnifiedQueueByRedditAccountAction(selectedAccount, "queued")
      
      if (result.isSuccess) {
        console.log("✅ [QUEUE-MGMT] Loaded queue items:", result.data.length)
        setQueueItems(result.data)
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("❌ [QUEUE-MGMT] Error loading queue:", error)
      toast({
        title: "Error",
        description: "Failed to load queue",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const loadQueueSettings = async () => {
    if (!selectedAccount) return
    
    try {
      const result = await getQueueSettingsAction(selectedAccount)
      
      if (result.isSuccess) {
        setQueueSettings(result.data)
      }
    } catch (error) {
      console.error("❌ [QUEUE-MGMT] Error loading queue settings:", error)
    }
  }

  const handleMoveItem = async (itemId: string, direction: "up" | "down") => {
    if (!selectedAccount) return
    
    const currentIndex = queueItems.findIndex(item => item.id === itemId)
    if (currentIndex === -1) return
    
    const newPosition = direction === "up" 
      ? Math.max(1, queueItems[currentIndex].queuePosition - 1)
      : queueItems[currentIndex].queuePosition + 1
    
    try {
      setIsUpdating(true)
      console.log("🔄 [QUEUE-MGMT] Moving item to position:", newPosition)
      
      const result = await reorderUnifiedQueueAction(selectedAccount, itemId, newPosition)
      
      if (result.isSuccess) {
        console.log("✅ [QUEUE-MGMT] Queue reordered successfully")
        setQueueItems(result.data)
        toast({
          title: "Success",
          description: "Queue order updated"
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("❌ [QUEUE-MGMT] Error moving item:", error)
      toast({
        title: "Error",
        description: "Failed to reorder queue",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEditItem = (item: SerializedUnifiedPostQueueDocument) => {
    setEditingItem(item)
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      setIsUpdating(true)
      console.log("🗑️ [QUEUE-MGMT] Deleting item:", itemId)
      
      const result = await updateUnifiedQueueItemAction(itemId, {
        status: "cancelled"
      })
      
      if (result.isSuccess) {
        console.log("✅ [QUEUE-MGMT] Item deleted successfully")
        await loadQueue() // Reload to get updated positions
        toast({
          title: "Success",
          description: "Item removed from queue"
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("❌ [QUEUE-MGMT] Error deleting item:", error)
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePostNow = async (itemId: string) => {
    try {
      setIsUpdating(true)
      console.log("🚀 [QUEUE-MGMT] Posting item immediately:", itemId)
      
      const now = new Date()
      const result = await updateUnifiedQueueItemAction(itemId, {
        scheduledFor: Timestamp.fromDate(now),
        queuePosition: 0 // Move to front
      })
      
      if (result.isSuccess) {
        console.log("✅ [QUEUE-MGMT] Item scheduled for immediate posting")
        await loadQueue()
        toast({
          title: "Success",
          description: "Item moved to front of queue for immediate posting"
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("❌ [QUEUE-MGMT] Error posting item:", error)
      toast({
        title: "Error",
        description: "Failed to schedule immediate posting",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const getFilteredItems = () => {
    let filtered = queueItems

    if (filterType !== "all") {
      filtered = filtered.filter(item => item.type === filterType)
    }

    if (!showAllOrganizations && currentOrganization) {
      filtered = filtered.filter(item => item.organizationId === currentOrganization.id)
    }

    return filtered
  }

  const getQueueStats = () => {
    const items = getFilteredItems()
    return {
      total: items.length,
      warmup: items.filter(i => i.type === "warmup").length,
      leadGen: items.filter(i => i.type === "lead_generation").length,
      comments: items.filter(i => i.type === "comment").length,
      nextPost: items.length > 0 ? items[0].scheduledFor : null
    }
  }

  const stats = getQueueStats()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-8 animate-spin" />
        <span className="ml-2">Loading queue management...</span>
      </div>
    )
  }

  if (redditAccounts.length === 0) {
    return (
      <Alert>
        <Info className="size-4" />
        <AlertDescription>
          No Reddit accounts found. Connect a Reddit account in your organization settings to use the queue management.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Queue Management</h2>
          <p className="text-muted-foreground">
            Manage your posting queue across all organizations
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadQueue}
            disabled={isUpdating || !selectedAccount}
          >
            <RefreshCw className={`mr-2 size-4 ${isUpdating ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSettings(true)}
            disabled={!selectedAccount}
          >
            <Settings className="mr-2 size-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Account Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Reddit Account</CardTitle>
          <CardDescription>
            Select which Reddit account's queue to manage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger>
              <SelectValue placeholder="Select a Reddit account" />
            </SelectTrigger>
            <SelectContent>
              {redditAccounts.map(account => (
                <SelectItem key={account.id} value={account.redditUsername}>
                  <div className="flex items-center gap-2">
                    <span>u/{account.redditUsername}</span>
                    <Badge variant="secondary" className="text-xs">
                      {account.currentQueueLength} in queue
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedAccount && queueSettings && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                {queueSettings.postingMode === "aggressive" ? (
                  <Zap className="size-4 text-orange-500" />
                ) : (
                  <Shield className="size-4 text-green-500" />
                )}
                <span className="capitalize">{queueSettings.postingMode} mode</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span>{queueSettings.dailyPostLimit} posts/day limit</span>
              <Separator orientation="vertical" className="h-4" />
              <span>{queueSettings.dailyCommentLimit} comments/day limit</span>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedAccount && (
        <>
          {/* Stats & Filters */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Total Queued</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Lead Posts</p>
                    <p className="text-2xl font-bold">{stats.leadGen}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Warmup Posts</p>
                    <p className="text-2xl font-bold">{stats.warmup}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Next Post</p>
                    <p className="text-sm font-bold">
                      {stats.nextPost 
                        ? new Date(stats.nextPost).toLocaleTimeString()
                        : "None scheduled"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="filter-type">Type:</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="warmup">Warmup</SelectItem>
                        <SelectItem value="lead_generation">Lead Generation</SelectItem>
                        <SelectItem value="comment">Comments</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllOrganizations(!showAllOrganizations)}
                  >
                    {showAllOrganizations ? (
                      <>
                        <EyeOff className="mr-2 size-4" />
                        Current Org Only
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 size-4" />
                        All Organizations
                      </>
                    )}
                  </Button>
                </div>
                
                <p className="text-sm text-gray-500">
                  Showing {getFilteredItems().length} of {queueItems.length} items
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Queue Items */}
          <div className="space-y-3">
            {getFilteredItems().length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Clock className="mx-auto mb-4 size-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-medium">No items in queue</h3>
                  <p className="text-gray-500">
                    Start by creating some warmup posts or finding leads to populate your queue.
                  </p>
                </CardContent>
              </Card>
            ) : (
              getFilteredItems().map((item, index) => (
                <QueueItem
                  key={item.id}
                  item={item}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  onMove={handleMoveItem}
                  onPostNow={handlePostNow}
                  isFirst={index === 0}
                  isLast={index === getFilteredItems().length - 1}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Edit Item Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Queue Item</DialogTitle>
              <DialogDescription>
                Modify the content and scheduling of this queue item
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {editingItem.title && (
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    defaultValue={editingItem.title}
                    placeholder="Post title"
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="edit-content">Content</Label>
                <Textarea
                  id="edit-content"
                  defaultValue={editingItem.content}
                  placeholder="Post content"
                  rows={6}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select defaultValue={editingItem.priority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-scheduled">Scheduled For</Label>
                  <Input
                    id="edit-scheduled"
                    type="datetime-local"
                    defaultValue={new Date(editingItem.scheduledFor).toISOString().slice(0, 16)}
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button>
                <Save className="mr-2 size-4" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 