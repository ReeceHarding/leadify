/*
<ai_context>
Contains middleware for protecting routes, checking user authentication, and redirecting as needed.
Using clerkMiddleware to handle authentication across the app.
</ai_context>
*/

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api(.*)",
  "/onboarding(.*)",
  "/reddit(.*)",
  "/firebase-test(.*)",
  "/reddit-auth(.*)"
])

const isPublicApiRoute = createRouteMatcher([
  "/api/queue/(.*)",
  "/api/warmup/(.*)",
  "/api/monitoring/(.*)",
  "/api/test-warmup"
])

const isTestApiRoute = createRouteMatcher([
  "/api/test-twitter-analysis",
  "/api/test-twitter-direct",
  "/api/test-keywords",
  "/api/test-personalized-comments",
  "/api/test-ai-enhanced"
])

// Create a custom middleware that checks for public API routes first
export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname

  console.log("🔥🔥🔥 [MIDDLEWARE] Request URL:", req.url)
  console.log("🔥🔥🔥 [MIDDLEWARE] Pathname:", pathname)

  // Allow test API routes without any authentication
  if (isTestApiRoute(req)) {
    console.log("🔥🔥🔥 [MIDDLEWARE] Test API route - allowing without auth")
    return NextResponse.next()
  }

  // Check for CRON_SECRET in authorization header for public API routes
  if (isPublicApiRoute(req)) {
    const authHeader = req.headers.get("authorization")
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    console.log("🔥🔥🔥 [MIDDLEWARE] Public API route detected")
    console.log("🔥🔥🔥 [MIDDLEWARE] Auth header:", authHeader)
    console.log("🔥🔥🔥 [MIDDLEWARE] Expected auth:", expectedAuth)

    if (authHeader === expectedAuth) {
      console.log("🔥🔥🔥 [MIDDLEWARE] CRON_SECRET valid - allowing request")
      return NextResponse.next()
    } else {
      console.log("🔥🔥🔥 [MIDDLEWARE] CRON_SECRET invalid - rejecting request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  // Skip authentication for /reddit/lead-finder (testing purposes)
  if (pathname === "/reddit/lead-finder") {
    console.log(
      "🔥🔥🔥 [MIDDLEWARE] Skipping auth for /reddit/lead-finder (testing)"
    )
    return NextResponse.next()
  }

  // For all other routes, check authentication
  const { userId } = await auth()
  console.log("🔥🔥🔥 [MIDDLEWARE] Auth userId:", userId)
  console.log("🔥🔥🔥 [MIDDLEWARE] Is protected route:", isProtectedRoute(req))

  if (isProtectedRoute(req) && !isPublicApiRoute(req) && !isTestApiRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)"
  ]
}
