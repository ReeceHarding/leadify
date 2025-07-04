"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Globe, Plus, FileText, Merge, Replace, Check } from "lucide-react"
import {
  SerializedKnowledgeBaseDocument,
  SerializedProfileDocument
} from "@/types"
import { useToast } from "@/lib/hooks/use-toast"
import { useOrganization } from "@/components/utilities/organization-provider"
import WebsiteScrapeDialog from "@/app/reddit/personalization/_components/website-scrape-dialog"

interface AddToKnowledgeBaseProps {
  userId: string
  organizationId: string
  knowledgeBase: SerializedKnowledgeBaseDocument | null
  setKnowledgeBase: (kb: SerializedKnowledgeBaseDocument | null) => void
  userProfile: SerializedProfileDocument | null
}

export default function AddToKnowledgeBase({
  userId,
  organizationId,
  knowledgeBase,
  setKnowledgeBase,
  userProfile
}: AddToKnowledgeBaseProps) {
  const { currentOrganization } = useOrganization()
  const [customInformation, setCustomInformation] = useState("")
  const [newInformation, setNewInformation] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCombining, setIsCombining] = useState(false)
  const [brandNameOverride, setBrandNameOverride] = useState("")
  const [showScrapeDialog, setShowScrapeDialog] = useState(false)
  const [editableOldInfo, setEditableOldInfo] = useState("")
  const [mergeMode, setMergeMode] = useState<"replace" | "merge">("merge")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [isUpdatingWebsite, setIsUpdatingWebsite] = useState(false)
  const { toast } = useToast()

  // Update state when knowledge base changes
  useEffect(() => {
    setEditableOldInfo(knowledgeBase?.customInformation || "")
    setBrandNameOverride(knowledgeBase?.brandNameOverride || "")
    setWebsiteUrl(currentOrganization?.website || "")
  }, [knowledgeBase?.customInformation, knowledgeBase?.brandNameOverride, currentOrganization?.website])

  const handleUpdateWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast({
        title: "Website URL required",
        description: "Please enter a valid website URL",
        variant: "destructive"
      })
      return
    }

    setIsUpdatingWebsite(true)
    try {
      const { updateOrganizationAction } = await import(
        "@/actions/db/organizations-actions"
      )
      
      // Ensure URL has protocol
      let formattedUrl = websiteUrl.trim()
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl
      }

      const result = await updateOrganizationAction(organizationId, {
        website: formattedUrl
      })

      if (result.isSuccess) {
        // Refresh the organization data
        window.location.reload()
        toast({
          title: "Success",
          description: "Website updated successfully"
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update website",
        variant: "destructive"
      })
    } finally {
      setIsUpdatingWebsite(false)
    }
  }

  const handleReplaceInformation = async () => {
    if (!newInformation.trim()) {
      toast({
        title: "No information provided",
        description: "Please enter some information to save",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      if (knowledgeBase) {
        // Update existing knowledge base
        const { updateKnowledgeBaseAction } = await import(
          "@/actions/db/personalization-actions"
        )
        const result = await updateKnowledgeBaseAction(knowledgeBase.id, {
          customInformation: newInformation,
          brandNameOverride: brandNameOverride
        })

        if (result.isSuccess) {
          setKnowledgeBase(result.data)
          setNewInformation("")
          setEditableOldInfo(newInformation)
          toast({
            title: "Success",
            description: "Information replaced successfully"
          })
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
          })
        }
      } else {
        // Create new knowledge base
        const { createKnowledgeBaseAction } = await import(
          "@/actions/db/personalization-actions"
        )
        const result = await createKnowledgeBaseAction({
          userId,
          organizationId,
          customInformation: newInformation,
          brandNameOverride: brandNameOverride,
          websiteUrl: currentOrganization?.website
        })

        if (result.isSuccess) {
          setKnowledgeBase(result.data)
          setNewInformation("")
          setEditableOldInfo(newInformation)
          toast({
            title: "Success",
            description: "Knowledge base created successfully"
          })
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save information",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCombineInformation = async () => {
    if (!newInformation.trim()) {
      toast({
        title: "No new information provided",
        description: "Please enter some information to combine",
        variant: "destructive"
      })
      return
    }

    if (!editableOldInfo.trim()) {
      // If no old info, just replace
      await handleReplaceInformation()
      return
    }

    setIsCombining(true)
    try {
      console.log("🔥 [COMBINE-INFO] Starting combination process")
      console.log("🔥 [COMBINE-INFO] Old info length:", editableOldInfo.length)
      console.log("🔥 [COMBINE-INFO] New info length:", newInformation.length)

      // Use LLM to combine information
      const { combineInformationAction } = await import(
        "@/actions/integrations/openai/openai-actions"
      )
      const combineResult = await combineInformationAction(
        editableOldInfo,
        newInformation
      )

      if (combineResult.isSuccess) {
        console.log("🔥 [COMBINE-INFO] LLM combination successful")

        // Update knowledge base with combined information
        if (knowledgeBase) {
          const { updateKnowledgeBaseAction } = await import(
            "@/actions/db/personalization-actions"
          )
          const result = await updateKnowledgeBaseAction(knowledgeBase.id, {
            customInformation: combineResult.data.combinedInformation,
            brandNameOverride: brandNameOverride
          })

          if (result.isSuccess) {
            setKnowledgeBase(result.data)
            setNewInformation("")
            setEditableOldInfo(combineResult.data.combinedInformation)
            toast({
              title: "Success",
              description: "Information combined successfully using AI"
            })
          } else {
            toast({
              title: "Error",
              description: result.message,
              variant: "destructive"
            })
          }
        } else {
          // Create new knowledge base with combined info
          const { createKnowledgeBaseAction } = await import(
            "@/actions/db/personalization-actions"
          )
          const result = await createKnowledgeBaseAction({
            userId,
            organizationId,
            customInformation: combineResult.data.combinedInformation,
            brandNameOverride: brandNameOverride,
            websiteUrl: currentOrganization?.website
          })

          if (result.isSuccess) {
            setKnowledgeBase(result.data)
            setNewInformation("")
            setEditableOldInfo(combineResult.data.combinedInformation)
            toast({
              title: "Success",
              description: "Knowledge base created with combined information"
            })
          } else {
            toast({
              title: "Error",
              description: result.message,
              variant: "destructive"
            })
          }
        }
      } else {
        toast({
          title: "Error",
          description: combineResult.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("🔥 [COMBINE-INFO] Error:", error)
      toast({
        title: "Error",
        description: "Failed to combine information",
        variant: "destructive"
      })
    } finally {
      setIsCombining(false)
    }
  }

  const handleSaveEditedInfo = async () => {
    setIsLoading(true)
    try {
      if (knowledgeBase) {
        const { updateKnowledgeBaseAction } = await import(
          "@/actions/db/personalization-actions"
        )
        const result = await updateKnowledgeBaseAction(knowledgeBase.id, {
          customInformation: editableOldInfo,
          brandNameOverride: brandNameOverride
        })

        if (result.isSuccess) {
          setKnowledgeBase(result.data)
          toast({
            title: "Success",
            description: "Information updated successfully"
          })
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save edited information",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card className="bg-white shadow-sm dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-5" />
            Add to Knowledge Base
          </CardTitle>
          <CardDescription>
            Expand your organization's knowledge base with website scraping and
            additional information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Website URL */}
          <div className="space-y-2">
            <Label htmlFor="website-url">Website URL</Label>
            <div className="flex items-center gap-2">
              <Input
                id="website-url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="Enter your website URL (e.g., https://example.com)"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleUpdateWebsite}
                disabled={isUpdatingWebsite || !websiteUrl.trim() || websiteUrl === currentOrganization?.website}
              >
                {isUpdatingWebsite ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 size-4" />
                    Update
                  </>
                )}
              </Button>
            </div>
            {currentOrganization?.website ? (
              <p className="text-sm text-gray-600">
                Current website: {currentOrganization.website}
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Add your website URL to enable page scraping.
              </p>
            )}
          </div>

          {/* Website Scraping */}
          <div className="space-y-2">
            <Label>Scrape Website Pages</Label>
            <div className="flex items-center gap-2">
              <Input
                value={currentOrganization?.website || "No website connected"}
                disabled
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setShowScrapeDialog(true)}
                disabled={!currentOrganization?.website}
              >
                <Globe className="mr-2 size-4" />
                Scrape Pages
              </Button>
            </div>
            {currentOrganization?.website ? (
              <p className="text-sm text-gray-600">
                Scrape specific pages from your website to add detailed
                information to your knowledge base.
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Add a website URL above to enable page scraping.
              </p>
            )}
          </div>

          {/* Brand Name Override */}
          <div className="space-y-2">
            <Label htmlFor="brand-name">Brand Name Override</Label>
            <Input
              id="brand-name"
              placeholder={`How to reference your brand (e.g., "zoho" instead of "${currentOrganization?.name || 'Your Brand'}")`}
              value={brandNameOverride}
              onChange={e => setBrandNameOverride(e.target.value)}
            />
            <p className="text-sm text-gray-600">
              Override how your brand is referenced in comments. Leave empty to use organization name.
              This will be converted to lowercase automatically.
            </p>
          </div>

          {/* Edit Existing Information */}
          {knowledgeBase?.customInformation && (
            <div className="space-y-2">
              <Label htmlFor="edit-info">Edit Existing Information</Label>
              <Textarea
                id="edit-info"
                placeholder="Edit your existing business information..."
                value={editableOldInfo}
                onChange={e => setEditableOldInfo(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveEditedInfo}
                  disabled={
                    isLoading ||
                    editableOldInfo === knowledgeBase.customInformation
                  }
                >
                  {isLoading && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  <FileText className="mr-2 size-4" />
                  Save Changes
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Edit and clean up your existing information. Remove irrelevant
                details and save.
              </p>
            </div>
          )}

          {/* Add New Information */}
          <div className="space-y-2">
            <Label htmlFor="new-info">Add New Information</Label>
            <Textarea
              id="new-info"
              placeholder="Add any additional information about your business, products, or services..."
              value={newInformation}
              onChange={e => setNewInformation(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-sm text-gray-600">
              Add new details about your business that should be included when
              generating comments.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleReplaceInformation}
              disabled={isLoading || isCombining || !newInformation.trim()}
              variant="outline"
            >
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              <Replace className="mr-2 size-4" />
              Replace Old Info
            </Button>

            {knowledgeBase?.customInformation && (
              <Button
                onClick={handleCombineInformation}
                disabled={isLoading || isCombining || !newInformation.trim()}
              >
                {isCombining && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                <Merge className="mr-2 size-4" />
                {isCombining ? "Combining with AI..." : "Add to Old Info"}
              </Button>
            )}
          </div>

          {knowledgeBase?.customInformation && (
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-sm text-blue-900">
                <strong>Replace:</strong> Completely replaces existing
                information with new information.
              </p>
              <p className="mt-1 text-sm text-blue-900">
                <strong>Add to Old:</strong> Uses AI to intelligently combine
                old and new information.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <WebsiteScrapeDialog
        open={showScrapeDialog}
        onOpenChange={setShowScrapeDialog}
        websiteUrl={currentOrganization?.website || ""}
        userId={userId}
        organizationId={organizationId}
        knowledgeBase={knowledgeBase}
        setKnowledgeBase={setKnowledgeBase}
      />
    </>
  )
}
