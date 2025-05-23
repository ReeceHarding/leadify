/*
<ai_context>
Initializes the database connection and exports for the app.
</ai_context>
*/

import { db, auth, storage } from "@/lib/firebase"

// Re-export Firebase services for easy import
export { db, auth, storage }

// Export collection references and types
export * from "./firestore/collections"
