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
  Info
} from "lucide-react"
import { createCampaignAction } from "@/actions/db/campaign-actions"
import { runFullLeadGenerationWorkflowAction } from "@/actions/lead-generation/workflow-actions"
import { generateCampaignNameAction } from "@/actions/lead-generation/campaign-name-actions"
import { toast } from "sonner"
import { useUser } from "@clerk/nextjs"
import { generateKeywordsAction } from "@/actions/lead-generation/keywords-actions"
import { scrapeWebsiteAction } from "@/actions/integrations/firecrawl/website-scraping-actions"
import { normalizeUrl, isValidUrl } from "@/lib/utils"
import { useOrganization } from "@/components/utilities/organization-provider"
import { getKnowledgeBaseByOrganizationIdAction } from "@/actions/db/personalization-actions"
import { Alert, AlertDescription } from "@/components/ui/alert"

const campaignSchema = z
  .object({
    name: z
      .string()
      .min(1, "Campaign name is required")
      .max(100, "Name too long"),
    website: z.string().optional(),
    businessDescription: z.string().optional(),
    keywords: z
      .array(z.string())
      .min(1, "At least one keyword is required")
      .max(10, "Maximum 10 keywords allowed")
  })
  .superRefine((data, ctx) => {
    // Custom validation for website
    if (data.website && data.website.trim().length > 0) {
      // Normalize and validate URL
      const normalizedUrl = normalizeUrl(data.website)
      if (!isValidUrl(normalizedUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Please enter a valid website URL (e.g., example.com or https://example.com)",
          path: ["website"]
        })
      }
    }

    // Ensure either website or businessDescription is provided
    const hasWebsite = data.website && data.website.trim().length > 0
    const hasDescription =
      data.businessDescription && data.businessDescription.trim().length > 0

    if (!hasWebsite && !hasDescription) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either website or business description is required",
        path: ["businessDescription"]
      })
    }
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
  const { activeOrganization } = useOrganization()
  const [currentKeyword, setCurrentKeyword] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false)
  const [generationStep, setGenerationStep] = useState<
    "idle" | "scraping" | "generating"
  >("idle")
  const [organizationDescription, setOrganizationDescription] = useState<string>("")
  const [hasLoadedOrgData, setHasLoadedOrgData] = useState(false)

  const form = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      website: "",
      businessDescription: "",
      keywords: []
    }
  })

  const keywordsForm = form.watch("keywords")
  const websiteForm = form.watch("website")
  const businessDescriptionForm = form.watch("businessDescription")

  // Load organization data when dialog opens
  useEffect(() => {
    const loadOrganizationData = async () => {
      if (!open || hasLoadedOrgData || !organizationId || !activeOrganization) return
      
      try {
        console.log("🏢 [CREATE-CAMPAIGN] Loading organization data")
        
        // Set website from organization
        if (activeOrganization.website) {
          form.setValue("website", activeOrganization.website)
        }
        
        // Build comprehensive business description from organization data
        let fullDescription = ""
        
        if (activeOrganization.businessDescription) {
          fullDescription = activeOrganization.businessDescription
        }
        
        // Try to get knowledge base for additional context
        const kbResult = await getKnowledgeBaseByOrganizationIdAction(organizationId)
        if (kbResult.isSuccess && kbResult.data) {
          if (kbResult.data.summary) {
            fullDescription += fullDescription ? `\n\n${kbResult.data.summary}` : kbResult.data.summary
          }
          if (kbResult.data.customInformation) {
            fullDescription += fullDescription ? `\n\n${kbResult.data.customInformation}` : kbResult.data.customInformation
          }
        }
        
        setOrganizationDescription(fullDescription)
        setHasLoadedOrgData(true)
        
        console.log("🏢 [CREATE-CAMPAIGN] Organization data loaded successfully")
      } catch (error) {
        console.error("❌ [CREATE-CAMPAIGN] Error loading organization data:", error)
      }
    }
    
    loadOrganizationData()
  }, [open, organizationId, activeOrganization, hasLoadedOrgData, form])

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setHasLoadedOrgData(false)
      setOrganizationDescription("")
    }
  }, [open])

  // Auto-generate campaign name when keywords or website/description change
  useEffect(() => {
    const generateName = async () => {
      if (
        keywordsForm.length > 0 &&
        (websiteForm || businessDescriptionForm) &&
        !form.getValues("name")
      ) {
        setIsGeneratingKeywords(true)
        try {
          const nameResult = await generateCampaignNameAction({
            keywords: keywordsForm,
            website: websiteForm || undefined,
            businessDescription: businessDescriptionForm || undefined,
            businessName: user?.fullName || undefined
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
  }, [keywordsForm, websiteForm, businessDescriptionForm, user?.fullName, form])

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
    const website = form.getValues("website")
    const businessDescription = form.getValues("businessDescription")

    // Use organization description as fallback
    const effectiveDescription = businessDescription?.trim() || organizationDescription

    if (!website?.trim() && !effectiveDescription) {
      toast.error(
        "Please enter your website URL or describe your business first"
      )
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
        refinement:
          "Generate 10 diverse keywords for finding potential customers on Reddit"
      })

      if (keywordsResult.isSuccess) {
        // Add generated keywords (up to remaining slots)
        const currentKeywords = form.getValues("keywords")
        const remainingSlots = 10 - currentKeywords.length
        const newKeywords = keywordsResult.data.keywords.slice(
          0,
          remainingSlots
        )
        form.setValue("keywords", [...currentKeywords, ...newKeywords])
        toast.success(`Generated ${newKeywords.length} keywords!`)
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

      // Normalize website URL if provided
      const normalizedWebsite = data.website?.trim()
        ? normalizeUrl(data.website.trim())
        : undefined

      // Use campaign-specific description if provided, otherwise use organization description
      const effectiveDescription = data.businessDescription?.trim() || organizationDescription

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
      runFullLeadGenerationWorkflowAction(campaignResult.data.id)
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
  const estimatedThreads = keywords.length * 10

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
    (form.getValues("website")?.trim() ||
      form.getValues("businessDescription")?.trim() ||
      organizationDescription) &&
    !isCreating

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Lead Search</DialogTitle>
          <DialogDescription>
            Set up a new lead search to find potential customers on Reddit based
            on specific keywords.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            {/* Show organization info if available */}
            {activeOrganization && organizationDescription && (
              <Alert>
                <Info className="size-4" />
                <AlertDescription>
                  <strong>Using organization profile:</strong> {activeOrganization.name}
                  {activeOrganization.website && (
                    <span className="text-muted-foreground block text-xs mt-1">
                      Website: {activeOrganization.website}
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
                  <FormLabel>Search Name</FormLabel>
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
                      : "Give your lead search a descriptive name or let AI generate one."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Globe className="size-4" />
                    Your Website (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormDescription>
                    We'll analyze your website to understand your business
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Update business description field */}
            {!websiteForm && (
              <FormField
                control={form.control}
                name="businessDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="size-4" />
                      Campaign-Specific Details (Optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={organizationDescription 
                          ? "Add any campaign-specific details or leave blank to use your organization's description"
                          : "Describe your business, products, or services. What do you offer? Who are your ideal customers?"}
                        className="min-h-[100px] resize-none"
                        {...field}
                        disabled={isCreating}
                      />
                    </FormControl>
                    <FormDescription>
                      {organizationDescription 
                        ? "Add campaign-specific details to supplement your organization's description"
                        : "Help us understand your business to generate better keywords"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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

                    {/* AI Generation Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateWithAI}
                      disabled={
                        (!websiteForm?.trim() &&
                          !businessDescriptionForm?.trim() &&
                          !organizationDescription) ||
                        field.value.length >= 10 ||
                        isGeneratingKeywords ||
                        isCreating
                      }
                      className="w-full"
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
                          Generate with AI
                        </>
                      )}
                    </Button>
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
                <FormLabel>Estimated Threads</FormLabel>
                <div className="flex items-center gap-3">
                  <p className="text-muted-foreground text-sm">
                    {estimatedThreads} threads
                  </p>
                  <p className="text-muted-foreground text-sm">
                    across {keywords.length} keywords
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
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
