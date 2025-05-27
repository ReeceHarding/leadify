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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, Settings, Play, Pause } from "lucide-react"
import {
  getWarmupAccountByOrganizationIdAction,
  createWarmupAccountAction,
  updateWarmupAccountAction
} from "@/actions/db/warmup-actions"
import { getRedditUserInfoAction } from "@/actions/integrations/reddit/reddit-warmup-actions"
import { generateRedditAuthUrlAction } from "@/actions/integrations/reddit/reddit-oauth-actions"
import { SerializedWarmupAccountDocument } from "@/db/firestore/warmup-collections"
import { useOrganization } from "@/components/utilities/organization-provider"
import SubredditSelector from "./subreddit-selector"
import WarmupPostsList from "./warmup-posts-list"
import WarmupSettings from "./warmup-settings"

interface WarmupDashboardProps {
  userId: string
  organizationId: string
}

export default function WarmupDashboard({
  userId,
  organizationId
}: WarmupDashboardProps) {
  const [warmupAccount, setWarmupAccount] =
    useState<SerializedWarmupAccountDocument | null>(null)
  const [redditUsername, setRedditUsername] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const { toast } = useToast()
  const { currentOrganization } = useOrganization()

  useEffect(() => {
    console.log("🔥🔥🔥 [WARMUP-DASHBOARD] Component mounted")
    console.log("🔥🔥🔥 [WARMUP-DASHBOARD] User ID:", userId)
    console.log("🔥🔥🔥 [WARMUP-DASHBOARD] Organization ID:", organizationId)
    
    if (organizationId) {
      loadWarmupAccount()
      checkRedditConnection()
    }
  }, [organizationId])

  const loadWarmupAccount = async () => {
    if (!organizationId) {
      console.log("⚠️ [WARMUP-DASHBOARD] No organization ID, skipping load")
      return
    }
    
    try {
      console.log(
        "🔍 [WARMUP-DASHBOARD] Loading warm-up account for organization:",
        organizationId
      )
      const result =
        await getWarmupAccountByOrganizationIdAction(organizationId)
      
      console.log("🔍 [WARMUP-DASHBOARD] Load result:", {
        isSuccess: result.isSuccess,
        hasData: !!result.data,
        message: result.message
      })
      
      if (result.isSuccess && result.data) {
        console.log("✅ [WARMUP-DASHBOARD] Warm-up account loaded:", result.data)
        setWarmupAccount(result.data)
      } else {
        console.log("ℹ️ [WARMUP-DASHBOARD] No warm-up account found")
      }
    } catch (error) {
      console.error(
        "❌ [WARMUP-DASHBOARD] Error loading warm-up account:",
        error
      )
      toast({
        title: "Error",
        description: "Failed to load warm-up account",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkRedditConnection = async () => {
    if (!organizationId) {
      console.log("⚠️ [WARMUP-DASHBOARD] No organization ID, skipping Reddit check")
      return
    }
    
    try {
      console.log(
        "🔍 [WARMUP-DASHBOARD] Checking Reddit connection for organization:",
        organizationId
      )
      const result = await getRedditUserInfoAction(organizationId)
      
      console.log("🔍 [WARMUP-DASHBOARD] Reddit connection result:", {
        isSuccess: result.isSuccess,
        hasData: !!result.data,
        username: result.data?.name,
        message: result.message
      })
      
      if (result.isSuccess && result.data) {
        console.log("✅ [WARMUP-DASHBOARD] Reddit connected as:", result.data.name)
        setRedditUsername(result.data.name)
      } else {
        console.log("ℹ️ [WARMUP-DASHBOARD] Reddit not connected")
      }
    } catch (error) {
      console.error(
        "❌ [WARMUP-DASHBOARD] Error checking Reddit connection:",
        error
      )
    }
  }

  const handleConnectReddit = async () => {
    try {
      setIsConnecting(true)
      console.log("🔧 [WARMUP-DASHBOARD] Connecting Reddit account")
      console.log("🔧 [WARMUP-DASHBOARD] Organization ID:", organizationId)

      // Set cookie for organization ID
      document.cookie = `reddit_auth_org_id=${organizationId}; path=/; max-age=600; SameSite=Lax`

      // Pass the current page URL as the return URL
      const currentUrl = window.location.pathname + window.location.search
      const result = await generateRedditAuthUrlAction({
        returnUrl: currentUrl
      })
      
      console.log("🔧 [WARMUP-DASHBOARD] Auth URL result:", {
        isSuccess: result.isSuccess,
        hasData: !!result.data,
        message: result.message
      })

      if (result.isSuccess && result.data) {
        console.log("🔗 [WARMUP-DASHBOARD] Redirecting to Reddit auth")
        window.location.href = result.data.authUrl
      } else {
        console.error("❌ [WARMUP-DASHBOARD] Failed to generate auth URL:", result.message)
        toast({
          title: "Error",
          description: result.message || "Failed to connect Reddit account",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("❌ [WARMUP-DASHBOARD] Error connecting Reddit:", error)
      toast({
        title: "Error",
        description: "Failed to connect Reddit account",
        variant: "destructive"
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSetupWarmup = async () => {
    try {
      setIsSettingUp(true)
      console.log("🔧 [WARMUP-DASHBOARD] Setting up warm-up account")
      console.log("🔧 [WARMUP-DASHBOARD] Reddit username:", redditUsername)
      console.log("🔧 [WARMUP-DASHBOARD] Organization ID:", organizationId)
      console.log("🔧 [WARMUP-DASHBOARD] User ID:", userId)

      if (!redditUsername) {
        console.log("⚠️ [WARMUP-DASHBOARD] No Reddit username available")
        toast({
          title: "Error",
          description: "Please connect your Reddit account first",
          variant: "destructive"
        })
        return
      }

      const createData = {
        userId,
        organizationId,
        redditUsername,
        targetSubreddits: [], // Start with empty, user will add them
        postingMode: "manual" as const,
        dailyPostLimit: 3
      }
      
      console.log("🔧 [WARMUP-DASHBOARD] Creating warm-up account with data:", createData)
      
      const result = await createWarmupAccountAction(createData)
      
      console.log("🔧 [WARMUP-DASHBOARD] Create result:", {
        isSuccess: result.isSuccess,
        hasData: !!result.data,
        message: result.message
      })

      if (result.isSuccess && result.data) {
        console.log("✅ [WARMUP-DASHBOARD] Warm-up account created:", result.data)
        setWarmupAccount(result.data)
        toast({
          title: "Success",
          description:
            "Warm-up account created! Now add some subreddits to get started."
        })
      } else {
        console.error("❌ [WARMUP-DASHBOARD] Failed to create warm-up account:", result.message)
        toast({
          title: "Error",
          description: result.message || "Failed to create warm-up account",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("❌ [WARMUP-DASHBOARD] Error setting up warm-up:", error)
      toast({
        title: "Error",
        description: "Failed to set up warm-up account",
        variant: "destructive"
      })
    } finally {
      setIsSettingUp(false)
    }
  }

  const handleToggleWarmup = async (isActive: boolean) => {
    if (!warmupAccount) {
      console.log("⚠️ [WARMUP-DASHBOARD] No warm-up account to toggle")
      return
    }

    try {
      console.log("🔧 [WARMUP-DASHBOARD] Toggling warm-up status")
      console.log("🔧 [WARMUP-DASHBOARD] Account ID:", warmupAccount.id)
      console.log("🔧 [WARMUP-DASHBOARD] New status:", isActive ? "active" : "paused")
      
      const result = await updateWarmupAccountAction(warmupAccount.id, {
        isActive,
        status: isActive ? "active" : "paused"
      })
      
      console.log("🔧 [WARMUP-DASHBOARD] Toggle result:", {
        isSuccess: result.isSuccess,
        hasData: !!result.data,
        message: result.message
      })

      if (result.isSuccess && result.data) {
        console.log("✅ [WARMUP-DASHBOARD] Warm-up status updated:", result.data.status)
        setWarmupAccount(result.data)
        toast({
          title: "Success",
          description: isActive
            ? "Warm-up activated! Posts will be generated daily."
            : "Warm-up paused."
        })
      } else {
        console.error("❌ [WARMUP-DASHBOARD] Failed to toggle warm-up:", result.message)
        toast({
          title: "Error",
          description: result.message || "Failed to update warm-up status",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("❌ [WARMUP-DASHBOARD] Error toggling warm-up:", error)
      toast({
        title: "Error",
        description: "Failed to update warm-up status",
        variant: "destructive"
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    )
  }

  if (!redditUsername) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect Your Organization's Reddit Account</CardTitle>
          <CardDescription>
            To start the warm-up process, you need to connect your
            organization's Reddit account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleConnectReddit}
            disabled={isConnecting}
            className="w-full sm:w-auto"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Plus className="mr-2 size-4" />
                Connect Reddit Account
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Account Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Warm-up Status</CardTitle>
              <CardDescription>Connected as u/{redditUsername}</CardDescription>
            </div>
            <Badge variant={warmupAccount?.isActive ? "default" : "secondary"}>
              {warmupAccount?.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {warmupAccount ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="warmup-active">Warm-up Active</Label>
                <Switch
                  id="warmup-active"
                  checked={warmupAccount.isActive}
                  onCheckedChange={handleToggleWarmup}
                />
              </div>

              <div className="text-muted-foreground text-sm">
                <p>
                  Started:{" "}
                  {new Date(warmupAccount.warmupStartDate).toLocaleDateString()}
                </p>
                <p>
                  Ends:{" "}
                  {new Date(warmupAccount.warmupEndDate).toLocaleDateString()}
                </p>
                <p>Daily post limit: {warmupAccount.dailyPostLimit} posts</p>
                <p>Posting mode: {warmupAccount.postingMode}</p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                No warm-up account found. Set up your warm-up configuration to
                get started.
              </p>
              <Button onClick={handleSetupWarmup} disabled={isSettingUp}>
                {isSettingUp ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 size-4" />
                    Set Up Warm-up
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      {warmupAccount && (
        <Tabs defaultValue="subreddits" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="subreddits">Subreddits</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="subreddits" className="space-y-4">
            <SubredditSelector
              userId={userId}
              organizationId={organizationId}
              warmupAccount={warmupAccount}
              onUpdate={loadWarmupAccount}
            />
          </TabsContent>

          <TabsContent value="posts" className="space-y-4">
            <WarmupPostsList
              userId={userId}
              organizationId={organizationId}
              warmupAccount={warmupAccount}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <WarmupSettings
              warmupAccount={warmupAccount}
              onUpdate={loadWarmupAccount}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
