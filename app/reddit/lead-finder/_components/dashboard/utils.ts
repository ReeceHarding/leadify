import { Timestamp } from "firebase/firestore"
import { toISOString } from "@/lib/utils/timestamp-utils"

// Helper function to robustly serialize Firestore Timestamps or plain timestamp objects to ISO string format
export function serializeTimestampToISO(timestamp: any): string | undefined {
  const iso = toISOString(timestamp)
  return iso || undefined
}

// Helper to get time ago string
export const getTimeAgo = (timestamp: any): string => {
  const now = Date.now()
  let then: number
  if (typeof timestamp === "string") {
    // Attempt to parse ISO string
    then = new Date(timestamp).getTime()
  } else if (timestamp && typeof timestamp.seconds === "number") {
    // Firestore Timestamp like object
    then = timestamp.seconds * 1000
  } else if (timestamp instanceof Date) {
    // Actual Date object
    then = timestamp.getTime()
  } else {
    // Fallback for unrecognized format
    console.warn(
      "[GET_TIME_AGO] Unrecognized timestamp format, defaulting time ago:",
      timestamp
    )
    then = now - 7200000 // Default to 2h ago if invalid
  }

  if (isNaN(then)) {
    // Check if date parsing failed
    console.warn(
      "[GET_TIME_AGO] Failed to parse timestamp, defaulting time ago:",
      timestamp
    )
    then = now - 7200000 // Default to 2h ago if parsing failed
  }

  const diff = now - then
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return "Just now"
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
