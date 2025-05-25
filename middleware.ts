/*
<ai_context>
Contains middleware for protecting routes, checking user authentication, and redirecting as needed.
Using clerkMiddleware to handle authentication across the app.
</ai_context>
*/

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api(.*)",
  "/onboarding(.*)",
  "/reddit(.*)",
  "/firebase-test(.*)",
  "/reddit-auth(.*)"
])

export default clerkMiddleware(async (auth, req) => {
  console.log("🔥🔥🔥 [MIDDLEWARE] Request URL:", req.url)
  console.log("🔥🔥🔥 [MIDDLEWARE] Pathname:", req.nextUrl.pathname)
  
  const { userId } = await auth()
  console.log("🔥🔥🔥 [MIDDLEWARE] Auth userId:", userId)
  console.log("🔥🔥🔥 [MIDDLEWARE] Is protected route:", isProtectedRoute(req))
  
  if (isProtectedRoute(req)) {
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
