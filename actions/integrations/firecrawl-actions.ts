/*
<ai_context>
Contains server actions for Firecrawl API integration to scrape website content.
</ai_context>
*/

"use server"

import FirecrawlApp from "@mendable/firecrawl-js"
import { ActionState } from "@/types"

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY!
})

export interface ScrapeResult {
  url: string
  content: string
  title?: string
  description?: string
  error?: string
}

export async function scrapeWebsiteAction(
  url: string
): Promise<ActionState<ScrapeResult>> {
  try {
    if (!process.env.FIRECRAWL_API_KEY) {
      return { 
        isSuccess: false, 
        message: "Firecrawl API key not configured" 
      }
    }

    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    console.log(`🔥 Scraping website: ${url}`)
    
    const scrapeResponse = await firecrawl.scrapeUrl(url, {
      formats: ['markdown'],
      onlyMainContent: true,
      waitFor: 3000, // Wait 3 seconds for page to load
      timeout: 30000 // 30 second timeout
    })

    if (!scrapeResponse || !scrapeResponse.success) {
      return {
        isSuccess: false,
        message: `Failed to scrape website: ${scrapeResponse?.error || 'Unknown error'}`
      }
    }

    // Handle the response data properly
    const responseData = scrapeResponse as any
    const data = responseData.data || responseData
    
    const result: ScrapeResult = {
      url: url,
      content: data.markdown || data.content || '',
      title: data.metadata?.title || data.title,
      description: data.metadata?.description || data.description
    }

    console.log(`✅ Website scraped successfully: ${result.content.length} characters`)
    
    return {
      isSuccess: true,
      message: "Website scraped successfully",
      data: result
    }
  } catch (error) {
    console.error("Error scraping website:", error)
    return { 
      isSuccess: false, 
      message: `Failed to scrape website: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

export async function testFirecrawlConnectionAction(): Promise<ActionState<{ status: string }>> {
  try {
    if (!process.env.FIRECRAWL_API_KEY) {
      return { 
        isSuccess: false, 
        message: "Firecrawl API key not configured" 
      }
    }

    // Test with a simple, reliable website
    const testUrl = "https://example.com"
    const scrapeResponse = await firecrawl.scrapeUrl(testUrl, {
      formats: ['markdown'],
      timeout: 10000
    })

    if (!scrapeResponse || !scrapeResponse.success) {
      return {
        isSuccess: false,
        message: `Firecrawl test failed: ${scrapeResponse?.error || 'Unknown error'}`
      }
    }

    return {
      isSuccess: true,
      message: "Firecrawl connection test successful",
      data: { status: "connected" }
    }
  } catch (error) {
    console.error("Error testing Firecrawl connection:", error)
    return { 
      isSuccess: false, 
      message: `Firecrawl connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
} 