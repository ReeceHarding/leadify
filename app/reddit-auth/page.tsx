"use client"

import { useState } from "react"
import { generateRedditAuthUrlAction } from "@/actions/integrations/reddit/reddit-oauth-actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"

export default function RedditAuthPage() {
  const [loading, setLoading] = useState(false)
  const [authUrl, setAuthUrl] = useState<string>("")

  const handleGenerateAuthUrl = async () => {
    setLoading(true)
    try {
      const result = await generateRedditAuthUrlAction()
      if (result.isSuccess) {
        setAuthUrl(result.data.authUrl)
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reddit API Authentication</CardTitle>
          <CardDescription>
            Click the button below to authenticate with Reddit and grant access
            to your app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGenerateAuthUrl}
            disabled={loading}
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
