"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Save } from "lucide-react"
import { updateWarmupAccountAction } from "@/actions/db/warmup-actions"
import { WarmupAccountDocument } from "@/db/firestore/warmup-collections"

interface WarmupSettingsProps {
  warmupAccount: WarmupAccountDocument
  onUpdate: () => void
}

export default function WarmupSettings({ warmupAccount, onUpdate }: WarmupSettingsProps) {
  const [postingMode, setPostingMode] = useState<"auto" | "manual">(warmupAccount.postingMode)
  const [dailyPostLimit, setDailyPostLimit] = useState(warmupAccount.dailyPostLimit.toString())
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      setIsSaving(true)
      console.log("💾 [WARMUP-SETTINGS] Saving settings")
      
      const result = await updateWarmupAccountAction(warmupAccount.id, {
        postingMode,
        dailyPostLimit: parseInt(dailyPostLimit)
      })
      
      if (result.isSuccess) {
        toast({
          title: "Success",
          description: "Settings updated successfully"
        })
        onUpdate()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("❌ [WARMUP-SETTINGS] Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = 
    postingMode !== warmupAccount.postingMode ||
    parseInt(dailyPostLimit) !== warmupAccount.dailyPostLimit

  return (
    <Card>
      <CardHeader>
        <CardTitle>Warm-up Settings</CardTitle>
        <CardDescription>
          Configure how your warm-up posts are managed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Posting Mode */}
        <div className="space-y-3">
          <Label>Posting Mode</Label>
          <RadioGroup value={postingMode} onValueChange={(value) => setPostingMode(value as "auto" | "manual")}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="auto" id="auto" />
              <Label htmlFor="auto" className="cursor-pointer font-normal">
                <div>
                  <div className="font-medium">Automatic Posting</div>
                  <div className="text-muted-foreground text-sm">
                    Posts will be automatically submitted to Reddit when scheduled
                  </div>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual" className="cursor-pointer font-normal">
                <div>
                  <div className="font-medium">Manual Verification</div>
                  <div className="text-muted-foreground text-sm">
                    Review and manually approve each post before it's submitted
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Daily Post Limit */}
        <div className="space-y-3">
          <Label htmlFor="daily-limit">Daily Post Limit</Label>
          <Select value={dailyPostLimit} onValueChange={setDailyPostLimit}>
            <SelectTrigger id="daily-limit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 posts per day</SelectItem>
              <SelectItem value="3">3 posts per day</SelectItem>
              <SelectItem value="4">4 posts per day</SelectItem>
              <SelectItem value="5">5 posts per day</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-sm">
            Maximum number of posts to create per day across all subreddits
          </p>
        </div>

        {/* Warm-up Period Info */}
        <div className="bg-muted space-y-2 rounded-lg p-4">
          <h4 className="font-medium">Warm-up Period</h4>
          <div className="space-y-1 text-sm">
            <p>Started: {new Date(warmupAccount.warmupStartDate.toDate()).toLocaleDateString()}</p>
            <p>Ends: {new Date(warmupAccount.warmupEndDate.toDate()).toLocaleDateString()}</p>
            <p className="text-muted-foreground">
              The warm-up period lasts for 7 days to establish your account's credibility
            </p>
          </div>
        </div>

        {/* Rate Limiting Info */}
        <div className="bg-muted space-y-2 rounded-lg p-4">
          <h4 className="font-medium">Rate Limiting</h4>
          <div className="text-muted-foreground space-y-1 text-sm">
            <p>• Maximum 1 post per subreddit every 3 days</p>
            <p>• Comments are spaced 3-4 minutes apart</p>
            <p>• Posts are distributed throughout the day</p>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 size-4" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
} 