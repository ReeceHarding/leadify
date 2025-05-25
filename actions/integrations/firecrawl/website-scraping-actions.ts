/*
<ai_context>
Website scraping actions using Firecrawl for knowledge base content.
</ai_context>
*/

"use server"

import { ActionState } from "@/types"

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY
const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v1"

interface ScrapedPage {
  url: string
  title: string
  content: string
  wordCount: number
  summary?: string
  keyPoints?: string[]
}

interface SitemapPage {
  url: string
  title: string
  description?: string
}

export async function scrapeWebsiteAction(
  url: string
): Promise<ActionState<ScrapedPage>> {
  console.log("🔥 [WEBSITE-SCRAPING] Starting scrapeWebsiteAction")
  console.log("🔥 [WEBSITE-SCRAPING] URL:", url)

  try {
    if (!FIRECRAWL_API_KEY) {
      console.error("🔥 [WEBSITE-SCRAPING] Firecrawl API key not found")
      return {
        isSuccess: false,
        message: "Firecrawl API key not configured"
      }
    }

    const response = await fetch(`${FIRECRAWL_BASE_URL}/scrape`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: url,
        formats: ["markdown", "html"],
        onlyMainContent: true,
        includeTags: ["title", "meta", "h1", "h2", "h3", "p", "article"],
        excludeTags: ["nav", "footer", "header", "aside", "script", "style"]
      })
    })

    console.log("🔥 [WEBSITE-SCRAPING] Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("🔥 [WEBSITE-SCRAPING] Firecrawl API error:", errorText)
      return {
        isSuccess: false,
        message: `Firecrawl API error: ${response.status} - ${errorText}`
      }
    }

    const data = await response.json()
    console.log("🔥 [WEBSITE-SCRAPING] Response data keys:", Object.keys(data))

    if (!data.success || !data.data) {
      console.error("🔥 [WEBSITE-SCRAPING] No data in response")
      return {
        isSuccess: false,
        message: "No content scraped from the website"
      }
    }

    const scrapedData = data.data
    const content = scrapedData.markdown || scrapedData.content || ""
    const title = scrapedData.metadata?.title || scrapedData.title || "Untitled"
    const wordCount = content.split(/\s+/).length

    console.log("🔥 [WEBSITE-SCRAPING] Content length:", content.length)
    console.log("🔥 [WEBSITE-SCRAPING] Word count:", wordCount)
    console.log("🔥 [WEBSITE-SCRAPING] Title:", title)

    const result: ScrapedPage = {
      url,
      title,
      content,
      wordCount
    }

    return {
      isSuccess: true,
      message: "Website scraped successfully",
      data: result
    }
  } catch (error) {
    console.error("🔥 [WEBSITE-SCRAPING] Error scraping website:", error)
    return {
      isSuccess: false,
      message: `Failed to scrape website: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function getWebsiteSitemapAction(
  url: string
): Promise<ActionState<SitemapPage[]>> {
  console.log("🔥 [WEBSITE-SCRAPING] Starting getWebsiteSitemapAction")
  console.log("🔥 [WEBSITE-SCRAPING] URL:", url)

  try {
    if (!FIRECRAWL_API_KEY) {
      console.error("🔥 [WEBSITE-SCRAPING] Firecrawl API key not found")
      return {
        isSuccess: false,
        message: "Firecrawl API key not configured"
      }
    }

    // First try to get the sitemap
    const sitemapResponse = await fetch(`${FIRECRAWL_BASE_URL}/map`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: url,
        search: "",
        limit: 50
      })
    })

    console.log("🔥 [WEBSITE-SCRAPING] Sitemap response status:", sitemapResponse.status)

    if (!sitemapResponse.ok) {
      const errorText = await sitemapResponse.text()
      console.error("🔥 [WEBSITE-SCRAPING] Sitemap API error:", errorText)
      return {
        isSuccess: false,
        message: `Failed to get sitemap: ${sitemapResponse.status} - ${errorText}`
      }
    }

    const sitemapData = await sitemapResponse.json()
    console.log("🔥 [WEBSITE-SCRAPING] Sitemap data keys:", Object.keys(sitemapData))

    if (!sitemapData.success || !sitemapData.links) {
      console.error("🔥 [WEBSITE-SCRAPING] No sitemap data")
      return {
        isSuccess: false,
        message: "No sitemap data found"
      }
    }

    const pages: SitemapPage[] = sitemapData.links.map((link: any) => ({
      url: link.url || link,
      title: link.title || extractTitleFromUrl(link.url || link),
      description: link.description
    }))

    console.log("🔥 [WEBSITE-SCRAPING] Found pages:", pages.length)

    return {
      isSuccess: true,
      message: `Found ${pages.length} pages in sitemap`,
      data: pages
    }
  } catch (error) {
    console.error("🔥 [WEBSITE-SCRAPING] Error getting sitemap:", error)
    return {
      isSuccess: false,
      message: `Failed to get sitemap: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function scrapeMultiplePagesAction(
  urls: string[]
): Promise<ActionState<ScrapedPage[]>> {
  console.log("🔥 [WEBSITE-SCRAPING] Starting scrapeMultiplePagesAction")
  console.log("🔥 [WEBSITE-SCRAPING] URLs count:", urls.length)

  try {
    if (!FIRECRAWL_API_KEY) {
      console.error("🔥 [WEBSITE-SCRAPING] Firecrawl API key not found")
      return {
        isSuccess: false,
        message: "Firecrawl API key not configured"
      }
    }

    if (urls.length === 0) {
      return {
        isSuccess: true,
        message: "No URLs provided",
        data: []
      }
    }

    // Limit to prevent overwhelming the API
    const limitedUrls = urls.slice(0, 20)
    console.log("🔥 [WEBSITE-SCRAPING] Processing URLs:", limitedUrls.length)

    const scrapedPages: ScrapedPage[] = []
    const errors: string[] = []

    // Process URLs in batches to avoid rate limiting
    const batchSize = 3
    for (let i = 0; i < limitedUrls.length; i += batchSize) {
      const batch = limitedUrls.slice(i, i + batchSize)
      console.log("🔥 [WEBSITE-SCRAPING] Processing batch:", i / batchSize + 1)

      const batchPromises = batch.map(async (url) => {
        try {
          const result = await scrapeWebsiteAction(url)
          if (result.isSuccess && result.data) {
            return result.data
          } else {
            errors.push(`${url}: ${result.message}`)
            return null
          }
        } catch (error) {
          errors.push(`${url}: ${error instanceof Error ? error.message : "Unknown error"}`)
          return null
        }
      })

      const batchResults = await Promise.all(batchPromises)
      const validResults = batchResults.filter((result): result is ScrapedPage => result !== null)
      scrapedPages.push(...validResults)

      // Add delay between batches to respect rate limits
      if (i + batchSize < limitedUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    console.log("🔥 [WEBSITE-SCRAPING] Successfully scraped pages:", scrapedPages.length)
    console.log("🔥 [WEBSITE-SCRAPING] Errors:", errors.length)

    let message = `Successfully scraped ${scrapedPages.length} pages`
    if (errors.length > 0) {
      message += ` (${errors.length} errors)`
    }

    return {
      isSuccess: true,
      message,
      data: scrapedPages
    }
  } catch (error) {
    console.error("🔥 [WEBSITE-SCRAPING] Error scraping multiple pages:", error)
    return {
      isSuccess: false,
      message: `Failed to scrape pages: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const segments = pathname.split('/').filter(segment => segment.length > 0)
    
    if (segments.length === 0) {
      return "Home"
    }
    
    const lastSegment = segments[segments.length - 1]
    return lastSegment
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\.(html|php|aspx?)$/i, '')
  } catch {
    return "Page"
  }
} 