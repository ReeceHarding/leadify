"use client"

import { useState, useEffect } from "react"
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
import { Loader2, Globe, AlertTriangle, X } from "lucide-react"
import { SerializedKnowledgeBaseDocument } from "@/actions/db/personalization-actions"
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
  knowledgeBase: SerializedKnowledgeBaseDocument | null
  setKnowledgeBase: (kb: SerializedKnowledgeBaseDocument | null) => void
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

  const handleRowClick = (url: string) => {
    const isSelected = selectedPages.includes(url)
    handlePageToggle(url, !isSelected)
  }

  const handleSelectAll = () => {
    if (selectedPages.length === sitemapPages.length) {
      setSelectedPages([])
    } else {
      setSelectedPages(sitemapPages.map(page => page.url))
    }
  }

  const removeSelectedPage = (url: string) => {
    setSelectedPages(prev => prev.filter(p => p !== url))
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
      <DialogContent className="flex max-h-[80vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            Scrape Website Pages
          </DialogTitle>
          <DialogDescription>
            Select the pages you want to scrape from {websiteUrl}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          {isLoadingSitemap ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 size-6 animate-spin" />
              Loading sitemap...
            </div>
          ) : (
            <>
              {showWarning && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                  <AlertTriangle className="size-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Large websites may take longer to scrape and could result in diluted results. Consider selecting only the most relevant pages.
                  </p>
                </div>
              )}

              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Found {sitemapPages.length} pages
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedPages.length === sitemapPages.length ? "Deselect All" : "Select All"}
                </Button>
              </div>

              <div className="flex flex-1 gap-4 overflow-hidden">
                {/* Available Pages */}
                <div className="flex-1 space-y-2 overflow-y-auto rounded-lg border p-4">
                  <h4 className="text-sm font-medium text-gray-700">Available Pages</h4>
                  {sitemapPages.map((page) => {
                    const isSelected = selectedPages.includes(page.url)
                    return (
                      <div 
                        key={page.url} 
                        className={`flex cursor-pointer items-start gap-3 rounded p-2 transition-colors ${
                          isSelected 
                            ? 'border border-blue-200 bg-blue-50 shadow-sm' 
                            : 'border border-transparent hover:bg-gray-50'
                        }`}
                        onClick={() => handleRowClick(page.url)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handlePageToggle(page.url, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{page.title}</p>
                          <p className="truncate text-xs text-gray-500">{page.url}</p>
                          {page.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-gray-600">{page.description}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Selected Pages */}
                {selectedPages.length > 0 && (
                  <div className="w-80 space-y-2 overflow-y-auto rounded-lg border p-4">
                    <h4 className="text-sm font-medium text-gray-700">
                      Selected Pages ({selectedPages.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedPages.map((url) => {
                        const page = sitemapPages.find(p => p.url === url)
                        return (
                          <div key={url} className="flex items-start gap-2 rounded bg-blue-50 p-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{page?.title || 'Unknown'}</p>
                              <p className="truncate text-xs text-gray-500">{url}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-6 p-0"
                              onClick={() => removeSelectedPage(url)}
                            >
                              <X className="size-3" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-gray-600">
            {selectedPages.length} pages selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleScrapePages}
              disabled={isScraping || selectedPages.length === 0}
            >
              {isScraping && <Loader2 className="mr-2 size-4 animate-spin" />}
              Scrape Selected Pages
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 