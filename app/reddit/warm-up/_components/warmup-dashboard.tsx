"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, Settings, Play, Pause } from "lucide-react"
import { getWarmupAccountByUserIdAction } from "@/actions/db/warmup-actions"
import { getRedditUserInfoAction } from "@/actions/integrations/reddit/reddit-warmup-actions"
import { generateRedditAuthUrlAction } from "@/actions/integrations/reddit/reddit-oauth-actions"
import { WarmupAccountDocument } from "@/db/firestore/warmup-collections"
import SubredditSelector from "./subreddit-selector"
import WarmupPostsList from "./warmup-posts-list"
import WarmupSettings from "./warmup-settings"

interface WarmupDashboardProps {
  userId: string
}

export default function WarmupDashboard({ userId }: WarmupDashboardProps) {
  const [warmupAccount, setWarmupAccount] = useState<WarmupAccountDocument | null>(null)
  const [redditUsername, setRedditUsername] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadWarmupAccount()
    checkRedditConnection()
  }, [userId])

  const loadWarmupAccount = async () => {
    try {
      console.log("🔍 [WARMUP-DASHBOARD] Loading warm-up account")
      const result = await getWarmupAccountByUserIdAction(userId)
      if (result.isSuccess && result.data) {
        setWarmupAccount(result.data)
      }
    } catch (error) {
      console.error("❌ [WARMUP-DASHBOARD] Error loading warm-up account:", error)
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
    try {
      console.log("🔍 [WARMUP-DASHBOARD] Checking Reddit connection")
      const result = await getRedditUserInfoAction()
      if (result.isSuccess && result.data) {
        setRedditUsername(result.data.name)
      }
    } catch (error) {
      console.error("❌ [WARMUP-DASHBOARD] Error checking Reddit connection:", error)
    }
  }

  const handleConnectReddit = async () => {
    try {
      setIsConnecting(true)
      console.log("🔗 [WARMUP-DASHBOARD] Connecting Reddit account")
      
      const result = await generateRedditAuthUrlAction()
      if (result.isSuccess && result.data) {
        window.location.href = result.data.authUrl
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to generate Reddit auth URL",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!redditUsername) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect Your Reddit Account</CardTitle>
          <CardDescription>
            To start the warm-up process, you need to connect your Reddit account.
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
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
              <CardDescription>
                Connected as u/{redditUsername}
              </CardDescription>
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
                  onCheckedChange={(checked) => {
                    // Handle toggle
                    console.log("Toggle warm-up:", checked)
                  }}
                />
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>Started: {new Date(warmupAccount.warmupStartDate.toDate()).toLocaleDateString()}</p>
                <p>Ends: {new Date(warmupAccount.warmupEndDate.toDate()).toLocaleDateString()}</p>
                <p>Daily post limit: {warmupAccount.dailyPostLimit} posts</p>
                <p>Posting mode: {warmupAccount.postingMode}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No warm-up account found. Set up your warm-up configuration to get started.
              </p>
              <Button onClick={() => {
                // Handle setup
                console.log("Setup warm-up account")
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Set Up Warm-up
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
              warmupAccount={warmupAccount}
              onUpdate={loadWarmupAccount}
            />
          </TabsContent>

          <TabsContent value="posts" className="space-y-4">
            <WarmupPostsList
              userId={userId}
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