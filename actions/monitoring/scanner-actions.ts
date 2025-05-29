"use server"

/*
<ai_context>
Scanner actions for real-time lead monitoring.
Handles lightweight Reddit scanning to find new posts and add them to potential_leads_feed.
</ai_context>
*/

import { db } from "@/db/db"
import { ActionState } from "@/types"
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from "firebase/firestore"
import {
  CampaignMonitorDocument,
  SerializedCampaignMonitorDocument,
  MONITORING_COLLECTIONS
} from "@/db/schema"
import {
  POTENTIAL_LEADS_COLLECTIONS,
  CreatePotentialLeadData,
  formatRedditPostId,
  createKeywordSubredditKey
} from "@/db/schema"
import { getCampaignByIdAction } from "@/actions/db/campaign-actions"

// Reddit API integration
import { searchRedditAction } from "@/actions/integrations/reddit/reddit-search-actions"

/**
 * Scan for new Reddit posts matching keywords for a specific campaign monitor
 */
export async function scanForNewPostsByMonitorAction(
  monitor: SerializedCampaignMonitorDocument
): Promise<ActionState<{
  postsFound: number
  newPostsAdded: number
  apiCallsUsed: number
}>> {
  console.log("🔍 [SCANNER] Starting scan for monitor:", monitor.id, "campaign:", monitor.campaignId)

  try {
    // Get campaign details to access keywords
    const campaignResult = await getCampaignByIdAction(monitor.campaignId)
    if (!campaignResult.isSuccess || !campaignResult.data) {
      throw new Error("Campaign not found")
    }

    const campaign = campaignResult.data
    if (!campaign.keywords || campaign.keywords.length === 0) {
      console.log("🔍 [SCANNER] No keywords found for campaign")
      return {
        isSuccess: true,
        message: "No keywords to scan",
        data: { postsFound: 0, newPostsAdded: 0, apiCallsUsed: 0 }
      }
    }

    console.log("🔍 [SCANNER] Scanning for keywords:", campaign.keywords)

    let totalPostsFound = 0
    let totalNewPostsAdded = 0
    let totalApiCalls = 0

    // Scan each keyword
    for (const keyword of campaign.keywords) {
      console.log(`🔍 [SCANNER] Scanning keyword: "${keyword}"`)

      try {
        // Search for recent posts containing this keyword
        // Use a broad search across multiple subreddits
        const searchResult = await searchRedditAction(
          monitor.organizationId,
          keyword,
          {
            sort: "new", // Get newest posts first
            time: "day", // Posts from last 24 hours
            limit: 25 // Reasonable limit for each keyword
          }
        )

        totalApiCalls += 1

        if (!searchResult.isSuccess || !searchResult.data) {
          console.error(`🔍 [SCANNER] Failed to search for keyword "${keyword}":`, searchResult.message)
          continue
        }

        const posts = searchResult.data
        console.log(`🔍 [SCANNER] Found ${posts.length} posts for keyword "${keyword}"`)
        totalPostsFound += posts.length

        // Process each post
        for (const post of posts) {
          try {
            // Create Reddit post ID
            const redditPostId = formatRedditPostId(post.id)
            
            // Check if we already have this post
            const existingQuery = query(
              collection(db, POTENTIAL_LEADS_COLLECTIONS.POTENTIAL_LEADS_FEED),
              where("id", "==", redditPostId),
              where("campaignId", "==", monitor.campaignId)
            )
            const existingSnapshot = await getDocs(existingQuery)

            if (!existingSnapshot.empty) {
              console.log(`🔍 [SCANNER] Post ${redditPostId} already exists, skipping`)
              continue
            }

            // Extract subreddit from permalink
            const subreddit = post.subreddit || "unknown"

            // Create potential lead
            const potentialLeadData: CreatePotentialLeadData = {
              id: redditPostId,
              organizationId: monitor.organizationId,
              campaignId: monitor.campaignId,
              matchedKeywords: [keyword],
              subreddit,
              title: post.title,
              author: post.author,
              created_utc: post.created_utc,
              permalink: post.permalink,
              content_snippet: post.selftext ? 
                post.selftext.substring(0, 200) + (post.selftext.length > 200 ? "..." : "") :
                "(No content)",
              status: "new"
            }

            // Add to potential leads feed
            const potentialLeadRef = doc(collection(db, POTENTIAL_LEADS_COLLECTIONS.POTENTIAL_LEADS_FEED), redditPostId)
            await setDoc(potentialLeadRef, {
              ...potentialLeadData,
              discovered_at: serverTimestamp(),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })

            console.log(`🔍 [SCANNER] ✅ Added new potential lead: ${redditPostId} (${post.title})`)
            totalNewPostsAdded++

            // Update the last checked post ID for this keyword-subreddit combo
            const keywordSubredditKey = createKeywordSubredditKey(keyword, subreddit)
            const updatedLastCheckedIds = {
              ...monitor.last_checked_post_ids,
              [keywordSubredditKey]: redditPostId
            }

            // Update monitor with new last checked post ID
            const monitorRef = doc(db, MONITORING_COLLECTIONS.CAMPAIGN_MONITORS, monitor.id)
            await updateDoc(monitorRef, {
              last_checked_post_ids: updatedLastCheckedIds,
              updatedAt: serverTimestamp()
            })

          } catch (error) {
            console.error(`🔍 [SCANNER] Error processing post ${post.id}:`, error)
          }
        }

      } catch (error) {
        console.error(`🔍 [SCANNER] Error scanning keyword "${keyword}":`, error)
      }
    }

    console.log(`🔍 [SCANNER] ✅ Scan complete - Found: ${totalPostsFound}, Added: ${totalNewPostsAdded}, API calls: ${totalApiCalls}`)

    return {
      isSuccess: true,
      message: `Scan completed - found ${totalPostsFound} posts, added ${totalNewPostsAdded} new leads`,
      data: {
        postsFound: totalPostsFound,
        newPostsAdded: totalNewPostsAdded,
        apiCallsUsed: totalApiCalls
      }
    }

  } catch (error) {
    console.error("🔍 [SCANNER] ❌ Scan failed:", error)
    return {
      isSuccess: false,
      message: `Scan failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

/**
 * Perform a quick heuristic score for a post during scanning
 * This is optional and lightweight - main scoring happens during qualification
 */
function calculateQuickScore(post: any, keyword: string): number {
  let score = 50 // Base score

  // Title contains keyword
  if (post.title.toLowerCase().includes(keyword.toLowerCase())) {
    score += 20
  }

  // Content contains keyword
  if (post.selftext && post.selftext.toLowerCase().includes(keyword.toLowerCase())) {
    score += 15
  }

  // Recent post (within last 6 hours gets boost)
  const sixHoursAgo = Math.floor(Date.now() / 1000) - (6 * 60 * 60)
  if (post.created_utc > sixHoursAgo) {
    score += 10
  }

  // High engagement posts
  if (post.score && post.score > 10) {
    score += 5
  }

  return Math.min(100, Math.max(0, score))
} 