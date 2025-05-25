"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, Globe, AlertTriangle, FileText, CheckCircle, ExternalLink } from "lucide-react"
import { KnowledgeBaseDocument } from "@/db/schema"
import { useToast } from "@/hooks/use-toast"

interface SitemapPage {
  url: string
  title: string
  description?: string
}

interface WebsiteScrapeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  websiteUrl: string
  userId: string
  knowledgeBase: KnowledgeBaseDocument | null
  setKnowledgeBase: (kb: KnowledgeBaseDocument | null) => void
}

export default function WebsiteScrapeDialog({
  open,
  onOpenChange,
  websiteUrl,
  userId,
  knowledgeBase,
  setKnowledgeBase
}: WebsiteScrapeDialogProps) {
  const [isLoadingSitemap, setIsLoadingSitemap] = useState(false)
  const [isScraping, setIsScraping] = useState(false)
  const [sitemapPages, setSitemapPages] = useState<SitemapPage[]>([])
  const [selectedPages, setSelectedPages] = useState<string[]>([])
  const [showWarning, setShowWarning] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && websiteUrl) {
      loadSitemap()
    }
  }, [open, websiteUrl])

  const loadSitemap = async () => {
    setIsLoadingSitemap(true)
    try {
      const { getWebsiteSitemapAction } = await import("@/actions/integrations/firecrawl/website-scraping-actions")
      const result = await getWebsiteSitemapAction(websiteUrl)
      
      if (result.isSuccess) {
        setSitemapPages(result.data)
        if (result.data.length > 10) {
          setShowWarning(true)
        }
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
        description: "Failed to load website sitemap",
        variant: "destructive"
      })
    } finally {
      setIsLoadingSitemap(false)
    }
  }

  const handlePageToggle = (url: string, checked: boolean) => {
    if (checked) {
      setSelectedPages(prev => [...prev, url])
    } else {
      setSelectedPages(prev => prev.filter(p => p !== url))
    }
  }

  const handleSelectAll = () => {
    if (selectedPages.length === sitemapPages.length) {
      setSelectedPages([])
    } else {
      setSelectedPages(sitemapPages.map(page => page.url))
    }
  }

  const handleScrapePages = async () => {
    if (selectedPages.length === 0) {
      toast({
        title: "No pages selected",
        description: "Please select at least one page to scrape",
        variant: "destructive"
      })
      return
    }

    setIsScraping(true)
    try {
      const { scrapeMultiplePagesAction } = await import("@/actions/integrations/firecrawl/website-scraping-actions")
      const scrapeResult = await scrapeMultiplePagesAction(selectedPages)
      
      if (scrapeResult.isSuccess) {
        // Save scraped content to database
        const { createScrapedContentAction } = await import("@/actions/db/personalization-actions")
        
        for (const page of scrapeResult.data) {
          await createScrapedContentAction({
            userId,
            url: page.url,
            title: page.title,
            content: page.content,
            contentType: "webpage",
            wordCount: page.wordCount
          })
        }

        // Update knowledge base with scraped pages
        if (knowledgeBase) {
          const { updateKnowledgeBaseAction } = await import("@/actions/db/personalization-actions")
          const updateResult = await updateKnowledgeBaseAction(knowledgeBase.id, {
            scrapedPages: [...(knowledgeBase.scrapedPages || []), ...selectedPages]
          })
          
          if (updateResult.isSuccess) {
            setKnowledgeBase(updateResult.data)
          }
        } else {
          const { createKnowledgeBaseAction } = await import("@/actions/db/personalization-actions")
          const createResult = await createKnowledgeBaseAction({
            userId,
            websiteUrl,
            scrapedPages: selectedPages
          })
          
          if (createResult.isSuccess) {
            setKnowledgeBase(createResult.data)
          }
        }

        toast({
          title: "Success",
          description: `Successfully scraped ${scrapeResult.data.length} pages`
        })
        
        onOpenChange(false)
      } else {
        toast({
          title: "Error",
          description: scrapeResult.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to scrape pages",
        variant: "destructive"
      })
    } finally {
      setIsScraping(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden border-0 shadow-2xl">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
              <Globe className="size-5 text-white" />
            </div>
            Scrape Website Pages
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600">
            Select the pages you want to scrape from{" "}
            <span className="font-medium text-blue-600">{websiteUrl}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          {isLoadingSitemap ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <div className="p-4 bg-blue-50 rounded-full mb-4">
                <Loader2 className="size-8 animate-spin text-blue-600" />
              </div>
              <p className="text-lg font-medium text-gray-700">Discovering pages...</p>
              <p className="text-sm text-gray-500 mt-1">Analyzing your website structure</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-1 flex-col"
            >
              <AnimatePresence>
                {showWarning && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4"
                  >
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4">
                      <AlertTriangle className="size-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-amber-800">Large Website Detected</p>
                        <p className="text-sm text-amber-700 mt-1">
                          This website has many pages. Consider selecting only the most relevant ones to avoid diluted results and faster processing.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <FileText className="size-3 mr-1" />
                    {sitemapPages.length} pages found
                  </Badge>
                  {selectedPages.length > 0 && (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle className="size-3 mr-1" />
                      {selectedPages.length} selected
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
                >
                  {selectedPages.length === sitemapPages.length ? "Deselect All" : "Select All"}
                </Button>
              </div>

              <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-50/50">
                <div className="h-full overflow-y-auto p-2">
                  <div className="space-y-2">
                    {sitemapPages.map((page, index) => (
                      <motion.div
                        key={page.url}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-start gap-3 rounded-lg p-3 transition-all duration-200 ${
                          selectedPages.includes(page.url)
                            ? "bg-blue-50 border border-blue-200 shadow-sm"
                            : "bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm"
                        }`}
                      >
                        <Checkbox
                          checked={selectedPages.includes(page.url)}
                          onCheckedChange={(checked) => handlePageToggle(page.url, checked as boolean)}
                          className="mt-1 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-gray-900 line-clamp-1">{page.title}</p>
                            <ExternalLink className="size-3 text-gray-400 flex-shrink-0 mt-1" />
                          </div>
                          <p className="text-xs text-blue-600 mt-1 line-clamp-1">{page.url}</p>
                          {page.description && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{page.description}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-4 mt-4">
          <div className="flex items-center gap-2">
            {selectedPages.length > 0 ? (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle className="size-3 mr-1" />
                {selectedPages.length} pages selected
              </Badge>
            ) : (
              <p className="text-sm text-gray-500">No pages selected</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleScrapePages}
              disabled={isScraping || selectedPages.length === 0}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isScraping ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <FileText className="mr-2 size-4" />
                  Scrape Selected Pages
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 