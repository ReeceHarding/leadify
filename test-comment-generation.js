// Simple test script to test the new comment generation
const testData = {
  threadTitle: "Where to hire software developers?",
  threadContent: "I'm looking for recommendations on where to find good software developers for my startup. We need someone who can build a web application from scratch. Budget is around $50k. Any suggestions?",
  subreddit: "entrepreneur",
  organizationId: "test-org",
  campaignKeywords: ["hire software developers", "find developers"],
  websiteContent: "CCO Vibe is a software development agency that specializes in building custom web applications for startups and small businesses. We have a team of experienced developers who can help you build your product from concept to launch.",
  existingComments: [
    "I've had good luck with Upwork for finding freelancers",
    "Try posting on AngelList or LinkedIn",
    "Local coding bootcamps often have good talent"
  ]
};

console.log("Test data prepared for comment generation:");
console.log("Thread:", testData.threadTitle);
console.log("Keywords:", testData.campaignKeywords.join(", "));
console.log("Brand:", "CCO Vibe");
console.log("\nThis would generate comments in the new natural style like:");
console.log("\nMICRO: I would love to chat about this if you want to message me. This is what I do!");
console.log("\nMEDIUM: I would love to chat about this if you want to message me. This is what I do! I love this exploratory phase! You have a few options - DIY/offshore, hire an engineer, or hire a company. Look at CCO Vibe and ask to set up an intro call.");
console.log("\nVERBOSE: [Full conversational response with A, B, C options and natural brand mention]"); 