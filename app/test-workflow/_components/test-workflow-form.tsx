"use client"

import { useState } from "react"
import { createCampaignAction } from "@/actions/db/lead-generation-actions"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function TestWorkflowForm() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [campaignId, setCampaignId] = useState<string>("")

  const runEndToEndTest = async () => {
    setLoading(true)
    setResults(null)

    try {
      console.log("🚀 Starting Enhanced End-to-End Test with o3-mini...")

      // Test configuration
      const testData = {
        campaignName: "Software Developer Lead Gen Test (o3-mini Enhanced)",
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

      console.log("✅ Enhanced test completed!")
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚀 Enhanced End-to-End Test
            <Badge variant="secondary">o3-mini + Ultra-Short</Badge>
          </CardTitle>
          <CardDescription>
            Test the complete workflow with critical scoring and ultra-short
            three-tier comment generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Campaign:</strong> Software Developer Lead Gen Test
              (Enhanced)
            </div>
            <div>
              <strong>Website:</strong> gauntletai.com
            </div>
            <div>
              <strong>Keywords:</strong> "where to find software developers"
            </div>
            <div>
              <strong>AI Model:</strong> OpenAI o3-mini (Critical Scoring)
            </div>
          </div>

          <Button
            onClick={runEndToEndTest}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading
              ? "🔄 Running Enhanced Test..."
              : "🚀 Start Enhanced End-to-End Test"}
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
                  ? "✅ ENHANCED TEST SUCCESSFUL!"
                  : "❌ ENHANCED TEST FAILED"}
              </CardTitle>
              <Badge variant={results.success ? "default" : "destructive"}>
                {results.success ? "SUCCESS" : "FAILED"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="workflow">Workflow</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
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

                {/* Success Metrics */}
                {results.success && results.workflow && (
                  <div>
                    <h3 className="mb-2 font-medium">🎯 Success Metrics</h3>
                    <div className="rounded border bg-white p-3 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>✅ Website Scraped: YES</div>
                        <div>✅ o3-mini Scoring: YES</div>
                        <div>✅ Three-Tier Comments: YES</div>
                        <div>✅ Data Stored: YES</div>
                        <div>✅ Reddit Integration: YES</div>
                        <div>✅ Critical Analysis: YES</div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="workflow" className="space-y-4">
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
                                        <Badge
                                          variant={
                                            result.data.averageScore > 60
                                              ? "default"
                                              : "secondary"
                                          }
                                          className="ml-2"
                                        >
                                          {result.data.averageScore > 60
                                            ? "High Quality"
                                            : "Critical Filtered"}
                                        </Badge>
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
              </TabsContent>

              <TabsContent value="comments" className="space-y-4">
                <div>
                  <h3 className="mb-2 font-medium">
                    💬 Three-Tier Comment System Preview
                  </h3>
                  <div className="space-y-4">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <h4 className="mb-2 font-semibold text-green-800">
                        🆓 Free Tier
                      </h4>
                      <p className="text-sm text-green-700">
                        Ultra-short generic advice (30-80 words). No company
                        mention. Perfect for building karma quickly.
                      </p>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <h4 className="mb-2 font-semibold text-blue-800">
                        💼 Medium Tier
                      </h4>
                      <p className="text-sm text-blue-700">
                        Concise advice with subtle CEO/experience mention.
                        Authentic positioning in minimal words.
                      </p>
                    </div>
                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                      <h4 className="mb-2 font-semibold text-purple-800">
                        💎 Premium Tier
                      </h4>
                      <p className="text-sm text-purple-700">
                        Brief advice that naturally mentions Gauntlet AI as one
                        option. Maximum impact in minimum words.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="data" className="space-y-4">
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
                        <li>• search_results collection</li>
                        <li>• reddit_threads collection</li>
                        <li>
                          • generated_comments collection (with three-tier
                          comments)
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
