"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Loader2,
  X,
  Plus,
  Wand2,
  Hash,
  Sparkles,
  Target,
  Edit2,
  Check,
  Zap,
  TrendingUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { generateKeywordsAction } from "@/actions/lead-generation/keywords-actions"

interface KeywordsStepProps {
  data: {
    name: string
    profilePictureUrl: string
    website: string
    keywords: string[]
    redditConnected: boolean
  }
  onUpdate: (data: Partial<KeywordsStepProps["data"]>) => void
  onNext: () => void
  onPrevious: () => void
}

export default function KeywordsStep({
  data,
  onUpdate,
  onNext,
  onPrevious
}: KeywordsStepProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [newKeyword, setNewKeyword] = useState("")
  const [refinementPrompt, setRefinementPrompt] = useState("")
  const [hasGenerated, setHasGenerated] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Auto-generate keywords when component mounts if website is provided
  useEffect(() => {
    if (data.website && !hasGenerated && data.keywords.length === 0) {
      generateKeywords()
    }
  }, [data.website])

  const generateKeywords = async (refinement?: string) => {
    setIsGenerating(true)
    try {
      const result = await generateKeywordsAction({
        website: data.website,
        refinement: refinement || undefined
      })

      if (result.isSuccess) {
        onUpdate({ keywords: result.data.keywords })
        setHasGenerated(true)
      }
    } catch (error) {
      console.error("Error generating keywords:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRefinement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (refinementPrompt.trim()) {
      await generateKeywords(refinementPrompt)
      setRefinementPrompt("")
    }
  }

  const addKeyword = (e: React.FormEvent) => {
    e.preventDefault()
    if (newKeyword.trim() && !data.keywords.includes(newKeyword.trim())) {
      onUpdate({ keywords: [...data.keywords, newKeyword.trim()] })
      setNewKeyword("")
    }
  }

  const removeKeyword = (keywordToRemove: string) => {
    onUpdate({
      keywords: data.keywords.filter(keyword => keyword !== keywordToRemove)
    })
  }

  const editKeyword = (index: number, newValue: string) => {
    const updatedKeywords = [...data.keywords]
    updatedKeywords[index] = newValue
    onUpdate({ keywords: updatedKeywords })
  }

  const handleKeywordClick = (index: number) => {
    setEditingIndex(index)
  }

  const handleKeywordBlur = (
    e: React.FocusEvent<HTMLInputElement>,
    index: number,
    keyword: string
  ) => {
    setEditingIndex(null)
    if (e.target.value.trim() === "") {
      removeKeyword(keyword)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (data.keywords.length > 0) {
      onNext()
    }
  }

  const suggestedKeywords = [
    "marketing automation",
    "lead generation",
    "CRM software",
    "sales funnel",
    "customer acquisition"
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* Enhanced Header */}
      <div className="space-y-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center"
        >
          <div className="shadow-glow rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 dark:from-purple-950 dark:to-purple-900">
            <Hash className="size-8 text-purple-600" />
          </div>
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Target Keywords
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed">
            {data.website
              ? "AI-generated keywords based on your website analysis. These help identify relevant Reddit conversations."
              : "Add keywords that your potential customers search for on Reddit to find relevant leads."}
          </p>
        </div>
      </div>

      {/* Enhanced Loading State */}
      {isGenerating && !hasGenerated && (
        <Card className="shadow-glow border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
          <CardContent className="p-12">
            <div className="flex flex-col items-center space-y-6">
              <div className="relative">
                <div className="border-muted size-16 animate-spin rounded-full border-4 border-t-purple-600" />
                <Sparkles className="absolute inset-0 m-auto size-8 animate-pulse text-purple-600" />
              </div>
              <div className="space-y-2 text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  AI is analyzing your website
                </p>
                <p className="text-muted-foreground">
                  Generating relevant keywords for Reddit lead generation...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Keywords Display */}
      {(data.keywords.length > 0 || hasGenerated) && !isGenerating && (
        <div className="space-y-8">
          {/* Keywords Grid */}
          <Card className="shadow-glow border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Target className="size-5 text-purple-600" />
                  <Label className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Your Keywords ({data.keywords.length})
                  </Label>
                </div>

                <div className="grid gap-3">
                  <AnimatePresence mode="popLayout">
                    {data.keywords.map((keyword, index) => (
                      <motion.div
                        key={keyword}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        layout
                        className="group"
                      >
                        {editingIndex === index ? (
                          <div className="flex items-center gap-3 rounded-xl border-2 border-blue-200 bg-blue-50 p-4 shadow-sm dark:border-blue-800 dark:bg-blue-950/20">
                            <Hash className="size-5 text-blue-600" />
                            <input
                              type="text"
                              value={keyword}
                              onChange={e => editKeyword(index, e.target.value)}
                              onBlur={e => handleKeywordBlur(e, index, keyword)}
                              onKeyDown={e => {
                                if (e.key === "Enter") {
                                  setEditingIndex(null)
                                }
                              }}
                              className="flex-1 border-none bg-transparent text-base font-medium outline-none"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingIndex(null)}
                              className="size-8 text-blue-600 hover:text-blue-700"
                            >
                              <Check className="size-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="glass hover:shadow-glow-lg group flex cursor-pointer items-center gap-3 rounded-xl p-4 transition-all duration-300 hover:-translate-y-1">
                            <Hash className="text-muted-foreground size-5" />
                            <span className="flex-1 text-base font-medium text-gray-900 dark:text-gray-100">
                              {keyword}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleKeywordClick(index)}
                                className="text-muted-foreground size-8 hover:text-blue-600"
                              >
                                <Edit2 className="size-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => removeKeyword(keyword)}
                                className="text-muted-foreground size-8 hover:text-red-600"
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced AI Refinement */}
          <Card className="shadow-glow border-0 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-900/20">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Wand2 className="size-5 text-indigo-600" />
                  <Label className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Refine with AI
                  </Label>
                </div>
                <p className="text-muted-foreground">
                  Tell our AI how to adjust your keywords for better targeting
                </p>

                <form onSubmit={handleRefinement} className="space-y-4">
                  <Textarea
                    value={refinementPrompt}
                    onChange={e => setRefinementPrompt(e.target.value)}
                    placeholder="Tell AI how to adjust keywords (e.g., 'focus more on B2B terms', 'make them more technical', 'add industry-specific language')"
                    className="min-h-[100px] resize-none rounded-xl border-2 border-indigo-200 text-base focus:border-indigo-500 dark:border-indigo-800 dark:focus:border-indigo-400"
                    disabled={isGenerating}
                  />
                  <Button
                    type="submit"
                    className="h-12 w-full bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-lg hover:from-indigo-700 hover:to-indigo-800"
                    disabled={!refinementPrompt.trim() || isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 size-5 animate-spin" />
                        Regenerating Keywords...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 size-5" />
                        Regenerate Keywords
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Add Custom Keyword */}
          <Card className="shadow-glow border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Plus className="size-5 text-green-600" />
                  <Label className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Add Custom Keyword
                  </Label>
                </div>

                <form onSubmit={addKeyword} className="flex gap-3">
                  <Input
                    value={newKeyword}
                    onChange={e => setNewKeyword(e.target.value)}
                    placeholder="Enter a custom keyword..."
                    className="h-12 flex-1 rounded-xl border-2 border-gray-200 text-base focus:border-green-500 dark:border-gray-700 dark:focus:border-green-400"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-gradient-to-r from-green-600 to-green-700 px-6 hover:from-green-700 hover:to-green-800"
                    disabled={!newKeyword.trim()}
                  >
                    <Plus className="size-5" />
                  </Button>
                </form>

                {/* Suggested Keywords */}
                {data.keywords.length < 3 && (
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-sm font-medium">
                      Popular suggestions:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedKeywords
                        .filter(
                          suggestion => !data.keywords.includes(suggestion)
                        )
                        .slice(0, 3)
                        .map((suggestion, index) => (
                          <Button
                            key={suggestion}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNewKeyword(suggestion)
                            }}
                            className="h-8 text-xs hover:border-green-200 hover:bg-green-50 dark:hover:bg-green-950/20"
                          >
                            <Zap className="mr-1 size-3" />
                            {suggestion}
                          </Button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Manual Keywords Entry (if no website) */}
      {!data.website && data.keywords.length === 0 && !isGenerating && (
        <Card className="border-2 border-dashed border-gray-300 bg-gradient-to-br from-white to-gray-50/50 dark:border-gray-700 dark:from-gray-900 dark:to-gray-800/50">
          <CardContent className="p-12 text-center">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="mx-auto w-fit rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 dark:from-purple-950 dark:to-purple-900">
                  <Hash className="size-12 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Add Your First Keyword
                </h3>
                <p className="text-muted-foreground mx-auto max-w-md">
                  Start by adding keywords your customers might search for on
                  Reddit. These help us find relevant conversations where you
                  can engage.
                </p>
              </div>

              <form
                onSubmit={addKeyword}
                className="mx-auto flex max-w-md gap-3"
              >
                <Input
                  value={newKeyword}
                  onChange={e => setNewKeyword(e.target.value)}
                  placeholder="e.g., marketing automation"
                  className="h-12 flex-1 rounded-xl border-2 border-gray-200 text-base focus:border-purple-500 dark:border-gray-700 dark:focus:border-purple-400"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 hover:from-purple-700 hover:to-purple-800"
                  disabled={!newKeyword.trim()}
                >
                  <Plus className="mr-2 size-5" />
                  Add
                </Button>
              </form>

              {/* Suggested Keywords for new users */}
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm font-medium">
                  Popular keywords to get started:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedKeywords.map(suggestion => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => setNewKeyword(suggestion)}
                      className="h-8 text-xs hover:border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Navigation */}
      {(data.keywords.length > 0 || !isGenerating) && (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button
              onClick={handleSubmit}
              className="h-14 w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105 hover:from-purple-700 hover:to-purple-800 hover:shadow-xl disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={data.keywords.length === 0}
            >
              Continue to Reddit Connection
            </Button>
          </motion.div>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={onPrevious}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-lg px-4 py-2 transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back to Website
            </Button>

            <div className="flex items-center gap-3">
              {data.keywords.length > 0 && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <TrendingUp className="size-4 text-green-600" />
                  <span>
                    {data.keywords.length} keyword
                    {data.keywords.length !== 1 ? "s" : ""} ready
                  </span>
                </div>
              )}
              <div className="text-muted-foreground text-sm">Step 3 of 5</div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
