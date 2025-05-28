#!/usr/bin/env tsx

/**
 * Migration script to populate the shared reddit_threads collection
 * from existing generated_comments
 */

import { db } from "@/db/db"
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore"
import { REDDIT_COLLECTIONS } from "@/db/firestore/reddit-threads-collections"

const GENERATED_COMMENTS_COLLECTION = "generated_comments"

async function migrateThreadsToSharedCollection() {
  console.log("🔄 Starting migration of threads to shared collection...")

  try {
    // Get all generated comments
    const commentsRef = collection(db, GENERATED_COMMENTS_COLLECTION)
    const commentsSnapshot = await getDocs(commentsRef)
    
    console.log(`📊 Found ${commentsSnapshot.size} generated comments to process`)

    const threadsMap = new Map<string, any>()
    let processedCount = 0
    let skippedCount = 0

    // Process each comment
    for (const commentDoc of commentsSnapshot.docs) {
      const comment = commentDoc.data()
      processedCount++

      // Skip if no thread ID
      if (!comment.threadId) {
        console.log(`⚠️ Skipping comment ${commentDoc.id} - no thread ID`)
        skippedCount++
        continue
      }

      // Skip if no organization ID
      if (!comment.organizationId) {
        console.log(`⚠️ Skipping comment ${commentDoc.id} - no organization ID`)
        skippedCount++
        continue
      }

      // Extract subreddit from URL
      const subreddit = comment.postUrl?.match(/\/r\/([^\/]+)\//)?.[1] || "unknown"

      // Create thread data
      const threadData = {
        id: comment.threadId,
        organizationId: comment.organizationId,
        title: comment.postTitle || "",
        author: comment.postAuthor || "",
        subreddit: subreddit,
        url: comment.postUrl || "",
        permalink: comment.postUrl?.replace('https://www.reddit.com', '') || "",
        content: comment.postContent || comment.postContentSnippet || "",
        contentSnippet: comment.postContentSnippet || "",
        score: comment.postScore || 0,
        numComments: 0, // We don't have this data
        createdUtc: comment.postCreatedAt 
          ? (comment.postCreatedAt.seconds || Math.floor(Date.now() / 1000))
          : Math.floor(Date.now() / 1000),
        relevanceScore: comment.relevanceScore || 0,
        reasoning: comment.reasoning || "",
        keywords: comment.keyword ? [comment.keyword] : [],
        hasComment: true, // Since this is from generated_comments
        commentId: commentDoc.id,
        createdAt: comment.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      // Check if we already have this thread for this org
      const key = `${comment.organizationId}-${comment.threadId}`
      const existingThread = threadsMap.get(key)
      
      if (existingThread) {
        // Merge keywords
        const mergedKeywords = new Set([
          ...existingThread.keywords,
          ...(comment.keyword ? [comment.keyword] : [])
        ])
        existingThread.keywords = Array.from(mergedKeywords)
        
        // Update relevance score if higher
        if (comment.relevanceScore > existingThread.relevanceScore) {
          existingThread.relevanceScore = comment.relevanceScore
          existingThread.reasoning = comment.reasoning
        }
      } else {
        threadsMap.set(key, threadData)
      }

      if (processedCount % 10 === 0) {
        console.log(`⏳ Processed ${processedCount}/${commentsSnapshot.size} comments...`)
      }
    }

    console.log(`\n📝 Unique threads to migrate: ${threadsMap.size}`)
    console.log(`⚠️ Skipped comments: ${skippedCount}`)

    // Save threads to shared collection
    let savedCount = 0
    let errorCount = 0

    for (const [key, threadData] of threadsMap) {
      try {
        const threadRef = doc(db, REDDIT_COLLECTIONS.THREADS, threadData.id)
        await setDoc(threadRef, threadData, { merge: true })
        savedCount++
        
        if (savedCount % 10 === 0) {
          console.log(`💾 Saved ${savedCount}/${threadsMap.size} threads...`)
        }
      } catch (error) {
        console.error(`❌ Error saving thread ${threadData.id}:`, error)
        errorCount++
      }
    }

    console.log("\n✅ Migration complete!")
    console.log(`📊 Summary:`)
    console.log(`  - Total comments processed: ${processedCount}`)
    console.log(`  - Comments skipped: ${skippedCount}`)
    console.log(`  - Unique threads found: ${threadsMap.size}`)
    console.log(`  - Threads saved: ${savedCount}`)
    console.log(`  - Errors: ${errorCount}`)

  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  }
}

// Run the migration
migrateThreadsToSharedCollection()
  .then(() => {
    console.log("🎉 Migration completed successfully!")
    process.exit(0)
  })
  .catch(error => {
    console.error("💥 Migration failed:", error)
    process.exit(1)
  }) 