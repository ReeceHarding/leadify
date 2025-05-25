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
  "/api/warmup/(.*)"
])

// Create a custom middleware that checks for public API routes first
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  console.log("🔥🔥🔥 [MIDDLEWARE] Request URL:", request.url)
  console.log("🔥🔥🔥 [MIDDLEWARE] Pathname:", pathname)
  
  // Skip auth for public API routes
  if (isPublicApiRoute(request)) {
    console.log("🔥🔥🔥 [MIDDLEWARE] Public API route - skipping auth")
    return NextResponse.next()
  }
  
  // For all other routes, use Clerk middleware
  return clerkMiddleware(async (auth, req) => {
    const { userId } = await auth()
    console.log("🔥🔥🔥 [MIDDLEWARE] Auth userId:", userId)
    console.log("🔥🔥🔥 [MIDDLEWARE] Is protected route:", isProtectedRoute(req))
    
    if (isProtectedRoute(req)) {
      await auth.protect()
    }
  })(request, {} as any)
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)"
  ]
}
