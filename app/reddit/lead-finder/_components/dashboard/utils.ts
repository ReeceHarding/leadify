import { Timestamp } from "firebase/firestore"

// Helper function to robustly serialize Firestore Timestamps or plain timestamp objects to ISO string format
export const serializeTimestampToISO = (timestamp: any): string | undefined => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString()
  }
  if (typeof timestamp === "string") {
    try {
      new Date(timestamp).toISOString() // Validate if it's a valid ISO string
      return timestamp
    } catch (e) {
      console.warn(
        "[SERIALIZE_TIMESTAMP] Invalid date string provided:",
        timestamp
      )
      return undefined
    }
  }
  if (
    timestamp &&
    typeof timestamp.seconds === "number" &&
    typeof timestamp.nanoseconds === "number"
  ) {
    return new Date(
      timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000
    ).toISOString()
  }
  if (timestamp) {
    console.warn(
      "[SERIALIZE_TIMESTAMP] Unexpected timestamp format:",
      timestamp
    )
  }
  return undefined
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
