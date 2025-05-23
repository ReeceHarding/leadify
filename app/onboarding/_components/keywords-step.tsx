"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Loader2,
  X,
  Plus,
  Wand2,
  Hash,
  Sparkles,
  Target
} from "lucide-react"
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
      className="space-y-6"
    >
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="mb-4 flex justify-center">
          <div className="bg-primary/10 rounded-full p-3">
            <Hash className="text-primary size-6" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Target Keywords</h2>
        <p className="text-muted-foreground">
          {data.website
            ? "AI-generated keywords based on your website analysis"
            : "Add keywords that your potential customers search for on Reddit"}
        </p>
      </div>

      {/* Loading State */}
      {isGenerating && !hasGenerated && (
        <div className="flex flex-col items-center space-y-4 py-12">
          <div className="relative">
            <div className="border-muted border-t-primary size-12 animate-spin rounded-full border-4" />
            <Sparkles className="text-primary absolute inset-0 m-auto size-6 animate-pulse" />
          </div>
          <div className="space-y-2 text-center">
            <p className="font-medium">AI is analyzing your website</p>
            <p className="text-muted-foreground text-sm">
              Generating relevant keywords for Reddit lead generation...
            </p>
          </div>
        </div>
      )}

      {/* Keywords Display */}
      {(data.keywords.length > 0 || hasGenerated) && !isGenerating && (
        <div className="space-y-6">
          {/* Keywords Grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="text-primary size-4" />
              <h3 className="font-semibold">
                Your Keywords ({data.keywords.length})
              </h3>
            </div>

            <div className="grid gap-3">
              {data.keywords.map((keyword, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  className="group"
                >
                  {editingIndex === index ? (
                    <div className="bg-card flex items-center gap-2 rounded-xl border p-3">
                      <Hash className="text-muted-foreground size-4" />
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
                        className="flex-1 border-none bg-transparent text-sm outline-none"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeKeyword(keyword)}
                        className="text-muted-foreground hover:text-destructive size-6"
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="bg-card hover:bg-muted/50 group flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-colors"
                      onClick={() => handleKeywordClick(index)}
                    >
                      <Hash className="text-muted-foreground size-4" />
                      <span className="flex-1 text-sm">{keyword}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={e => {
                          e.stopPropagation()
                          removeKeyword(keyword)
                        }}
                        className="text-muted-foreground hover:text-destructive size-6 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* AI Refinement */}
          <div className="bg-muted/30 space-y-4 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Wand2 className="text-primary size-4" />
              <h3 className="font-semibold">Refine with AI</h3>
            </div>
            <form onSubmit={handleRefinement} className="space-y-3">
              <Textarea
                value={refinementPrompt}
                onChange={e => setRefinementPrompt(e.target.value)}
                placeholder="Tell AI how to adjust keywords (e.g., 'focus on B2B terms' or 'make them more technical')"
                className="focus-ring min-h-[80px] resize-none"
                disabled={isGenerating}
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={!refinementPrompt.trim() || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    Regenerate Keywords
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Add Custom Keyword */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="text-primary size-4" />
              <h3 className="font-semibold">Add Custom Keyword</h3>
            </div>
            <form onSubmit={addKeyword} className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                placeholder="Enter a custom keyword..."
                className="focus-ring flex-1"
              />
              <Button
                type="submit"
                variant="outline"
                size="icon"
                disabled={!newKeyword.trim()}
              >
                <Plus className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Manual Keywords Entry (if no website) */}
      {!data.website && data.keywords.length === 0 && !isGenerating && (
        <div className="space-y-4 rounded-xl border border-dashed p-6 text-center">
          <div className="space-y-2">
            <Hash className="text-muted-foreground mx-auto size-8" />
            <h3 className="font-semibold">Add Your First Keyword</h3>
            <p className="text-muted-foreground text-sm">
              Start by adding keywords your customers might search for on Reddit
            </p>
          </div>

          <form onSubmit={addKeyword} className="mx-auto flex max-w-md gap-2">
            <Input
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              placeholder="e.g., marketing automation"
              className="focus-ring flex-1"
            />
            <Button type="submit" disabled={!newKeyword.trim()}>
              <Plus className="mr-2 size-4" />
              Add
            </Button>
          </form>
        </div>
      )}

      {/* Navigation */}
      {(data.keywords.length > 0 || !isGenerating) && (
        <div className="space-y-4">
          <Button
            onClick={handleSubmit}
            className="h-12 w-full rounded-xl text-base font-semibold"
            disabled={data.keywords.length === 0}
          >
            Continue
          </Button>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onPrevious}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>

            {data.keywords.length > 0 && (
              <div className="text-muted-foreground text-sm">
                {data.keywords.length} keyword
                {data.keywords.length !== 1 ? "s" : ""} added
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
