/*
<ai_context>
Utility functions for Firebase operations.
</ai_context>
*/

// Utility function to remove undefined values from objects
// Firestore doesn't accept undefined values, only null or omitted fields
export function removeUndefinedValues(obj: any): any {
  const cleaned: any = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value
    }
  }
  return cleaned
}
