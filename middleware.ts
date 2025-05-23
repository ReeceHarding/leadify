/*
<ai_context>
Contains middleware for protecting routes, checking user authentication, and redirecting as needed.
Using clerkMiddleware to handle authentication across the app.
</ai_context>
*/

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isPublicRoute = createRouteMatcher([
  '/',
  '/about',
  '/contact', 
  '/pricing',
  '/login(.*)',
  '/signup(.*)',
  '/api/stripe/webhooks',
  '/api/reddit/callback'
])

const isOnboardingRoute = createRouteMatcher([
  '/onboarding(.*)'
])

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/reddit/lead-finder(.*)',
  '/reddit-test(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes
  if (isPublicRoute(req)) {
    return
  }
  
  // Protect onboarding routes - user must be signed in
  if (isOnboardingRoute(req)) {
    await auth.protect()
    return
  }
  
  // Protect other authenticated routes
  if (isProtectedRoute(req)) {
    await auth.protect()
    return
  }
  
  // Default protection for all other routes
  await auth.protect()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
