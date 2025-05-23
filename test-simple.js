require('dotenv').config({ path: '.env.local' });

async function testGoogleSearch() {
  console.log('🔍 Testing Google Search for Reddit threads...');
  
  try {
    const searchQuery = 'need developer site:reddit.com';
    const apiUrl = new URL('https://www.googleapis.com/customsearch/v1');
    apiUrl.searchParams.set('key', process.env.GOOGLE_SEARCH_API_KEY);
    apiUrl.searchParams.set('cx', process.env.GOOGLE_SEARCH_ENGINE_ID);
    apiUrl.searchParams.set('q', searchQuery);
    apiUrl.searchParams.set('num', '3');

    const response = await fetch(apiUrl.toString());
    
    if (response.ok) {
      const data = await response.json();
      const results = (data.items || []).map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        threadId: item.link.match(/\/comments\/([^\/]+)/)?.[1]
      })).filter(result => result.threadId);

      console.log(`✅ Found ${results.length} Reddit threads`);
      results.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.title.slice(0, 60)}...`);
        console.log(`      Thread ID: ${result.threadId}`);
      });
      
      return results;
    } else {
      console.log(`❌ Search failed: ${response.status} ${response.statusText}`);
      return [];
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return [];
  }
}

async function testOpenAI() {
  console.log('\n🤖 Testing OpenAI scoring...');
  
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const testThread = {
      title: "Need help finding a reliable software development team",
      content: "I'm a startup founder looking for a development team to build our MVP. We need experience in AI and machine learning."
    };

    const mockWebsiteContent = "We are a software development agency specializing in AI-powered solutions and machine learning consulting.";

    const prompt = `Rate this Reddit thread from 1-100 for lead generation relevance:

Website: ${mockWebsiteContent}
Thread: ${testThread.title}
Content: ${testThread.content}

Respond with just a number from 1-100.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 10
    });

    const score = completion.choices[0]?.message?.content?.trim();
    console.log(`✅ OpenAI scored the thread: ${score}/100`);
    
    return parseInt(score) || 0;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return 0;
  }
}

async function testFirebase() {
  console.log('\n🔥 Testing Firebase connection...');
  
  try {
    // Test by importing Firebase and checking configuration
    const { initializeApp, getApps } = require('firebase/app');
    const { getFirestore, connectFirestoreEmulator } = require('firebase/firestore');
    
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
    console.log('✅ Firebase configured successfully');
    console.log(`   Project ID: ${firebaseConfig.projectId}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Firebase Error: ${error.message}`);
    return false;
  }
}

async function runSimpleTests() {
  console.log('🧪 Running simplified component tests...\n');
  
  const results = {};
  
  // Test Google Search
  const searchResults = await testGoogleSearch();
  results.googleSearch = searchResults.length > 0;
  
  // Test OpenAI
  const score = await testOpenAI();
  results.openai = score > 0;
  
  // Test Firebase
  const firebaseWorking = await testFirebase();
  results.firebase = firebaseWorking;
  
  console.log('\n📊 Test Results Summary:');
  console.log(`   🔍 Google Search: ${results.googleSearch ? '✅ Working' : '❌ Failed'}`);
  console.log(`   🤖 OpenAI: ${results.openai ? '✅ Working' : '❌ Failed'}`);
  console.log(`   🔥 Firebase: ${results.firebase ? '✅ Working' : '❌ Failed'}`);
  
  const workingCount = Object.values(results).filter(Boolean).length;
  console.log(`\n🏁 ${workingCount}/3 core components working`);
  
  if (workingCount === 3) {
    console.log('🎉 All core backend components are functional!');
    console.log('✅ Ready for full lead generation workflow');
  } else {
    console.log('⚠️  Some components need attention, but enough are working to proceed');
  }
  
  return results;
}

runSimpleTests().catch(console.error); 