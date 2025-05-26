"use server"

import { db } from "@/db/db"
import { ActionState } from "@/types"
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from "firebase/firestore"

const COLLECTIONS = {
  POSTING_HISTORY: "posting_history"
} as const

interface PostingHistoryDocument {
  id: string
  userId: string
  subreddit: string
  lastPostedAt: Timestamp
  postCount: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface SubredditPostingHistory {
  subreddit: string
  lastPostedAt: string | null
  postCount: number
}

export async function getSubredditPostingHistoryAction(
  userId: string,
  subreddits: string[]
): Promise<ActionState<SubredditPostingHistory[]>> {
  try {
    console.log(
      "📊 [POSTING-HISTORY] Getting history for subreddits:",
      subreddits
    )

    const historyRef = collection(db, COLLECTIONS.POSTING_HISTORY)
    const q = query(
      historyRef,
      where("userId", "==", userId),
      where("subreddit", "in", subreddits)
    )

    const querySnapshot = await getDocs(q)
    const histories: SubredditPostingHistory[] = []

    // Create a map of found histories
    const foundSubreddits = new Set<string>()

    querySnapshot.docs.forEach(doc => {
      const data = doc.data() as PostingHistoryDocument
      histories.push({
        subreddit: data.subreddit,
        lastPostedAt: data.lastPostedAt
          ? data.lastPostedAt.toDate().toISOString()
          : null,
        postCount: data.postCount || 0
      })
      foundSubreddits.add(data.subreddit)
    })

    // Add entries for subreddits with no history
    subreddits.forEach(subreddit => {
      if (!foundSubreddits.has(subreddit)) {
        histories.push({
          subreddit,
          lastPostedAt: null,
          postCount: 0
        })
      }
    })

    console.log("📊 [POSTING-HISTORY] Found histories:", histories.length)

    return {
      isSuccess: true,
      message: "Posting history retrieved successfully",
      data: histories
    }
  } catch (error) {
    console.error("Error getting posting history:", error)
    return { isSuccess: false, message: "Failed to get posting history" }
  }
}

export async function updatePostingHistoryAction(
  userId: string,
  subreddit: string
): Promise<ActionState<void>> {
  try {
    console.log("📊 [POSTING-HISTORY] Updating history for:", {
      userId,
      subreddit
    })

    // Create document ID from userId and subreddit
    const docId = `${userId}_${subreddit}`
    const historyRef = doc(db, COLLECTIONS.POSTING_HISTORY, docId)

    const existingDoc = await getDoc(historyRef)

    if (existingDoc.exists()) {
      // Update existing record
      await updateDoc(historyRef, {
        lastPostedAt: serverTimestamp(),
        postCount: (existingDoc.data().postCount || 0) + 1,
        updatedAt: serverTimestamp()
      })
    } else {
      // Create new record
      await setDoc(historyRef, {
        id: docId,
        userId,
        subreddit,
        lastPostedAt: serverTimestamp(),
        postCount: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    }

    console.log("📊 [POSTING-HISTORY] History updated successfully")

    return {
      isSuccess: true,
      message: "Posting history updated successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error updating posting history:", error)
    return { isSuccess: false, message: "Failed to update posting history" }
  }
}
