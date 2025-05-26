/*
Migration script to move Reddit tokens and business data from profiles to organizations.

Run with: npx tsx scripts/migrate-to-organizations.ts

This script will:
1. Create organizations for users with Reddit tokens in their profile
2. Move Reddit tokens from profile to organization
3. Move business data (website, name) to organization
4. Add organizationId to all generated comments
5. Clean up profile documents
*/

import { db } from "@/db/db"
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  writeBatch,
  query,
  where
} from "firebase/firestore"
import { COLLECTIONS } from "@/db/firestore/collections"
import { LEAD_COLLECTIONS } from "@/db/firestore/lead-generation-collections"
import { ORGANIZATION_COLLECTIONS } from "@/db/firestore/organizations-collections"

async function migrateToOrganizations() {
  console.log("🚀 Starting migration to organizations...")
  
  try {
    // Step 1: Get all profiles with Reddit tokens
    console.log("\n📋 Step 1: Fetching profiles with Reddit tokens...")
    const profilesRef = collection(db, COLLECTIONS.PROFILES)
    const profilesSnapshot = await getDocs(profilesRef)
    
    let migratedCount = 0
    let errorCount = 0
    
    for (const profileDoc of profilesSnapshot.docs) {
      const profile = profileDoc.data()
      const userId = profileDoc.id
      
      // Check if profile has Reddit tokens or business data
      if (profile.redditAccessToken || profile.website || profile.keywords?.length > 0) {
        console.log(`\n👤 Processing user: ${userId}`)
        console.log(`  - Name: ${profile.name || 'Unknown'}`)
        console.log(`  - Reddit username: ${profile.redditUsername || 'None'}`)
        console.log(`  - Website: ${profile.website || 'None'}`)
        console.log(`  - Keywords: ${profile.keywords?.length || 0}`)
        
        try {
          // Step 2: Check if user already has organizations
          const orgsQuery = query(
            collection(db, ORGANIZATION_COLLECTIONS.ORGANIZATIONS),
            where("ownerId", "==", userId)
          )
          const orgsSnapshot = await getDocs(orgsQuery)
          
          let organizationId: string
          
          if (orgsSnapshot.empty) {
            // Create new organization
            console.log("  ✨ Creating new organization...")
            const orgRef = doc(collection(db, ORGANIZATION_COLLECTIONS.ORGANIZATIONS))
            organizationId = orgRef.id
            
            await setDoc(orgRef, {
              id: organizationId,
              name: profile.name || "My Organization",
              ownerId: userId,
              website: profile.website,
              businessDescription: profile.businessDescription,
              plan: "free",
              // Move Reddit tokens
              redditAccessToken: profile.redditAccessToken,
              redditRefreshToken: profile.redditRefreshToken,
              redditTokenExpiresAt: profile.redditTokenExpiresAt,
              redditUsername: profile.redditUsername,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })
            
            // Create organization member entry
            const memberRef = doc(collection(db, ORGANIZATION_COLLECTIONS.ORGANIZATION_MEMBERS))
            await setDoc(memberRef, {
              id: memberRef.id,
              organizationId,
              userId,
              role: "owner",
              joinedAt: serverTimestamp()
            })
            
            console.log(`  ✅ Created organization: ${organizationId}`)
          } else {
            // Update existing organization with Reddit tokens
            organizationId = orgsSnapshot.docs[0].id
            console.log(`  📝 Updating existing organization: ${organizationId}`)
            
            await updateDoc(doc(db, ORGANIZATION_COLLECTIONS.ORGANIZATIONS, organizationId), {
              redditAccessToken: profile.redditAccessToken || orgsSnapshot.docs[0].data().redditAccessToken,
              redditRefreshToken: profile.redditRefreshToken || orgsSnapshot.docs[0].data().redditRefreshToken,
              redditTokenExpiresAt: profile.redditTokenExpiresAt || orgsSnapshot.docs[0].data().redditTokenExpiresAt,
              redditUsername: profile.redditUsername || orgsSnapshot.docs[0].data().redditUsername,
              website: profile.website || orgsSnapshot.docs[0].data().website,
              updatedAt: serverTimestamp()
            })
          }
          
          // Step 3: Update campaigns to ensure they have organizationId
          console.log("  📊 Updating campaigns...")
          const campaignsQuery = query(
            collection(db, LEAD_COLLECTIONS.CAMPAIGNS),
            where("userId", "==", userId)
          )
          const campaignsSnapshot = await getDocs(campaignsQuery)
          
          for (const campaignDoc of campaignsSnapshot.docs) {
            const campaign = campaignDoc.data()
            if (!campaign.organizationId) {
              await updateDoc(doc(db, LEAD_COLLECTIONS.CAMPAIGNS, campaignDoc.id), {
                organizationId,
                updatedAt: serverTimestamp()
              })
              console.log(`    - Updated campaign: ${campaignDoc.id}`)
            }
          }
          
          // Step 4: Update generated comments with organizationId
          console.log("  💬 Updating generated comments...")
          let commentCount = 0
          
          for (const campaignDoc of campaignsSnapshot.docs) {
            const commentsQuery = query(
              collection(db, LEAD_COLLECTIONS.GENERATED_COMMENTS),
              where("campaignId", "==", campaignDoc.id)
            )
            const commentsSnapshot = await getDocs(commentsQuery)
            
            const batch = writeBatch(db)
            let batchCount = 0
            
            for (const commentDoc of commentsSnapshot.docs) {
              if (!commentDoc.data().organizationId) {
                batch.update(doc(db, LEAD_COLLECTIONS.GENERATED_COMMENTS, commentDoc.id), {
                  organizationId,
                  updatedAt: serverTimestamp()
                })
                batchCount++
                
                // Firestore batch limit is 500
                if (batchCount === 500) {
                  await batch.commit()
                  batchCount = 0
                }
              }
            }
            
            if (batchCount > 0) {
              await batch.commit()
            }
            
            commentCount += commentsSnapshot.size
          }
          console.log(`    - Updated ${commentCount} comments`)
          
          // Step 5: Clean up profile document
          console.log("  🧹 Cleaning up profile...")
          await updateDoc(doc(db, COLLECTIONS.PROFILES, userId), {
            // Remove deprecated fields
            redditAccessToken: null,
            redditRefreshToken: null,
            redditTokenExpiresAt: null,
            redditUsername: null,
            website: null,
            keywords: null,
            businessDescription: null,
            updatedAt: serverTimestamp()
          })
          
          console.log(`  ✅ Migration complete for user: ${userId}`)
          migratedCount++
          
        } catch (error) {
          console.error(`  ❌ Error migrating user ${userId}:`, error)
          errorCount++
        }
      }
    }
    
    console.log("\n🎉 Migration completed!")
    console.log(`✅ Successfully migrated: ${migratedCount} users`)
    console.log(`❌ Errors: ${errorCount} users`)
    
  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  }
}

// Run the migration
migrateToOrganizations()
  .then(() => {
    console.log("\n✨ Migration script finished")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Migration script failed:", error)
    process.exit(1)
  }) 