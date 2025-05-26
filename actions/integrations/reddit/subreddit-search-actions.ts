"use server"

import { ActionState } from "@/types"
import fs from "fs"
import path from "path"
import { parse } from "csv-parse/sync"

export interface SubredditData {
  base10_id: string
  base36_reddit_id: string
  creation_epoch: string
  subreddit_name: string
  subscribers_count: string
}

export async function searchSubredditsAction(
  query: string,
  limit: number = 50
): Promise<ActionState<SubredditData[]>> {
  console.log("🔍 [SUBREDDIT-SEARCH] Starting subreddit search")
  console.log("🔍 [SUBREDDIT-SEARCH] Query:", query)
  console.log("🔍 [SUBREDDIT-SEARCH] Limit:", limit)

  try {
    if (!query || query.trim().length < 2) {
      return {
        isSuccess: true,
        message: "Query too short",
        data: []
      }
    }

    const csvPath = path.join(process.cwd(), "data", "subreddits_public.csv")
    
    if (!fs.existsSync(csvPath)) {
      console.error("🔍 [SUBREDDIT-SEARCH] CSV file not found:", csvPath)
      return {
        isSuccess: false,
        message: "Subreddit data file not found"
      }
    }

    console.log("🔍 [SUBREDDIT-SEARCH] Reading CSV file...")
    const csvContent = fs.readFileSync(csvPath, "utf-8")
    
    // Parse CSV with streaming to handle large file
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      cast: false,
      relax_column_count: true, // Allow inconsistent column counts
      relax_quotes: true, // Handle malformed quotes
      on_record: (record: any) => {
        // Filter out records with missing required fields
        if (!record.subreddit_name || record.subreddit_name.trim() === '') {
          return null
        }
        return record
      }
    }) as SubredditData[]

    console.log("🔍 [SUBREDDIT-SEARCH] Total subreddits loaded:", records.length)

    // Filter subreddits based on query
    const searchTerm = query.toLowerCase().trim()
    const filteredSubreddits = records
      .filter(subreddit => 
        subreddit && 
        subreddit.subreddit_name && 
        typeof subreddit.subreddit_name === 'string' &&
        subreddit.subreddit_name.trim() !== '' &&
        subreddit.subreddit_name.toLowerCase().includes(searchTerm)
      )
      .sort((a, b) => {
        // Sort by exact match first, then by subscriber count
        const aExact = a.subreddit_name.toLowerCase() === searchTerm
        const bExact = b.subreddit_name.toLowerCase() === searchTerm
        
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        
        // Then by subscriber count (descending)
        const aCount = a.subscribers_count === 'None' ? 0 : parseInt(a.subscribers_count) || 0
        const bCount = b.subscribers_count === 'None' ? 0 : parseInt(b.subscribers_count) || 0
        return bCount - aCount
      })
      .slice(0, limit)

    console.log("🔍 [SUBREDDIT-SEARCH] Filtered results:", filteredSubreddits.length)

    return {
      isSuccess: true,
      message: `Found ${filteredSubreddits.length} subreddits`,
      data: filteredSubreddits
    }
  } catch (error) {
    console.error("🔍 [SUBREDDIT-SEARCH] Error:", error)
    return {
      isSuccess: false,
      message: `Failed to search subreddits: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function getPopularSubredditsAction(
  limit: number = 100
): Promise<ActionState<SubredditData[]>> {
  console.log("🔍 [SUBREDDIT-SEARCH] Getting popular subreddits")
  console.log("🔍 [SUBREDDIT-SEARCH] Limit:", limit)

  try {
    const csvPath = path.join(process.cwd(), "data", "subreddits_public.csv")
    
    if (!fs.existsSync(csvPath)) {
      console.error("🔍 [SUBREDDIT-SEARCH] CSV file not found:", csvPath)
      return {
        isSuccess: false,
        message: "Subreddit data file not found"
      }
    }

    console.log("🔍 [SUBREDDIT-SEARCH] Reading CSV file...")
    const csvContent = fs.readFileSync(csvPath, "utf-8")
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      cast: false,
      relax_column_count: true, // Allow inconsistent column counts
      relax_quotes: true, // Handle malformed quotes
      on_record: (record: any) => {
        // Filter out records with missing required fields
        if (!record.subreddit_name || record.subreddit_name.trim() === '') {
          return null
        }
        return record
      }
    }) as SubredditData[]

    // Sort by subscriber count and take top results
    const popularSubreddits = records
      .filter(subreddit => 
        subreddit && 
        subreddit.subreddit_name && 
        typeof subreddit.subreddit_name === 'string' &&
        subreddit.subreddit_name.trim() !== '' &&
        subreddit.subscribers_count &&
        subreddit.subscribers_count !== 'None' &&
        !isNaN(parseInt(subreddit.subscribers_count)) &&
        parseInt(subreddit.subscribers_count) > 1000
      ) // Filter out very small subreddits
      .sort((a, b) => parseInt(b.subscribers_count) - parseInt(a.subscribers_count))
      .slice(0, limit)

    console.log("🔍 [SUBREDDIT-SEARCH] Popular subreddits found:", popularSubreddits.length)

    return {
      isSuccess: true,
      message: `Found ${popularSubreddits.length} popular subreddits`,
      data: popularSubreddits
    }
  } catch (error) {
    console.error("🔍 [SUBREDDIT-SEARCH] Error:", error)
    return {
      isSuccess: false,
      message: `Failed to get popular subreddits: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 