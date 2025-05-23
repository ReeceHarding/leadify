/*
<ai_context>
Contains middleware for protecting routes, checking user authentication, and redirecting as needed.
Modified to allow all pages for testing purposes while keeping Stripe logic.
</ai_context>
*/

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// Empty for testing - no routes are protected
const isProtectedRoute = createRouteMatcher([])

export default clerkMiddleware(async (auth, req) => {
  // For testing purposes, allow all requests to pass through
  // This enables curl commands and testing without authentication
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"]
}
