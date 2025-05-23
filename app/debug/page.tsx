"use client"

import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { resetOnboardingAction } from "@/actions/db/debug-actions"
import { useState } from "react"

export default function DebugPage() {
  const { user } = useUser()
  const [isResetting, setIsResetting] = useState(false)
  const [message, setMessage] = useState("")

  const handleResetOnboarding = async () => {
    if (!user?.id) {
      setMessage("❌ No user found")
      return
    }

    setIsResetting(true)
    setMessage("")

    try {
      const result = await resetOnboardingAction(user.id)

      if (result.isSuccess) {
        setMessage(
          "✅ Onboarding reset successfully! You can now go through onboarding fresh."
        )
      } else {
        setMessage(`❌ ${result.message}`)
      }
    } catch (error) {
      setMessage("❌ Error resetting onboarding")
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-4 text-2xl font-bold">Debug Tools</h1>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Reset Onboarding</h2>
          <p className="mb-2 text-sm text-gray-600">
            Use this if your profile is stuck in an inconsistent state (marked
            as complete but missing required data).
          </p>
          <Button
            onClick={handleResetOnboarding}
            disabled={isResetting || !user?.id}
            className="mr-2"
          >
            {isResetting ? "Resetting..." : "Reset My Onboarding"}
          </Button>
        </div>

        {message && (
          <div className="rounded-lg border p-4">
            <p>{message}</p>
          </div>
        )}

        {user && (
          <div className="text-sm text-gray-500">User ID: {user.id}</div>
        )}
      </div>
    </div>
  )
}
