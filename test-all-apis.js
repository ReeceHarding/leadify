require('dotenv').config({ path: '.env.local' });

async function testAllAPIs() {
  console.log('🧪 Testing all API integrations with new credentials...\n');

  const results = {};

  // Test Firecrawl
  console.log('1️⃣ Testing Firecrawl...');
  try {
    const FirecrawlApp = require('@mendable/firecrawl-js').default;
    const firecrawl = new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY
    });

    const result = await firecrawl.scrapeUrl('https://example.com', {
      formats: ['markdown'],
      timeout: 10000
    });

    if (result && result.success) {
      console.log('✅ Firecrawl: Connected successfully');
      results.firecrawl = true;
    } else {
      console.log('❌ Firecrawl: Failed');
      results.firecrawl = false;
    }
  } catch (error) {
    console.log('❌ Firecrawl: Error -', error.message);
    results.firecrawl = false;
  }

  // Test Google Search
  console.log('\n2️⃣ Testing Google Search...');
  try {
    const apiUrl = new URL('https://www.googleapis.com/customsearch/v1');
    apiUrl.searchParams.set('key', process.env.GOOGLE_SEARCH_API_KEY);
    apiUrl.searchParams.set('cx', process.env.GOOGLE_SEARCH_ENGINE_ID);
    apiUrl.searchParams.set('q', 'test site:reddit.com');
    apiUrl.searchParams.set('num', '1');

    const response = await fetch(apiUrl.toString());
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Google Search: Connected successfully');
      console.log(`   Found ${data.items ? data.items.length : 0} test results`);
      results.googleSearch = true;
    } else {
      console.log('❌ Google Search: API Error -', response.status);
      results.googleSearch = false;
    }
  } catch (error) {
    console.log('❌ Google Search: Error -', error.message);
    results.googleSearch = false;
  }

  // Test Reddit
  console.log('\n3️⃣ Testing Reddit...');
  try {
    const Snoowrap = require('snoowrap');
    
    // Use fromApplicationOnlyAuth for read-only access with better User-Agent
    const reddit = await Snoowrap.fromApplicationOnlyAuth({
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET,
      userAgent: process.env.REDDIT_USER_AGENT,
      // Use explicit grant type constant
      grantType: 'client_credentials'
    });

    const testSubreddit = await reddit.getSubreddit('test').fetch();
    console.log('✅ Reddit: Connected successfully');
    console.log(`   Test subreddit has ${testSubreddit.subscribers} subscribers`);
    results.reddit = true;
  } catch (error) {
    console.log('❌ Reddit: Error -', error.message);
    results.reddit = false;
  }

  // Test OpenAI
  console.log('\n4️⃣ Testing OpenAI...');
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Say hello world" }],
      max_tokens: 10
    });

    if (completion.choices[0]?.message?.content) {
      console.log('✅ OpenAI: Connected successfully');
      console.log('   Response:', completion.choices[0].message.content.trim());
      results.openai = true;
    } else {
      console.log('❌ OpenAI: No response received');
      results.openai = false;
    }
  } catch (error) {
    console.log('❌ OpenAI: Error -', error.message);
    results.openai = false;
  }

  // Test Firebase
  console.log('\n5️⃣ Testing Firebase...');
  try {
    const { initializeApp, getApps } = require('firebase/app');
    const { getFirestore } = require('firebase/firestore');
    
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };

    let app;
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    
    const db = getFirestore(app);
    console.log('✅ Firebase: Connected successfully');
    console.log(`   Project ID: ${firebaseConfig.projectId}`);
    results.firebase = true;
  } catch (error) {
    console.log('❌ Firebase: Error -', error.message);
    results.firebase = false;
  }

  // Summary
  console.log('\n📊 Results Summary:');
  Object.entries(results).forEach(([service, success]) => {
    console.log(`   ${success ? '✅' : '❌'} ${service}: ${success ? 'Working' : 'Failed'}`);
  });

  const workingCount = Object.values(results).filter(Boolean).length;
  console.log(`\n🏁 ${workingCount}/5 services are working correctly`);
  
  if (workingCount >= 4) {
    console.log('🎉 All critical services working! Reddit lead generation is ready to go!');
  } else {
    console.log('⚠️  Some services need attention');
  }

  return results;
}

testAllAPIs().catch(console.error); 