"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
  campaignId: string
}

export default function StartLeadGeneration({ campaignId }: Props) {
  console.log("🔥🔥🔥 [START-LEAD-GEN] Component mounted with campaignId:", campaignId)
  
  const [isLoading, setIsLoading] = useState(false)
  console.log("🔥🔥🔥 [START-LEAD-GEN] Initial loading state:", isLoading)

  const startGeneration = async () => {
    try {
      console.log("🔥🔥🔥 [START-LEAD-GEN] startGeneration called")
      console.log("🔥🔥🔥 [START-LEAD-GEN] Campaign ID:", campaignId)
      
      setIsLoading(true)
      console.log("🔥🔥🔥 [START-LEAD-GEN] Set loading to true")

      const requestBody = { campaignId }
      console.log("🔥🔥🔥 [START-LEAD-GEN] Request body:", requestBody)
      console.log("🔥🔥🔥 [START-LEAD-GEN] Calling API endpoint: /api/lead-generation/start")

      const response = await fetch("/api/lead-generation/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      })

      console.log("🔥🔥🔥 [START-LEAD-GEN] Response status:", response.status)
      console.log("🔥🔥🔥 [START-LEAD-GEN] Response ok:", response.ok)
      console.log("🔥🔥🔥 [START-LEAD-GEN] Response headers:", Object.fromEntries(response.headers.entries()))

      const data = await response.json()
      console.log("🔥🔥🔥 [START-LEAD-GEN] Response data:", data)

      if (!response.ok) {
        console.error("🔥🔥🔥 [START-LEAD-GEN] Response not OK, error:", data.error)
        throw new Error(data.error || "Failed to start lead generation")
      }

      console.log("🔥🔥🔥 [START-LEAD-GEN] Success! Showing toast")
      toast.success("Lead generation started! New leads will appear below.")
    } catch (error) {
      console.error("🔥🔥🔥 [START-LEAD-GEN] Error caught:", error)
      console.error("🔥🔥🔥 [START-LEAD-GEN] Error type:", typeof error)
      console.error("🔥🔥🔥 [START-LEAD-GEN] Error message:", error instanceof Error ? error.message : String(error))
      console.error("🔥🔥🔥 [START-LEAD-GEN] Error stack:", error instanceof Error ? error.stack : 'No stack trace')
      
      toast.error(error instanceof Error ? error.message : "Failed to start lead generation")
    } finally {
      console.log("🔥🔥🔥 [START-LEAD-GEN] Finally block, setting loading to false")
      setIsLoading(false)
    }
  }

  console.log("🔥🔥🔥 [START-LEAD-GEN] Rendering button, isLoading:", isLoading)

  return (
    <Button
      onClick={startGeneration}
      disabled={isLoading}
      size="sm"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Starting...
        </>
      ) : (
        <>
          <Play className="mr-2 size-4" />
          Start Lead Generation
        </>
      )}
    </Button>
  )
} 