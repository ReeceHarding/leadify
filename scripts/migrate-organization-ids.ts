/*
<ai_context>
Migration script to add organizationId to existing data.
This script should be run once to migrate existing data to the new organization-based structure.
</ai_context>
*/

import { db } from "@/db/db"
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  writeBatch,
  Timestamp
} from "firebase/firestore"
import { COLLECTIONS } from "@/db/firestore/collections"
import { ORGANIZATION_COLLECTIONS } from "@/db/firestore/organizations-collections"
import { LEAD_COLLECTIONS } from "@/db/firestore/lead-generation-collections"
import { WARMUP_COLLECTIONS } from "@/db/firestore/warmup-collections"
import { POSTING_QUEUE_COLLECTIONS } from "@/db/firestore/posting-queue-collections"
import { PERSONALIZATION_COLLECTIONS } from "@/db/firestore/personalization-collections"

async function migrateCollection(
  collectionName: string,
  userIdField: string = "userId"
) {
  console.log(`\n🔄 Migrating collection: ${collectionName}`)
  
  try {
    const collectionRef = collection(db, collectionName)
    const snapshot = await getDocs(collectionRef)
    
    if (snapshot.empty) {
      console.log(`✅ No documents to migrate in ${collectionName}`)
      return
    }
    
    console.log(`📊 Found ${snapshot.size} documents to check`)
    
    let migratedCount = 0
    let skippedCount = 0
    let errorCount = 0
    
    // Process in batches of 500
    const batch = writeBatch(db)
    let batchCount = 0
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data()
      
      // Skip if already has organizationId
      if (data.organizationId) {
        skippedCount++
        continue
      }
      
      // Skip if no userId
      if (!data[userIdField]) {
        console.warn(`⚠️ Document ${docSnapshot.id} has no ${userIdField}`)
        errorCount++
        continue
      }
      
      try {
        // Get user's organizations
        const orgsQuery = query(
          collection(db, ORGANIZATION_COLLECTIONS.ORGANIZATIONS),
          where("members", "array-contains", data[userIdField])
        )
        const orgsSnapshot = await getDocs(orgsQuery)
        
        if (orgsSnapshot.empty) {
          console.warn(`⚠️ No organization found for user ${data[userIdField]}`)
          errorCount++
          continue
        }
        
        // Use the first organization (oldest)
        const firstOrg = orgsSnapshot.docs[0]
        
        batch.update(docSnapshot.ref, {
          organizationId: firstOrg.id,
          updatedAt: Timestamp.now()
        })
        
        batchCount++
        migratedCount++
        
        // Commit batch every 500 documents
        if (batchCount >= 500) {
          await batch.commit()
          console.log(`💾 Committed batch of ${batchCount} documents`)
          batchCount = 0
        }
      } catch (error) {
        console.error(`❌ Error migrating document ${docSnapshot.id}:`, error)
        errorCount++
      }
    }
    
    // Commit remaining documents
    if (batchCount > 0) {
      await batch.commit()
      console.log(`💾 Committed final batch of ${batchCount} documents`)
    }
    
    console.log(`✅ Migration complete for ${collectionName}:`)
    console.log(`   - Migrated: ${migratedCount}`)
    console.log(`   - Skipped (already had org): ${skippedCount}`)
    console.log(`   - Errors: ${errorCount}`)
    
  } catch (error) {
    console.error(`❌ Failed to migrate ${collectionName}:`, error)
  }
}

async function runMigration() {
  console.log("🚀 Starting organization ID migration...")
  console.log("⏰ Started at:", new Date().toISOString())
  
  try {
    // Collections that need migration
    const collectionsToMigrate = [
      // Lead generation collections
      { name: LEAD_COLLECTIONS.CAMPAIGNS, userIdField: "userId" },
      { name: LEAD_COLLECTIONS.GENERATED_COMMENTS, userIdField: "userId" },
      
      // Warmup collections
      { name: WARMUP_COLLECTIONS.WARMUP_ACCOUNTS, userIdField: "userId" },
      { name: WARMUP_COLLECTIONS.WARMUP_POSTS, userIdField: "userId" },
      { name: WARMUP_COLLECTIONS.WARMUP_COMMENTS, userIdField: "userId" },
      { name: WARMUP_COLLECTIONS.WARMUP_RATE_LIMITS, userIdField: "userId" },
      
      // Posting queue collections
      { name: POSTING_QUEUE_COLLECTIONS.POSTING_QUEUE, userIdField: "userId" },
      { name: POSTING_QUEUE_COLLECTIONS.REDDIT_RATE_LIMITS, userIdField: "userId" },
      
      // Personalization collections
      { name: PERSONALIZATION_COLLECTIONS.KNOWLEDGE_BASE, userIdField: "userId" },
      { name: PERSONALIZATION_COLLECTIONS.VOICE_SETTINGS, userIdField: "userId" },
      { name: PERSONALIZATION_COLLECTIONS.SCRAPED_CONTENT, userIdField: "userId" },
      { name: PERSONALIZATION_COLLECTIONS.TWITTER_ANALYSIS, userIdField: "userId" },
      
      // Keyword performance
      { name: "keyword-performance", userIdField: "userId" }
    ]
    
    for (const collection of collectionsToMigrate) {
      await migrateCollection(collection.name, collection.userIdField)
    }
    
    console.log("\n✅ Migration completed successfully!")
    console.log("⏰ Completed at:", new Date().toISOString())
    
  } catch (error) {
    console.error("\n❌ Migration failed:", error)
    process.exit(1)
  }
}

// Run the migration
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Fatal error:", error)
      process.exit(1)
    })
} 