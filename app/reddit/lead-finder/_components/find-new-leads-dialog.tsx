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
import { useOrganization } from "@/components/utilities/organization-provider"
import { generateKeywordsAction } from "@/actions/lead-generation/keywords-actions"
import { runLeadGenerationWorkflowWithLimitsAction } from "@/actions/lead-generation/workflow-actions"
import CustomizeKeywordsDialog from "./dashboard/customize-keywords-dialog"

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
  const { currentOrganization } = useOrganization()
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([])
  const [customKeyword, setCustomKeyword] = useState("")
  const [postsPerKeyword, setPostsPerKeyword] = useState("10")
  const [aiRefinement, setAiRefinement] = useState("")
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false)
  const [isFindingLeads, setIsFindingLeads] = useState(false)
  const [showAiInput, setShowAiInput] = useState(false)
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false)

  // Load suggested keywords when dialog opens
  useEffect(() => {
    if (open && suggestedKeywords.length === 0) {
      loadSuggestedKeywords()
    }
  }, [open])

  const loadSuggestedKeywords = async () => {
    setIsGeneratingKeywords(true)
    try {
      if (!currentOrganization) {
        toast.error("No organization selected")
        return
      }

      if (!currentOrganization.website) {
        toast.error("Organization website not found")
        return
      }

      // Generate keywords excluding current ones
      const refinement =
        currentKeywords.length > 0
          ? `Do not suggest these existing keywords: ${currentKeywords.join(", ")}`
          : ""

      const keywordsResult = await generateKeywordsAction({
        website: currentOrganization.website,
        refinement: refinement,
        organizationId: currentOrganization.id
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
      if (!currentOrganization) {
        toast.error("No organization selected")
        return
      }

      if (!currentOrganization.website) {
        toast.error("Organization website not found")
        return
      }

      // Generate keywords with custom refinement
      const refinement = `${aiRefinement}. Do not suggest these existing keywords: ${currentKeywords.join(", ")}`

      const keywordsResult = await generateKeywordsAction({
        website: currentOrganization.website,
        refinement: refinement,
        organizationId: currentOrganization.id
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
    console.log("🔍🔍🔍 [FIND-NEW-LEADS] ========== START FIND LEADS ==========")
    console.log("🔍🔍🔍 [FIND-NEW-LEADS] Selected keywords:", selectedKeywords)
    console.log("🔍🔍🔍 [FIND-NEW-LEADS] Posts per keyword:", postsPerKeyword)
    console.log("🔍🔍🔍 [FIND-NEW-LEADS] Campaign ID:", campaignId)
    console.log("🔍🔍🔍 [FIND-NEW-LEADS] User ID:", userId)
    console.log("🔍🔍🔍 [FIND-NEW-LEADS] Organization:", currentOrganization?.id)
    console.log("🔍🔍🔍 [FIND-NEW-LEADS] Current campaign keywords:", currentKeywords)

    if (selectedKeywords.length === 0) {
      console.log("🔍🔍🔍 [FIND-NEW-LEADS] ❌ No keywords selected")
      toast.error("Please select at least one keyword")
      return
    }

    if (!campaignId) {
      console.log("🔍🔍🔍 [FIND-NEW-LEADS] ❌ No campaign ID")
      toast.error("No campaign selected")
      return
    }

    setIsFindingLeads(true)
    // Close the dialog right away so the user isn't stuck waiting while the
    // backend workflow spins up. This provides instant feedback that their
    // request was accepted.
    onOpenChange(false)
    try {
      // First, update the campaign with all keywords (existing + new)
      const allKeywords = [...new Set([...currentKeywords, ...selectedKeywords])]
      console.log("🔍🔍🔍 [FIND-NEW-LEADS] Updating campaign with all keywords:", allKeywords)
      
      const { updateCampaignAction } = await import("@/actions/db/campaign-actions")
      const updateResult = await updateCampaignAction(campaignId, {
        keywords: allKeywords
      })
      
      if (!updateResult.isSuccess) {
        console.log("🔍🔍🔍 [FIND-NEW-LEADS] ❌ Failed to update campaign keywords")
        throw new Error("Failed to update campaign keywords")
      }
      
      console.log("🔍🔍🔍 [FIND-NEW-LEADS] ✅ Campaign keywords updated successfully")
      
      // Create keyword limits object
      const keywordLimits: Record<string, number> = {}
      selectedKeywords.forEach(keyword => {
        keywordLimits[keyword] = parseInt(postsPerKeyword)
      })

      console.log("🔍🔍🔍 [FIND-NEW-LEADS] Keyword limits object:", keywordLimits)
      console.log("🔍🔍🔍 [FIND-NEW-LEADS] Calling runLeadGenerationWorkflowWithLimitsAction...")

      const result = await runLeadGenerationWorkflowWithLimitsAction(
        campaignId,
        keywordLimits
      )

      console.log("🔍🔍🔍 [FIND-NEW-LEADS] Workflow result received:", {
        isSuccess: result.isSuccess,
        message: result.message,
        hasData: !!result.data
      })

      if (result.data) {
        console.log("🔍🔍🔍 [FIND-NEW-LEADS] Workflow data:", {
          currentStep: result.data.currentStep,
          totalSteps: result.data.totalSteps,
          completedSteps: result.data.completedSteps,
          isComplete: result.data.isComplete,
          error: result.data.error,
          resultsCount: result.data.results?.length || 0
        })

        if (result.data.results) {
          result.data.results.forEach((r, i) => {
            console.log(`🔍🔍🔍 [FIND-NEW-LEADS] Step ${i + 1}:`, {
              step: r.step,
              success: r.success,
              message: r.message,
              hasData: !!r.data
            })
          })
        }
      }

      if (result.isSuccess) {
        const totalPosts = Object.values(keywordLimits).reduce(
          (a, b) => a + b,
          0
        )
        console.log("🔍🔍🔍 [FIND-NEW-LEADS] ✅ Success! Total posts to find:", totalPosts)
        toast.success(`Finding up to ${totalPosts} new leads!`, {
          description: "New leads will appear as they're discovered"
        })
        
        console.log("🔍🔍🔍 [FIND-NEW-LEADS] Calling onSuccess callback...")
        onSuccess?.()
        
        // Reset any local state (component may already be unmounted, so guard)
        setIsFindingLeads(false)
        setSelectedKeywords([])
        setSuggestedKeywords([])
        setCustomKeyword("")
      } else {
        console.log("🔍🔍🔍 [FIND-NEW-LEADS] ❌ Workflow failed:", result.message)
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("🔍🔍🔍 [FIND-NEW-LEADS] ❌ Error finding leads:", error)
      console.error("🔍🔍🔍 [FIND-NEW-LEADS] Error type:", typeof error)
      console.error("🔍🔍🔍 [FIND-NEW-LEADS] Error message:", error instanceof Error ? error.message : "Unknown error")
      console.error("🔍🔍🔍 [FIND-NEW-LEADS] Error stack:", error instanceof Error ? error.stack : "No stack trace")
      toast.error("Failed to start lead generation")
    } finally {
      console.log("🔍🔍🔍 [FIND-NEW-LEADS] Setting loading state to false...")
      setIsFindingLeads(false)
      console.log("🔍🔍🔍 [FIND-NEW-LEADS] ========== END FIND LEADS ==========")
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

  // Add force close handler for emergency exit
  const handleForceClose = () => {
    console.log("🔍🔍🔍 [FIND-NEW-LEADS] Force closing dialog")
    // Reset all states
    setIsFindingLeads(false)
    setIsGeneratingKeywords(false)
    setSelectedKeywords([])
    setSuggestedKeywords([])
    setCustomKeyword("")
    setAiRefinement("")
    setShowAiInput(false)
    onOpenChange(false)
  }

  // Add timeout to prevent stuck loading state
  useEffect(() => {
    if (isFindingLeads) {
      const timeout = setTimeout(() => {
        console.error("🔍🔍🔍 [FIND-NEW-LEADS] Timeout: Resetting loading state after 30 seconds")
        setIsFindingLeads(false)
        toast.error("Lead generation is taking longer than expected. You can close this dialog and check back later.")
      }, 30000) // 30 second timeout

      return () => clearTimeout(timeout)
    }
  }, [isFindingLeads])

  const handleCustomizeWithAI = () => {
    setShowCustomizeDialog(true)
  }

  const handleKeywordsGenerated = (keywords: string[]) => {
    setSuggestedKeywords(keywords)
    setSelectedKeywords(keywords.slice(0, 3)) // Pre-select first 3
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(newOpen) => {
        if (!newOpen) {
          // If trying to close, use force close if loading
          if (isFindingLeads || isGeneratingKeywords) {
            handleForceClose()
          } else {
            handleClose()
          }
        } else {
          onOpenChange(newOpen)
        }
      }}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="size-5 text-blue-600" />
              Find New Leads
            </DialogTitle>
            <DialogDescription>
              Select keywords to search for new Reddit discussions. Your
              existing leads will be preserved.
            </DialogDescription>
          </DialogHeader>

          <div className="-mx-6 flex-1 space-y-6 overflow-y-auto px-6 py-4">
            {/* Current Keywords Info */}
            {currentKeywords.length > 0 && (
              <Alert>
                <Info className="size-4" />
                <AlertDescription>
                  <strong>Current keywords:</strong>{" "}
                  {currentKeywords.join(", ")}
                  <br />
                  <span className="text-muted-foreground mt-1 text-xs">
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
              <Select
                value={postsPerKeyword}
                onValueChange={setPostsPerKeyword}
              >
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
              <p className="text-muted-foreground text-xs">
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
                  onClick={handleCustomizeWithAI}
                  disabled={isGeneratingKeywords}
                >
                  <Sparkles className="mr-2 size-3" />
                  Customize with AI
                </Button>
              </div>

              {showAiInput && (
                <Textarea
                  placeholder="e.g., Focus on keywords related to vacation planning, exclude business travel..."
                  value={aiRefinement}
                  onChange={e => setAiRefinement(e.target.value)}
                  className="min-h-[80px]"
                  disabled={isGeneratingKeywords}
                />
              )}

              {isGeneratingKeywords ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-blue-600" />
                  <span className="text-muted-foreground ml-2 text-sm">
                    Generating keyword suggestions...
                  </span>
                </div>
              ) : suggestedKeywords.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {suggestedKeywords.map(keyword => (
                      <Badge
                        key={keyword}
                        variant={
                          selectedKeywords.includes(keyword)
                            ? "default"
                            : "outline"
                        }
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
                  <p className="text-muted-foreground text-xs">
                    Click keywords to select/deselect them
                  </p>
                </div>
              ) : (
                <div className="text-muted-foreground py-4 text-center text-sm">
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
                  onChange={e => setCustomKeyword(e.target.value)}
                  onKeyPress={e => {
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
                  <strong>Ready to score threads:</strong>{" "}
                  {selectedKeywords.length} keywords × {postsPerKeyword} posts =
                  up to {selectedKeywords.length * parseInt(postsPerKeyword)}{" "}
                  threads
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (isFindingLeads || isGeneratingKeywords) {
                  handleForceClose()
                } else {
                  handleClose()
                }
              }}
              disabled={false}
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
                  Score {selectedKeywords.length *
                    parseInt(postsPerKeyword)}{" "}
                  Threads
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomizeKeywordsDialog
        open={showCustomizeDialog}
        onOpenChange={setShowCustomizeDialog}
        userId={userId}
        currentKeywords={currentKeywords}
        onKeywordsGenerated={handleKeywordsGenerated}
      />
    </>
  )
}
