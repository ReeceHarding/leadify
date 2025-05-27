/*
<ai_context>
Contains middleware for protecting routes, checking user authentication, and redirecting as needed.
Using clerkMiddleware to handle authentication across the app.
</ai_context>
*/

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getOrganizationsByUserIdForMiddlewareAction } from "@/actions/db/organizations-actions"

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
  "/api/test-warmup"
])

const isTestApiRoute = createRouteMatcher([
  "/api/test-twitter-analysis",
  "/api/test-twitter-direct",
  "/api/test-keywords",
  "/api/test-personalized-comments"
])

// Routes that require organization context
const requiresOrganization = createRouteMatcher([
  "/dashboard(.*)",
  "/reddit(.*)",
  "/api/lead-generation/(.*)",
  "/api/reddit/(.*)"
])

// Routes that should redirect to onboarding if no organization
const shouldRedirectToOnboarding = createRouteMatcher([
  "/dashboard(.*)",
  "/reddit(.*)"
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
    
    // Check organization context for routes that require it
    if (userId && requiresOrganization(req)) {
      console.log("🔥🔥🔥 [MIDDLEWARE] Checking organization context for user:", userId)
      
      try {
        const orgsResult = await getOrganizationsByUserIdForMiddlewareAction(userId)
        
        if (!orgsResult.isSuccess || !orgsResult.data || orgsResult.data.length === 0) {
          console.log("🔥🔥🔥 [MIDDLEWARE] No organizations found for user")
          
          // Redirect to onboarding if this is a page that requires organization
          if (shouldRedirectToOnboarding(req) && pathname !== "/onboarding") {
            console.log("🔥🔥🔥 [MIDDLEWARE] Redirecting to onboarding")
            return NextResponse.redirect(new URL("/onboarding", req.url))
          }
          
          // For API routes, return error
          if (pathname.startsWith("/api/")) {
            return NextResponse.json(
              { error: "No organization found. Please complete onboarding." },
              { status: 403 }
            )
          }
        }
        
        console.log("🔥🔥🔥 [MIDDLEWARE] User has", orgsResult.data?.length || 0, "organizations")
      } catch (error) {
        console.error("🔥🔥🔥 [MIDDLEWARE] Error checking organizations:", error)
        // Allow request to continue - let the page/API handle the error
      }
    }
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
