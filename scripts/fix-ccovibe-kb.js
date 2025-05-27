const admin = require('firebase-admin');
const serviceAccount = require('../austen-reddit-app-firebase-adminsdk-fbsvc-83ff3586fc.json');

// Initialize admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixCCOVibeKnowledgeBase() {
  console.log('🔧 Fixing CCO Vibe knowledge base...\n');

  try {
    // Find CCO Vibe organization
    console.log('📋 Finding CCO Vibe organization...');
    const orgsSnapshot = await db.collection('organizations')
      .where('name', '==', 'CCO Vibe')
      .get();
    
    if (orgsSnapshot.empty) {
      console.log('❌ CCO Vibe organization not found');
      return;
    }
    
    const ccoVibeOrg = orgsSnapshot.docs[0];
    const orgData = ccoVibeOrg.data();
    console.log('✅ Found CCO Vibe organization:', ccoVibeOrg.id);
    console.log('  Owner:', orgData.ownerId);
    console.log('  Business Description:', orgData.businessDescription);
    
    // Check if knowledge base already exists
    console.log('\n📋 Checking for existing knowledge base...');
    const kbSnapshot = await db.collection('knowledgeBase')
      .where('organizationId', '==', ccoVibeOrg.id)
      .get();
    
    if (!kbSnapshot.empty) {
      console.log('⚠️  Knowledge base already exists for CCO Vibe');
      const kb = kbSnapshot.docs[0].data();
      console.log('  Custom Information:', kb.customInformation ? 'Yes' : 'No');
      console.log('  Summary:', kb.summary ? 'Yes' : 'No');
      return;
    }
    
    // Create knowledge base
    console.log('\n🔨 Creating knowledge base for CCO Vibe...');
    const kbRef = db.collection('knowledgeBase').doc();
    const kbData = {
      id: kbRef.id,
      userId: orgData.ownerId,
      organizationId: ccoVibeOrg.id,
      websiteUrl: orgData.website || '',
      customInformation: orgData.businessDescription || 'CCO vibe is a coding agency that builds internal tools for developed companies and MVP\'s for startups',
      scrapedPages: [],
      summary: '',
      keyFacts: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await kbRef.set(kbData);
    console.log('✅ Knowledge base created successfully!');
    console.log('  ID:', kbRef.id);
    console.log('  Organization ID:', ccoVibeOrg.id);
    console.log('  Custom Information:', kbData.customInformation);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Clean up
    await admin.app().delete();
  }
}

// Run the fix
fixCCOVibeKnowledgeBase(); 