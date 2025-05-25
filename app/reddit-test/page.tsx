"use client"

import { useState } from "react"
import {
  testRedditConnectionAction,
  fetchRedditThreadAction,
  fetchRedditCommentsAction
} from "@/actions/integrations/reddit/reddit-actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"

export default function RedditTestPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const testConnection = async () => {
    setLoading(true)
    try {
      const result = await testRedditConnectionAction()
      setResults(prev => [
        ...prev,
        {
          type: "connection",
          timestamp: new Date().toLocaleTimeString(),
          success: result.isSuccess,
          message: result.message,
          data: result.isSuccess ? result.data : null
        }
      ])
    } catch (error) {
      setResults(prev => [
        ...prev,
        {
          type: "connection",
          timestamp: new Date().toLocaleTimeString(),
          success: false,
          message: `Error: ${error}`,
          data: null
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const testFetchThread = async () => {
    setLoading(true)
    try {
      // Test with a popular thread ID
      const result = await fetchRedditThreadAction("1i2m7ya", "programming")
      setResults(prev => [
        ...prev,
        {
          type: "fetch",
          timestamp: new Date().toLocaleTimeString(),
          success: result.isSuccess,
          message: result.message,
          data: result.isSuccess ? result.data : null
        }
      ])
    } catch (error) {
      setResults(prev => [
        ...prev,
        {
          type: "fetch",
          timestamp: new Date().toLocaleTimeString(),
          success: false,
          message: `Error: ${error}`,
          data: null
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setResults([])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Reddit OAuth Test Dashboard</CardTitle>
            <CardDescription>
              Test your Reddit OAuth integration to make sure everything is
              working properly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={testConnection}
                disabled={loading}
                variant="default"
              >
                {loading ? "Testing..." : "Test Connection"}
              </Button>

              <Button
                onClick={testFetchThread}
                disabled={loading}
                variant="default"
              >
                {loading ? "Fetching..." : "Test Thread Fetch"}
              </Button>

              <Button
                onClick={clearResults}
                disabled={loading}
                variant="outline"
              >
                Clear Results
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {results.map((result, index) => (
            <Card
              key={index}
              className={`${result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle
                    className={`text-sm ${result.success ? "text-green-800" : "text-red-800"}`}
                  >
                    {result.success ? "✅" : "❌"}{" "}
                    {result.type === "connection"
                      ? "Connection Test"
                      : "Thread Fetch Test"}
                  </CardTitle>
                  <span className="text-xs text-gray-500">
                    {result.timestamp}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p
                  className={`mb-2 text-sm ${result.success ? "text-green-700" : "text-red-700"}`}
                >
                  {result.message}
                </p>

                {result.data && (
                  <div className="mt-2 rounded border bg-white p-3">
                    <h4 className="mb-2 text-sm font-medium">Response Data:</h4>
                    {result.type === "connection" ? (
                      <p className="text-xs text-gray-600">
                        Status: {result.data.status}
                      </p>
                    ) : (
                      <div className="space-y-1 text-xs text-gray-600">
                        <p>
                          <strong>Title:</strong> {result.data.title}
                        </p>
                        <p>
                          <strong>Author:</strong> {result.data.author}
                        </p>
                        <p>
                          <strong>Subreddit:</strong> r/{result.data.subreddit}
                        </p>
                        <p>
                          <strong>Score:</strong> {result.data.score}
                        </p>
                        <p>
                          <strong>Comments:</strong> {result.data.numComments}
                        </p>
                        <p>
                          <strong>Content:</strong>{" "}
                          {result.data.content.substring(0, 200)}...
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {results.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-gray-500">
                Click the buttons above to test your Reddit OAuth integration
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
