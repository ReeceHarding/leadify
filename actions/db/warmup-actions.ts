/*
<ai_context>
Server actions for managing Reddit warm-up accounts, posts, and comments.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import {
  WARMUP_COLLECTIONS,
  WarmupAccountDocument,
  WarmupPostDocument,
  WarmupCommentDocument,
  SubredditAnalysisDocument,
  WarmupRateLimitDocument,
  SerializedWarmupAccountDocument,
  SerializedWarmupPostDocument,
  SerializedWarmupCommentDocument,
  SerializedSubredditAnalysisDocument,
  SerializedWarmupRateLimitDocument,
  CreateWarmupAccountData,
  CreateWarmupPostData,
  CreateWarmupCommentData,
  UpdateWarmupAccountData,
  UpdateWarmupPostData,
  UpdateWarmupCommentData
} from "@/db/firestore/warmup-collections"
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
  serverTimestamp,
  Timestamp,
  orderBy,
  limit
} from "firebase/firestore"

// Serialization helpers to convert Firestore Timestamps to ISO strings
function serializeTimestamp(timestamp: any): string {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString()
  }
  if (timestamp && typeof timestamp === "object" && "seconds" in timestamp) {
    return new Date(timestamp.seconds * 1000).toISOString()
  }
  return timestamp
}

function serializeWarmupAccount(account: any): SerializedWarmupAccountDocument {
  return {
    ...account,
    warmupStartDate: serializeTimestamp(account.warmupStartDate),
    warmupEndDate: serializeTimestamp(account.warmupEndDate),
    createdAt: serializeTimestamp(account.createdAt),
    updatedAt: serializeTimestamp(account.updatedAt)
  }
}

function serializeWarmupPost(post: any): SerializedWarmupPostDocument {
  return {
    ...post,
    scheduledFor: post.scheduledFor
      ? serializeTimestamp(post.scheduledFor)
      : null,
    postedAt: post.postedAt ? serializeTimestamp(post.postedAt) : undefined,
    createdAt: serializeTimestamp(post.createdAt),
    updatedAt: serializeTimestamp(post.updatedAt)
  }
}

function serializeWarmupComment(comment: any): SerializedWarmupCommentDocument {
  return {
    ...comment,
    scheduledFor: comment.scheduledFor
      ? serializeTimestamp(comment.scheduledFor)
      : null,
    postedAt: comment.postedAt
      ? serializeTimestamp(comment.postedAt)
      : undefined,
    createdAt: serializeTimestamp(comment.createdAt),
    updatedAt: serializeTimestamp(comment.updatedAt)
  }
}

function serializeSubredditAnalysis(
  analysis: any
): SerializedSubredditAnalysisDocument {
  return {
    ...analysis,
    lastAnalyzedAt: serializeTimestamp(analysis.lastAnalyzedAt),
    createdAt: serializeTimestamp(analysis.createdAt),
    updatedAt: serializeTimestamp(analysis.updatedAt)
  }
}

function serializeRateLimit(rateLimit: any): SerializedWarmupRateLimitDocument {
  return {
    ...rateLimit,
    lastPostTime: serializeTimestamp(rateLimit.lastPostTime),
    createdAt: serializeTimestamp(rateLimit.createdAt),
    updatedAt: serializeTimestamp(rateLimit.updatedAt)
  }
}

// Warm-up Account Actions

export async function createWarmupAccountAction(
  data: CreateWarmupAccountData
): Promise<ActionState<SerializedWarmupAccountDocument>> {
  try {
    console.log(
      "🔧 [CREATE-WARMUP-ACCOUNT] Creating warm-up account for user:",
      data.userId
    )

    // Check if user already has a warm-up account
    const existingQuery = query(
      collection(db, WARMUP_COLLECTIONS.WARMUP_ACCOUNTS),
      where("userId", "==", data.userId)
    )
    const existingDocs = await getDocs(existingQuery)

    if (!existingDocs.empty) {
      console.log(
        "⚠️ [CREATE-WARMUP-ACCOUNT] User already has a warm-up account"
      )
      return {
        isSuccess: false,
        message: "User already has a warm-up account"
      }
    }

    const accountRef = doc(collection(db, WARMUP_COLLECTIONS.WARMUP_ACCOUNTS))
    const now = Timestamp.now()

    const accountData = {
      id: accountRef.id,
      userId: data.userId,
      redditUsername: data.redditUsername,
      targetSubreddits: data.targetSubreddits,
      postingMode: data.postingMode || "manual",
      isActive: true,
      warmupStartDate: now,
      warmupEndDate: Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ), // 7 days from now
      dailyPostLimit: data.dailyPostLimit || 3,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await setDoc(accountRef, accountData)

    const createdDoc = await getDoc(accountRef)
    console.log(
      "✅ [CREATE-WARMUP-ACCOUNT] Warm-up account created successfully"
    )

    return {
      isSuccess: true,
      message: "Warm-up account created successfully",
      data: serializeWarmupAccount(createdDoc.data())
    }
  } catch (error) {
    console.error("❌ [CREATE-WARMUP-ACCOUNT] Error:", error)
    return { isSuccess: false, message: "Failed to create warm-up account" }
  }
}

export async function getWarmupAccountByUserIdAction(
  userId: string
): Promise<ActionState<SerializedWarmupAccountDocument | null>> {
  try {
    console.log(
      "🔍 [GET-WARMUP-ACCOUNT] Fetching warm-up account for user:",
      userId
    )

    const accountQuery = query(
      collection(db, WARMUP_COLLECTIONS.WARMUP_ACCOUNTS),
      where("userId", "==", userId)
    )
    const querySnapshot = await getDocs(accountQuery)

    if (querySnapshot.empty) {
      console.log("ℹ️ [GET-WARMUP-ACCOUNT] No warm-up account found")
      return {
        isSuccess: true,
        message: "No warm-up account found",
        data: null
      }
    }

    const account = querySnapshot.docs[0].data()
    console.log("✅ [GET-WARMUP-ACCOUNT] Warm-up account found")

    return {
      isSuccess: true,
      message: "Warm-up account retrieved successfully",
      data: serializeWarmupAccount(account)
    }
  } catch (error) {
    console.error("❌ [GET-WARMUP-ACCOUNT] Error:", error)
    return { isSuccess: false, message: "Failed to get warm-up account" }
  }
}

export async function updateWarmupAccountAction(
  accountId: string,
  data: UpdateWarmupAccountData
): Promise<ActionState<SerializedWarmupAccountDocument>> {
  try {
    console.log(
      "🔧 [UPDATE-WARMUP-ACCOUNT] Updating warm-up account:",
      accountId
    )

    const accountRef = doc(db, WARMUP_COLLECTIONS.WARMUP_ACCOUNTS, accountId)

    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }

    await updateDoc(accountRef, updateData)

    const updatedDoc = await getDoc(accountRef)
    console.log(
      "✅ [UPDATE-WARMUP-ACCOUNT] Warm-up account updated successfully"
    )

    return {
      isSuccess: true,
      message: "Warm-up account updated successfully",
      data: serializeWarmupAccount(updatedDoc.data())
    }
  } catch (error) {
    console.error("❌ [UPDATE-WARMUP-ACCOUNT] Error:", error)
    return { isSuccess: false, message: "Failed to update warm-up account" }
  }
}

// Warm-up Post Actions

export async function createWarmupPostAction(
  data: CreateWarmupPostData
): Promise<ActionState<SerializedWarmupPostDocument>> {
  try {
    console.log(
      "🔧 [CREATE-WARMUP-POST] Creating warm-up post for subreddit:",
      data.subreddit
    )

    const postRef = doc(collection(db, WARMUP_COLLECTIONS.WARMUP_POSTS))

    const postData = {
      id: postRef.id,
      userId: data.userId,
      warmupAccountId: data.warmupAccountId,
      subreddit: data.subreddit,
      title: data.title,
      content: data.content,
      status: "draft" as const,
      scheduledFor: data.scheduledFor,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await setDoc(postRef, postData)

    const createdDoc = await getDoc(postRef)
    console.log("✅ [CREATE-WARMUP-POST] Warm-up post created successfully")

    return {
      isSuccess: true,
      message: "Warm-up post created successfully",
      data: serializeWarmupPost(createdDoc.data())
    }
  } catch (error) {
    console.error("❌ [CREATE-WARMUP-POST] Error:", error)
    return { isSuccess: false, message: "Failed to create warm-up post" }
  }
}

export async function getWarmupPostsByUserIdAction(
  userId: string
): Promise<ActionState<SerializedWarmupPostDocument[]>> {
  try {
    console.log(
      "🔍 [GET-WARMUP-POSTS] Fetching warm-up posts for user:",
      userId
    )

    // Simplified query to avoid composite index requirement
    const postsQuery = query(
      collection(db, WARMUP_COLLECTIONS.WARMUP_POSTS),
      where("userId", "==", userId)
    )
    const querySnapshot = await getDocs(postsQuery)

    // Sort in memory after fetching
    const posts = querySnapshot.docs
      .map(doc => serializeWarmupPost(doc.data()))
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA // desc order
      })

    console.log(`✅ [GET-WARMUP-POSTS] Found ${posts.length} warm-up posts`)

    return {
      isSuccess: true,
      message: "Warm-up posts retrieved successfully",
      data: posts
    }
  } catch (error) {
    console.error("❌ [GET-WARMUP-POSTS] Error:", error)
    return { isSuccess: false, message: "Failed to get warm-up posts" }
  }
}

export async function updateWarmupPostAction(
  postId: string,
  data: UpdateWarmupPostData
): Promise<ActionState<SerializedWarmupPostDocument>> {
  try {
    console.log("🔧 [UPDATE-WARMUP-POST] Updating warm-up post:", postId)

    const postRef = doc(db, WARMUP_COLLECTIONS.WARMUP_POSTS, postId)

    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }

    await updateDoc(postRef, updateData)

    const updatedDoc = await getDoc(postRef)
    console.log("✅ [UPDATE-WARMUP-POST] Warm-up post updated successfully")

    return {
      isSuccess: true,
      message: "Warm-up post updated successfully",
      data: serializeWarmupPost(updatedDoc.data())
    }
  } catch (error) {
    console.error("❌ [UPDATE-WARMUP-POST] Error:", error)
    return { isSuccess: false, message: "Failed to update warm-up post" }
  }
}

// Subreddit Analysis Actions

export async function getSubredditAnalysisAction(
  subreddit: string
): Promise<ActionState<SerializedSubredditAnalysisDocument | null>> {
  try {
    console.log("🔍 [GET-SUBREDDIT-ANALYSIS] Fetching analysis for:", subreddit)

    const analysisRef = doc(
      db,
      WARMUP_COLLECTIONS.SUBREDDIT_ANALYSIS,
      subreddit
    )
    const analysisDoc = await getDoc(analysisRef)

    if (!analysisDoc.exists()) {
      console.log("ℹ️ [GET-SUBREDDIT-ANALYSIS] No analysis found")
      return {
        isSuccess: true,
        message: "No analysis found",
        data: null
      }
    }

    const analysis = analysisDoc.data()
    console.log("✅ [GET-SUBREDDIT-ANALYSIS] Analysis found")

    return {
      isSuccess: true,
      message: "Subreddit analysis retrieved successfully",
      data: serializeSubredditAnalysis(analysis)
    }
  } catch (error) {
    console.error("❌ [GET-SUBREDDIT-ANALYSIS] Error:", error)
    return { isSuccess: false, message: "Failed to get subreddit analysis" }
  }
}

export async function saveSubredditAnalysisAction(
  subreddit: string,
  topPosts: any[],
  writingStyle: string,
  commonTopics: string[]
): Promise<ActionState<SerializedSubredditAnalysisDocument>> {
  try {
    console.log("🔧 [SAVE-SUBREDDIT-ANALYSIS] Saving analysis for:", subreddit)

    const analysisRef = doc(
      db,
      WARMUP_COLLECTIONS.SUBREDDIT_ANALYSIS,
      subreddit
    )

    const analysisData = {
      id: subreddit,
      subreddit,
      topPosts,
      writingStyle,
      commonTopics,
      lastAnalyzedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await setDoc(analysisRef, analysisData, { merge: true })

    const savedDoc = await getDoc(analysisRef)
    console.log("✅ [SAVE-SUBREDDIT-ANALYSIS] Analysis saved successfully")

    return {
      isSuccess: true,
      message: "Subreddit analysis saved successfully",
      data: serializeSubredditAnalysis(savedDoc.data())
    }
  } catch (error) {
    console.error("❌ [SAVE-SUBREDDIT-ANALYSIS] Error:", error)
    return { isSuccess: false, message: "Failed to save subreddit analysis" }
  }
}

// Rate Limiting Actions

export async function checkWarmupRateLimitAction(
  userId: string,
  subreddit: string
): Promise<ActionState<{ canPost: boolean; nextPostTime?: Date }>> {
  try {
    console.log(
      "🔍 [CHECK-RATE-LIMIT] Checking rate limit for:",
      userId,
      subreddit
    )

    const rateLimitId = `${userId}_${subreddit}`
    const rateLimitRef = doc(
      db,
      WARMUP_COLLECTIONS.WARMUP_RATE_LIMITS,
      rateLimitId
    )
    const rateLimitDoc = await getDoc(rateLimitRef)

    if (!rateLimitDoc.exists()) {
      console.log("✅ [CHECK-RATE-LIMIT] No rate limit found, can post")
      return {
        isSuccess: true,
        message: "Can post",
        data: { canPost: true }
      }
    }

    const rateLimit = rateLimitDoc.data() as WarmupRateLimitDocument
    const lastPostTime = rateLimit.lastPostTime.toDate()
    const timeSinceLastPost = Date.now() - lastPostTime.getTime()
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000

    if (timeSinceLastPost < threeDaysInMs) {
      const nextPostTime = new Date(lastPostTime.getTime() + threeDaysInMs)
      console.log(
        "⚠️ [CHECK-RATE-LIMIT] Rate limit active, next post:",
        nextPostTime
      )
      return {
        isSuccess: true,
        message: "Rate limit active",
        data: { canPost: false, nextPostTime }
      }
    }

    console.log("✅ [CHECK-RATE-LIMIT] Can post")
    return {
      isSuccess: true,
      message: "Can post",
      data: { canPost: true }
    }
  } catch (error) {
    console.error("❌ [CHECK-RATE-LIMIT] Error:", error)
    return { isSuccess: false, message: "Failed to check rate limit" }
  }
}

export async function updateWarmupRateLimitAction(
  userId: string,
  subreddit: string
): Promise<ActionState<void>> {
  try {
    console.log(
      "🔧 [UPDATE-RATE-LIMIT] Updating rate limit for:",
      userId,
      subreddit
    )

    const rateLimitId = `${userId}_${subreddit}`
    const rateLimitRef = doc(
      db,
      WARMUP_COLLECTIONS.WARMUP_RATE_LIMITS,
      rateLimitId
    )

    const rateLimitData = {
      id: rateLimitId,
      userId,
      subreddit,
      lastPostTime: serverTimestamp(),
      postsInLast3Days: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await setDoc(rateLimitRef, rateLimitData, { merge: true })

    console.log("✅ [UPDATE-RATE-LIMIT] Rate limit updated successfully")

    return {
      isSuccess: true,
      message: "Rate limit updated successfully",
      data: undefined
    }
  } catch (error) {
    console.error("❌ [UPDATE-RATE-LIMIT] Error:", error)
    return { isSuccess: false, message: "Failed to update rate limit" }
  }
}

// Comment Actions

export async function createWarmupCommentAction(
  data: CreateWarmupCommentData
): Promise<ActionState<SerializedWarmupCommentDocument>> {
  try {
    console.log(
      "🔧 [CREATE-WARMUP-COMMENT] Creating warm-up comment for post:",
      data.warmupPostId
    )

    const commentRef = doc(collection(db, WARMUP_COLLECTIONS.WARMUP_COMMENTS))

    const commentData = {
      id: commentRef.id,
      userId: data.userId,
      warmupPostId: data.warmupPostId,
      parentCommentId: data.parentCommentId,
      redditParentCommentId: data.redditParentCommentId,
      content: data.content,
      status: "draft" as const,
      scheduledFor: data.scheduledFor,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    await setDoc(commentRef, commentData)

    const createdDoc = await getDoc(commentRef)
    console.log(
      "✅ [CREATE-WARMUP-COMMENT] Warm-up comment created successfully"
    )

    return {
      isSuccess: true,
      message: "Warm-up comment created successfully",
      data: serializeWarmupComment(createdDoc.data())
    }
  } catch (error) {
    console.error("❌ [CREATE-WARMUP-COMMENT] Error:", error)
    return { isSuccess: false, message: "Failed to create warm-up comment" }
  }
}

export async function getWarmupCommentsByPostIdAction(
  warmupPostId: string
): Promise<ActionState<SerializedWarmupCommentDocument[]>> {
  try {
    console.log(
      "🔍 [GET-WARMUP-COMMENTS] Fetching comments for post:",
      warmupPostId
    )

    // Simplified query to avoid composite index requirement
    const commentsQuery = query(
      collection(db, WARMUP_COLLECTIONS.WARMUP_COMMENTS),
      where("warmupPostId", "==", warmupPostId)
    )
    const querySnapshot = await getDocs(commentsQuery)

    // Sort in memory after fetching
    const comments = querySnapshot.docs
      .map(doc => serializeWarmupComment(doc.data()))
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateA - dateB // asc order
      })

    console.log(`✅ [GET-WARMUP-COMMENTS] Found ${comments.length} comments`)

    return {
      isSuccess: true,
      message: "Warm-up comments retrieved successfully",
      data: comments
    }
  } catch (error) {
    console.error("❌ [GET-WARMUP-COMMENTS] Error:", error)
    return { isSuccess: false, message: "Failed to get warm-up comments" }
  }
}

export async function updateWarmupCommentAction(
  commentId: string,
  data: UpdateWarmupCommentData
): Promise<ActionState<SerializedWarmupCommentDocument>> {
  try {
    console.log(
      "🔧 [UPDATE-WARMUP-COMMENT] Updating warm-up comment:",
      commentId
    )

    const commentRef = doc(db, WARMUP_COLLECTIONS.WARMUP_COMMENTS, commentId)

    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    }

    await updateDoc(commentRef, updateData)

    const updatedDoc = await getDoc(commentRef)
    console.log(
      "✅ [UPDATE-WARMUP-COMMENT] Warm-up comment updated successfully"
    )

    return {
      isSuccess: true,
      message: "Warm-up comment updated successfully",
      data: serializeWarmupComment(updatedDoc.data())
    }
  } catch (error) {
    console.error("❌ [UPDATE-WARMUP-COMMENT] Error:", error)
    return { isSuccess: false, message: "Failed to update warm-up comment" }
  }
}
