/*
<ai_context>
Initializes Firebase configuration and services for the app.
</ai_context>
*/

import { initializeApp, getApps, FirebaseApp } from "firebase/app"
import { getFirestore, Firestore } from "firebase/firestore"
import { getAuth, Auth } from "firebase/auth"
import { getStorage, FirebaseStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!
}

// Initialize Firebase only if it hasn't been initialized already
const app: FirebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)

// Initialize Firebase services
export const db: Firestore = getFirestore(app)
export const storage: FirebaseStorage = getStorage(app)

// Conditionally initialize and export auth
let auth: Auth | undefined = undefined
if (typeof window !== "undefined") {
  // Only initialize Auth in the browser environment
  try {
    auth = getAuth(app)
  } catch (error) {
    console.warn(
      "Firebase Auth could not be initialized. This might be expected in a server-only environment.",
      error
    )
  }
}

export { auth }
export default app
