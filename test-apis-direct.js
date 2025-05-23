require('dotenv').config({ path: '.env.local' });

async function testFirecrawl() {
  console.log('🔥 Testing Firecrawl API...');
  
  if (!process.env.FIRECRAWL_API_KEY) {
    console.log('❌ FIRECRAWL_API_KEY not found in environment');
    return false;
  }

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
      return true;
    } else {
      console.log('❌ Firecrawl: Failed to scrape test page');
      console.log('   Error:', result?.error || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log('❌ Firecrawl: Error -', error.message);
    return false;
  }
}

async function testGoogleSearch() {
  console.log('\n🔍 Testing Google Custom Search API...');
  
  if (!process.env.GOOGLE_SEARCH_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
    console.log('❌ Google Search API credentials not found in environment');
    return false;
  }

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
      return true;
    } else {
      console.log('❌ Google Search: API Error -', response.status, response.statusText);
      const errorText = await response.text();
      console.log('   Details:', errorText.slice(0, 200));
      return false;
    }
  } catch (error) {
    console.log('❌ Google Search: Error -', error.message);
    return false;
  }
}

async function testReddit() {
  console.log('\n📖 Testing Reddit API...');
  
  if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
    console.log('❌ Reddit API credentials not found in environment');
    console.log('   Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET to test Reddit');
    return false;
  }

  try {
    const Snoowrap = require('snoowrap');
    const reddit = new Snoowrap({
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET,
      userAgent: process.env.REDDIT_USER_AGENT || 'RedditLeadGen/1.0.0'
    });

    const testSubreddit = await reddit.getSubreddit('test').fetch();
    console.log('✅ Reddit: Connected successfully');
    console.log(`   Test subreddit has ${testSubreddit.subscribers} subscribers`);
    return true;
  } catch (error) {
    console.log('❌ Reddit: Error -', error.message);
    return false;
  }
}

async function testOpenAI() {
  console.log('\n🤖 Testing OpenAI API...');
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY not found in environment');
    console.log('   Add OPENAI_API_KEY to test OpenAI');
    return false;
  }

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
      return true;
    } else {
      console.log('❌ OpenAI: No response received');
      return false;
    }
  } catch (error) {
    console.log('❌ OpenAI: Error -', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Testing API integrations directly...\n');
  
  const results = {
    firecrawl: await testFirecrawl(),
    googleSearch: await testGoogleSearch(),
    reddit: await testReddit(),
    openai: await testOpenAI()
  };

  console.log('\n📊 Results Summary:');
  Object.entries(results).forEach(([service, success]) => {
    console.log(`   ${success ? '✅' : '❌'} ${service}: ${success ? 'Working' : 'Failed'}`);
  });

  const workingCount = Object.values(results).filter(Boolean).length;
  console.log(`\n🏁 ${workingCount}/4 services are working correctly`);
  
  if (workingCount >= 2) {
    console.log('✅ Sufficient services working to proceed with testing!');
  } else {
    console.log('⚠️  Add more API credentials to test the full workflow');
  }
}

runTests().catch(console.error); 