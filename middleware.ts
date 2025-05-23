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
  '/onboarding(.*)',
  '/reddit/lead-finder(.*)',
  '/reddit-test(.*)',
  '/login(.*)',
  '/signup(.*)',
  '/api/stripe/webhooks',
  '/api/reddit/callback'
])

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes
  if (isPublicRoute(req)) {
    return
  }
  
  // Protect all other routes
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
