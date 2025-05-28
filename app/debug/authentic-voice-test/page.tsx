"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { testAuthenticVoiceSystemAction, testSpecificWritingStyleElementsAction } from "@/actions/integrations/openai/test-authentic-voice-actions"

export default function AuthenticVoiceTestPage() {
  const [isTestingSystem, setIsTestingSystem] = useState(false)
  const [isTestingStyle, setIsTestingStyle] = useState(false)
  const [systemTestResult, setSystemTestResult] = useState<any>(null)
  const [styleTestResult, setStyleTestResult] = useState<any>(null)

  const runSystemTest = async () => {
    setIsTestingSystem(true)
    try {
      console.log("🧪 Starting authentic voice system test...")
      const result = await testAuthenticVoiceSystemAction()
      setSystemTestResult(result)
      console.log("🧪 System test completed:", result)
    } catch (error) {
      console.error("❌ System test failed:", error)
      setSystemTestResult({ isSuccess: false, message: "Test failed with error" })
    } finally {
      setIsTestingSystem(false)
    }
  }

  const runStyleTest = async () => {
    setIsTestingStyle(true)
    try {
      console.log("🧪 Starting writing style elements test...")
      const result = await testSpecificWritingStyleElementsAction()
      setStyleTestResult(result)
      console.log("🧪 Style test completed:", result)
    } catch (error) {
      console.error("❌ Style test failed:", error)
      setStyleTestResult({ isSuccess: false, message: "Test failed with error" })
    } finally {
      setIsTestingStyle(false)
    }
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Authentic Voice System Test</h1>
        <p className="text-muted-foreground">
          Test the authentic consultant voice system to ensure it generates comments in the exact style of the example post.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* System Test */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 Full System Test</CardTitle>
            <CardDescription>
              Tests the complete authentic voice generation system including voice prompt generation and comment creation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runSystemTest} 
              disabled={isTestingSystem}
              className="w-full"
            >
              {isTestingSystem ? "Running System Test..." : "Run System Test"}
            </Button>

            {systemTestResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={systemTestResult.isSuccess ? "default" : "destructive"}>
                    {systemTestResult.isSuccess ? "✅ PASSED" : "❌ FAILED"}
                  </Badge>
                  <span className="text-muted-foreground text-sm">
                    {systemTestResult.message}
                  </span>
                </div>

                {systemTestResult.isSuccess && systemTestResult.data && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Voice Prompt: {systemTestResult.data.voicePromptGenerated ? "✅" : "❌"}</div>
                      <div>Comments: {systemTestResult.data.authenticCommentGenerated ? "✅" : "❌"}</div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h4 className="font-semibold">Voice Characteristics</h4>
                      <div className="space-y-1 text-sm">
                        <div>Enthusiasm: {systemTestResult.data.voiceCharacteristics?.enthusiasmLevel}</div>
                        <div>Domain: {systemTestResult.data.voiceCharacteristics?.expertiseDomain}</div>
                        <div>Connection: {systemTestResult.data.voiceCharacteristics?.personalConnection}</div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h4 className="font-semibold">Sample Comments</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Micro:</strong> {systemTestResult.data.sampleMicroComment}
                        </div>
                        <div>
                          <strong>Medium:</strong> {systemTestResult.data.sampleMediumComment}
                        </div>
                        <div>
                          <strong>Verbose Preview:</strong> {systemTestResult.data.sampleVerboseComment?.substring(0, 150)}...
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Style Test */}
        <Card>
          <CardHeader>
            <CardTitle>✍️ Writing Style Test</CardTitle>
            <CardDescription>
              Tests specific writing style elements to ensure compliance with the authentic consultant voice rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runStyleTest} 
              disabled={isTestingStyle}
              className="w-full"
            >
              {isTestingStyle ? "Running Style Test..." : "Run Style Test"}
            </Button>

            {styleTestResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={styleTestResult.isSuccess ? "default" : "destructive"}>
                    {styleTestResult.isSuccess ? "✅ PASSED" : "❌ FAILED"}
                  </Badge>
                  <span className="text-muted-foreground text-sm">
                    {styleTestResult.message}
                  </span>
                </div>

                {styleTestResult.isSuccess && styleTestResult.data && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Style Element Tests</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>No Hyphens:</span>
                        <Badge variant={styleTestResult.data.hyphenTest ? "default" : "destructive"}>
                          {styleTestResult.data.hyphenTest ? "✅ PASS" : "❌ FAIL"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Uses $ Symbol:</span>
                        <Badge variant={styleTestResult.data.symbolTest ? "default" : "destructive"}>
                          {styleTestResult.data.symbolTest ? "✅ PASS" : "❌ FAIL"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Shows Enthusiasm:</span>
                        <Badge variant={styleTestResult.data.enthusiasmTest ? "default" : "destructive"}>
                          {styleTestResult.data.enthusiasmTest ? "✅ PASS" : "❌ FAIL"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Proper Structure:</span>
                        <Badge variant={styleTestResult.data.structureTest ? "default" : "destructive"}>
                          {styleTestResult.data.structureTest ? "✅ PASS" : "❌ FAIL"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Authentic Tone:</span>
                        <Badge variant={styleTestResult.data.toneTest ? "default" : "destructive"}>
                          {styleTestResult.data.toneTest ? "✅ PASS" : "❌ FAIL"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Test Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">What These Tests Verify:</h4>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li><strong>System Test:</strong> Verifies the complete authentic voice generation pipeline works correctly</li>
              <li><strong>Style Test:</strong> Ensures generated comments follow the specific writing style rules</li>
              <li><strong>Hyphen Rule:</strong> Comments must NEVER use hyphens (write "3rd party" not "third-party")</li>
              <li><strong>Symbol Usage:</strong> Must use "$" instead of "money" or "dollars"</li>
              <li><strong>Enthusiasm:</strong> Should include exclamation marks and positive language</li>
              <li><strong>Structure:</strong> Should follow the authentic consultant format with personal connection, questions, and options</li>
              <li><strong>Tone:</strong> Should be conversational, helpful, and include honest warnings</li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-semibold">Expected Authentic Voice Elements:</h4>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>Personal connection opening ("I would love to chat about this...")</li>
              <li>Framework questions ("There are a handful of things you need to consider:")</li>
              <li>Option presentation ("Then you have a few options.")</li>
              <li>Honest pros/cons for each option</li>
              <li>Specific expectations ("Expect to pay...")</li>
              <li>Personal closing with offer to help</li>
              <li>Use of "And," to start sentences</li>
              <li>ALL CAPS for emphasis on key words</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Console Output Notice */}
      <Card>
        <CardHeader>
          <CardTitle>🔍 Detailed Output</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Check the browser console (F12) for detailed test output, including full generated comments and step-by-step validation results.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 