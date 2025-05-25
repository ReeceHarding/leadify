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
import { X, Plus, Loader2, Globe, Search, Target } from "lucide-react"
import { createCampaignAction } from "@/actions/db/campaign-actions"
import { runFullLeadGenerationWorkflowAction } from "@/actions/lead-generation/workflow-actions"
import { generateCampaignNameAction } from "@/actions/lead-generation/campaign-name-actions"
import { toast } from "sonner"
import { useUser } from "@clerk/nextjs"

const campaignSchema = z.object({
  name: z
    .string()
    .min(1, "Campaign name is required")
    .max(100, "Name too long"),
  website: z.string().url("Please enter a valid website URL"),
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
}

export default function CreateCampaignDialog({
  open,
  onOpenChange,
  onSuccess
}: CreateCampaignDialogProps) {
  const [currentKeyword, setCurrentKeyword] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isGeneratingName, setIsGeneratingName] = useState(false)
  const { user } = useUser()

  const form = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      website: "",
      keywords: []
    }
  })

  const keywords = form.watch("keywords")
  const website = form.watch("website")

  // Auto-generate campaign name when keywords or website change
  useEffect(() => {
    const generateName = async () => {
      if (keywords.length > 0 && website && !form.getValues("name")) {
        setIsGeneratingName(true)
        try {
          const nameResult = await generateCampaignNameAction({
            keywords,
            website,
            businessName: user?.fullName || undefined
          })
          
          if (nameResult.isSuccess) {
            form.setValue("name", nameResult.data)
          }
        } catch (error) {
          console.error("Error generating campaign name:", error)
        } finally {
          setIsGeneratingName(false)
        }
      }
    }

    const timer = setTimeout(generateName, 500) // Debounce
    return () => clearTimeout(timer)
  }, [keywords, website, user?.fullName, form])

  const addKeyword = () => {
    if (
      currentKeyword.trim() &&
      !keywords.includes(currentKeyword.trim()) &&
      keywords.length < 10
    ) {
      form.setValue("keywords", [...keywords, currentKeyword.trim()])
      setCurrentKeyword("")
    }
  }

  const removeKeyword = (keyword: string) => {
    form.setValue(
      "keywords",
      keywords.filter(k => k !== keyword)
    )
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addKeyword()
    }
  }

  const onSubmit = async (data: CampaignForm) => {
    if (!user?.id) {
      toast.error("Please sign in to create a campaign")
      return
    }

    setIsCreating(true)

    try {
      // Create campaign
      const campaignResult = await createCampaignAction({
        userId: user.id,
        name: data.name,
        website: data.website,
        keywords: data.keywords
      })

      if (!campaignResult.isSuccess) {
        toast.error("Failed to create campaign", {
          description: campaignResult.message
        })
        return
      }

      toast.success("Campaign created successfully!", {
        description: "Starting lead generation workflow..."
      })

      setIsCreating(false)
      setIsRunning(true)

      // Run the workflow
      const workflowResult = await runFullLeadGenerationWorkflowAction(
        campaignResult.data.id
      )

      if (workflowResult.isSuccess) {
        toast.success("Campaign completed successfully!", {
          description: `Found ${workflowResult.data.results.find(r => r.step === "Score and Generate Comments")?.data?.commentsGenerated || 0} quality leads`
        })
      } else {
        toast.error("Campaign workflow failed", {
          description: workflowResult.message
        })
      }

      setIsRunning(false)
      onOpenChange(false)
      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error("Error creating campaign:", error)
      toast.error("Unexpected error occurred")
      setIsCreating(false)
      setIsRunning(false)
    }
  }

  const handleClose = () => {
    if (!isCreating && !isRunning) {
      onOpenChange(false)
      form.reset()
      setCurrentKeyword("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="size-5 text-blue-600" />
            Create Lead Generation Campaign
          </DialogTitle>
          <DialogDescription>
            Set up a new campaign to find and analyze Reddit opportunities for
            your business.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Campaign Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Target className="size-4" />
                    Campaign Name
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder={isGeneratingName ? "Generating name..." : "e.g., Software Developer Outreach"}
                        {...field}
                        disabled={isCreating || isRunning || isGeneratingName}
                      />
                      {isGeneratingName && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <Loader2 className="size-4 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    {isGeneratingName 
                      ? "AI is generating a campaign name based on your keywords..."
                      : "Give your campaign a descriptive name or let AI generate one."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Website URL */}
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Globe className="size-4" />
                    Website URL
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://yourcompany.com"
                      {...field}
                      disabled={isCreating || isRunning}
                    />
                  </FormControl>
                  <FormDescription>
                    We'll analyze your website to understand your business and
                    generate relevant comments.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Keywords */}
            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Search className="size-4" />
                    Search Keywords
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., software developer hiring"
                          value={currentKeyword}
                          onChange={e => setCurrentKeyword(e.target.value)}
                          onKeyPress={handleKeyPress}
                          disabled={
                            isCreating || isRunning || keywords.length >= 10
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addKeyword}
                          disabled={
                            !currentKeyword.trim() ||
                            keywords.includes(currentKeyword.trim()) ||
                            keywords.length >= 10 ||
                            isCreating ||
                            isRunning
                          }
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>

                      {keywords.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {keywords.map(keyword => (
                            <Badge
                              key={keyword}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {keyword}
                              {!isCreating && !isRunning && (
                                <button
                                  type="button"
                                  onClick={() => removeKeyword(keyword)}
                                  className="ml-1 hover:text-red-500"
                                >
                                  <X className="size-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Keywords to search for on Reddit. We'll find threads related
                    to these terms. ({keywords.length}/10)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(isCreating || isRunning) && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="size-5 animate-spin text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      {isCreating
                        ? "Creating campaign..."
                        : "Running lead generation workflow..."}
                    </p>
                    <p className="text-sm text-blue-700">
                      {isCreating
                        ? "Setting up your campaign"
                        : "Analyzing Reddit threads and generating comments. This may take a few minutes."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isCreating || isRunning}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isRunning || keywords.length === 0}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                {isCreating || isRunning ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {isCreating ? "Creating..." : "Running..."}
                  </>
                ) : (
                  "Create & Run Campaign"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
