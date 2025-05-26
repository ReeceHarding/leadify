/*
Migration script to move Reddit tokens and business data from profiles to organizations.
Run with: GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json" npx tsx scripts/migrate-to-organizations.ts
(Replace serviceAccountKey.json with your actual key file name/path)

This script will:
1. Create organizations for users with Reddit tokens in their profile
2. Move Reddit tokens from profile to organization
3. Move business data (website, name) to organization
4. Add organizationId to all generated comments
5. Clean up profile documents
*/

import * as admin from "firebase-admin";
// IMPORTANT: Make sure your service account key JSON file is in the specified path
// or set the GOOGLE_APPLICATION_CREDENTIALS environment variable.
// For local development, you might place the key in the root and gitignore it.
const serviceAccount = require("../serviceAccountKey.json"); // ADJUST PATH AS NEEDED

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp; // Admin SDK server timestamp

// Import collection name constants (assuming they don't use client SDK specific features)
import { COLLECTIONS } from "@/db/firestore/collections";
import { LEAD_COLLECTIONS } from "@/db/firestore/lead-generation-collections";
import { ORGANIZATION_COLLECTIONS } from "@/db/firestore/organizations-collections";

async function migrateToOrganizations() {
  console.log("🚀 Starting migration to organizations using Firebase Admin SDK...");
  
  try {
    console.log("\n📋 Step 1: Fetching profiles...");
    const profilesRef = db.collection(COLLECTIONS.PROFILES);
    const profilesSnapshot = await profilesRef.get();
    
    let migratedCount = 0;
    let errorCount = 0;
    
    if (profilesSnapshot.empty) {
        console.log("No profiles found to migrate.");
        return;
    }

    for (const profileDoc of profilesSnapshot.docs) {
      const profile = profileDoc.data();
      const userId = profileDoc.id;
      
      if (!profile) {
        console.warn(`Skipping profileDoc with id ${userId} as data is undefined.`);
        continue;
      }
      
      // Check if profile has data to migrate
      if (profile.redditAccessToken || profile.website || (profile.keywords && profile.keywords.length > 0) || profile.businessDescription) {
        console.log(`\n👤 Processing user: ${userId}`);
        console.log(`  - Name from profile: ${profile.name || 'Unknown'}`);
        console.log(`  - Reddit username from profile: ${profile.redditUsername || 'None'}`);
        console.log(`  - Website from profile: ${profile.website || 'None'}`);
        console.log(`  - Keywords count from profile: ${profile.keywords?.length || 0}`);
        
        try {
          const batch = db.batch();

          const orgsQuery = db.collection(ORGANIZATION_COLLECTIONS.ORGANIZATIONS).where("ownerId", "==", userId);
          const orgsSnapshot = await orgsQuery.get();
          
          let organizationId: string;
          let organizationRef: FirebaseFirestore.DocumentReference;

          if (orgsSnapshot.empty) {
            console.log("  ✨ Creating new organization...");
            organizationRef = db.collection(ORGANIZATION_COLLECTIONS.ORGANIZATIONS).doc();
            organizationId = organizationRef.id;
            
            batch.set(organizationRef, {
              id: organizationId,
              name: profile.name || `${userId}\'s Organization`, // Use profile name or a default
              ownerId: userId,
              website: profile.website || null,
              businessDescription: profile.businessDescription || null,
              plan: "free",
              redditAccessToken: profile.redditAccessToken || null,
              redditRefreshToken: profile.redditRefreshToken || null,
              redditTokenExpiresAt: profile.redditTokenExpiresAt || null, // This is already a Timestamp or null
              redditUsername: profile.redditUsername || null,
              isActive: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            
            const memberRef = db.collection(ORGANIZATION_COLLECTIONS.ORGANIZATION_MEMBERS).doc();
            batch.set(memberRef, {
              id: memberRef.id,
              organizationId,
              userId,
              role: "owner",
              joinedAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            console.log(`  ✅ Organization ${organizationId} and membership queued for creation.`);
          } else {
            organizationRef = orgsSnapshot.docs[0].ref;
            organizationId = orgsSnapshot.docs[0].id;
            const existingOrgData = orgsSnapshot.docs[0].data();
            console.log(`  📝 Updating existing organization: ${organizationId}`);
            
            batch.update(organizationRef, {
              // Only update if profile has new data, otherwise keep existing org data
              name: profile.name || existingOrgData.name,
              website: profile.website || existingOrgData.website || null,
              businessDescription: profile.businessDescription || existingOrgData.businessDescription || null,
              redditAccessToken: profile.redditAccessToken || existingOrgData.redditAccessToken || null,
              redditRefreshToken: profile.redditRefreshToken || existingOrgData.redditRefreshToken || null,
              redditTokenExpiresAt: profile.redditTokenExpiresAt || existingOrgData.redditTokenExpiresAt || null,
              redditUsername: profile.redditUsername || existingOrgData.redditUsername || null,
              updatedAt: serverTimestamp()
            });
            console.log(`  ✅ Organization ${organizationId} queued for update.`);
          }
          
          console.log("  📊 Updating user's campaigns with organizationId...");
          const campaignsQuery = db.collection(LEAD_COLLECTIONS.CAMPAIGNS).where("userId", "==", userId);
          const campaignsSnapshot = await campaignsQuery.get();
          
          for (const campaignDoc of campaignsSnapshot.docs) {
            if (!campaignDoc.data().organizationId) {
              batch.update(campaignDoc.ref, {
                organizationId,
                // Remove legacy fields from campaign if they exist, as they are now on organization
                website: admin.firestore.FieldValue.delete(),
                businessDescription: admin.firestore.FieldValue.delete(),
                updatedAt: serverTimestamp()
              });
              console.log(`    - Campaign ${campaignDoc.id} queued for organizationId update & cleanup.`);
            }
          }
          
          console.log("  💬 Updating user's generated comments with organizationId...");
          const userCommentsQuery = db.collection(LEAD_COLLECTIONS.GENERATED_COMMENTS).where("campaignId", "in", campaignsSnapshot.docs.map(d => d.id));
          const userCommentsSnapshot = await userCommentsQuery.get();

          for (const commentDoc of userCommentsSnapshot.docs) {
            if (!commentDoc.data().organizationId) {
               batch.update(commentDoc.ref, { organizationId, updatedAt: serverTimestamp() });
            }
          }
          console.log(`    - Queued updates for ${userCommentsSnapshot.size} comments.`);
          
          console.log("  🧹 Cleaning up profile document...");
          batch.update(profileDoc.ref, {
            redditAccessToken: admin.firestore.FieldValue.delete(),
            redditRefreshToken: admin.firestore.FieldValue.delete(),
            redditTokenExpiresAt: admin.firestore.FieldValue.delete(),
            redditUsername: admin.firestore.FieldValue.delete(),
            website: admin.firestore.FieldValue.delete(),
            keywords: admin.firestore.FieldValue.delete(),
            businessDescription: admin.firestore.FieldValue.delete(),
            updatedAt: serverTimestamp()
          });
          
          await batch.commit();
          console.log(`  ✅ Migration batch committed for user: ${userId}`);
          migratedCount++;
          
        } catch (error) {
          console.error(`  ❌ Error migrating user ${userId}:`, error);
          errorCount++;
        }
      } else {
        console.log(`  Skipping user ${userId} - no relevant data found in profile for migration.`);
      }
    }
    
    console.log("\n🎉 Migration to organizations completed!");
    console.log(`✅ Successfully processed: ${migratedCount} users with relevant data`);
    console.log(`❌ Errors during migration for: ${errorCount} users`);
    
  } catch (error) {
    console.error("❌ Overall migration failed:", error);
    process.exit(1);
  }
}

migrateToOrganizations()
  .then(() => {
    console.log("\n✨ Migration script finished successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration script encountered an unhandled error:", error);
    process.exit(1);
  }); 