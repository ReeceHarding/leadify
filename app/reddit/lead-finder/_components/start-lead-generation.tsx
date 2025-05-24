"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
  campaignId: string
}

export default function StartLeadGeneration({ campaignId }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const startGeneration = async () => {
    try {
      setIsLoading(true)
      console.log("🔥 [START-LEAD-GEN] Starting lead generation for campaign:", campaignId)

      const response = await fetch("/api/lead-generation/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ campaignId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to start lead generation")
      }

      toast.success("Lead generation started! New leads will appear below.")
    } catch (error) {
      console.error("🔥 [START-LEAD-GEN] Error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to start lead generation")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={startGeneration}
      disabled={isLoading}
      size="sm"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Starting...
        </>
      ) : (
        <>
          <Play className="mr-2 h-4 w-4" />
          Start Lead Generation
        </>
      )}
    </Button>
  )
} 