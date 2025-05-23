"use client"

import { Suspense } from "react"
import OnboardingFlow from "./_components/onboarding-flow"

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="mx-auto size-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-muted-foreground">Loading onboarding...</p>
          </div>
        </div>
      }
    >
      <OnboardingFlow />
    </Suspense>
  )
}
