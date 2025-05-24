// Using ES modules with .mjs extension instead
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Firebase configuration (using values from your app)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirestoreQuery() {
  console.log('\n🔍 Testing Firestore Queries...\n');
  
  try {
    // Test 1: Get all campaigns
    console.log('📋 Fetching all campaigns...');
    const campaignsSnapshot = await getDocs(collection(db, 'campaigns'));
    console.log(`Found ${campaignsSnapshot.size} campaigns:`);
    
    campaignsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\nCampaign ID: ${doc.id}`);
      console.log(`- Name: ${data.name}`);
      console.log(`- Status: ${data.status}`);
      console.log(`- User ID: ${data.userId}`);
      console.log(`- Total Comments Generated: ${data.totalCommentsGenerated}`);
    });
    
    // Test 2: Get all generated comments
    console.log('\n\n📝 Fetching all generated comments...');
    const commentsSnapshot = await getDocs(collection(db, 'generated_comments'));
    console.log(`Found ${commentsSnapshot.size} total comments`);
    
    // Group by campaign ID
    const commentsByCampaign = {};
    commentsSnapshot.forEach(doc => {
      const data = doc.data();
      const campaignId = data.campaignId;
      if (!commentsByCampaign[campaignId]) {
        commentsByCampaign[campaignId] = [];
      }
      commentsByCampaign[campaignId].push({
        id: doc.id,
        postTitle: data.postTitle,
        relevanceScore: data.relevanceScore,
        status: data.status
      });
    });
    
    console.log('\n📊 Comments grouped by campaign:');
    Object.entries(commentsByCampaign).forEach(([campaignId, comments]) => {
      console.log(`\nCampaign ${campaignId}: ${comments.length} comments`);
      comments.slice(0, 3).forEach(comment => {
        console.log(`  - ${comment.postTitle ? comment.postTitle.substring(0, 50) : 'No title'}... (Score: ${comment.relevanceScore})`);
      });
    });
    
    // Test 3: Query specific campaign
    const testCampaignId = 'nGUkAfdPyTxgYUE7AzD7';
    console.log(`\n\n🎯 Testing query for campaign: ${testCampaignId}`);
    const specificQuery = await getDocs(
      query(collection(db, 'generated_comments'), where('campaignId', '==', testCampaignId))
    );
    
    console.log(`Found ${specificQuery.size} comments for this campaign`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

testFirestoreQuery(); 