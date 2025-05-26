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
import { Loader2, Globe, Plus, FileText, Merge, Replace } from "lucide-react"
import { SerializedKnowledgeBaseDocument, SerializedProfileDocument } from "@/types"
import { useToast } from "@/hooks/use-toast"
import WebsiteScrapeDialog from "../../personalization/_components/website-scrape-dialog"

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
  const [isLoading, setIsLoading] = useState(false)
  const [isCombining, setIsCombining] = useState(false)
  const [newInformation, setNewInformation] = useState("")
  const [editableOldInfo, setEditableOldInfo] = useState(
    knowledgeBase?.customInformation || ""
  )
  const [showScrapeDialog, setShowScrapeDialog] = useState(false)
  const { toast } = useToast()

  // Update editable old info when knowledge base changes
  useEffect(() => {
    setEditableOldInfo(knowledgeBase?.customInformation || "")
  }, [knowledgeBase?.customInformation])

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
          customInformation: newInformation
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
          websiteUrl: userProfile?.website
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
            customInformation: combineResult.data.combinedInformation
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
            websiteUrl: userProfile?.website
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
          customInformation: editableOldInfo
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
            Expand your organization's knowledge base with website scraping and additional
            information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Website Scraping */}
          <div className="space-y-2">
            <Label>Website Scraping</Label>
            <div className="flex items-center gap-2">
              <Input
                value={userProfile?.website || ""}
                placeholder="No website connected"
                disabled
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setShowScrapeDialog(true)}
                disabled={!userProfile?.website}
              >
                <Globe className="mr-2 size-4" />
                Scrape Pages
              </Button>
            </div>
            {userProfile?.website ? (
              <p className="text-sm text-gray-600">
                Scrape specific pages from your website to add detailed
                information to your knowledge base.
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Connect a website in your profile to enable page scraping.
              </p>
            )}
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
        websiteUrl={userProfile?.website || ""}
        userId={userId}
        organizationId={organizationId}
        knowledgeBase={knowledgeBase}
        setKnowledgeBase={setKnowledgeBase}
      />
    </>
  )
}
