"use client"

import { useState, useEffect } from "react"
import { generateRedditAuthUrlAction } from "@/actions/integrations/reddit/reddit-oauth-actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useOrganization } from "@/components/utilities/organization-provider"

export default function RedditAuthPage() {
  const [loading, setLoading] = useState(false)
  const [authUrl, setAuthUrl] = useState<string>("")
  const { currentOrganization } = useOrganization()
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null)

  useEffect(() => {
    // Check if we have a pending organization ID from settings
    const orgId = sessionStorage.getItem("pendingRedditOrgId")
    if (orgId) {
      setPendingOrgId(orgId)
    }
  }, [])

  const handleGenerateAuthUrl = async () => {
    setLoading(true)
    try {
      const result = await generateRedditAuthUrlAction()
      if (result.isSuccess) {
        setAuthUrl(result.data.authUrl)

        // Set organization ID cookie for the callback
        const orgId = pendingOrgId || currentOrganization?.id
        if (orgId) {
          // Set cookie that will be read by the callback
          document.cookie = `reddit_auth_org_id=${orgId}; path=/; max-age=3600; samesite=lax`
        }

        // Clear the pending org ID from session storage
        if (pendingOrgId) {
          sessionStorage.removeItem("pendingRedditOrgId")
        }

        // Automatically redirect to Reddit
        window.location.href = result.data.authUrl
      } else {
        alert(`Error: ${result.message}`)
      }
    } catch (error) {
      alert(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const targetOrg = pendingOrgId
    ? `for organization`
    : currentOrganization
      ? `for ${currentOrganization.name}`
      : ""

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reddit API Authentication</CardTitle>
          <CardDescription>
            Connect your Reddit account {targetOrg}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!currentOrganization && !pendingOrgId && (
            <Alert>
              <AlertCircle className="size-4" />
              <AlertDescription>
                No organization selected. Please select an organization from the
                sidebar first.
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleGenerateAuthUrl}
            disabled={loading || (!currentOrganization && !pendingOrgId)}
            className="w-full"
            size="lg"
          >
            {loading ? "Generating..." : "🔗 Authenticate with Reddit"}
          </Button>

          {authUrl && (
            <div className="mt-4 rounded bg-gray-100 p-4">
              <p className="mb-2 text-sm text-gray-600">Generated Auth URL:</p>
              <a
                href={authUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-xs text-blue-600 hover:underline"
              >
                {authUrl}
              </a>
            </div>
          )}

          <div className="mt-6 rounded border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 font-medium text-blue-900">
              Setup Instructions:
            </h3>
            <ol className="space-y-1 text-sm text-blue-800">
              <li>
                1. Go to{" "}
                <a
                  href="https://www.reddit.com/prefs/apps"
                  target="_blank"
                  className="underline"
                >
                  Reddit Apps
                </a>
              </li>
              <li>2. Edit your "n8n" app</li>
              <li>3. Update the redirect URI to:</li>
              <li className="mt-1 rounded bg-white p-2 font-mono text-xs">
                http://localhost:3000/api/reddit/callback
              </li>
              <li>4. Save the changes</li>
              <li>5. Click the authenticate button above</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
