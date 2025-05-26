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
import { Loader2, Globe, Building2 } from "lucide-react"
import { createOrganizationAction } from "@/actions/db/organizations-actions"
import { toast } from "sonner"
import { useUser } from "@clerk/nextjs"

const organizationSchema = z
  .object({
    name: z
      .string()
      .min(1, "Organization name is required")
      .max(100, "Name too long"),
    website: z.string().optional(),
    businessDescription: z.string().optional()
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

  const form = useForm<OrganizationForm>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      website: "",
      businessDescription: ""
    }
  })

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

      // Success - close dialog and notify
      toast.success("Organization created successfully!")
      onSuccess?.(orgResult.data.id)
      onOpenChange(false)

      // Reset form
      form.reset()
    } catch (error) {
      console.error("Error creating organization:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to create organization"
      )
    } finally {
      setIsCreating(false)
    }
  }

  // Check if form should be submittable
  const canSubmit =
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
            Set up a new organization with its own Reddit account. You can
            create lead searches after setting up your organization.
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
                    Your organization's website URL
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
                    Help us understand your business
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  "Create Organization"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
