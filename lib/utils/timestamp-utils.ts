/*
<ai_context>
Centralized timestamp utilities for consistent date handling
</ai_context>
*/

import { Timestamp } from "firebase/firestore"

/**
 * Converts any timestamp format to ISO string
 * Handles Firestore Timestamp, Date, string, and null/undefined
 */
export function toISOString(timestamp: any): string | null {
  if (!timestamp) return null

  // Handle Firestore Timestamp
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString()
  }

  // Handle Date object
  if (timestamp instanceof Date) {
    return timestamp.toISOString()
  }

  // Handle string (assume it's already ISO)
  if (typeof timestamp === "string") {
    try {
      // Validate it's a valid date string
      const date = new Date(timestamp)
      if (!isNaN(date.getTime())) {
        return date.toISOString()
      }
    } catch {
      // Invalid date string
    }
  }

  // Handle object with toDate method (Firestore Timestamp-like)
  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    try {
      return timestamp.toDate().toISOString()
    } catch {
      // Invalid timestamp object
    }
  }

  // Handle object with seconds/nanoseconds (Firestore Timestamp structure)
  if (timestamp.seconds !== undefined) {
    try {
      const date = new Date(timestamp.seconds * 1000)
      return date.toISOString()
    } catch {
      // Invalid timestamp structure
    }
  }

  return null
}

/**
 * Converts any timestamp to Date object
 */
export function toDate(timestamp: any): Date | null {
  const iso = toISOString(timestamp)
  return iso ? new Date(iso) : null
}

/**
 * Gets relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(timestamp: any): string {
  const date = toDate(timestamp)
  if (!date) return "Unknown time"

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
  }
  if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`
  }
  return "Just now"
}

/**
 * Formats timestamp for display
 */
export function formatTimestamp(
  timestamp: any,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }
): string {
  const date = toDate(timestamp)
  if (!date) return "Invalid date"

  return new Intl.DateTimeFormat("en-US", options).format(date)
}
