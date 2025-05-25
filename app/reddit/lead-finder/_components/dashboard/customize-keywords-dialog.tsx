"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Sparkles, Info, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { generateKeywordsAction } from "@/actions/lead-generation/keywords-actions"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"

interface CustomizeKeywordsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  currentKeywords: string[]
  onKeywordsGenerated: (keywords: string[]) => void
}

export default function CustomizeKeywordsDialog({
  open,
  onOpenChange,
  userId,
  currentKeywords,
  onKeywordsGenerated
}: CustomizeKeywordsDialogProps) {
  const [refinementInstructions, setRefinementInstructions] = useState("")
  const [keywordCount, setKeywordCount] = useState("10")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!refinementInstructions.trim()) {
      toast.error("Please provide instructions for keyword generation")
      return
    }

    setIsGenerating(true)
    try {
      // Get user profile for website content
      const profileResult = await getProfileByUserIdAction(userId)
      if (!profileResult.isSuccess || !profileResult.data) {
        toast.error("Failed to load profile")
        return
      }

      // Build refinement with all context
      const fullRefinement = `
        ${refinementInstructions}
        
        Generate exactly ${keywordCount} keywords.
        
        Current keywords to avoid duplicating: ${currentKeywords.join(", ")}
        
        Business context:
        - Name: ${profileResult.data.name || ""}
        - Website: ${profileResult.data.website || ""}
      `.trim()

      console.log("🎯 Generating keywords with refinement:", fullRefinement)

      const result = await generateKeywordsAction({
        website: profileResult.data.website || "",
        refinement: fullRefinement
      })

      if (result.isSuccess) {
        // Filter out any existing keywords
        const newKeywords = result.data.keywords.filter(
          (keyword: string) => !currentKeywords.includes(keyword)
        )
        
        // Ensure we have the requested count
        const finalKeywords = newKeywords.slice(0, parseInt(keywordCount))
        
        onKeywordsGenerated(finalKeywords)
        toast.success(`Generated ${finalKeywords.length} new keywords!`)
        onOpenChange(false)
        
        // Reset form
        setRefinementInstructions("")
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("Error generating keywords:", error)
      toast.error("Failed to generate keywords")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-blue-600" />
            Customize AI Keywords
          </DialogTitle>
          <DialogDescription>
            Tell the AI how to refine your keyword suggestions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Keywords Info */}
          {currentKeywords.length > 0 && (
            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                <strong>Current keywords:</strong> {currentKeywords.join(", ")}
              </AlertDescription>
            </Alert>
          )}

          {/* Refinement Instructions */}
          <div className="space-y-2">
            <Label>What would you like to change?</Label>
            <Textarea
              placeholder="Examples:
• Focus more on luxury weddings and honeymoons
• Make keywords shorter and more specific
• Target budget-conscious travelers
• Include seasonal activities like surfing
• Focus on family-friendly resorts"
              value={refinementInstructions}
              onChange={(e) => setRefinementInstructions(e.target.value)}
              className="min-h-[120px]"
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Be specific about your target audience or niche
            </p>
          </div>

          {/* Keyword Count Selector */}
          <div className="space-y-2">
            <Label>How many keywords?</Label>
            <Select value={keywordCount} onValueChange={setKeywordCount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 keywords</SelectItem>
                <SelectItem value="10">10 keywords</SelectItem>
                <SelectItem value="15">15 keywords</SelectItem>
                <SelectItem value="20">20 keywords</SelectItem>
                <SelectItem value="30">30 keywords</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              More keywords = wider reach but may be less targeted
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !refinementInstructions.trim()}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generate Keywords
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 