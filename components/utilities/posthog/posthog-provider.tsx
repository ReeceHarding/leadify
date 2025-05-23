/*
<ai_context>
This client component provides the PostHog provider for the app.
</ai_context>
*/

"use client"

import { useState, useEffect } from "react"
import posthog from "posthog-js"
import { PostHogProvider } from "posthog-js/react"

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (
      process.env.NEXT_PUBLIC_POSTHOG_KEY &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST
    ) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        person_profiles: "identified_only" // or 'always' to create profiles for anonymous users as well
      })
    }
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
