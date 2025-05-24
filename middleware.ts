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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api/stripe/webhooks
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/stripe/webhooks).*)"
  ]
}
