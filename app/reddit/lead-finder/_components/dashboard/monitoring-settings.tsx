"use client"

import React, { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  Clock,
  Zap,
  Info,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"
import { CampaignMonitorDocument, SerializedCampaignMonitorDocument } from "@/db/schema"
import {
  getCampaignMonitorAction,
  createCampaignMonitorAction,
  updateCampaignMonitorAction
} from "@/actions/db/campaign-monitor-actions"

interface MonitoringSettingsProps {
  campaignId: string
  organizationId: string
  userId: string
}

const FREQUENCY_OPTIONS = [
  { value: "30min", label: "Every 30 minutes", description: "Best for hot leads" },
  { value: "1hour", label: "Every hour", description: "Recommended" },
  { value: "2hours", label: "Every 2 hours", description: "Balanced" },
  { value: "4hours", label: "Every 4 hours", description: "Conservative" },
  { value: "6hours", label: "Every 6 hours", description: "Low frequency" },
  { value: "12hours", label: "Every 12 hours", description: "Minimal checking" }
]

export default function MonitoringSettings({
  campaignId,
  organizationId,
  userId
}: MonitoringSettingsProps) {
  const [monitor, setMonitor] = useState<SerializedCampaignMonitorDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [frequency, setFrequency] = useState<string>("1hour")

  // Load monitor settings
  useEffect(() => {
    const loadMonitor = async () => {
      setIsLoading(true)
      try {
        const result = await getCampaignMonitorAction(campaignId)
        
        if (result.isSuccess && result.data) {
          setMonitor(result.data)
          setEnabled(result.data.enabled)
          setFrequency(result.data.frequency)
        } else {
          // No monitor exists yet
          setMonitor(null)
          setEnabled(false)
          setFrequency("1hour")
        }
      } catch (error) {
        console.error("Error loading monitor:", error)
        toast.error("Failed to load monitoring settings")
      } finally {
        setIsLoading(false)
      }
    }

    if (campaignId) {
      loadMonitor()
    }
  }, [campaignId])

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      if (monitor) {
        // Update existing monitor
        const result = await updateCampaignMonitorAction(monitor.id, {
          enabled,
          frequency: frequency as any
        })
        
        if (result.isSuccess) {
          setMonitor(result.data)
          toast.success("Monitoring settings updated")
        } else {
          throw new Error(result.message)
        }
      } else if (enabled) {
        // Create new monitor (only if enabling)
        const result = await createCampaignMonitorAction({
          campaignId,
          organizationId,
          userId,
          enabled,
          frequency: frequency as any
        })
        
        if (result.isSuccess) {
          setMonitor(result.data)
          toast.success("Monitoring enabled for this campaign")
        } else {
          throw new Error(result.message)
        }
      }
    } catch (error) {
      console.error("Error saving monitor settings:", error)
      toast.error("Failed to save monitoring settings")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  const formatNextCheck = (timestamp: string | null) => {
    if (!timestamp) return "Not scheduled"
    const date = new Date(timestamp)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    
    if (diff < 0) return "Due now"
    if (diff < 60000) return "Less than a minute"
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes`
    return `${Math.floor(diff / 3600000)} hours`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              Automatic Monitoring
            </CardTitle>
            <CardDescription>
              Automatically check for new posts matching your keywords
            </CardDescription>
          </div>
          {monitor && monitor.enabled && (
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="size-3" />
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="monitoring-enabled" className="flex flex-col gap-1">
            <span className="font-medium">Enable Monitoring</span>
            <span className="text-sm text-gray-500">
              Automatically find new leads without manual checks
            </span>
          </Label>
          <Switch
            id="monitoring-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {/* Frequency Selection */}
        {enabled && (
          <div className="space-y-3">
            <Label>Check Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-gray-500">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status Information */}
        {monitor && enabled && (
          <div className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-900">
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Next check:
                </span>
                <span className="font-medium">
                  {formatNextCheck(monitor.nextCheckAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Total checks:
                </span>
                <span className="font-medium">{monitor.totalChecks || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Posts found:
                </span>
                <span className="font-medium">
                  {monitor.totalPostsFound || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Info Alert */}
        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            When monitoring is enabled, we'll automatically check Reddit for new
            posts matching your keywords and add them to your lead queue. You'll
            see new leads appear in the Monitor tab.
          </AlertDescription>
        </Alert>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 size-4" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
} 