"use client"

import { useState } from "react"
import { createCampaignAction } from "@/actions/db/campaign-actions"
import { runFullLeadGenerationWorkflowAction } from "@/actions/lead-generation/workflow-actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function TestWorkflowPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [campaignId, setCampaignId] = useState<string>("")

  const runEndToEndTest = async () => {
    setLoading(true)
    setResults(null)

    try {
      console.log("🚀 Starting End-to-End Test...")

      // Test configuration
      const testData = {
        campaignName: "Software Developer Lead Gen Test",
        website: "gauntletai.com",
        keywords: ["where to find software developers"],
        userId: "test-user-123"
      }

      console.log("📋 Test Configuration:", testData)

      // Step 1: Create campaign
      console.log("🎯 Creating campaign...")
      const campaignResult = await createCampaignAction({
        userId: testData.userId,
        name: testData.campaignName,
        website: testData.website,
        keywords: testData.keywords
      })

      if (!campaignResult.isSuccess) {
        throw new Error(`Campaign creation failed: ${campaignResult.message}`)
      }

      const campaign = campaignResult.data
      setCampaignId(campaign.id)
      console.log(`✅ Campaign created: ${campaign.id}`)

      // Step 2: Run workflow
      console.log("🔄 Running complete workflow...")
      const workflowResult = await runFullLeadGenerationWorkflowAction(
        campaign.id
      )

      setResults({
        success: workflowResult.isSuccess,
        message: workflowResult.message,
        campaign: campaign,
        workflow: workflowResult.data,
        testData: testData
      })

      console.log("✅ Test completed!")
    } catch (error) {
      console.error("💥 Test failed:", error)
      setResults({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        error: error
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🚀 End-to-End Reddit Lead Generation Test</CardTitle>
            <CardDescription>
              Test the complete workflow: Scrape website → Search Reddit → Fetch
              content → Score & generate comments → Store in Firebase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Campaign:</strong> Software Developer Lead Gen Test
              </div>
              <div>
                <strong>Website:</strong> gauntletai.com
              </div>
              <div>
                <strong>Keywords:</strong> "where to find software developers"
              </div>
              <div>
                <strong>Max Results:</strong> 5 posts (as requested)
              </div>
            </div>

            <Button
              onClick={runEndToEndTest}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading
                ? "🔄 Running End-to-End Test..."
                : "🚀 Start End-to-End Test"}
            </Button>

            {campaignId && (
              <div className="rounded border bg-blue-50 p-3">
                <p className="text-sm text-blue-800">
                  <strong>Campaign ID:</strong> {campaignId}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {results && (
          <Card
            className={`${results.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle
                  className={`${results.success ? "text-green-800" : "text-red-800"}`}
                >
                  {results.success
                    ? "✅ END-TO-END TEST SUCCESSFUL!"
                    : "❌ END-TO-END TEST FAILED"}
                </CardTitle>
                <Badge variant={results.success ? "default" : "destructive"}>
                  {results.success ? "SUCCESS" : "FAILED"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Test Configuration */}
                <div>
                  <h3 className="mb-2 font-medium">📋 Test Configuration</h3>
                  <div className="grid grid-cols-2 gap-2 rounded border bg-white p-3 text-sm">
                    <div>
                      <strong>Campaign:</strong>{" "}
                      {results.testData?.campaignName}
                    </div>
                    <div>
                      <strong>Website:</strong> {results.testData?.website}
                    </div>
                    <div>
                      <strong>Keywords:</strong>{" "}
                      {results.testData?.keywords?.join(", ")}
                    </div>
                    <div>
                      <strong>User ID:</strong> {results.testData?.userId}
                    </div>
                  </div>
                </div>

                {/* Campaign Details */}
                {results.campaign && (
                  <div>
                    <h3 className="mb-2 font-medium">🎯 Campaign Created</h3>
                    <div className="rounded border bg-white p-3 text-sm">
                      <div>
                        <strong>ID:</strong> {results.campaign.id}
                      </div>
                      <div>
                        <strong>Name:</strong> {results.campaign.name}
                      </div>
                      <div>
                        <strong>Status:</strong> {results.campaign.status}
                      </div>
                    </div>
                  </div>
                )}

                {/* Workflow Results */}
                {results.workflow && (
                  <div>
                    <h3 className="mb-2 font-medium">🔄 Workflow Progress</h3>
                    <div className="space-y-2 rounded border bg-white p-3 text-sm">
                      <div>
                        <strong>Total Steps:</strong>{" "}
                        {results.workflow.totalSteps}
                      </div>
                      <div>
                        <strong>Completed Steps:</strong>{" "}
                        {results.workflow.completedSteps}
                      </div>
                      <div>
                        <strong>Is Complete:</strong>{" "}
                        {results.workflow.isComplete ? "YES" : "NO"}
                      </div>

                      <div className="mt-4">
                        <h4 className="mb-2 font-medium">📋 Step Results:</h4>
                        <div className="space-y-2">
                          {results.workflow.results?.map(
                            (result: any, index: number) => (
                              <div
                                key={index}
                                className={`rounded p-2 text-xs ${result.success ? "bg-green-100" : "bg-red-100"}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{result.success ? "✅" : "❌"}</span>
                                  <strong>{result.step}</strong>
                                </div>
                                <div className="mt-1 text-gray-600">
                                  {result.message}
                                </div>
                                {result.data && (
                                  <div className="mt-1 space-y-1">
                                    {result.data.contentLength && (
                                      <div>
                                        Website Content:{" "}
                                        {result.data.contentLength} characters
                                      </div>
                                    )}
                                    {result.data.totalResults && (
                                      <div>
                                        Search Results:{" "}
                                        {result.data.totalResults} threads
                                      </div>
                                    )}
                                    {result.data.threadsFound !== undefined && (
                                      <div>
                                        Reddit Threads:{" "}
                                        {result.data.threadsFound} fetched
                                      </div>
                                    )}
                                    {result.data.commentsGenerated && (
                                      <div>
                                        Comments Generated:{" "}
                                        {result.data.commentsGenerated}
                                      </div>
                                    )}
                                    {result.data.averageScore && (
                                      <div>
                                        Average Score:{" "}
                                        {result.data.averageScore.toFixed(1)}
                                        /100
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Metrics */}
                {results.success && results.workflow && (
                  <div>
                    <h3 className="mb-2 font-medium">🎯 Success Metrics</h3>
                    <div className="rounded border bg-white p-3 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>✅ Website Scraped: YES</div>
                        <div>✅ Data Stored: YES</div>
                        <div>✅ Reddit Integration: YES</div>
                        <div>✅ OpenAI Integration: YES</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Details */}
                {!results.success && (
                  <div>
                    <h3 className="mb-2 font-medium text-red-800">
                      💥 Error Details
                    </h3>
                    <div className="rounded border bg-white p-3 text-sm text-red-700">
                      {results.message}
                    </div>
                  </div>
                )}

                {/* Firebase Instructions */}
                <div>
                  <h3 className="mb-2 font-medium">🔍 View Detailed Results</h3>
                  <div className="rounded border bg-white p-3 text-sm">
                    <div className="space-y-1">
                      <div>
                        <strong>Campaign ID:</strong> {results.campaign?.id}
                      </div>
                      <div className="mt-2">
                        <strong>Check Firebase Console for:</strong>
                      </div>
                      <ul className="ml-4 space-y-1">
                        <li>• campaigns collection</li>
                        <li>• searchResults collection</li>
                        <li>• redditThreads collection</li>
                        <li>• generatedComments collection</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
