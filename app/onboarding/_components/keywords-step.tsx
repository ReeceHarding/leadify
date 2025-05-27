"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Target,
  Wand2,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Lightbulb,
  Users,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateKeywordsAction } from "@/actions/lead-generation/keywords-actions"

interface KeywordsStepProps {
  data: {
    website: string
    keywords: string[]
    businessDescription: string // This is the organizationName for context
    organizationId: string
  }
  onUpdate: (data: Partial<{ keywords: string[] }>) => void // Only keywords are updated by this step
  onNext: () => void
  onPrevious: () => void
}

export default function KeywordsStep({
  data,
  onUpdate,
  onNext,
  onPrevious
}: KeywordsStepProps) {
  console.log("🔍 [KEYWORDS] Component initialized")
  console.log("🔍 [KEYWORDS] Current data:", data)
  console.log("🔍 [KEYWORDS] Current keywords:", data.keywords)
  console.log("🔍 [KEYWORDS] Keywords length:", data.keywords?.length || 0)

  const [isGenerating, setIsGenerating] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(
    data.keywords && data.keywords.length > 0
  )
  const [refinementInput, setRefinementInput] = useState("")
  const [strategicInsights, setStrategicInsights] = useState<{
    idealCustomerProfile?: string
    uniqueValueProposition?: string
    targetPainPoints?: string[]
  }>({})

  console.log("🔍 [KEYWORDS] Component state:")
  console.log("🔍 [KEYWORDS] - isGenerating:", isGenerating)
  console.log("🔍 [KEYWORDS] - hasGenerated:", hasGenerated)
  console.log("🔍 [KEYWORDS] - refinementInput:", refinementInput)
  console.log("🔍 [KEYWORDS] - strategicInsights:", strategicInsights)

  const handleNext = () => {
    console.log("🔍 [KEYWORDS] handleNext() called")
    console.log("🔍 [KEYWORDS] Current keywords before next:", data.keywords)
    console.log(
      "🔍 [KEYWORDS] Keywords length before next:",
      data.keywords?.length || 0
    )

    if (data.keywords && data.keywords.length > 0) {
      console.log("🔍 [KEYWORDS] Keywords exist, proceeding to next step")
      onNext()
    } else {
      console.log("🔍 [KEYWORDS] No keywords found, cannot proceed")
    }
  }

  const handlePrevious = () => {
    console.log("🔍 [KEYWORDS] handlePrevious() called")
    onPrevious()
  }

  const generateKeywords = async (refinement?: string) => {
    console.log("🔍 [KEYWORDS] generateKeywords() called with o3-mini")
    console.log("🔍 [KEYWORDS] Website:", data.website)
    console.log(
      "🔍 [KEYWORDS] Business Description (Org Name for context):",
      data.businessDescription
    )
    console.log("🔍 [KEYWORDS] Organization ID:", data.organizationId)
    console.log("🔍 [KEYWORDS] Refinement:", refinement)

    setIsGenerating(true)
    try {
      console.log(
        "🔍 [KEYWORDS] Calling generateKeywordsAction with strategic analysis"
      )
      const result = await generateKeywordsAction({
        website: data.website,
        businessDescription: data.businessDescription,
        refinement: refinement || undefined,
        organizationId: data.organizationId
      })

      console.log(
        "🔍 [KEYWORDS] generateKeywordsAction result:",
        JSON.stringify(result, null, 2)
      )

      if (result.isSuccess) {
        console.log("🔍 [KEYWORDS] Strategic keywords generation successful")
        console.log("🔍 [KEYWORDS] Generated keywords:", result.data.keywords)
        console.log(
          "🔍 [KEYWORDS] Keywords length:",
          result.data.keywords.length
        )
        console.log("🔍 [KEYWORDS] Strategic insights:", {
          idealCustomerProfile: result.data.idealCustomerProfile,
          uniqueValueProposition: result.data.uniqueValueProposition,
          targetPainPoints: result.data.targetPainPoints
        })

        // Update keywords and strategic insights
        console.log(
          "🔍 [KEYWORDS] Calling onUpdate with generated keywords and insights"
        )
        onUpdate({ keywords: result.data.keywords })

        // Store strategic insights in component state for display
        setStrategicInsights({
          idealCustomerProfile: result.data.idealCustomerProfile,
          uniqueValueProposition: result.data.uniqueValueProposition,
          targetPainPoints: result.data.targetPainPoints
        })

        setHasGenerated(true)
        setRefinementInput("") // Clear refinement input after successful generation

        console.log(
          "🔍 [KEYWORDS] Successfully updated keywords and strategic insights"
        )
      } else {
        console.error(
          "🔍 [KEYWORDS] Strategic keywords generation failed:",
          result.message
        )
      }
    } catch (error) {
      console.error("🔍 [KEYWORDS] Error generating strategic keywords:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = () => {
    console.log("🔍 [KEYWORDS] handleGenerate() called")
    console.log("🔍 [KEYWORDS] Refinement input:", refinementInput)
    generateKeywords(refinementInput.trim() || undefined)
  }

  const handleRegenerate = () => {
    console.log("🔍 [KEYWORDS] handleRegenerate() called")
    console.log(
      "🔍 [KEYWORDS] Refinement input for regeneration:",
      refinementInput
    )
    generateKeywords(refinementInput.trim() || undefined)
  }

  console.log("🔍 [KEYWORDS] About to render component")
  console.log("🔍 [KEYWORDS] Final data.keywords:", data.keywords)
  console.log("🔍 [KEYWORDS] Final hasGenerated:", hasGenerated)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-8 text-center"
    >
      <div className="space-y-4">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-blue-700">
          <span className="text-2xl font-bold text-white">3</span>
        </div>
        <h1 className="text-3xl font-bold text-white">
          Generate Your Keywords
        </h1>
        <p className="text-base leading-relaxed text-gray-400">
          Our AI will analyze your website and create targeted Reddit search
          terms to find prospects who need exactly what you offer.
        </p>
      </div>

      {!hasGenerated && (
        <div className="space-y-6 text-left">
          <Card className="border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Lightbulb className="size-5 text-blue-500" />
                In 1-2 sentences, describe what kind of customers you're looking
                for
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={refinementInput}
                onChange={e => setRefinementInput(e.target.value)}
                placeholder="Describe in 1-2 sentences the types of users you're looking to find on Reddit - ie people looking for recommendations for large group event venues in the Dominican Republic like weddings and large family get togethers"
                className="min-h-[100px] border-gray-600 bg-gray-800 text-white placeholder:text-gray-500"
              />
              <p className="text-sm text-gray-400">
                Help the AI understand your specific niche or target audience
                for more relevant keywords.
              </p>
            </CardContent>
          </Card>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full rounded-lg bg-blue-600 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <Wand2 className="mr-2 size-4 animate-spin" />
                Analyzing Website & Generating Strategic Keywords...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 size-4" />
                Generate Keywords
              </>
            )}
          </Button>
        </div>
      )}

      {hasGenerated && data.keywords && data.keywords.length > 0 && (
        <div className="space-y-6 text-left">
          {/* Strategic Insights */}
          {(strategicInsights.idealCustomerProfile ||
            strategicInsights.uniqueValueProposition ||
            strategicInsights.targetPainPoints) && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Users className="size-5 text-blue-500" />
                Strategic Analysis
              </h3>

              {strategicInsights.idealCustomerProfile && (
                <Card className="border-gray-700 bg-gray-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-300">
                      Ideal Customer Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white">
                      {strategicInsights.idealCustomerProfile}
                    </p>
                  </CardContent>
                </Card>
              )}

              {strategicInsights.uniqueValueProposition && (
                <Card className="border-gray-700 bg-gray-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-300">
                      Unique Value Proposition
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white">
                      {strategicInsights.uniqueValueProposition}
                    </p>
                  </CardContent>
                </Card>
              )}

              {strategicInsights.targetPainPoints &&
                strategicInsights.targetPainPoints.length > 0 && (
                  <Card className="border-gray-700 bg-gray-900">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm text-gray-300">
                        <AlertTriangle className="size-4" />
                        Target Pain Points
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {strategicInsights.targetPainPoints.map(
                          (painPoint, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <div className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-500" />
                              <p className="text-white">{painPoint}</p>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
            </div>
          )}

          {/* Generated Keywords */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <CheckCircle className="size-5 text-green-500" />
                Generated Keywords ({data.keywords.length})
              </h3>
              <Badge
                variant="secondary"
                className="bg-green-900 text-green-100"
              >
                Ready for Reddit
              </Badge>
            </div>

            <div className="grid gap-3">
              {data.keywords.map((keyword, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-700 bg-gray-900 p-3 text-white"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                      {index + 1}
                    </span>
                    <span className="flex-1">{keyword}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Refinement Section */}
          <Card className="border-gray-700 bg-gray-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <RefreshCw className="size-5 text-blue-500" />
                Refine Keywords
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={refinementInput}
                onChange={e => setRefinementInput(e.target.value)}
                placeholder="Not satisfied? Add specific instructions to refine the keywords... (e.g., 'focus more on AI-specific hiring needs' or 'target smaller startups instead of enterprises')"
                className="min-h-[80px] border-gray-600 bg-gray-800 text-white placeholder:text-gray-500"
              />
              <Button
                onClick={handleRegenerate}
                disabled={isGenerating}
                variant="outline"
                className="w-full border-gray-600 bg-gray-800 text-white hover:bg-gray-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 size-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 size-4" />
                    Regenerate Keywords
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-4">
        <Button
          onClick={handlePrevious}
          variant="outline"
          className="flex-1 border-gray-600 bg-gray-800 text-white hover:bg-gray-700"
        >
          <ArrowLeft className="mr-2 size-4" />
          Previous
        </Button>
        <Button
          onClick={handleNext}
          disabled={
            !hasGenerated || !data.keywords || data.keywords.length === 0
          }
          className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
        >
          Continue
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    </motion.div>
  )
}
