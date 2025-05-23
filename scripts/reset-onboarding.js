const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to set up your service account key)
// admin.initializeApp({
//   credential: admin.credential.cert(require('./path-to-service-account-key.json'))
// });

const db = admin.firestore();

async function resetOnboarding() {
  const userId = "user_2xT54moGFE62okP8YhdF8IqvLeg";
  
  try {
    await db.collection('profiles').doc(userId).update({
      onboardingCompleted: false,
      name: "",
      website: "", 
      keywords: admin.firestore.FieldValue.delete(), // Remove the field entirely
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log("✅ Onboarding reset successfully!");
    console.log("You can now go through onboarding fresh.");
  } catch (error) {
    console.error("❌ Error resetting onboarding:", error);
  }
}

// resetOnboarding(); 