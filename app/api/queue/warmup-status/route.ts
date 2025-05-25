/*
<ai_context>
API endpoint to check the status of the warm-up system.
Shows recent activity and system health.
</ai_context>
*/

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db/db"
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp
} from "firebase/firestore"
import { WARMUP_COLLECTIONS } from "@/db/firestore/warmup-collections"

export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("📊 [WARMUP-STATUS] Checking system status for user:", userId)

    // Get warm-up account
    const accountQuery = query(
      collection(db, WARMUP_COLLECTIONS.WARMUP_ACCOUNTS),
      where("userId", "==", userId)
    )
    const accountSnapshot = await getDocs(accountQuery)
    
    if (accountSnapshot.empty) {
      return NextResponse.json({
        status: "no_account",
        message: "No warm-up account found"
      })
    }

    const account = accountSnapshot.docs[0].data()

    // Get recent posts
    const recentPostsQuery = query(
      collection(db, WARMUP_COLLECTIONS.WARMUP_POSTS),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(10)
    )
    const postsSnapshot = await getDocs(recentPostsQuery)
    const posts = postsSnapshot.docs.map(doc => doc.data())

    // Get recent comments
    const recentCommentsQuery = query(
      collection(db, WARMUP_COLLECTIONS.WARMUP_COMMENTS),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(20)
    )
    const commentsSnapshot = await getDocs(recentCommentsQuery)
    const comments = commentsSnapshot.docs.map(doc => doc.data())

    // Calculate statistics
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const postsLast24h = posts.filter(p => 
      p.createdAt && p.createdAt.toDate() > last24Hours
    ).length

    const postsLast7Days = posts.filter(p => 
      p.createdAt && p.createdAt.toDate() > last7Days
    ).length

    const queuedPosts = posts.filter(p => p.status === "queued").length
    const postedPosts = posts.filter(p => p.status === "posted").length
    const failedPosts = posts.filter(p => p.status === "failed").length

    const queuedComments = comments.filter(c => c.status === "queued").length
    const postedComments = comments.filter(c => c.status === "posted").length

    // Get next scheduled post
    const nextPostQuery = query(
      collection(db, WARMUP_COLLECTIONS.WARMUP_POSTS),
      where("userId", "==", userId),
      where("status", "==", "queued"),
      where("scheduledFor", ">", Timestamp.now()),
      orderBy("scheduledFor", "asc"),
      limit(1)
    )
    const nextPostSnapshot = await getDocs(nextPostQuery)
    const nextPost = nextPostSnapshot.empty ? null : nextPostSnapshot.docs[0].data()

    return NextResponse.json({
      status: "active",
      account: {
        isActive: account.isActive,
        warmupStartDate: account.warmupStartDate.toDate(),
        warmupEndDate: account.warmupEndDate.toDate(),
        targetSubreddits: account.targetSubreddits,
        postingMode: account.postingMode,
        dailyPostLimit: account.dailyPostLimit
      },
      statistics: {
        posts: {
          total: posts.length,
          last24Hours: postsLast24h,
          last7Days: postsLast7Days,
          queued: queuedPosts,
          posted: postedPosts,
          failed: failedPosts
        },
        comments: {
          total: comments.length,
          queued: queuedComments,
          posted: postedComments
        }
      },
      nextScheduledPost: nextPost ? {
        subreddit: nextPost.subreddit,
        scheduledFor: nextPost.scheduledFor.toDate(),
        title: nextPost.title
      } : null,
      recentActivity: {
        posts: posts.slice(0, 5).map(p => ({
          id: p.id,
          subreddit: p.subreddit,
          status: p.status,
          createdAt: p.createdAt?.toDate(),
          postedAt: p.postedAt?.toDate()
        })),
        comments: comments.slice(0, 5).map(c => ({
          id: c.id,
          status: c.status,
          createdAt: c.createdAt?.toDate(),
          postedAt: c.postedAt?.toDate()
        }))
      }
    })
  } catch (error) {
    console.error("❌ [WARMUP-STATUS] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 