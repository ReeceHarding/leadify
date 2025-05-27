"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import {
  Edit2,
  Loader2,
  Archive,
  Trash2,
  AlertCircle,
  Calendar,
  Hash,
  TrendingUp,
  MessageSquare
} from "lucide-react"
import { toast } from "sonner"
import { updateCampaignAction, deleteCampaignAction } from "@/actions/db/campaign-actions"
import { format } from "date-fns"

interface EditCampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaign: {
    id: string
    name: string
    businessDescription?: string
    keywords: string[]
    status: string
    totalCommentsGenerated: number
    createdAt: string
  } | null
  onSuccess?: () => void
}

export default function EditCampaignDialog({
  open,
  onOpenChange,
  campaign,
  onSuccess
}: EditCampaignDialogProps) {
  const [name, setName] = useState("")
  const [businessDescription, setBusinessDescription] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Reset form when campaign changes
  useEffect(() => {
    if (campaign) {
      setName(campaign.name)
      setBusinessDescription(campaign.businessDescription || "")
    }
  }, [campaign])

  const handleUpdate = async () => {
    if (!campaign) return

    console.log("📝 [EDIT-CAMPAIGN] Updating campaign:", campaign.id)
    setIsUpdating(true)

    try {
      const result = await updateCampaignAction(campaign.id, {
        name: name.trim(),
        businessDescription: businessDescription.trim() || undefined
      })

      if (result.isSuccess) {
        console.log("📝 [EDIT-CAMPAIGN] ✅ Campaign updated successfully")
        toast.success("Campaign updated successfully")
        onSuccess?.()
        onOpenChange(false)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("📝 [EDIT-CAMPAIGN] ❌ Error updating campaign:", error)
      toast.error("Failed to update campaign")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleArchive = async () => {
    if (!campaign) return

    console.log("📦 [EDIT-CAMPAIGN] Archiving campaign:", campaign.id)
    setIsUpdating(true)

    try {
      const result = await updateCampaignAction(campaign.id, {
        status: "paused" as const
      })

      if (result.isSuccess) {
        console.log("📦 [EDIT-CAMPAIGN] ✅ Campaign archived successfully")
        toast.success("Campaign archived successfully")
        setShowArchiveDialog(false)
        onSuccess?.()
        onOpenChange(false)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("📦 [EDIT-CAMPAIGN] ❌ Error archiving campaign:", error)
      toast.error("Failed to archive campaign")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!campaign) return

    console.log("🗑️ [EDIT-CAMPAIGN] Deleting campaign:", campaign.id)
    setIsUpdating(true)

    try {
      const result = await deleteCampaignAction(campaign.id)

      if (result.isSuccess) {
        console.log("🗑️ [EDIT-CAMPAIGN] ✅ Campaign deleted successfully")
        toast.success("Campaign deleted successfully")
        setShowDeleteDialog(false)
        onSuccess?.()
        onOpenChange(false)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("🗑️ [EDIT-CAMPAIGN] ❌ Error deleting campaign:", error)
      toast.error("Failed to delete campaign")
    } finally {
      setIsUpdating(false)
    }
  }

  if (!campaign) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
      case "running":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
      case "paused":
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300"
      case "error":
        return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300"
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-5" />
              Edit Campaign
            </DialogTitle>
            <DialogDescription>
              Update your campaign details or manage its status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Campaign Status */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(campaign.status)}>
                  {campaign.status}
                </Badge>
                <div className="text-muted-foreground text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    Created {format(new Date(campaign.createdAt), "MMM d, yyyy")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="text-muted-foreground size-4" />
                <span>{campaign.totalCommentsGenerated} leads</span>
              </div>
            </div>

            {/* Campaign Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q4 Lead Generation"
                disabled={isUpdating}
              />
            </div>

            {/* Business Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Business Description
                <span className="text-muted-foreground ml-2 text-xs">(Optional)</span>
              </Label>
              <Textarea
                id="description"
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder="Add notes about this campaign's goals, target audience, or strategy..."
                rows={4}
                disabled={isUpdating}
              />
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Hash className="size-4" />
                Keywords
              </Label>
              <div className="flex flex-wrap gap-2 rounded-lg border p-3">
                {campaign.keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                Keywords cannot be edited after campaign creation
              </p>
            </div>

            {/* Danger Zone */}
            {campaign.status !== "running" && (
              <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
                <div className="flex items-center gap-2 text-sm font-medium text-red-900 dark:text-red-100">
                  <AlertCircle className="size-4" />
                  Danger Zone
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowArchiveDialog(true)}
                    disabled={isUpdating || campaign.status === "paused"}
                    className="border-orange-600 text-orange-700 hover:bg-orange-100 dark:border-orange-400 dark:text-orange-300 dark:hover:bg-orange-900/30"
                  >
                    <Archive className="mr-2 size-4" />
                    Archive Campaign
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isUpdating}
                    className="border-red-600 text-red-700 hover:bg-red-100 dark:border-red-400 dark:text-red-300 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete Campaign
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isUpdating || !name.trim()}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will pause the campaign and move it to your archived campaigns. 
              You can unarchive it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isUpdating}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Archiving...
                </>
              ) : (
                "Archive Campaign"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the campaign
              and all associated leads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isUpdating}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Campaign"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 