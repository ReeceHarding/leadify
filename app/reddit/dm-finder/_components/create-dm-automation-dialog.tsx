"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, X, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { createDMAutomationAction } from "@/actions/db/dm-actions"
import { generateKeywordsAction } from "@/actions/lead-generation/keywords-actions"

interface CreateDMAutomationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  onSuccess: (automation: any) => void
}

export default function CreateDMAutomationDialog({
  open,
  onOpenChange,
  organizationId,
  onSuccess
}: CreateDMAutomationDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState("")
  const [targetSubreddits, setTargetSubreddits] = useState<string[]>([])
  const [subredditInput, setSubredditInput] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false)
  const [aiInstructions, setAiInstructions] = useState("")

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()])
      setKeywordInput("")
    }
  }

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword))
  }

  const handleAddSubreddit = () => {
    const subreddit = subredditInput.trim().replace(/^r\//, "")
    if (subreddit && !targetSubreddits.includes(subreddit)) {
      setTargetSubreddits([...targetSubreddits, subreddit])
      setSubredditInput("")
    }
  }

  const handleRemoveSubreddit = (subreddit: string) => {
    setTargetSubreddits(targetSubreddits.filter(s => s !== subreddit))
  }

  const handleGenerateKeywords = async () => {
    if (!description.trim()) {
      toast.error("Please provide a description first")
      return
    }

    setIsGeneratingKeywords(true)
    try {
      const result = await generateKeywordsAction({
        businessDescription: description,
        refinement: aiInstructions || "Generate keywords for finding Reddit users to send DMs to",
        organizationId: organizationId
      })

      if (result.isSuccess && result.data) {
        setKeywords(result.data.keywords)
        toast.success("Keywords generated successfully!")
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate keywords"
      toast.error(errorMessage)
    } finally {
      setIsGeneratingKeywords(false)
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please provide a name")
      return
    }

    if (keywords.length === 0) {
      toast.error("Please add at least one keyword")
      return
    }

    setIsCreating(true)
    try {
      const result = await createDMAutomationAction({
        organizationId,
        userId: "", // This will be filled by the action
        name: name.trim(),
        keywords,
        subreddits: targetSubreddits,
        templateId: "", // This needs to be set or made optional
        maxDailyDMs: 50 // Default value
      })

      if (result.isSuccess && result.data) {
        toast.success("DM automation created successfully!")
        onSuccess(result.data)
        onOpenChange(false)
        
        // Reset form
        setName("")
        setDescription("")
        setKeywords([])
        setTargetSubreddits([])
        setKeywordInput("")
        setSubredditInput("")
        setAiInstructions("")
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create automation"
      toast.error(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create DM Automation</DialogTitle>
          <DialogDescription>
            Set up an automation to find and message potential customers on Reddit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Automation Name</Label>
            <Input
              id="name"
              placeholder="e.g., Software Developer Outreach"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what you're offering and who you're targeting..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label>Keywords</Label>
            <p className="text-muted-foreground text-sm">
              Keywords to find relevant Reddit users (e.g., "looking for developers", "need software help")
            </p>
            
            {/* AI Generation */}
            {description && (
              <div className="bg-muted/50 space-y-2 rounded-lg border p-3">
                <Textarea
                  placeholder="Optional: Add specific instructions for AI keyword generation (e.g., 'focus on enterprise customers', 'include budget-conscious terms')"
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateKeywords}
                  disabled={isGeneratingKeywords}
                  className="w-full"
                >
                  {isGeneratingKeywords ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 size-4" />
                  )}
                  Generate Keywords with AI
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Add a keyword..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddKeyword()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddKeyword}
                disabled={!keywordInput.trim()}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="gap-1">
                    {keyword}
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="hover:text-destructive ml-1"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Target Subreddits (Optional) */}
          <div className="space-y-2">
            <Label>Target Subreddits (Optional)</Label>
            <p className="text-muted-foreground text-sm">
              Limit search to specific subreddits
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., webdev, startups"
                value={subredditInput}
                onChange={(e) => setSubredditInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddSubreddit()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddSubreddit}
                disabled={!subredditInput.trim()}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            
            {targetSubreddits.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {targetSubreddits.map((subreddit) => (
                  <Badge key={subreddit} variant="outline" className="gap-1">
                    r/{subreddit}
                    <button
                      onClick={() => handleRemoveSubreddit(subreddit)}
                      className="hover:text-destructive ml-1"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim() || keywords.length === 0}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Automation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 