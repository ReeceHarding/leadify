/*
<ai_context>
Contains the utility functions for the app.
</ai_context>
*/

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes a URL to ensure it has a proper protocol and format
 * Makes URL input idiot-proof by handling common user mistakes
 */
export function normalizeUrl(url: string): string {
  if (!url) return ""

  // Remove whitespace and common prefixes users might add
  url = url.trim()

  // Remove common prefixes that users might accidentally include
  url = url.replace(/^(www\.|https?:\/\/www\.|https?:\/\/)/i, "")

  // Add https:// protocol
  url = "https://" + url

  // Remove trailing slashes
  url = url.replace(/\/+$/, "")

  return url
}

/**
 * Validates if a URL is properly formatted
 * Works with normalized URLs
 */
export function isValidUrl(url: string): boolean {
  try {
    const normalized = normalizeUrl(url)
    const urlObj = new URL(normalized)

    // Check if it has a valid domain
    const domain = urlObj.hostname
    if (!domain || domain.length < 3 || !domain.includes(".")) {
      return false
    }

    // Check for valid protocol
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return false
    }

    return true
  } catch {
    return false
  }
}
