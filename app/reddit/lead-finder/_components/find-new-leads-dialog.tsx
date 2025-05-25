"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  X,
  Plus,
  Loader2,
  Search,
  Sparkles,
  AlertCircle,
  Hash,
  Target,
  Info
} from "lucide-react"
import { toast } from "sonner"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { generateKeywordsAction } from "@/actions/lead-generation/keywords-actions"
import { runLeadGenerationWorkflowWithLimitsAction } from "@/actions/lead-generation/workflow-actions"

interface FindNewLeadsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  campaignId: string
  currentKeywords: string[]
  onSuccess?: () => void
}

export default function FindNewLeadsDialog({
  open,
  onOpenChange,
  userId,
  campaignId,
  currentKeywords,
  onSuccess
}: FindNewLeadsDialogProps) {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([])
  const [customKeyword, setCustomKeyword] = useState("")
  const [postsPerKeyword, setPostsPerKeyword] = useState("10")
  const [aiRefinement, setAiRefinement] = useState("")
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false)
  const [isFindingLeads, setIsFindingLeads] = useState(false)
  const [showAiInput, setShowAiInput] = useState(false)

  // Load suggested keywords when dialog opens
  useEffect(() => {
    if (open && suggestedKeywords.length === 0) {
      loadSuggestedKeywords()
    }
  }, [open])

  const loadSuggestedKeywords = async () => {
    setIsGeneratingKeywords(true)
    try {
      const profileResult = await getProfileByUserIdAction(userId)
      if (!profileResult.isSuccess || !profileResult.data) {
        toast.error("Failed to load profile")
        return
      }

      // Generate keywords excluding current ones
      const refinement = currentKeywords.length > 0 
        ? `Do not suggest these existing keywords: ${currentKeywords.join(", ")}`
        : ""

      const keywordsResult = await generateKeywordsAction({
        website: profileResult.data.website || "",
        refinement: refinement
      })

      if (keywordsResult.isSuccess) {
        // Filter out any keywords that already exist
        const newKeywords = keywordsResult.data.keywords.filter(
          (keyword: string) => !currentKeywords.includes(keyword)
        )
        setSuggestedKeywords(newKeywords)
        // Pre-select the first 3 keywords
        setSelectedKeywords(newKeywords.slice(0, 3))
      }
    } catch (error) {
      console.error("Error generating keywords:", error)
      toast.error("Failed to generate keyword suggestions")
    } finally {
      setIsGeneratingKeywords(false)
    }
  }

  const regenerateKeywords = async () => {
    if (!aiRefinement.trim() && !showAiInput) {
      setShowAiInput(true)
      return
    }

    setIsGeneratingKeywords(true)
    try {
      const profileResult = await getProfileByUserIdAction(userId)
      if (!profileResult.isSuccess || !profileResult.data) {
        toast.error("Failed to load profile")
        return
      }

      // Generate keywords with custom refinement
      const refinement = `${aiRefinement}. Do not suggest these existing keywords: ${currentKeywords.join(", ")}`

      const keywordsResult = await generateKeywordsAction({
        website: profileResult.data.website || "",
        refinement: refinement
      })

      if (keywordsResult.isSuccess) {
        const newKeywords = keywordsResult.data.keywords.filter(
          (keyword: string) => !currentKeywords.includes(keyword)
        )
        setSuggestedKeywords(newKeywords)
        setSelectedKeywords([])
        setAiRefinement("")
        setShowAiInput(false)
      }
    } catch (error) {
      console.error("Error regenerating keywords:", error)
      toast.error("Failed to regenerate keywords")
    } finally {
      setIsGeneratingKeywords(false)
    }
  }

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords(prev =>
      prev.includes(keyword)
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword]
    )
  }

  const addCustomKeyword = () => {
    const trimmed = customKeyword.trim()
    if (
      trimmed &&
      !currentKeywords.includes(trimmed) &&
      !suggestedKeywords.includes(trimmed)
    ) {
      setSuggestedKeywords(prev => [...prev, trimmed])
      setSelectedKeywords(prev => [...prev, trimmed])
      setCustomKeyword("")
    }
  }

  const handleFindLeads = async () => {
    if (selectedKeywords.length === 0) {
      toast.error("Please select at least one keyword")
      return
    }

    setIsFindingLeads(true)
    try {
      // Create keyword limits object
      const keywordLimits: Record<string, number> = {}
      selectedKeywords.forEach(keyword => {
        keywordLimits[keyword] = parseInt(postsPerKeyword)
      })

      console.log("🔍 Finding leads with limits:", keywordLimits)

      const result = await runLeadGenerationWorkflowWithLimitsAction(
        campaignId,
        keywordLimits
      )

      if (result.isSuccess) {
        const totalPosts = Object.values(keywordLimits).reduce((a, b) => a + b, 0)
        toast.success(`Finding up to ${totalPosts} new leads!`, {
          description: "New leads will appear as they're discovered"
        })
        onSuccess?.()
        onOpenChange(false)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("Error finding leads:", error)
      toast.error("Failed to start lead generation")
    } finally {
      setIsFindingLeads(false)
    }
  }

  const handleClose = () => {
    if (!isFindingLeads && !isGeneratingKeywords) {
      onOpenChange(false)
      // Reset state
      setSelectedKeywords([])
      setSuggestedKeywords([])
      setCustomKeyword("")
      setAiRefinement("")
      setShowAiInput(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="size-5 text-blue-600" />
            Find New Leads
          </DialogTitle>
          <DialogDescription>
            Select keywords to search for new Reddit discussions. Your existing leads will be preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Keywords Info */}
          {currentKeywords.length > 0 && (
            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                <strong>Current keywords:</strong> {currentKeywords.join(", ")}
                <br />
                <span className="text-xs text-muted-foreground mt-1">
                  New leads will be added to your existing collection
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Posts per keyword selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Hash className="size-4" />
              Posts per keyword
            </Label>
            <Select value={postsPerKeyword} onValueChange={setPostsPerKeyword}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 posts</SelectItem>
                <SelectItem value="25">25 posts</SelectItem>
                <SelectItem value="50">50 posts</SelectItem>
                <SelectItem value="100">100 posts</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How many Reddit posts to analyze for each keyword
            </p>
          </div>

          {/* Suggested Keywords */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Target className="size-4" />
                Suggested Keywords
              </Label>
              <Button
                size="sm"
                variant="outline"
                onClick={regenerateKeywords}
                disabled={isGeneratingKeywords}
              >
                <Sparkles className="mr-2 size-3" />
                {showAiInput ? "Regenerate" : "Customize with AI"}
              </Button>
            </div>

            {showAiInput && (
              <Textarea
                placeholder="e.g., Focus on keywords related to vacation planning, exclude business travel..."
                value={aiRefinement}
                onChange={(e) => setAiRefinement(e.target.value)}
                className="min-h-[80px]"
                disabled={isGeneratingKeywords}
              />
            )}

            {isGeneratingKeywords ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Generating keyword suggestions...
                </span>
              </div>
            ) : suggestedKeywords.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {suggestedKeywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant={selectedKeywords.includes(keyword) ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() => toggleKeyword(keyword)}
                    >
                      {keyword}
                      {selectedKeywords.includes(keyword) && (
                        <X className="ml-1 size-3" />
                      )}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click keywords to select/deselect them
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No keyword suggestions available
              </div>
            )}
          </div>

          {/* Add Custom Keyword */}
          <div className="space-y-2">
            <Label>Add Custom Keyword</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., budget travel tips"
                value={customKeyword}
                onChange={(e) => setCustomKeyword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addCustomKeyword()
                  }
                }}
                disabled={isFindingLeads}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCustomKeyword}
                disabled={!customKeyword.trim() || isFindingLeads}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          {/* Summary */}
          {selectedKeywords.length > 0 && (
            <Alert>
              <AlertCircle className="size-4" />
              <AlertDescription>
                <strong>Ready to find leads:</strong> {selectedKeywords.length} keywords × {postsPerKeyword} posts = up to {selectedKeywords.length * parseInt(postsPerKeyword)} new leads
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isFindingLeads || isGeneratingKeywords}
          >
            Cancel
          </Button>
          <Button
            onClick={handleFindLeads}
            disabled={
              selectedKeywords.length === 0 ||
              isFindingLeads ||
              isGeneratingKeywords
            }
            className="gap-2"
          >
            {isFindingLeads ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Finding Leads...
              </>
            ) : (
              <>
                <Search className="size-4" />
                Find {selectedKeywords.length * parseInt(postsPerKeyword)} Leads
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 