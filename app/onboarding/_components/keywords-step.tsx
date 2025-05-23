"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Loader2, X, Plus, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-8 text-center"
    >
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Target Keywords
        </h1>
        <p className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
          {data.website
            ? "We've analyzed your website and generated relevant keywords that your potential customers might search for on Reddit."
            : "Add keywords that your potential customers might search for on Reddit."}
        </p>
      </div>

      {/* Loading State */}
      {isGenerating && !hasGenerated && (
        <div className="flex flex-col items-center space-y-4 py-12">
          <div className="relative">
            <div className="size-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Analyzing your website and generating keywords...
          </p>
        </div>
      )}

      {/* Keywords Display */}
      {(data.keywords.length > 0 || hasGenerated) && !isGenerating && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Generated Keywords
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {data.keywords.map((keyword, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative"
                >
                  {editingIndex === index ? (
                    <div className="flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800">
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
                        className="min-w-0 flex-1 border-none bg-transparent text-sm text-gray-900 outline-none dark:text-gray-100"
                        autoFocus
                        style={{ width: `${keyword.length + 2}ch` }}
                      />
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="ml-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleKeywordClick(index)}
                    >
                      <span className="break-words">{keyword}</span>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          removeKeyword(keyword)
                        }}
                        className="ml-2 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* AI Refinement */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Refine Keywords
            </h3>
            <form onSubmit={handleRefinement} className="space-y-3">
              <Textarea
                value={refinementPrompt}
                onChange={e => setRefinementPrompt(e.target.value)}
                placeholder="Tell the AI how to adjust the keywords (e.g., 'focus more on technical keywords' or 'make them more specific to B2B customers')"
                className="min-h-[80px] rounded-lg border-gray-300 dark:border-gray-600"
                disabled={isGenerating}
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full rounded-lg"
                disabled={!refinementPrompt.trim() || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 size-4" />
                    Regenerate Keywords
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Add Custom Keyword */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Add Custom Keyword
            </h3>
            <form onSubmit={addKeyword} className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                placeholder="Add a custom keyword..."
                className="flex-1 rounded-lg border-gray-300 dark:border-gray-600"
              />
              <Button
                type="submit"
                variant="outline"
                disabled={!newKeyword.trim()}
                className="rounded-lg"
              >
                <Plus className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Manual Keywords Entry (if no website) */}
      {!data.website && data.keywords.length === 0 && !isGenerating && (
        <div className="space-y-4">
          <form onSubmit={addKeyword} className="flex gap-2">
            <Input
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              placeholder="Enter a keyword your customers might search for..."
              className="flex-1 rounded-lg border-gray-300 dark:border-gray-600"
            />
            <Button
              type="submit"
              variant="outline"
              disabled={!newKeyword.trim()}
              className="rounded-lg"
            >
              <Plus className="size-4" />
            </Button>
          </form>
        </div>
      )}

      {/* Navigation */}
      {(data.keywords.length > 0 || !isGenerating) && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            disabled={data.keywords.length === 0}
          >
            Continue →
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onPrevious}
            className="flex w-full items-center justify-center text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Button>
        </form>
      )}
    </motion.div>
  )
}
