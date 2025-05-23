const { 
  createProfileAction, 
  getProfileByUserIdAction, 
  updateProfileAction, 
  deleteProfileAction 
} = require("./actions/db/profiles-actions");

async function testProfileActions() {
  try {
    console.log("🧪 Testing Profile Actions...");
    
    const testUserId = "test-user-" + Date.now();
    console.log("📝 Test User ID:", testUserId);
    
    // Test create profile
    console.log("\n1️⃣ Testing createProfileAction...");
    const createResult = await createProfileAction({
      userId: testUserId,
      membership: "free"
    });
    
    if (createResult.isSuccess) {
      console.log("✅ Profile created:", createResult.data);
    } else {
      console.log("❌ Failed to create profile:", createResult.message);
      return;
    }
    
    // Test get profile
    console.log("\n2️⃣ Testing getProfileByUserIdAction...");
    const getResult = await getProfileByUserIdAction(testUserId);
    
    if (getResult.isSuccess) {
      console.log("✅ Profile retrieved:", getResult.data);
    } else {
      console.log("❌ Failed to get profile:", getResult.message);
      return;
    }
    
    // Test update profile
    console.log("\n3️⃣ Testing updateProfileAction...");
    const updateResult = await updateProfileAction(testUserId, {
      membership: "pro",
      stripeCustomerId: "cus_test123"
    });
    
    if (updateResult.isSuccess) {
      console.log("✅ Profile updated:", updateResult.data);
    } else {
      console.log("❌ Failed to update profile:", updateResult.message);
      return;
    }
    
    // Test delete profile
    console.log("\n4️⃣ Testing deleteProfileAction...");
    const deleteResult = await deleteProfileAction(testUserId);
    
    if (deleteResult.isSuccess) {
      console.log("✅ Profile deleted successfully");
    } else {
      console.log("❌ Failed to delete profile:", deleteResult.message);
      return;
    }
    
    console.log("\n🎉 All profile actions are working perfectly!");
    
  } catch (error) {
    console.error("❌ Profile actions test failed:", error);
    process.exit(1);
  }
}

testProfileActions(); 