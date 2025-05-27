/*
<ai_context>
Initializes Firebase Admin SDK for server-side operations.
Supports both service account JSON file and individual environment variables.
</ai_context>
*/

import * as admin from "firebase-admin"

let app: admin.app.App | undefined

export function getFirebaseAdmin(): admin.app.App {
  if (app) {
    return app
  }

  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      app = admin.apps[0]!
      return app
    }

    // Option 1: Use GOOGLE_APPLICATION_CREDENTIALS (service account JSON file)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log("🔥 [FIREBASE-ADMIN] Initializing with service account file")
      app = admin.initializeApp({
        credential: admin.credential.applicationDefault()
      })
      return app
    }

    // Option 2: Use individual environment variables
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      console.log("🔥 [FIREBASE-ADMIN] Initializing with environment variables")
      
      // Replace escaped newlines in private key
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        })
      })
      return app
    }

    throw new Error(
      "Firebase Admin SDK credentials not found. Please set either GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables."
    )
  } catch (error) {
    console.error("❌ [FIREBASE-ADMIN] Failed to initialize:", error)
    throw error
  }
}

export const adminDb = () => getFirebaseAdmin().firestore()
export const adminAuth = () => getFirebaseAdmin().auth()
export const adminStorage = () => getFirebaseAdmin().storage() 