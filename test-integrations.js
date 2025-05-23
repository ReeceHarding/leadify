const { testFirecrawlConnectionAction } = require('./actions/integrations/firecrawl-actions');
const { testGoogleSearchConnectionAction } = require('./actions/integrations/google-search-actions');

async function testAllIntegrations() {
  console.log('🧪 Testing all API integrations...\n');

  // Test Firecrawl
  console.log('1️⃣ Testing Firecrawl...');
  try {
    const firecrawlResult = await testFirecrawlConnectionAction();
    console.log(firecrawlResult.isSuccess ? '✅ Firecrawl: Connected' : '❌ Firecrawl: Failed');
    if (!firecrawlResult.isSuccess) {
      console.log(`   Error: ${firecrawlResult.message}`);
    }
  } catch (error) {
    console.log(`❌ Firecrawl: Error - ${error.message}`);
  }

  // Test Google Search
  console.log('\n2️⃣ Testing Google Search...');
  try {
    const googleResult = await testGoogleSearchConnectionAction();
    console.log(googleResult.isSuccess ? '✅ Google Search: Connected' : '❌ Google Search: Failed');
    if (!googleResult.isSuccess) {
      console.log(`   Error: ${googleResult.message}`);
    }
  } catch (error) {
    console.log(`❌ Google Search: Error - ${error.message}`);
  }

  // Test Reddit (if credentials are available)
  console.log('\n3️⃣ Testing Reddit...');
  try {
    const { testRedditConnectionAction } = require('./actions/integrations/reddit-actions');
    const redditResult = await testRedditConnectionAction();
    console.log(redditResult.isSuccess ? '✅ Reddit: Connected' : '❌ Reddit: Failed');
    if (!redditResult.isSuccess) {
      console.log(`   Error: ${redditResult.message}`);
    }
  } catch (error) {
    console.log(`❌ Reddit: Error - ${error.message}`);
  }

  // Test OpenAI (if credentials are available)
  console.log('\n4️⃣ Testing OpenAI...');
  try {
    const { testOpenAIConnectionAction } = require('./actions/integrations/openai-actions');
    const openaiResult = await testOpenAIConnectionAction();
    console.log(openaiResult.isSuccess ? '✅ OpenAI: Connected' : '❌ OpenAI: Failed');
    if (!openaiResult.isSuccess) {
      console.log(`   Error: ${openaiResult.message}`);
    }
  } catch (error) {
    console.log(`❌ OpenAI: Error - ${error.message}`);
  }

  console.log('\n🏁 Integration testing complete!');
}

testAllIntegrations().catch(console.error); 