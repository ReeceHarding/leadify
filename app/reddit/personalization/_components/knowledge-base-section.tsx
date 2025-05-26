"use client"

import { useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Loader2, Globe, Plus, X } from "lucide-react"
import { SerializedKnowledgeBaseDocument, SerializedProfileDocument } from "@/types"
import { useOrganization } from "@/components/utilities/organization-provider"
import { useToast } from "@/hooks/use-toast"
import WebsiteScrapeDialog from "./website-scrape-dialog"

interface KnowledgeBaseSectionProps {
  userId: string
  knowledgeBase: SerializedKnowledgeBaseDocument | null
  setKnowledgeBase: (kb: SerializedKnowledgeBaseDocument | null) => void
  userProfile: SerializedProfileDocument | null
}

export default function KnowledgeBaseSection({
  userId,
  knowledgeBase,
  setKnowledgeBase,
  userProfile
}: KnowledgeBaseSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [customInformation, setCustomInformation] = useState(
    knowledgeBase?.customInformation || ""
  )
  const [showScrapeDialog, setShowScrapeDialog] = useState(false)
  const { toast } = useToast()

  const handleSaveCustomInformation = async () => {
    setIsLoading(true)
    try {
      if (knowledgeBase) {
        // Update existing knowledge base
        const { updateKnowledgeBaseAction } = await import(
          "@/actions/db/personalization-actions"
        )
        const result = await updateKnowledgeBaseAction(knowledgeBase.id, {
          customInformation
        })

        if (result.isSuccess) {
          setKnowledgeBase(result.data)
          toast({
            title: "Success",
            description: "Custom information updated successfully"
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
          customInformation,
          websiteUrl: activeOrganization?.website
        })

        if (result.isSuccess) {
          setKnowledgeBase(result.data)
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
        description: "Failed to save custom information",
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
            <Globe className="size-5" />
            Knowledge Base
          </CardTitle>
          <CardDescription>
            Add information about your business and products to help generate
            more accurate and informative comments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connected Website */}
          <div className="space-y-2">
            <Label>Connected Website</Label>
            <div className="flex items-center gap-2">
              <Input
                value={activeOrganization?.website || ""}
                placeholder="No website connected"
                disabled
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setShowScrapeDialog(true)}
                disabled={!activeOrganization?.website}
              >
                <Plus className="mr-2 size-4" />
                Scrape Pages
              </Button>
            </div>
            {activeOrganization?.website && (
              <p className="text-sm text-gray-600">
                We know about your website from your profile. You can scrape
                specific pages to add to your knowledge base.
              </p>
            )}
          </div>

          {/* Scraped Pages */}
          {knowledgeBase?.scrapedPages &&
            knowledgeBase.scrapedPages.length > 0 && (
              <div className="space-y-2">
                <Label>Scraped Pages</Label>
                <div className="flex flex-wrap gap-2">
                  {knowledgeBase.scrapedPages.map((page, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {page}
                      <X className="size-3 cursor-pointer" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

          {/* Custom Information */}
          <div className="space-y-2">
            <Label htmlFor="custom-info">Additional Information</Label>
            <Textarea
              id="custom-info"
              placeholder="Add any additional information about your business, products, or services that should be included when generating comments..."
              value={customInformation}
              onChange={e => setCustomInformation(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-sm text-gray-600">
              This information will be used to provide factual details when
              generating comments.
            </p>
          </div>

          {/* Summary */}
          {knowledgeBase?.summary && (
            <div className="space-y-2">
              <Label>Knowledge Base Summary</Label>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-700">{knowledgeBase.summary}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSaveCustomInformation} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save Information
            </Button>
          </div>
        </CardContent>
      </Card>

      <WebsiteScrapeDialog
        open={showScrapeDialog}
        onOpenChange={setShowScrapeDialog}
        websiteUrl={activeOrganization?.website || ""}
        userId={userId}
        knowledgeBase={knowledgeBase}
        setKnowledgeBase={setKnowledgeBase}
      />
    </>
  )
}
