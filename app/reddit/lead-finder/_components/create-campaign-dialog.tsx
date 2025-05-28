"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  X,
  Plus,
  Loader2,
  Globe,
  Search,
  Target,
  Sparkles,
  Building2,
  Info,
  ExternalLink,
  MessageSquare,
  Hash
} from "lucide-react"
import { createCampaignAction } from "@/actions/db/campaign-actions"
import { runLeadGenerationWorkflowWithLimitsAction } from "@/actions/lead-generation/workflow-actions"
import { generateCampaignNameAction } from "@/actions/lead-generation/campaign-name-actions"
import { toast } from "sonner"
import { useUser } from "@clerk/nextjs"
import { generateKeywordsAction } from "@/actions/lead-generation/keywords-actions"
import { scrapeWebsiteAction } from "@/actions/integrations/firecrawl/website-scraping-actions"
import { normalizeUrl, isValidUrl } from "@/lib/utils"
import { useOrganization } from "@/components/utilities/organization-provider"
import { getKnowledgeBaseByOrganizationIdAction } from "@/actions/db/personalization-actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const campaignSchema = z.object({
  name: z
    .string()
    .min(1, "Campaign name is required")
    .max(100, "Name too long"),
  businessDescription: z.string().optional(),
  keywords: z
    .array(z.string())
    .min(1, "At least one keyword is required")
    .max(10, "Maximum 10 keywords allowed")
})

type CampaignForm = z.infer<typeof campaignSchema>

interface CreateCampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  organizationId?: string
}

export default function CreateCampaignDialog({
  open,
  onOpenChange,
  onSuccess,
  organizationId
}: CreateCampaignDialogProps) {
  const { user } = useUser()
  const { currentOrganization } = useOrganization()
  const [currentKeyword, setCurrentKeyword] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false)
  const [generationStep, setGenerationStep] = useState<
    "idle" | "scraping" | "generating"
  >("idle")
  const [organizationDescription, setOrganizationDescription] =
    useState<string>("")
  const [hasLoadedOrgData, setHasLoadedOrgData] = useState(false)
  const [keywordCount, setKeywordCount] = useState(5)
  const [threadsPerKeyword, setThreadsPerKeyword] = useState(10)
  const [redditConnected, setRedditConnected] = useState<boolean | null>(null)
  const [keywordInstructions, setKeywordInstructions] = useState("")

  const form = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      businessDescription: "",
      keywords: []
    }
  })

  const keywordsForm = form.watch("keywords")
  const businessDescriptionForm = form.watch("businessDescription")

  // Check Reddit connection status
  useEffect(() => {
    const checkRedditConnection = async () => {
      if (!organizationId || !open) return
      
      try {
        const { getCurrentOrganizationTokens } = await import(
          "@/actions/integrations/reddit/reddit-auth-helpers"
        )
        const tokenResult = await getCurrentOrganizationTokens(organizationId)
        const isConnected =
          tokenResult.isSuccess && !!tokenResult.data.accessToken
        setRedditConnected(isConnected)
      } catch (error) {
        console.error("Error checking Reddit connection:", error)
        setRedditConnected(false)
      }
    }

    checkRedditConnection()
  }, [organizationId, open])

  // Load organization data when dialog opens
  useEffect(() => {
    const loadOrganizationData = async () => {
      if (!open || hasLoadedOrgData || !organizationId || !currentOrganization)
        return

      try {
        console.log("🏢 [CREATE-CAMPAIGN] Loading organization data")

        // Build comprehensive business description from organization data
        let fullDescription = ""

        if (currentOrganization.businessDescription) {
          fullDescription = currentOrganization.businessDescription
        }

        // Try to get knowledge base for additional context
        const kbResult =
          await getKnowledgeBaseByOrganizationIdAction(organizationId)
        if (kbResult.isSuccess && kbResult.data) {
          if (kbResult.data.summary) {
            fullDescription += fullDescription
              ? `\n\n${kbResult.data.summary}`
              : kbResult.data.summary
          }
          if (kbResult.data.customInformation) {
            fullDescription += fullDescription
              ? `\n\n${kbResult.data.customInformation}`
              : kbResult.data.customInformation
          }
        }

        setOrganizationDescription(fullDescription)
        setHasLoadedOrgData(true)

        console.log(
          "🏢 [CREATE-CAMPAIGN] Organization data loaded successfully"
        )
      } catch (error) {
        console.error(
          "❌ [CREATE-CAMPAIGN] Error loading organization data:",
          error
        )
      }
    }

    loadOrganizationData()
  }, [open, organizationId, currentOrganization, hasLoadedOrgData])

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setHasLoadedOrgData(false)
      setOrganizationDescription("")
      setRedditConnected(null)
      setKeywordInstructions("")
    }
  }, [open])

  // Auto-generate campaign name when keywords change
  useEffect(() => {
    const generateName = async () => {
      if (
        keywordsForm.length > 0 &&
        (organizationDescription || businessDescriptionForm) &&
        !form.getValues("name")
      ) {
        setIsGeneratingKeywords(true)
        try {
          const nameResult = await generateCampaignNameAction({
            keywords: keywordsForm,
            website: currentOrganization?.website || undefined,
            businessDescription:
              businessDescriptionForm || organizationDescription || undefined,
            businessName:
              currentOrganization?.name || user?.fullName || undefined
          })

          if (nameResult.isSuccess) {
            form.setValue("name", nameResult.data)
          }
        } catch (error) {
          console.error("Error generating campaign name:", error)
        } finally {
          setIsGeneratingKeywords(false)
        }
      }
    }

    const timer = setTimeout(generateName, 500) // Debounce
    return () => clearTimeout(timer)
  }, [
    keywordsForm,
    businessDescriptionForm,
    organizationDescription,
    currentOrganization,
    user?.fullName,
    form
  ])

  const handleAddKeyword = () => {
    const keywords = form.getValues("keywords")
    if (currentKeyword.trim() && keywords.length < 10) {
      form.setValue("keywords", [...keywords, currentKeyword.trim()])
      setCurrentKeyword("")
    }
  }

  const handleRemoveKeyword = (index: number) => {
    const keywords = form.getValues("keywords")
    form.setValue(
      "keywords",
      keywords.filter((_, i) => i !== index)
    )
  }

  const handleGenerateWithAI = async () => {
    const businessDescription = form.getValues("businessDescription")

    // Use organization description as fallback
    const effectiveDescription =
      businessDescription?.trim() || organizationDescription
    const website = currentOrganization?.website

    if (!website?.trim() && !effectiveDescription) {
      toast.error(
        "Organization data is missing. Please update your organization profile."
      )
      return
    }

    if (!currentOrganization) {
      toast.error("No organization selected")
      return
    }

    setIsGeneratingKeywords(true)
    setGenerationStep(website ? "scraping" : "generating")

    try {
      let contentForKeywords = effectiveDescription || ""

      if (website) {
        // Step 1: Scrape the website
        console.log("🌐 Scraping website:", website)
        const scrapeResult = await scrapeWebsiteAction(website)

        if (!scrapeResult.isSuccess) {
          throw new Error("Failed to analyze website")
        }

        contentForKeywords =
          scrapeResult.data.content || effectiveDescription || ""
      }

      // Step 2: Generate keywords
      setGenerationStep("generating")
      console.log("🎯 Generating keywords from content")

      const keywordsResult = await generateKeywordsAction({
        website: website || undefined,
        businessDescription: contentForKeywords || effectiveDescription,
        refinement: keywordInstructions.trim() 
          ? `Generate ${keywordCount} diverse keywords for finding potential customers on Reddit. ${keywordInstructions}`
          : `Generate ${keywordCount} diverse keywords for finding potential customers on Reddit`,
        organizationId: currentOrganization.id
      })

      if (keywordsResult.isSuccess) {
        // Check if we should replace or append keywords
        const currentKeywords = form.getValues("keywords")
        
        // If we have instructions and existing keywords, ask if they want to replace
        if (keywordInstructions.trim() && currentKeywords.length > 0) {
          // Replace existing keywords when regenerating with new instructions
          form.setValue("keywords", keywordsResult.data.keywords.slice(0, keywordCount))
          toast.success(`Regenerated ${keywordCount} keywords with your instructions!`)
        } else {
          // Add generated keywords (up to remaining slots)
          const remainingSlots = 10 - currentKeywords.length
          const newKeywords = keywordsResult.data.keywords.slice(
            0,
            Math.min(remainingSlots, keywordCount)
          )
          form.setValue("keywords", [...currentKeywords, ...newKeywords])
          toast.success(`Generated ${newKeywords.length} keywords!`)
        }
      } else {
        throw new Error("Failed to generate keywords")
      }
    } catch (error) {
      console.error("Error generating keywords:", error)
      toast.error("Failed to generate keywords")
    } finally {
      setIsGeneratingKeywords(false)
      setGenerationStep("idle")
    }
  }

  const onSubmit = async (data: CampaignForm) => {
    setIsCreating(true)

    try {
      if (!user?.id) {
        toast.error("Please sign in to create a campaign")
        return
      }

      if (!organizationId) {
        toast.error("Please select an organization first")
        return
      }

      // Normalize website URL if provided (use org website)
      const normalizedWebsite = currentOrganization?.website?.trim()
        ? normalizeUrl(currentOrganization.website.trim())
        : undefined

      // Use campaign-specific description if provided, otherwise use organization description
      const effectiveDescription =
        data.businessDescription?.trim() || organizationDescription

      // Create the campaign
      const campaignResult = await createCampaignAction({
        userId: user.id,
        organizationId: organizationId,
        name: data.name,
        website: normalizedWebsite,
        businessDescription: effectiveDescription || undefined,
        keywords: data.keywords
      })

      if (!campaignResult.isSuccess || !campaignResult.data) {
        throw new Error(campaignResult.message || "Failed to create campaign")
      }

      // Close the dialog immediately after creating campaign
      toast.success("Lead search created! Starting lead generation...")
      onSuccess?.()
      onOpenChange(false)

      // Reset form
      form.reset()

      // Run the lead generation workflow in the background
      runLeadGenerationWorkflowWithLimitsAction(
        campaignResult.data.id,
        // Create keyword limits object with the same limit for all keywords
        data.keywords.reduce((acc, keyword) => {
          acc[keyword] = threadsPerKeyword
          return acc
        }, {} as Record<string, number>)
      )
        .then(workflowResult => {
          if (workflowResult.isSuccess) {
            const progress = workflowResult.data
            const commentsGenerated =
              progress.results.find(
                r => r.step === "Score and Generate Comments"
              )?.data?.commentsGenerated || 0

            if (commentsGenerated > 0) {
              toast.success(
                `Lead generation complete! Found ${commentsGenerated} potential leads.`
              )
            } else {
              toast.warning(
                "Lead generation complete but no leads were found. Try different keywords."
              )
            }
          } else {
            toast.error(`Lead generation failed: ${workflowResult.message}`)
          }
        })
        .catch(error => {
          console.error("Workflow error:", error)
          toast.error(
            "Lead generation encountered an error. Please check the dashboard."
          )
        })
    } catch (error) {
      console.error("Error creating campaign:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to create campaign"
      )
      setIsCreating(false)
    }
  }

  const keywords = form.watch("keywords")
  const estimatedThreads = keywords.length * threadsPerKeyword

  // Debug form state
  useEffect(() => {
    console.log("🔍 Form State Debug:", {
      isValid: form.formState.isValid,
      errors: form.formState.errors,
      values: form.getValues(),
      isDirty: form.formState.isDirty
    })
  }, [form.formState.isValid, form.formState.errors, form.formState.isDirty])

  // Check if form should be submittable
  const canSubmit =
    keywords.length > 0 &&
    form.getValues("name").trim().length > 0 &&
    !isCreating &&
    redditConnected === true

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Lead Search</DialogTitle>
          <DialogDescription>
            Set up a new lead search to find potential customers on Reddit.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="-mx-6 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {/* Check Reddit connection first */}
              {redditConnected === false && (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                  <MessageSquare className="size-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="space-y-3">
                    <div>
                      <strong className="text-amber-900 dark:text-amber-100">
                        Reddit Connection Required
                      </strong>
                      <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                        You need to connect a Reddit account to your organization before creating lead searches.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Set the organization ID cookie before redirecting
                        document.cookie = `reddit_auth_org_id=${organizationId}; path=/; max-age=600; samesite=lax${window.location.protocol === 'https:' ? '; secure' : ''}`
                        // Redirect to Reddit auth with return URL back to lead finder
                        window.location.href = "/api/reddit/auth?return_url=/reddit/lead-finder"
                      }}
                      className="gap-2 border-amber-600 text-amber-700 hover:bg-amber-100 dark:border-amber-400 dark:text-amber-300 dark:hover:bg-amber-900/30"
                    >
                      <ExternalLink className="size-3" />
                      Connect Reddit Account
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Show organization info if available */}
              {currentOrganization && (
                <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
                  <Info className="size-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription>
                    <strong className="text-blue-900 dark:text-blue-100">
                      Using organization:
                    </strong>{" "}
                    <span className="text-blue-800 dark:text-blue-200">
                      {currentOrganization.name}
                    </span>
                    {currentOrganization.website && (
                      <span className="mt-1 block text-xs text-blue-600 dark:text-blue-400">
                        {currentOrganization.website}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="e.g., Q1 2024 Lead Search"
                          {...field}
                          disabled={isCreating}
                        />
                        {isGeneratingKeywords && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <Loader2 className="size-4 animate-spin text-gray-400" />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      {isGeneratingKeywords
                        ? "AI is generating a search name based on your keywords..."
                        : "Give your lead search a descriptive name."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Optional campaign-specific description */}
              <FormField
                control={form.control}
                name="businessDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="size-4" />
                      Campaign-Specific Details
                      <span className="text-muted-foreground text-xs font-normal">
                        (Optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any campaign-specific details, target audience, or special focus areas for this search..."
                        className="min-h-[80px] resize-none"
                        {...field}
                        disabled={isCreating}
                      />
                    </FormControl>
                    <FormDescription>
                      Only add details specific to this campaign. Your
                      organization's description is already included.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Search className="size-4" />
                      Search Keywords
                    </FormLabel>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., software developer hiring"
                          value={currentKeyword}
                          onChange={e => setCurrentKeyword(e.target.value)}
                          onKeyPress={e => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleAddKeyword()
                            }
                          }}
                          disabled={isCreating || field.value.length >= 10}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddKeyword}
                          disabled={
                            !currentKeyword.trim() ||
                            field.value.length >= 10 ||
                            isCreating
                          }
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>

                      {/* Posts per keyword selector - moved up for better visibility */}
                      {keywords.length === 0 && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Hash className="size-4" />
                            Posts per keyword
                          </Label>
                          <Select
                            value={threadsPerKeyword.toString()}
                            onValueChange={(value) => setThreadsPerKeyword(parseInt(value))}
                            disabled={isCreating}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5 posts per keyword</SelectItem>
                              <SelectItem value="10">10 posts per keyword (Recommended)</SelectItem>
                              <SelectItem value="15">15 posts per keyword</SelectItem>
                              <SelectItem value="20">20 posts per keyword</SelectItem>
                              <SelectItem value="25">25 posts per keyword</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-muted-foreground text-xs">
                            How many Reddit posts to analyze for each keyword
                          </p>
                        </div>
                      )}

                      {/* AI Generation Button */}
                      <div className="space-y-3">
                        {/* AI Instructions Input */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            AI Instructions <span className="text-xs text-gray-500">(Optional)</span>
                          </label>
                          <Input
                            placeholder="e.g., include software terms, focus on enterprise customers..."
                            value={keywordInstructions}
                            onChange={e => setKeywordInstructions(e.target.value)}
                            disabled={isCreating || isGeneratingKeywords}
                            className="text-sm"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Add specific instructions to customize the AI-generated keywords
                          </p>
                        </div>

                        {/* Generation Controls */}
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={keywordCount}
                            onChange={e => {
                              const value = parseInt(e.target.value)
                              if (!isNaN(value) && value >= 1 && value <= 10) {
                                setKeywordCount(value)
                              }
                            }}
                            disabled={
                              field.value.length >= 10 ||
                              isGeneratingKeywords ||
                              isCreating
                            }
                            className="w-20"
                            placeholder="5"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleGenerateWithAI}
                            disabled={
                              !organizationDescription ||
                              field.value.length >= 10 ||
                              isGeneratingKeywords ||
                              isCreating
                            }
                            className="flex-1"
                          >
                            {isGeneratingKeywords ? (
                              <>
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                {generationStep === "scraping" ? (
                                  <>
                                    <Globe className="mr-2 size-4" />
                                    Scraping homepage...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="mr-2 size-4" />
                                    Generating keywords...
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 size-4" />
                                {field.value.length > 0 ? 'Regenerate' : 'Generate'} {keywordCount} {keywordCount === 1 ? 'keyword' : 'keywords'} with AI
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <FormDescription>
                      Keywords to search for on Reddit. We'll score threads
                      related to these terms. ({field.value.length}/10)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {keywords.length > 0 && (
                <div className="space-y-2">
                  <FormLabel>Selected Keywords</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {keyword}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(index)}
                          className="hover:text-destructive ml-1"
                          disabled={isCreating}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {keywords.length > 0 && (
                <div className="space-y-2">
                  <FormLabel>Search Configuration</FormLabel>
                  <div className="space-y-3">
                    {/* Posts per keyword selector */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Hash className="size-4" />
                        Posts per keyword
                      </Label>
                      <Select
                        value={threadsPerKeyword.toString()}
                        onValueChange={(value) => setThreadsPerKeyword(parseInt(value))}
                        disabled={isCreating}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 posts per keyword</SelectItem>
                          <SelectItem value="10">10 posts per keyword (Recommended)</SelectItem>
                          <SelectItem value="15">15 posts per keyword</SelectItem>
                          <SelectItem value="20">20 posts per keyword</SelectItem>
                          <SelectItem value="25">25 posts per keyword</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-muted-foreground text-xs">
                        How many Reddit posts to analyze for each keyword
                      </p>
                    </div>
                    
                    {/* Summary */}
                    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
                      <Target className="size-4 text-blue-600 dark:text-blue-400" />
                      <AlertDescription>
                        <strong className="text-blue-900 dark:text-blue-100">
                          Total threads to analyze:
                        </strong>{" "}
                        <span className="text-blue-800 dark:text-blue-200">
                          {estimatedThreads} threads
                        </span>
                        <span className="text-muted-foreground mt-1 block text-xs">
                          ({keywords.length} keywords × {threadsPerKeyword} posts each)
                        </span>
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-4 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating Lead Search...
                  </>
                ) : (
                  `Create & Find ${estimatedThreads} Threads`
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
