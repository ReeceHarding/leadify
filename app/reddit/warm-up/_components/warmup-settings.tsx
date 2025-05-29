"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { useToast } from "@/components/ui/use-toast"
import {
  Loader2,
  Save,
  Settings,
  Clock,
  Target,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Info,
  Zap,
  Shield,
  Sliders
} from "lucide-react"
import { updateWarmupAccountAction } from "@/actions/db/warmup-actions"
import {
  createOrUpdateQueueSettingsAction,
  getQueueSettingsAction
} from "@/actions/db/unified-queue-actions"
import { SerializedWarmupAccountDocument, SerializedQueueSettingsDocument } from "@/db/schema"

interface WarmupSettingsProps {
  warmupAccount: SerializedWarmupAccountDocument
  onUpdate: () => void
}

interface SubredditSetting {
  name: string
  minDaysBetweenPosts: number
  minDaysBetweenComments: number
  maxPostsPerWeek: number
}

export default function WarmupSettings({
  warmupAccount,
  onUpdate
}: WarmupSettingsProps) {
  const [postingMode, setPostingMode] = useState<"auto" | "manual">(warmupAccount.postingMode)
  const [dailyPostLimit, setDailyPostLimit] = useState(warmupAccount.dailyPostLimit.toString())
  
  // New unified queue settings
  const [queueSettings, setQueueSettings] = useState<SerializedQueueSettingsDocument | null>(null)
  const [queuePostingMode, setQueuePostingMode] = useState<"aggressive" | "safe" | "custom">("safe")
  const [minIntervalMinutes, setMinIntervalMinutes] = useState(120)
  const [maxIntervalMinutes, setMaxIntervalMinutes] = useState(480)
  const [dailyCommentLimit, setDailyCommentLimit] = useState(5)
  const [warmupToLeadRatio, setWarmupToLeadRatio] = useState(0.5)
  const [activeHoursStart, setActiveHoursStart] = useState(9)
  const [activeHoursEnd, setActiveHoursEnd] = useState(17)
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5])
  
  // Subreddit-specific settings
  const [subredditSettings, setSubredditSettings] = useState<SubredditSetting[]>([])
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [newSubreddit, setNewSubreddit] = useState("")
  
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingQueueSettings, setIsLoadingQueueSettings] = useState(true)
  const { toast } = useToast()

  // Load queue settings
  useEffect(() => {
    if (warmupAccount.redditUsername) {
      loadQueueSettings()
    }
  }, [warmupAccount.redditUsername])

  const loadQueueSettings = async () => {
    try {
      setIsLoadingQueueSettings(true)
      console.log("🔍 [WARMUP-SETTINGS] Loading queue settings for:", warmupAccount.redditUsername)
      
      const result = await getQueueSettingsAction(warmupAccount.redditUsername)
      
      if (result.isSuccess && result.data) {
        console.log("✅ [WARMUP-SETTINGS] Queue settings loaded:", result.data)
        setQueueSettings(result.data)
        setQueuePostingMode(result.data.postingMode)
        setMinIntervalMinutes(result.data.minIntervalMinutes)
        setMaxIntervalMinutes(result.data.maxIntervalMinutes)
        setDailyCommentLimit(result.data.dailyCommentLimit)
        setWarmupToLeadRatio(result.data.warmupToLeadRatio)
        setActiveHoursStart(result.data.activeHours.start)
        setActiveHoursEnd(result.data.activeHours.end)
        setActiveDays(result.data.activeDays)
        
        // Convert subreddit settings to array
        const subredditArray: SubredditSetting[] = Object.entries(result.data.subredditSettings || {})
          .map(([name, settings]) => ({
            name,
            ...settings
          }))
        setSubredditSettings(subredditArray)
      } else {
        console.log("ℹ️ [WARMUP-SETTINGS] No queue settings found, using defaults")
      }
    } catch (error) {
      console.error("❌ [WARMUP-SETTINGS] Error loading queue settings:", error)
      toast({
        title: "Error",
        description: "Failed to load advanced settings",
        variant: "destructive"
      })
    } finally {
      setIsLoadingQueueSettings(false)
    }
  }

  const handleSaveSettings = async () => {
    setIsLoading(true)
    try {
      console.log("💾 [WARMUP-SETTINGS] Saving settings")
      
      // Save basic warmup account settings
      const warmupResult = await updateWarmupAccountAction(warmupAccount.id, {
        postingMode,
        dailyPostLimit: parseInt(dailyPostLimit)
      })

      if (!warmupResult.isSuccess) {
        throw new Error(warmupResult.message)
      }

      // Save advanced queue settings
      const subredditSettingsObj: { [key: string]: any } = {}
      subredditSettings.forEach(setting => {
        subredditSettingsObj[setting.name] = {
          minDaysBetweenPosts: setting.minDaysBetweenPosts,
          minDaysBetweenComments: setting.minDaysBetweenComments,
          maxPostsPerWeek: setting.maxPostsPerWeek
        }
      })

      const queueResult = await createOrUpdateQueueSettingsAction({
        redditAccount: warmupAccount.redditUsername,
        postingMode: queuePostingMode,
        minIntervalMinutes,
        maxIntervalMinutes,
        dailyPostLimit: parseInt(dailyPostLimit),
        dailyCommentLimit,
        warmupToLeadRatio,
        activeHours: {
          start: activeHoursStart,
          end: activeHoursEnd
        },
        activeDays,
        subredditSettings: subredditSettingsObj
      })

      if (!queueResult.isSuccess) {
        throw new Error(queueResult.message)
      }

      console.log("✅ [WARMUP-SETTINGS] Settings saved successfully")
      toast({
        title: "Success",
        description: "Settings saved successfully"
      })

      onUpdate()
    } catch (error) {
      console.error("❌ [WARMUP-SETTINGS] Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addSubredditSetting = () => {
    if (!newSubreddit.trim()) return
    
    if (subredditSettings.some(s => s.name.toLowerCase() === newSubreddit.toLowerCase())) {
      toast({
        title: "Error",
        description: "Subreddit already has custom settings",
        variant: "destructive"
      })
      return
    }

    setSubredditSettings([...subredditSettings, {
      name: newSubreddit.trim(),
      minDaysBetweenPosts: 3,
      minDaysBetweenComments: 1,
      maxPostsPerWeek: 2
    }])
    setNewSubreddit("")
  }

  const removeSubredditSetting = (index: number) => {
    setSubredditSettings(subredditSettings.filter((_, i) => i !== index))
  }

  const updateSubredditSetting = (index: number, field: keyof SubredditSetting, value: string | number) => {
    const updated = [...subredditSettings]
    updated[index] = { ...updated[index], [field]: value }
    setSubredditSettings(updated)
  }

  const getPostingModeInfo = (mode: string) => {
    switch (mode) {
      case "aggressive":
        return {
          icon: <Zap className="size-4 text-orange-500" />,
          description: "Posts every 30-120 minutes with minimal delays",
          color: "text-orange-600"
        }
      case "safe":
        return {
          icon: <Shield className="size-4 text-green-500" />,
          description: "Posts every 4-8 hours with natural spacing",
          color: "text-green-600"
        }
      case "custom":
        return {
          icon: <Sliders className="size-4 text-blue-500" />,
          description: "Use your custom interval settings below",
          color: "text-blue-600"
        }
      default:
        return {
          icon: <Settings className="size-4" />,
          description: "",
          color: ""
        }
    }
  }

  const getDayName = (dayNum: number) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return days[dayNum]
  }

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            Basic Warm-up Settings
          </CardTitle>
          <CardDescription>
            Configure how your warm-up posts are managed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Posting Mode */}
          <div className="space-y-3">
            <Label>Posting Mode</Label>
            <RadioGroup
              value={postingMode}
              onValueChange={value => setPostingMode(value as "auto" | "manual")}
            >
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
              <p>
                Started:{" "}
                {new Date(warmupAccount.warmupStartDate).toLocaleDateString()}
              </p>
              <p>
                Ends: {new Date(warmupAccount.warmupEndDate).toLocaleDateString()}
              </p>
              <p className="text-muted-foreground">
                The warm-up period lasts for 7 days to establish your account's
                credibility
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Queue Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-5" />
            Advanced Posting Controls
          </CardTitle>
          <CardDescription>
            Fine-tune posting behavior and timing across organizations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingQueueSettings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin" />
              <span className="ml-2">Loading advanced settings...</span>
            </div>
          ) : (
            <>
              {/* Posting Speed Mode */}
              <div className="space-y-4">
                <Label>Posting Speed</Label>
                <RadioGroup
                  value={queuePostingMode}
                  onValueChange={value => setQueuePostingMode(value as "aggressive" | "safe" | "custom")}
                >
                  {(["aggressive", "safe", "custom"] as const).map((mode) => {
                    const info = getPostingModeInfo(mode)
                    return (
                      <div key={mode} className="flex items-center space-x-2">
                        <RadioGroupItem value={mode} id={mode} />
                        <Label htmlFor={mode} className="flex-1 cursor-pointer font-normal">
                          <div className="flex items-start gap-3">
                            {info.icon}
                            <div className="flex-1">
                              <div className={`font-medium capitalize ${info.color}`}>
                                {mode} Posting
                              </div>
                              <div className="text-muted-foreground text-sm">
                                {info.description}
                              </div>
                            </div>
                          </div>
                        </Label>
                      </div>
                    )
                  })}
                </RadioGroup>
              </div>

              {/* Custom Interval Settings */}
              {queuePostingMode === "custom" && (
                <div className="space-y-4 rounded-lg border p-4">
                  <h4 className="font-medium">Custom Timing</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="min-interval">Min Interval (minutes)</Label>
                      <Input
                        id="min-interval"
                        type="number"
                        min={15}
                        max={1440}
                        value={minIntervalMinutes}
                        onChange={e => setMinIntervalMinutes(parseInt(e.target.value) || 15)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max-interval">Max Interval (minutes)</Label>
                      <Input
                        id="max-interval"
                        type="number"
                        min={30}
                        max={1440}
                        value={maxIntervalMinutes}
                        onChange={e => setMaxIntervalMinutes(parseInt(e.target.value) || 30)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Daily Limits */}
              <div className="space-y-4">
                <h4 className="font-medium">Daily Limits</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="comment-limit">Daily Comment Limit</Label>
                    <Input
                      id="comment-limit"
                      type="number"
                      min={1}
                      max={20}
                      value={dailyCommentLimit}
                      onChange={e => setDailyCommentLimit(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="warmup-ratio">Warmup to Lead Ratio</Label>
                    <Select
                      value={warmupToLeadRatio.toString()}
                      onValueChange={value => setWarmupToLeadRatio(parseFloat(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.25">1 warmup : 4 leads</SelectItem>
                        <SelectItem value="0.5">1 warmup : 2 leads</SelectItem>
                        <SelectItem value="1">1 warmup : 1 lead</SelectItem>
                        <SelectItem value="2">2 warmups : 1 lead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Active Hours */}
              <div className="space-y-4">
                <h4 className="font-medium">Active Posting Hours</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-hour">Start Hour (24-hour)</Label>
                    <Input
                      id="start-hour"
                      type="number"
                      min={0}
                      max={23}
                      value={activeHoursStart}
                      onChange={e => setActiveHoursStart(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-hour">End Hour (24-hour)</Label>
                    <Input
                      id="end-hour"
                      type="number"
                      min={1}
                      max={23}
                      value={activeHoursEnd}
                      onChange={e => setActiveHoursEnd(parseInt(e.target.value) || 23)}
                    />
                  </div>
                </div>
                <p className="text-muted-foreground text-sm">
                  Posts will only be scheduled during these hours
                </p>
              </div>

              {/* Active Days */}
              <div className="space-y-4">
                <h4 className="font-medium">Active Days</h4>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map(day => (
                    <Button
                      key={day}
                      variant={activeDays.includes(day) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (activeDays.includes(day)) {
                          setActiveDays(activeDays.filter(d => d !== day))
                        } else {
                          setActiveDays([...activeDays, day])
                        }
                      }}
                    >
                      {getDayName(day)}
                    </Button>
                  ))}
                </div>
                <p className="text-muted-foreground text-sm">
                  Posts will only be scheduled on selected days
                </p>
              </div>

              {/* Subreddit-Specific Settings */}
              <Collapsible
                open={showAdvancedSettings}
                onOpenChange={setShowAdvancedSettings}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span>Subreddit-Specific Settings</span>
                    {showAdvancedSettings ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  {/* Add New Subreddit */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Subreddit name (e.g., programming)"
                      value={newSubreddit}
                      onChange={e => setNewSubreddit(e.target.value)}
                      onKeyPress={e => e.key === "Enter" && addSubredditSetting()}
                    />
                    <Button onClick={addSubredditSetting} size="icon">
                      <Plus className="size-4" />
                    </Button>
                  </div>

                  {/* Existing Subreddit Settings */}
                  {subredditSettings.map((setting, index) => (
                    <div key={setting.name} className="space-y-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium">r/{setting.name}</h5>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSubredditSetting(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Min Days Between Posts</Label>
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            value={setting.minDaysBetweenPosts}
                            onChange={e =>
                              updateSubredditSetting(index, "minDaysBetweenPosts", parseInt(e.target.value) || 1)
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Min Days Between Comments</Label>
                          <Input
                            type="number"
                            min={0}
                            max={7}
                            value={setting.minDaysBetweenComments}
                            onChange={e =>
                              updateSubredditSetting(index, "minDaysBetweenComments", parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Max Posts Per Week</Label>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={setting.maxPostsPerWeek}
                            onChange={e =>
                              updateSubredditSetting(index, "maxPostsPerWeek", parseInt(e.target.value) || 1)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {subredditSettings.length === 0 && (
                    <div className="text-muted-foreground py-4 text-center text-sm">
                      No custom subreddit settings configured
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </CardContent>
      </Card>

      {/* Rate Limiting Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-5" />
            Rate Limiting Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>• Maximum 1 post per subreddit every 3 days</p>
            <p>• Comments are spaced 3-4 minutes apart</p>
            <p>• Posts are distributed throughout the day</p>
            <p>• Queue is managed across all your organizations</p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button 
        onClick={handleSaveSettings} 
        disabled={isLoading || isLoadingQueueSettings}
        className="w-full"
      >
        {isLoading ? (
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
    </div>
  )
}
