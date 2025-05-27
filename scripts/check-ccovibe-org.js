const admin = require('firebase-admin');
const serviceAccount = require('../austen-reddit-app-firebase-adminsdk-fbsvc-83ff3586fc.json');

// Initialize admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCCOVibeOrganization() {
  console.log('🔍 Checking CCO Vibe organization in Firebase...\n');

  try {
    // First, let's find all organizations
    console.log('📋 Fetching all organizations...');
    const orgsSnapshot = await db.collection('organizations').get();
    
    console.log(`Found ${orgsSnapshot.size} total organizations\n`);
    
    // Look for CCO Vibe specifically
    let ccoVibeOrg = null;
    orgsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Organization: ${data.name} (ID: ${doc.id})`);
      console.log(`  Owner ID: ${data.ownerId}`);
      console.log(`  Website: ${data.website || 'Not set'}`);
      console.log(`  Reddit Username: ${data.redditUsername || 'Not set'}`);
      console.log(`  Created: ${data.createdAt?.toDate() || 'Unknown'}`);
      console.log('');
      
      if (data.name && (data.name === 'CCO Vibe' || data.name.toLowerCase() === 'cco vibe')) {
        ccoVibeOrg = { id: doc.id, ...data };
      }
    });
    
    if (ccoVibeOrg) {
      console.log('✅ Found CCO Vibe organization!');
      console.log('🔍 Detailed CCO Vibe info:', JSON.stringify(ccoVibeOrg, null, 2));
      
      // Check if there's a user profile for the owner
      console.log('\n📋 Checking owner profile...');
      const profileSnapshot = await db.collection('profiles')
        .where('userId', '==', ccoVibeOrg.ownerId)
        .get();
      
      if (!profileSnapshot.empty) {
        const profile = profileSnapshot.docs[0].data();
        console.log('Owner profile found:', {
          name: profile.name,
          email: profile.email,
          onboardingCompleted: profile.onboardingCompleted
        });
      }
      
      // Check for knowledge base
      console.log('\n📋 Checking knowledge base...');
      const knowledgeBaseSnapshot = await db.collection('knowledgeBase')
        .where('organizationId', '==', ccoVibeOrg.id)
        .get();
      
      if (!knowledgeBaseSnapshot.empty) {
        const kb = knowledgeBaseSnapshot.docs[0].data();
        console.log('Knowledge base found:', {
          hasCustomInfo: !!kb.customInformation,
          customInfoLength: kb.customInformation?.length || 0,
          hasSummary: !!kb.summary,
          keyFactsCount: kb.keyFacts?.length || 0
        });
        
        if (kb.customInformation) {
          console.log('\n📝 Custom Information:');
          console.log(kb.customInformation.substring(0, 200) + '...');
        }
      } else {
        console.log('❌ No knowledge base found for this organization');
      }
      
      // Check for campaigns
      console.log('\n📋 Checking campaigns...');
      const campaignsSnapshot = await db.collection('campaigns')
        .where('organizationId', '==', ccoVibeOrg.id)
        .get();
      
      console.log(`Found ${campaignsSnapshot.size} campaigns for CCO Vibe`);
      campaignsSnapshot.forEach(doc => {
        const campaign = doc.data();
        console.log(`  Campaign: ${campaign.name}`);
        console.log(`    Keywords: ${campaign.keywords?.join(', ') || 'None'}`);
      });
      
      // Check which users have access to this organization
      console.log('\n📋 Checking user access...');
      console.log('Organization owner:', ccoVibeOrg.ownerId);
      
      // Check all profiles to see who might be trying to access
      const allProfilesSnapshot = await db.collection('profiles').get();
      console.log('\nAll user profiles:');
      allProfilesSnapshot.forEach(doc => {
        const profile = doc.data();
        console.log(`  User ID: ${profile.userId}`);
        console.log(`    Name: ${profile.name}`);
        console.log(`    Email: ${profile.email}`);
        console.log(`    Onboarding: ${profile.onboardingCompleted}`);
        console.log('');
      });
      
    } else {
      console.log('❌ CCO Vibe organization not found');
      
      // List all organization names to help debug
      console.log('\n📋 All organization names:');
      orgsSnapshot.forEach(doc => {
        console.log(`  - ${doc.data().name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking Firebase:', error);
  } finally {
    // Clean up
    await admin.app().delete();
  }
}

// Run the check
checkCCOVibeOrganization(); 