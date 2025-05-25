#!/usr/bin/env tsx

/*
Script to add test subreddits to a warm-up account
Usage: npm run add-subreddits
*/

import { db } from "../db/db"
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore"
import { WARMUP_COLLECTIONS } from "../db/firestore/warmup-collections"

async function addTestSubreddits() {
  try {
    const userId = "user_2xVcPK80cNJ6GNcDuEBKJcF4ZMy" // Your user ID from the logs
    
    console.log("🔍 Finding warm-up account for user:", userId)
    
    // Find the warm-up account
    const accountQuery = query(
      collection(db, WARMUP_COLLECTIONS.WARMUP_ACCOUNTS),
      where("userId", "==", userId)
    )
    const querySnapshot = await getDocs(accountQuery)
    
    if (querySnapshot.empty) {
      console.error("❌ No warm-up account found")
      process.exit(1)
    }
    
    const accountDoc = querySnapshot.docs[0]
    const account = accountDoc.data()
    
    console.log("✅ Found warm-up account:", accountDoc.id)
    console.log("Current subreddits:", account.targetSubreddits)
    
    // Add some test subreddits
    const testSubreddits = [
      "test", // r/test is a good testing subreddit
      "testingground4bots", // Another testing subreddit
      "travel" // A real subreddit for testing
    ]
    
    // Update the account
    await updateDoc(doc(db, WARMUP_COLLECTIONS.WARMUP_ACCOUNTS, accountDoc.id), {
      targetSubreddits: testSubreddits
    })
    
    console.log("✅ Updated subreddits to:", testSubreddits)
    console.log("🎉 Done! You can now generate posts for these subreddits.")
    
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
  
  process.exit(0)
}

addTestSubreddits() 