/*
<ai_context>
This file contains actions for interacting with the Google Custom Search API.
Used to search for Reddit threads based on keywords.
</ai_context>
*/

"use server"

import { ActionState, GoogleSearchResult } from "@/types"

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID

export async function searchRedditThreadsAction(
  keyword: string,
  numResults: number = 10
): Promise<ActionState<GoogleSearchResult[]>> {
  console.log("🔍🔍🔍 [GOOGLE-SEARCH] ========== SEARCH START ==========")
  console.log("🔍🔍🔍 [GOOGLE-SEARCH] Timestamp:", new Date().toISOString())
  console.log("🔍🔍🔍 [GOOGLE-SEARCH] Keyword:", keyword)
  console.log("🔍🔍🔍 [GOOGLE-SEARCH] Requested results:", numResults)
  console.log("🔍🔍🔍 [GOOGLE-SEARCH] API Key exists:", !!GOOGLE_API_KEY)
  console.log(
    "🔍🔍🔍 [GOOGLE-SEARCH] Search Engine ID exists:",
    !!GOOGLE_SEARCH_ENGINE_ID
  )

  if (!GOOGLE_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
    console.log("🔍🔍🔍 [GOOGLE-SEARCH] ❌ Missing API credentials")
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH] GOOGLE_API_KEY:",
      GOOGLE_API_KEY ? "Present" : "Missing"
    )
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH] GOOGLE_SEARCH_ENGINE_ID:",
      GOOGLE_SEARCH_ENGINE_ID ? "Present" : "Missing"
    )
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH] ========== SEARCH END (NO CREDENTIALS) =========="
    )
    return {
      isSuccess: false,
      message: "Google Search API credentials not configured"
    }
  }

  try {
    // Check if keyword already includes "reddit" at the end
    const includesReddit = keyword.toLowerCase().includes('reddit')
    
    // If keyword already includes reddit, use as-is
    // Otherwise, add site:reddit.com for better results
    const searchQuery = includesReddit 
      ? keyword  // New format: keyword already includes reddit
      : `${keyword} site:reddit.com`  // Old format: add site restriction
      
    console.log("🔍🔍🔍 [GOOGLE-SEARCH] Full search query:", searchQuery)

    const url = new URL("https://www.googleapis.com/customsearch/v1")
    url.searchParams.append("key", GOOGLE_API_KEY)
    url.searchParams.append("cx", GOOGLE_SEARCH_ENGINE_ID)
    url.searchParams.append("q", searchQuery)
    url.searchParams.append("num", numResults.toString())

    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH] API URL:",
      url.toString().replace(GOOGLE_API_KEY, "***API_KEY***")
    )
    console.log("🔍🔍🔍 [GOOGLE-SEARCH] Making API request...")

    const response = await fetch(url.toString())
    console.log("🔍🔍🔍 [GOOGLE-SEARCH] Response status:", response.status)
    console.log("🔍🔍🔍 [GOOGLE-SEARCH] Response OK:", response.ok)
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH] Response headers:",
      Object.fromEntries(response.headers.entries())
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.log("🔍🔍🔍 [GOOGLE-SEARCH] ❌ API request failed")
      console.log("🔍🔍🔍 [GOOGLE-SEARCH] Error response:", errorText)
      console.log(
        "🔍🔍🔍 [GOOGLE-SEARCH] ========== SEARCH END (API ERROR) =========="
      )
      throw new Error(`Google Search API error: ${response.status}`)
    }

    const data = await response.json()
    console.log("🔍🔍🔍 [GOOGLE-SEARCH] Response data received")
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH] Total results:",
      data.searchInformation?.totalResults
    )
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH] Search time:",
      data.searchInformation?.searchTime
    )
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH] Items returned:",
      data.items?.length || 0
    )

    if (!data.items || data.items.length === 0) {
      console.log("🔍🔍🔍 [GOOGLE-SEARCH] ⚠️ No results found")
      console.log(
        "🔍🔍🔍 [GOOGLE-SEARCH] ========== SEARCH END (NO RESULTS) =========="
      )
      return {
        isSuccess: true,
        message: "No results found",
        data: []
      }
    }

    // Extract Reddit thread IDs from URLs
    const results: GoogleSearchResult[] = data.items.map(
      (item: any, index: number) => {
        console.log(`🔍🔍🔍 [GOOGLE-SEARCH] Processing result ${index + 1}:`)
        console.log(`🔍🔍🔍 [GOOGLE-SEARCH] - Title: ${item.title}`)
        console.log(`🔍🔍🔍 [GOOGLE-SEARCH] - Link: ${item.link}`)
        console.log(
          `🔍🔍🔍 [GOOGLE-SEARCH] - Snippet length: ${item.snippet?.length || 0}`
        )

        // Extract thread ID from Reddit URL
        // Example: https://www.reddit.com/r/subreddit/comments/abc123/title/
        const threadIdMatch = item.link.match(/\/comments\/([a-zA-Z0-9]+)/)
        const threadId = threadIdMatch ? threadIdMatch[1] : undefined
        console.log(
          `🔍🔍🔍 [GOOGLE-SEARCH] - Extracted thread ID: ${threadId || "None"}`
        )

        return {
          title: item.title,
          link: item.link,
          snippet: item.snippet || "",
          position: index + 1,
          threadId
        }
      }
    )

    console.log("🔍🔍🔍 [GOOGLE-SEARCH] ✅ Search completed successfully")
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH] Total results processed:",
      results.length
    )
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH] Results with thread IDs:",
      results.filter(r => r.threadId).length
    )
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH] ========== SEARCH END (SUCCESS) =========="
    )

    return {
      isSuccess: true,
      message: `Found ${results.length} Reddit threads`,
      data: results
    }
  } catch (error) {
    console.log("🔍🔍🔍 [GOOGLE-SEARCH] ❌ Exception caught")
    console.log("🔍🔍🔍 [GOOGLE-SEARCH] Error type:", typeof error)
    console.log("🔍🔍🔍 [GOOGLE-SEARCH] Error:", error)
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH] Error message:",
      error instanceof Error ? error.message : "Unknown error"
    )
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    )
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH] ========== SEARCH END (EXCEPTION) =========="
    )

    return {
      isSuccess: false,
      message: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function searchMultipleKeywordsAction(
  keywords: string[],
  numResultsPerKeyword: number = 10
): Promise<ActionState<{ keyword: string; results: GoogleSearchResult[] }[]>> {
  console.log(
    "🔍🔍🔍 [GOOGLE-SEARCH-MULTI] ========== MULTI-SEARCH START =========="
  )
  console.log(
    "🔍🔍🔍 [GOOGLE-SEARCH-MULTI] Timestamp:",
    new Date().toISOString()
  )
  console.log("🔍🔍🔍 [GOOGLE-SEARCH-MULTI] Keywords count:", keywords.length)
  console.log("🔍🔍🔍 [GOOGLE-SEARCH-MULTI] Keywords:", keywords)
  console.log(
    "🔍🔍🔍 [GOOGLE-SEARCH-MULTI] Results per keyword:",
    numResultsPerKeyword
  )

  try {
    console.log("🔍🔍🔍 [GOOGLE-SEARCH-MULTI] Starting parallel searches...")
    const searchPromises = keywords.map(async (keyword, index) => {
      console.log(
        `🔍🔍🔍 [GOOGLE-SEARCH-MULTI] Initiating search ${index + 1}/${keywords.length} for: "${keyword}"`
      )
      const result = await searchRedditThreadsAction(
        keyword,
        numResultsPerKeyword
      )
      console.log(
        `🔍🔍🔍 [GOOGLE-SEARCH-MULTI] Search ${index + 1} completed:`,
        {
          keyword,
          success: result.isSuccess,
          resultCount: result.data?.length || 0
        }
      )
      return {
        keyword,
        results: result.isSuccess ? result.data : []
      }
    })

    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH-MULTI] Waiting for all searches to complete..."
    )
    const allResults = await Promise.all(searchPromises)

    const totalResults = allResults.reduce(
      (sum, r) => sum + r.results.length,
      0
    )
    console.log("🔍🔍🔍 [GOOGLE-SEARCH-MULTI] ✅ All searches completed")
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH-MULTI] Total results across all keywords:",
      totalResults
    )
    console.log("🔍🔍🔍 [GOOGLE-SEARCH-MULTI] Results breakdown:")
    allResults.forEach(r => {
      console.log(
        `🔍🔍🔍 [GOOGLE-SEARCH-MULTI] - "${r.keyword}": ${r.results.length} results`
      )
    })
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH-MULTI] ========== MULTI-SEARCH END (SUCCESS) =========="
    )

    return {
      isSuccess: true,
      message: `Found ${totalResults} total results across ${keywords.length} keywords`,
      data: allResults
    }
  } catch (error) {
    console.log("🔍🔍🔍 [GOOGLE-SEARCH-MULTI] ❌ Exception caught")
    console.log("🔍🔍🔍 [GOOGLE-SEARCH-MULTI] Error type:", typeof error)
    console.log("🔍🔍🔍 [GOOGLE-SEARCH-MULTI] Error:", error)
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH-MULTI] Error message:",
      error instanceof Error ? error.message : "Unknown error"
    )
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH-MULTI] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    )
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH-MULTI] ========== MULTI-SEARCH END (EXCEPTION) =========="
    )

    return {
      isSuccess: false,
      message: `Multiple search failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function testGoogleSearchConnectionAction(): Promise<
  ActionState<boolean>
> {
  console.log(
    "🔍🔍🔍 [GOOGLE-SEARCH-TEST] ========== CONNECTION TEST START =========="
  )
  console.log(
    "🔍🔍🔍 [GOOGLE-SEARCH-TEST] Timestamp:",
    new Date().toISOString()
  )
  console.log(
    "🔍🔍🔍 [GOOGLE-SEARCH-TEST] Testing Google Search API connection..."
  )

  try {
    console.log(
      "��🔍🔍 [GOOGLE-SEARCH-TEST] Running test search with query: 'test site:reddit.com'"
    )
    const result = await searchRedditThreadsAction("test", 1)

    console.log("🔍🔍🔍 [GOOGLE-SEARCH-TEST] Test result:", {
      isSuccess: result.isSuccess,
      message: result.message,
      hasData: !!result.data
    })

    if (result.isSuccess) {
      console.log("🔍🔍🔍 [GOOGLE-SEARCH-TEST] ✅ Google Search API is working")
      console.log(
        "🔍🔍🔍 [GOOGLE-SEARCH-TEST] ========== CONNECTION TEST END (SUCCESS) =========="
      )
      return {
        isSuccess: true,
        message: "Google Search API is working",
        data: true
      }
    } else {
      console.log(
        "🔍🔍🔍 [GOOGLE-SEARCH-TEST] ❌ Google Search API test failed"
      )
      console.log(
        "🔍🔍🔍 [GOOGLE-SEARCH-TEST] ========== CONNECTION TEST END (FAILED) =========="
      )
      return {
        isSuccess: false,
        message: result.message
      }
    }
  } catch (error) {
    console.log("🔍🔍🔍 [GOOGLE-SEARCH-TEST] ❌ Exception during test")
    console.log("🔍🔍🔍 [GOOGLE-SEARCH-TEST] Error:", error)
    console.log(
      "🔍🔍🔍 [GOOGLE-SEARCH-TEST] ========== CONNECTION TEST END (EXCEPTION) =========="
    )

    return {
      isSuccess: false,
      message: `Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}
