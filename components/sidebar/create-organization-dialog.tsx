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
  Building2
} from "lucide-react"
import { createOrganizationAction } from "@/actions/db/organizations-actions"
import { createCampaignAction } from "@/actions/db/campaign-actions"
import { runFullLeadGenerationWorkflowAction } from "@/actions/lead-generation/workflow-actions"
import { generateCampaignNameAction } from "@/actions/lead-generation/campaign-name-actions"
import { toast } from "sonner"
import { useUser } from "@clerk/nextjs"
import { generateKeywordsAction } from "@/actions/lead-generation/keywords-actions"
import { scrapeWebsiteAction } from "@/actions/integrations/firecrawl/website-scraping-actions"

const organizationSchema = z
  .object({
    name: z
      .string()
      .min(1, "Organization name is required")
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
      // Only validate URL if website is provided
      try {
        new URL(data.website)
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid website URL",
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

type OrganizationForm = z.infer<typeof organizationSchema>

interface CreateOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (organizationId: string) => void
}

export default function CreateOrganizationDialog({
  open,
  onOpenChange,
  onSuccess
}: CreateOrganizationDialogProps) {
  const { user } = useUser()
  const [isCreating, setIsCreating] = useState(false)
  const [currentKeyword, setCurrentKeyword] = useState("")
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false)
  const [generationStep, setGenerationStep] = useState<
    "scraping" | "generating"
  >("scraping")

  const form = useForm<OrganizationForm>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      website: "",
      businessDescription: "",
      keywords: []
    }
  })

  const websiteForm = form.watch("website")
  const businessDescriptionForm = form.watch("businessDescription")

  const handleAddKeyword = () => {
    const keyword = currentKeyword.trim()
    if (keyword && form.getValues("keywords").length < 10) {
      const currentKeywords = form.getValues("keywords")
      if (!currentKeywords.includes(keyword)) {
        form.setValue("keywords", [...currentKeywords, keyword])
        setCurrentKeyword("")
      }
    }
  }

  const handleRemoveKeyword = (index: number) => {
    const currentKeywords = form.getValues("keywords")
    form.setValue(
      "keywords",
      currentKeywords.filter((_, i) => i !== index)
    )
  }

  const handleGenerateWithAI = async () => {
    setIsGeneratingKeywords(true)

    try {
      let businessContext = businessDescriptionForm || ""
      let websiteUrl = websiteForm || undefined

      // If website is provided, scrape it first
      if (websiteForm?.trim()) {
        setGenerationStep("scraping")
        console.log("🌐 Scraping website:", websiteForm)

        const scrapeResult = await scrapeWebsiteAction(websiteForm)
        if (scrapeResult.isSuccess && scrapeResult.data) {
          businessContext = scrapeResult.data.content
          console.log("✅ Website scraped successfully")
        } else {
          console.warn(
            "⚠️ Website scraping failed, using business description only"
          )
        }
      }

      // Generate keywords
      setGenerationStep("generating")
      console.log(
        "🤖 Generating keywords with context length:",
        businessContext.length
      )

      const keywordsResult = await generateKeywordsAction({
        website: websiteUrl,
        businessDescription: businessContext
      })

      if (keywordsResult.isSuccess && keywordsResult.data) {
        form.setValue("keywords", keywordsResult.data.keywords)
        toast.success(
          `Generated ${keywordsResult.data.keywords.length} keywords!`
        )
      } else {
        toast.error(keywordsResult.message || "Failed to generate keywords")
      }
    } catch (error) {
      console.error("Error generating keywords:", error)
      toast.error("Failed to generate keywords")
    } finally {
      setIsGeneratingKeywords(false)
    }
  }

  const onSubmit = async (data: OrganizationForm) => {
    setIsCreating(true)

    try {
      if (!user?.id) {
        toast.error("Please sign in to create an organization")
        return
      }

      // Create the organization
      const orgResult = await createOrganizationAction({
        ownerId: user.id,
        name: data.name,
        website: data.website || undefined,
        businessDescription: data.businessDescription || undefined
      })

      if (!orgResult.isSuccess || !orgResult.data) {
        throw new Error(orgResult.message || "Failed to create organization")
      }

      // Create the first campaign for this organization
      const campaignResult = await createCampaignAction({
        userId: user.id,
        organizationId: orgResult.data.id,
        name: `${data.name} - Initial Campaign`,
        website: data.website || undefined,
        businessDescription: data.businessDescription || undefined,
        keywords: data.keywords
      })

      if (!campaignResult.isSuccess || !campaignResult.data) {
        throw new Error(campaignResult.message || "Failed to create campaign")
      }

      // Close the dialog immediately after creating organization and campaign
      toast.success("Organization created! Starting lead generation...")
      onSuccess?.(orgResult.data.id)
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
                (r: any) => r.step === "Score and Generate Comments"
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
      console.error("Error creating organization:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to create organization"
      )
      setIsCreating(false)
    }
  }

  const keywords = form.watch("keywords")
  const estimatedThreads = keywords.length * 10

  // Check if form should be submittable
  const canSubmit =
    keywords.length > 0 &&
    form.getValues("name").trim().length > 0 &&
    (form.getValues("website")?.trim() ||
      form.getValues("businessDescription")?.trim()) &&
    !isCreating

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Set up a new organization with its own Reddit account and lead
            generation campaigns.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., My Company"
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormDescription>
                    Give your organization a descriptive name.
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
                      placeholder="https://example.com"
                      type="url"
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

            <FormField
              control={form.control}
              name="businessDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building2 className="size-4" />
                    Business Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[100px] resize-none"
                      placeholder="Describe your business, products, or services. What do you offer? Who are your ideal customers?"
                      {...field}
                      disabled={isCreating}
                    />
                  </FormControl>
                  <FormDescription>
                    Help us understand your business to generate better keywords
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

                    {/* AI Generation Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateWithAI}
                      disabled={
                        (!websiteForm?.trim() &&
                          !businessDescriptionForm?.trim()) ||
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

            {/* Keywords Display */}
            {keywords.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(index)}
                        className="ml-1 hover:text-red-500"
                        disabled={isCreating}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
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
                    Creating Organization...
                  </>
                ) : (
                  `Create & Score ${estimatedThreads} Threads`
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
