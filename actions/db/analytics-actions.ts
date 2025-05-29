"use server"

import { db } from "@/db/db"
import {
  LEAD_COLLECTIONS,
  type GeneratedCommentDocument,
  type CampaignDocument
} from "@/db/firestore/lead-generation-collections"
import {
  KEYWORD_PERFORMANCE_COLLECTIONS,
  type KeywordPerformanceDocument,
  type DailyAnalyticsSnapshotDocument,
  type CreateDailyAnalyticsSnapshotData
} from "@/db/firestore/keyword-performance-collections"
import { ActionState } from "@/types"
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  endBefore,
  serverTimestamp,
  Timestamp,
  writeBatch
} from "firebase/firestore"
import { removeUndefinedValues } from "@/lib/firebase-utils"

// ============================================================================
// ANALYTICS OVERVIEW TYPES
// ============================================================================

export interface AnalyticsOverview {
  totalLeads: number
  avgRelevanceScore: number
  postingSuccessRate: number
  avgEngagement: number
  timeRange: string
}

export interface AnalyticsDateRange {
  start: Timestamp
  end: Timestamp
}

export interface LeadsOverTimeDataPoint {
  date: string // ISO date string
  leads: number
  highQualityLeads: number
}

export interface RelevanceDistribution {
  range: string // e.g., "0-20", "21-40", etc.
  count: number
}

export interface EngagementOverTimeDataPoint {
  date: string
  upvotes: number
  replies: number
  avgEngagementPerPost: number
}

export interface CampaignPerformance {
  campaignId: string
  campaignName: string
  totalLeads: number
  avgRelevanceScore: number
  totalEngagement: number
  avgEngagement: number
}

export interface KeywordPerformanceData {
  keyword: string
  leadsGenerated: number
  avgRelevanceScore: number
  avgEngagement: number
  topPostExample?: {
    title: string
    score: number
    url: string
  }
}

export interface TopPerformingComment {
  id: string
  postTitle: string
  postUrl: string
  postedCommentUrl?: string
  upvotes: number
  replies: number
  relevanceScore: number
  keyword?: string
  campaignName?: string
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function createDateRange(range: "today" | "7days" | "30days" | "custom", customStart?: Date, customEnd?: Date): AnalyticsDateRange {
  console.log(`📊 [ANALYTICS] Creating date range for: ${range}`)
  
  const now = new Date()
  let start: Date
  let end: Date = now

  switch (range) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case "7days":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case "30days":
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case "custom":
      start = customStart || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      end = customEnd || now
      break
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  console.log(`📊 [ANALYTICS] Date range: ${start.toISOString()} to ${end.toISOString()}`)

  return {
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end)
  }
}

function getDateString(timestamp: Timestamp): string {
  return timestamp.toDate().toISOString().split('T')[0]
}

// ============================================================================
// MAIN ANALYTICS ACTIONS
// ============================================================================

export async function getOrganizationAnalyticsAction(
  organizationId: string,
  dateRange: "today" | "7days" | "30days" | "custom" = "30days",
  customStart?: Date,
  customEnd?: Date
): Promise<ActionState<AnalyticsOverview>> {
  try {
    console.log(`\n📊 [ANALYTICS] ====== FETCHING ORGANIZATION ANALYTICS ======`)
    console.log(`📊 [ANALYTICS] Organization ID: ${organizationId}`)
    console.log(`📊 [ANALYTICS] Date Range: ${dateRange}`)

    const { start, end } = createDateRange(dateRange, customStart, customEnd)

    // Get all campaigns for this organization
    const campaignsRef = collection(db, LEAD_COLLECTIONS.CAMPAIGNS)
    const campaignsQuery = query(campaignsRef, where("organizationId", "==", organizationId))
    const campaignsSnapshot = await getDocs(campaignsQuery)

    if (campaignsSnapshot.empty) {
      console.log(`📊 [ANALYTICS] No campaigns found for organization`)
      return {
        isSuccess: true,
        message: "Analytics retrieved successfully",
        data: {
          totalLeads: 0,
          avgRelevanceScore: 0,
          postingSuccessRate: 0,
          avgEngagement: 0,
          timeRange: dateRange
        }
      }
    }

    const campaignIds = campaignsSnapshot.docs.map(doc => doc.id)
    console.log(`📊 [ANALYTICS] Found ${campaignIds.length} campaigns`)

    // Get all generated comments for these campaigns within date range
    const commentsRef = collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS)
    const commentsQuery = query(
      commentsRef,
      where("organizationId", "==", organizationId),
      where("createdAt", ">=", start),
      where("createdAt", "<=", end)
    )
    const commentsSnapshot = await getDocs(commentsQuery)

    console.log(`📊 [ANALYTICS] Found ${commentsSnapshot.docs.length} comments in date range`)

    const comments = commentsSnapshot.docs.map(doc => doc.data() as GeneratedCommentDocument)

    // Calculate metrics
    const totalLeads = comments.length
    const avgRelevanceScore = totalLeads > 0 
      ? comments.reduce((sum, comment) => sum + comment.relevanceScore, 0) / totalLeads 
      : 0

    const postedComments = comments.filter(comment => comment.status === "posted")
    const postingSuccessRate = totalLeads > 0 ? (postedComments.length / totalLeads) * 100 : 0

    const totalUpvotes = postedComments.reduce((sum, comment) => sum + (comment.engagementUpvotes || 0), 0)
    const totalReplies = postedComments.reduce((sum, comment) => sum + (comment.engagementRepliesCount || 0), 0)
    const avgEngagement = postedComments.length > 0 
      ? (totalUpvotes + totalReplies) / postedComments.length 
      : 0

    console.log(`📊 [ANALYTICS] Calculated metrics:`, {
      totalLeads,
      avgRelevanceScore: Math.round(avgRelevanceScore * 100) / 100,
      postingSuccessRate: Math.round(postingSuccessRate * 100) / 100,
      avgEngagement: Math.round(avgEngagement * 100) / 100
    })

    return {
      isSuccess: true,
      message: "Analytics retrieved successfully",
      data: {
        totalLeads,
        avgRelevanceScore: Math.round(avgRelevanceScore * 100) / 100,
        postingSuccessRate: Math.round(postingSuccessRate * 100) / 100,
        avgEngagement: Math.round(avgEngagement * 100) / 100,
        timeRange: dateRange
      }
    }
  } catch (error) {
    console.error("❌ [ANALYTICS] Error getting organization analytics:", error)
    return { isSuccess: false, message: "Failed to get organization analytics" }
  }
}

export async function getCampaignAnalyticsAction(
  campaignId: string,
  dateRange: "today" | "7days" | "30days" | "custom" = "30days",
  customStart?: Date,
  customEnd?: Date
): Promise<ActionState<AnalyticsOverview>> {
  try {
    console.log(`\n📊 [ANALYTICS] ====== FETCHING CAMPAIGN ANALYTICS ======`)
    console.log(`📊 [ANALYTICS] Campaign ID: ${campaignId}`)
    console.log(`📊 [ANALYTICS] Date Range: ${dateRange}`)

    const { start, end } = createDateRange(dateRange, customStart, customEnd)

    // Get generated comments for this campaign within date range
    const commentsRef = collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS)
    const commentsQuery = query(
      commentsRef,
      where("campaignId", "==", campaignId),
      where("createdAt", ">=", start),
      where("createdAt", "<=", end)
    )
    const commentsSnapshot = await getDocs(commentsQuery)

    console.log(`📊 [ANALYTICS] Found ${commentsSnapshot.docs.length} comments for campaign`)

    const comments = commentsSnapshot.docs.map(doc => doc.data() as GeneratedCommentDocument)

    // Calculate metrics (same as organization but for single campaign)
    const totalLeads = comments.length
    const avgRelevanceScore = totalLeads > 0 
      ? comments.reduce((sum, comment) => sum + comment.relevanceScore, 0) / totalLeads 
      : 0

    const postedComments = comments.filter(comment => comment.status === "posted")
    const postingSuccessRate = totalLeads > 0 ? (postedComments.length / totalLeads) * 100 : 0

    const totalUpvotes = postedComments.reduce((sum, comment) => sum + (comment.engagementUpvotes || 0), 0)
    const totalReplies = postedComments.reduce((sum, comment) => sum + (comment.engagementRepliesCount || 0), 0)
    const avgEngagement = postedComments.length > 0 
      ? (totalUpvotes + totalReplies) / postedComments.length 
      : 0

    console.log(`📊 [ANALYTICS] Campaign metrics calculated successfully`)

    return {
      isSuccess: true,
      message: "Campaign analytics retrieved successfully",
      data: {
        totalLeads,
        avgRelevanceScore: Math.round(avgRelevanceScore * 100) / 100,
        postingSuccessRate: Math.round(postingSuccessRate * 100) / 100,
        avgEngagement: Math.round(avgEngagement * 100) / 100,
        timeRange: dateRange
      }
    }
  } catch (error) {
    console.error("❌ [ANALYTICS] Error getting campaign analytics:", error)
    return { isSuccess: false, message: "Failed to get campaign analytics" }
  }
}

export async function getLeadsOverTimeAction(
  organizationId: string,
  campaignId?: string,
  dateRange: "today" | "7days" | "30days" | "custom" = "30days",
  customStart?: Date,
  customEnd?: Date
): Promise<ActionState<LeadsOverTimeDataPoint[]>> {
  try {
    console.log(`\n📊 [ANALYTICS] ====== FETCHING LEADS OVER TIME ======`)
    console.log(`📊 [ANALYTICS] Organization ID: ${organizationId}`)
    console.log(`📊 [ANALYTICS] Campaign ID: ${campaignId || "All campaigns"}`)

    const { start, end } = createDateRange(dateRange, customStart, customEnd)

    // Build query
    const commentsRef = collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS)
    let commentsQuery
    
    if (campaignId) {
      commentsQuery = query(
        commentsRef,
        where("campaignId", "==", campaignId),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end),
        orderBy("createdAt")
      )
    } else {
      commentsQuery = query(
        commentsRef,
        where("organizationId", "==", organizationId),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end),
        orderBy("createdAt")
      )
    }

    const commentsSnapshot = await getDocs(commentsQuery)
    const comments = commentsSnapshot.docs.map(doc => doc.data() as GeneratedCommentDocument)

    console.log(`📊 [ANALYTICS] Processing ${comments.length} comments for time series`)

    // Group by date
    const dailyData = new Map<string, { leads: number; highQualityLeads: number }>()

    comments.forEach(comment => {
      const dateStr = getDateString(comment.createdAt)
      const current = dailyData.get(dateStr) || { leads: 0, highQualityLeads: 0 }
      
      current.leads += 1
      if (comment.relevanceScore >= 70) {
        current.highQualityLeads += 1
      }
      
      dailyData.set(dateStr, current)
    })

    // Convert to array and sort
    const timeSeriesData: LeadsOverTimeDataPoint[] = Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        leads: data.leads,
        highQualityLeads: data.highQualityLeads
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    console.log(`📊 [ANALYTICS] Generated ${timeSeriesData.length} data points for time series`)

    return {
      isSuccess: true,
      message: "Leads over time data retrieved successfully",
      data: timeSeriesData
    }
  } catch (error) {
    console.error("❌ [ANALYTICS] Error getting leads over time:", error)
    return { isSuccess: false, message: "Failed to get leads over time data" }
  }
}

export async function getRelevanceDistributionAction(
  organizationId: string,
  campaignId?: string,
  dateRange: "today" | "7days" | "30days" | "custom" = "30days",
  customStart?: Date,
  customEnd?: Date
): Promise<ActionState<RelevanceDistribution[]>> {
  try {
    console.log(`\n📊 [ANALYTICS] ====== FETCHING RELEVANCE DISTRIBUTION ======`)

    const { start, end } = createDateRange(dateRange, customStart, customEnd)

    // Build query
    const commentsRef = collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS)
    let commentsQuery
    
    if (campaignId) {
      commentsQuery = query(
        commentsRef,
        where("campaignId", "==", campaignId),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end)
      )
    } else {
      commentsQuery = query(
        commentsRef,
        where("organizationId", "==", organizationId),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end)
      )
    }

    const commentsSnapshot = await getDocs(commentsQuery)
    const comments = commentsSnapshot.docs.map(doc => doc.data() as GeneratedCommentDocument)

    console.log(`📊 [ANALYTICS] Processing ${comments.length} comments for relevance distribution`)

    // Create distribution buckets
    const distribution = {
      "0-20": 0,
      "21-40": 0,
      "41-60": 0,
      "61-80": 0,
      "81-100": 0
    }

    comments.forEach(comment => {
      const score = comment.relevanceScore
      if (score <= 20) distribution["0-20"]++
      else if (score <= 40) distribution["21-40"]++
      else if (score <= 60) distribution["41-60"]++
      else if (score <= 80) distribution["61-80"]++
      else distribution["81-100"]++
    })

    const distributionData: RelevanceDistribution[] = Object.entries(distribution).map(([range, count]) => ({
      range,
      count
    }))

    console.log(`📊 [ANALYTICS] Relevance distribution calculated:`, distribution)

    return {
      isSuccess: true,
      message: "Relevance distribution retrieved successfully",
      data: distributionData
    }
  } catch (error) {
    console.error("❌ [ANALYTICS] Error getting relevance distribution:", error)
    return { isSuccess: false, message: "Failed to get relevance distribution" }
  }
}

export async function getKeywordPerformanceAction(
  organizationId: string,
  campaignId?: string,
  dateRange: "today" | "7days" | "30days" | "custom" = "30days",
  customStart?: Date,
  customEnd?: Date
): Promise<ActionState<KeywordPerformanceData[]>> {
  try {
    console.log(`\n📊 [ANALYTICS] ====== FETCHING KEYWORD PERFORMANCE ======`)

    const { start, end } = createDateRange(dateRange, customStart, customEnd)

    // Get comments with keywords
    const commentsRef = collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS)
    let commentsQuery
    
    if (campaignId) {
      commentsQuery = query(
        commentsRef,
        where("campaignId", "==", campaignId),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end)
      )
    } else {
      commentsQuery = query(
        commentsRef,
        where("organizationId", "==", organizationId),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end)
      )
    }

    const commentsSnapshot = await getDocs(commentsQuery)
    const comments = commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as GeneratedCommentDocument & { id: string })

    console.log(`📊 [ANALYTICS] Processing ${comments.length} comments for keyword performance`)

    // Group by keyword
    const keywordData = new Map<string, {
      leads: number
      totalRelevanceScore: number
      totalUpvotes: number
      totalReplies: number
      topPost?: { title: string; score: number; url: string }
    }>()

    comments.forEach(comment => {
      if (!comment.keyword) return // Skip comments without keywords

      const keyword = comment.keyword
      const current = keywordData.get(keyword) || {
        leads: 0,
        totalRelevanceScore: 0,
        totalUpvotes: 0,
        totalReplies: 0
      }

      current.leads += 1
      current.totalRelevanceScore += comment.relevanceScore
      current.totalUpvotes += comment.engagementUpvotes || 0
      current.totalReplies += comment.engagementRepliesCount || 0

      // Track top performing post for this keyword
      if (!current.topPost || comment.relevanceScore > current.topPost.score) {
        current.topPost = {
          title: comment.postTitle,
          score: comment.relevanceScore,
          url: comment.postUrl
        }
      }

      keywordData.set(keyword, current)
    })

    // Convert to performance data
    const performanceData: KeywordPerformanceData[] = Array.from(keywordData.entries())
      .map(([keyword, data]) => ({
        keyword,
        leadsGenerated: data.leads,
        avgRelevanceScore: Math.round((data.totalRelevanceScore / data.leads) * 100) / 100,
        avgEngagement: data.leads > 0 ? Math.round(((data.totalUpvotes + data.totalReplies) / data.leads) * 100) / 100 : 0,
        topPostExample: data.topPost
      }))
      .sort((a, b) => b.leadsGenerated - a.leadsGenerated) // Sort by leads generated

    console.log(`📊 [ANALYTICS] Generated performance data for ${performanceData.length} keywords`)

    return {
      isSuccess: true,
      message: "Keyword performance retrieved successfully",
      data: performanceData
    }
  } catch (error) {
    console.error("❌ [ANALYTICS] Error getting keyword performance:", error)
    return { isSuccess: false, message: "Failed to get keyword performance" }
  }
}

export async function getTopPerformingCommentsAction(
  organizationId: string,
  campaignId?: string,
  dateRange: "today" | "7days" | "30days" | "custom" = "30days",
  metric: "upvotes" | "replies" = "upvotes",
  limitResults: number = 10,
  customStart?: Date,
  customEnd?: Date
): Promise<ActionState<TopPerformingComment[]>> {
  try {
    console.log(`\n📊 [ANALYTICS] ====== FETCHING TOP PERFORMING COMMENTS ======`)
    console.log(`📊 [ANALYTICS] Metric: ${metric}, Limit: ${limitResults}`)

    const { start, end } = createDateRange(dateRange, customStart, customEnd)

    // Get posted comments with engagement data
    const commentsRef = collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS)
    let commentsQuery
    
    if (campaignId) {
      commentsQuery = query(
        commentsRef,
        where("campaignId", "==", campaignId),
        where("status", "==", "posted"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end)
      )
    } else {
      commentsQuery = query(
        commentsRef,
        where("organizationId", "==", organizationId),
        where("status", "==", "posted"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end)
      )
    }

    const commentsSnapshot = await getDocs(commentsQuery)
    const comments = commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as GeneratedCommentDocument & { id: string })

    console.log(`📊 [ANALYTICS] Found ${comments.length} posted comments`)

    // Get campaign names for context
    const campaignNames = new Map<string, string>()
    if (comments.length > 0) {
      const campaignIds = [...new Set(comments.map(c => c.campaignId))]
      for (const cId of campaignIds) {
        try {
          const campaignDoc = await getDoc(doc(db, LEAD_COLLECTIONS.CAMPAIGNS, cId))
          if (campaignDoc.exists()) {
            const campaign = campaignDoc.data() as CampaignDocument
            campaignNames.set(cId, campaign.name)
          }
        } catch (error) {
          console.log(`⚠️ [ANALYTICS] Could not fetch campaign name for ${cId}`)
        }
      }
    }

    // Sort by the specified metric and limit results
    const sortedComments = comments
      .filter(comment => {
        // Only include comments that have engagement data
        const hasEngagement = (comment.engagementUpvotes || 0) > 0 || (comment.engagementRepliesCount || 0) > 0
        return hasEngagement
      })
      .sort((a, b) => {
        const aMetric = metric === "upvotes" ? (a.engagementUpvotes || 0) : (a.engagementRepliesCount || 0)
        const bMetric = metric === "upvotes" ? (b.engagementUpvotes || 0) : (b.engagementRepliesCount || 0)
        return bMetric - aMetric
      })
      .slice(0, limitResults)

    const topComments: TopPerformingComment[] = sortedComments.map(comment => ({
      id: comment.id,
      postTitle: comment.postTitle,
      postUrl: comment.postUrl,
      postedCommentUrl: comment.postedCommentUrl,
      upvotes: comment.engagementUpvotes || 0,
      replies: comment.engagementRepliesCount || 0,
      relevanceScore: comment.relevanceScore,
      keyword: comment.keyword,
      campaignName: campaignNames.get(comment.campaignId)
    }))

    console.log(`📊 [ANALYTICS] Returning ${topComments.length} top performing comments`)

    return {
      isSuccess: true,
      message: "Top performing comments retrieved successfully",
      data: topComments
    }
  } catch (error) {
    console.error("❌ [ANALYTICS] Error getting top performing comments:", error)
    return { isSuccess: false, message: "Failed to get top performing comments" }
  }
}

// ============================================================================
// ENGAGEMENT UPDATE ACTIONS
// ============================================================================

export async function updateCommentEngagementAction(
  generatedCommentId: string,
  upvotes: number,
  replyCount: number
): Promise<ActionState<void>> {
  try {
    console.log(`📊 [ENGAGEMENT] Updating engagement for comment ${generatedCommentId}`)
    console.log(`📊 [ENGAGEMENT] Upvotes: ${upvotes}, Replies: ${replyCount}`)

    const commentRef = doc(db, LEAD_COLLECTIONS.GENERATED_COMMENTS, generatedCommentId)
    
    const updateData = {
      engagementUpvotes: upvotes,
      engagementRepliesCount: replyCount,
      lastEngagementCheckAt: serverTimestamp(),
      engagementCheckCount: 1, // TODO: Increment existing value
      updatedAt: serverTimestamp()
    }

    await updateDoc(commentRef, updateData)

    console.log(`✅ [ENGAGEMENT] Successfully updated engagement for comment ${generatedCommentId}`)

    return {
      isSuccess: true,
      message: "Comment engagement updated successfully",
      data: undefined
    }
  } catch (error) {
    console.error("❌ [ENGAGEMENT] Error updating comment engagement:", error)
    return { isSuccess: false, message: "Failed to update comment engagement" }
  }
}

// ============================================================================
// DAILY SNAPSHOTS ACTIONS
// ============================================================================

export async function calculateAndStoreAnalyticsSnapshotAction(
  organizationId: string,
  date: Date
): Promise<ActionState<void>> {
  try {
    console.log(`\n📊 [SNAPSHOT] ====== CALCULATING DAILY SNAPSHOT ======`)
    console.log(`📊 [SNAPSHOT] Organization: ${organizationId}`)
    console.log(`📊 [SNAPSHOT] Date: ${date.toISOString()}`)

    // Get start and end of day
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1)

    const start = Timestamp.fromDate(startOfDay)
    const end = Timestamp.fromDate(endOfDay)

    // Get all comments for this organization on this date
    const commentsRef = collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS)
    const commentsQuery = query(
      commentsRef,
      where("organizationId", "==", organizationId),
      where("createdAt", ">=", start),
      where("createdAt", "<=", end)
    )

    const commentsSnapshot = await getDocs(commentsQuery)
    const comments = commentsSnapshot.docs.map(doc => doc.data() as GeneratedCommentDocument)

    console.log(`📊 [SNAPSHOT] Found ${comments.length} comments for this date`)

    // Calculate metrics
    const leadsGenerated = comments.length
    const highQualityLeads = comments.filter(c => c.relevanceScore >= 70).length
    const avgRelevanceScore = leadsGenerated > 0 
      ? comments.reduce((sum, c) => sum + c.relevanceScore, 0) / leadsGenerated 
      : 0

    const postedComments = comments.filter(c => c.status === "posted")
    const totalEngagementUpvotes = postedComments.reduce((sum, c) => sum + (c.engagementUpvotes || 0), 0)
    const totalEngagementReplies = postedComments.reduce((sum, c) => sum + (c.engagementRepliesCount || 0), 0)
    const commentsPosted = postedComments.length

    // Find top keyword
    const keywordCounts = new Map<string, number>()
    comments.forEach(c => {
      if (c.keyword) {
        keywordCounts.set(c.keyword, (keywordCounts.get(c.keyword) || 0) + 1)
      }
    })

    let topKeyword: string | undefined
    let topKeywordLeads = 0
    for (const [keyword, count] of keywordCounts.entries()) {
      if (count > topKeywordLeads) {
        topKeyword = keyword
        topKeywordLeads = count
      }
    }

    const uniqueKeywords = keywordCounts.size

    // Create snapshot
    const snapshotId = `${organizationId}_${date.toISOString().split('T')[0]}`
    const snapshotRef = doc(db, KEYWORD_PERFORMANCE_COLLECTIONS.DAILY_ANALYTICS_SNAPSHOTS, snapshotId)

    const snapshotData: CreateDailyAnalyticsSnapshotData = {
      organizationId,
      date: start,
      metrics: {
        leadsGenerated,
        highQualityLeads,
        avgRelevanceScore: Math.round(avgRelevanceScore * 100) / 100,
        totalEngagementUpvotes,
        totalEngagementReplies,
        commentsPosted,
        uniqueKeywords,
        topKeyword,
        topKeywordLeads
      }
    }

    const finalSnapshotData = {
      id: snapshotId,
      ...snapshotData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await setDoc(snapshotRef, finalSnapshotData)

    console.log(`✅ [SNAPSHOT] Successfully stored daily snapshot:`, snapshotData.metrics)

    return {
      isSuccess: true,
      message: "Daily analytics snapshot created successfully",
      data: undefined
    }
  } catch (error) {
    console.error("❌ [SNAPSHOT] Error calculating daily snapshot:", error)
    return { isSuccess: false, message: "Failed to calculate daily snapshot" }
  }
} 