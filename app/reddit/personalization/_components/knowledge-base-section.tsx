"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Globe, Plus, X, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { KnowledgeBaseDocument } from "@/db/schema"
import { SerializedProfileDocument } from "@/actions/db/profiles-actions"
import { useToast } from "@/hooks/use-toast"
import WebsiteScrapeDialog from "./website-scrape-dialog"

interface KnowledgeBaseSectionProps {
  userId: string
  knowledgeBase: KnowledgeBaseDocument | null
  setKnowledgeBase: (kb: KnowledgeBaseDocument | null) => void
  userProfile: SerializedProfileDocument | null
}

export default function KnowledgeBaseSection({
  userId,
  knowledgeBase,
  setKnowledgeBase,
  userProfile
}: KnowledgeBaseSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [customInformation, setCustomInformation] = useState(knowledgeBase?.customInformation || "")
  const [showScrapeDialog, setShowScrapeDialog] = useState(false)
  const { toast } = useToast()

  const handleSaveCustomInformation = async () => {
    setIsLoading(true)
    try {
      if (knowledgeBase) {
        // Update existing knowledge base
        const { updateKnowledgeBaseAction } = await import("@/actions/db/personalization-actions")
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
        const { createKnowledgeBaseAction } = await import("@/actions/db/personalization-actions")
        const result = await createKnowledgeBaseAction({
          userId,
          customInformation,
          websiteUrl: userProfile?.website
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

  const hasContent = customInformation.trim().length > 0 || (knowledgeBase?.scrapedPages && knowledgeBase.scrapedPages.length > 0)

  return (
    <>
      <div className="space-y-6">
        {/* Connected Website Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-emerald-600" />
            <Label className="text-sm font-medium text-gray-700">Connected Website</Label>
            {userProfile?.website && (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle className="size-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Input
              value={userProfile?.website || ""}
              placeholder="No website connected"
              disabled
              className="flex-1 bg-gray-50 border-gray-200"
            />
            <Button
              variant="outline"
              onClick={() => setShowScrapeDialog(true)}
              disabled={!userProfile?.website}
              className="bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all duration-200"
            >
              <Plus className="mr-2 size-4" />
              Scrape Pages
            </Button>
          </div>
          
          {userProfile?.website ? (
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-500" />
              Website detected from your profile. Click "Scrape Pages" to add specific content to your knowledge base.
            </p>
          ) : (
            <p className="text-sm text-amber-600 flex items-center gap-2">
              <AlertCircle className="size-4 text-amber-500" />
              No website connected. Add a website to your profile to enable page scraping.
            </p>
          )}
        </motion.div>

        {/* Scraped Pages */}
        <AnimatePresence>
          {knowledgeBase?.scrapedPages && knowledgeBase.scrapedPages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-blue-600" />
                <Label className="text-sm font-medium text-gray-700">Scraped Pages</Label>
                <Badge variant="secondary" className="text-xs">
                  {knowledgeBase.scrapedPages.length} pages
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {knowledgeBase.scrapedPages.map((page, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Badge 
                      variant="secondary" 
                      className="flex items-center gap-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <span className="max-w-[200px] truncate">{page}</span>
                      <X className="size-3 cursor-pointer hover:text-red-500 transition-colors" />
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-purple-600" />
            <Label htmlFor="custom-info" className="text-sm font-medium text-gray-700">
              Business Information
            </Label>
            {customInformation.trim().length > 0 && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                <CheckCircle className="size-3 mr-1" />
                {customInformation.trim().length} characters
              </Badge>
            )}
          </div>
          
          <Textarea
            id="custom-info"
            placeholder="Tell us about your business, products, services, unique value propositions, target audience, and any other relevant information that should be included when generating comments..."
            value={customInformation}
            onChange={(e) => setCustomInformation(e.target.value)}
            rows={6}
            className="resize-none border-gray-200 focus:border-purple-300 focus:ring-purple-200 transition-all duration-200"
          />
          
          <p className="text-sm text-gray-600">
            💡 <strong>Tip:</strong> Include specific details about your products, services, pricing, and what makes your business unique. This helps generate more accurate and compelling comments.
          </p>
        </motion.div>

        {/* Knowledge Base Summary */}
        <AnimatePresence>
          {knowledgeBase?.summary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-600" />
                <Label className="text-sm font-medium text-gray-700">AI-Generated Summary</Label>
              </div>
              
              <div className="rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4">
                <p className="text-sm text-gray-700 leading-relaxed">{knowledgeBase.summary}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 pt-2"
        >
          <Button
            onClick={handleSaveCustomInformation}
            disabled={isLoading || customInformation === (knowledgeBase?.customInformation || "")}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {knowledgeBase ? "Update Information" : "Save Information"}
          </Button>
          
          {hasContent && (
            <Badge className="flex items-center gap-1 bg-green-100 text-green-700 border-green-200 px-3 py-1">
              <CheckCircle className="size-3" />
              Knowledge Base Active
            </Badge>
          )}
        </motion.div>
      </div>

      <WebsiteScrapeDialog
        open={showScrapeDialog}
        onOpenChange={setShowScrapeDialog}
        websiteUrl={userProfile?.website || ""}
        userId={userId}
        knowledgeBase={knowledgeBase}
        setKnowledgeBase={setKnowledgeBase}
      />
    </>
  )
} 