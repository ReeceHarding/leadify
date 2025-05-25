/*
<ai_context>
Contains server actions for Google Custom Search API integration to find Reddit threads.
</ai_context>
*/

"use server"

import { ActionState } from "@/types"

export interface GoogleSearchResult {
  title: string
  link: string
  snippet: string
  displayLink: string
  position: number
}

export interface RedditSearchResult extends GoogleSearchResult {
  threadId?: string // Extracted Reddit thread ID
  subreddit?: string // Extracted subreddit name
}

export async function searchRedditThreadsAction(
  keyword: string,
  maxResults = 10
): Promise<ActionState<RedditSearchResult[]>> {
  try {
    if (
      !process.env.GOOGLE_SEARCH_API_KEY ||
      !process.env.GOOGLE_SEARCH_ENGINE_ID
    ) {
      return {
        isSuccess: false,
        message: "Google Search API credentials not configured"
      }
    }

    // Format search query to specifically target Reddit
    const searchQuery = `${keyword} site:reddit.com`
    console.log(`🔍 Searching Google for: "${searchQuery}"`)

    // Build Google Custom Search API URL
    const apiUrl = new URL("https://www.googleapis.com/customsearch/v1")
    apiUrl.searchParams.set("key", process.env.GOOGLE_SEARCH_API_KEY)
    apiUrl.searchParams.set("cx", process.env.GOOGLE_SEARCH_ENGINE_ID)
    apiUrl.searchParams.set("q", searchQuery)
    apiUrl.searchParams.set("num", Math.min(maxResults, 10).toString()) // Max 10 per request
    apiUrl.searchParams.set("start", "1")

    const response = await fetch(apiUrl.toString())

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Google Search API error:", response.status, errorText)
      return {
        isSuccess: false,
        message: `Google Search API error: ${response.status} ${response.statusText}`
      }
    }

    const data = await response.json()

    if (!data.items || !Array.isArray(data.items)) {
      return {
        isSuccess: true,
        message: "No search results found",
        data: []
      }
    }

    // Process and enhance results with Reddit-specific data
    const results: RedditSearchResult[] = data.items.map(
      (item: any, index: number) => {
        const result: RedditSearchResult = {
          title: item.title || "",
          link: item.link || "",
          snippet: item.snippet || "",
          displayLink: item.displayLink || "",
          position: index + 1
        }

        // Extract Reddit thread ID from URL
        // URL format: https://www.reddit.com/r/healthcare/comments/1i2m7ya/comment/mjnc73e/
        const redditUrlMatch = result.link.match(
          /\/r\/([^\/]+)\/comments\/([^\/]+)/
        )
        if (redditUrlMatch) {
          result.subreddit = redditUrlMatch[1]
          result.threadId = redditUrlMatch[2]
        }

        return result
      }
    )

    // Filter to only include results that have Reddit thread IDs
    const redditResults = results.filter(result => result.threadId)

    console.log(
      `✅ Found ${redditResults.length} Reddit threads for keyword: "${keyword}"`
    )

    return {
      isSuccess: true,
      message: `Found ${redditResults.length} Reddit search results`,
      data: redditResults
    }
  } catch (error) {
    console.error("Error searching Reddit threads:", error)
    return {
      isSuccess: false,
      message: `Failed to search Reddit threads: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function searchMultipleKeywordsAction(
  keywords: string[],
  maxResultsPerKeyword = 10
): Promise<ActionState<{ keyword: string; results: RedditSearchResult[] }[]>> {
  try {
    const allResults: { keyword: string; results: RedditSearchResult[] }[] = []

    console.log(`🔍 Searching for ${keywords.length} keywords...`)

    for (const keyword of keywords) {
      const searchResult = await searchRedditThreadsAction(
        keyword,
        maxResultsPerKeyword
      )

      if (searchResult.isSuccess) {
        allResults.push({
          keyword,
          results: searchResult.data
        })

        // Add a small delay between requests to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 1000))
      } else {
        console.error(
          `Failed to search for keyword "${keyword}":`,
          searchResult.message
        )
        // Continue with other keywords even if one fails
        allResults.push({
          keyword,
          results: []
        })
      }
    }

    const totalResults = allResults.reduce(
      (sum, item) => sum + item.results.length,
      0
    )

    return {
      isSuccess: true,
      message: `Completed search for ${keywords.length} keywords, found ${totalResults} total results`,
      data: allResults
    }
  } catch (error) {
    console.error("Error in multiple keyword search:", error)
    return {
      isSuccess: false,
      message: `Failed to search multiple keywords: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function testGoogleSearchConnectionAction(): Promise<
  ActionState<{ status: string }>
> {
  try {
    if (
      !process.env.GOOGLE_SEARCH_API_KEY ||
      !process.env.GOOGLE_SEARCH_ENGINE_ID
    ) {
      return {
        isSuccess: false,
        message: "Google Search API credentials not configured"
      }
    }

    // Test with a simple search
    const testResult = await searchRedditThreadsAction("test", 1)

    if (testResult.isSuccess) {
      return {
        isSuccess: true,
        message: "Google Search API connection test successful",
        data: { status: "connected" }
      }
    } else {
      return {
        isSuccess: false,
        message: `Google Search API test failed: ${testResult.message}`
      }
    }
  } catch (error) {
    console.error("Error testing Google Search connection:", error)
    return {
      isSuccess: false,
      message: `Google Search connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}
