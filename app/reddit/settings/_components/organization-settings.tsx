"use client"

import { useState, useEffect } from "react"
import { useOrganization } from "@/components/utilities/organization-provider"
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
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2,
  Building2,
  User,
  Link,
  AlertCircle,
  Check
} from "lucide-react"
import { updateOrganizationAction } from "@/actions/db/organizations-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function OrganizationSettings() {
  const { currentOrganization, refreshOrganizations } = useOrganization()
  const [isUpdating, setIsUpdating] = useState(false)
  const [orgName, setOrgName] = useState(currentOrganization?.name || "")
  const [website, setWebsite] = useState(currentOrganization?.website || "")
  const [businessDescription, setBusinessDescription] = useState(
    currentOrganization?.businessDescription || ""
  )
  const router = useRouter()

  // Sync form state with active organization
  useEffect(() => {
    if (currentOrganization) {
      setOrgName(currentOrganization.name || "")
      setWebsite(currentOrganization.website || "")
      setBusinessDescription(currentOrganization.businessDescription || "")
    }
  }, [currentOrganization])

  if (!currentOrganization) {
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>
          No organization selected. Please select an organization from the
          sidebar.
        </AlertDescription>
      </Alert>
    )
  }

  const handleUpdateOrganization = async () => {
    if (!currentOrganization) return

    setIsUpdating(true)
    try {
      const result = await updateOrganizationAction(currentOrganization.id, {
        name: orgName,
        website: website || undefined,
        businessDescription: businessDescription || undefined
      })

      if (result.isSuccess) {
        toast.success("Organization updated successfully")
        await refreshOrganizations()
      } else {
        toast.error(result.message || "Failed to update organization")
      }
    } catch (error) {
      console.error("Error updating organization:", error)
      toast.error("Failed to update organization")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleConnectReddit = async () => {
    if (!currentOrganization) return

    try {
      // Store organization ID in cookie for Reddit callback
      document.cookie = `reddit_auth_org_id=${currentOrganization.id}; path=/; max-age=600; samesite=lax${window.location.protocol === 'https:' ? '; secure' : ''}`

      // Redirect to Reddit auth with return URL back to lead finder
      window.location.href = "/api/reddit/auth?return_url=/reddit/lead-finder"
    } catch (error) {
      console.error("Error connecting Reddit:", error)
      toast.error("Failed to connect Reddit account")
    }
  }

  return (
    <div className="space-y-6">
      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5" />
            Organization Details
          </CardTitle>
          <CardDescription>
            Update your organization's information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="My Organization"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Business Description</Label>
            <textarea
              id="description"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={businessDescription}
              onChange={e => setBusinessDescription(e.target.value)}
              placeholder="Describe your business..."
            />
          </div>

          <Button
            onClick={handleUpdateOrganization}
            disabled={isUpdating}
            className="w-full sm:w-auto"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Check className="mr-2 size-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Reddit Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            Reddit Account
          </CardTitle>
          <CardDescription>
            Connect a Reddit account to this organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentOrganization.redditUsername ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="text-muted-foreground size-4" />
                  <span className="font-medium">
                    u/{currentOrganization.redditUsername}
                  </span>
                  <Badge variant="secondary">Connected</Badge>
                </div>
              </div>

              <Alert>
                <AlertCircle className="size-4" />
                <AlertDescription>
                  To change the Reddit account, disconnect the current one and
                  connect a new one.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleConnectReddit}
                  className="flex-1 sm:flex-initial"
                >
                  <Link className="mr-2 size-4" />
                  Reconnect Account
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="size-4" />
                <AlertDescription>
                  No Reddit account connected. Connect one to start posting.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleConnectReddit}
                className="w-full sm:w-auto"
              >
                <Link className="mr-2 size-4" />
                Connect Reddit Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Information */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plan</CardTitle>
          <CardDescription>Your current plan and usage limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="font-medium">Current Plan:</span>
            <Badge variant="default">
              {currentOrganization.plan.charAt(0).toUpperCase() +
                currentOrganization.plan.slice(1)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
