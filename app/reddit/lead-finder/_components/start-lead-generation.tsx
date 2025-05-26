"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Play } from "lucide-react"
import { toast } from "sonner"
import { runFullLeadGenerationWorkflowAction } from "@/actions/lead-generation/workflow-actions"

interface Props {
  campaignId: string
}

export default function StartLeadGeneration({ campaignId }: Props) {
  console.log("🚀🚀🚀 [START-LEAD-GEN] ========== COMPONENT MOUNT ==========")
  console.log("🚀🚀🚀 [START-LEAD-GEN] Component mounted with campaignId:", campaignId)
  console.log("🚀🚀🚀 [START-LEAD-GEN] Timestamp:", new Date().toISOString())
  
  const [isLoading, setIsLoading] = useState(false)
  console.log("🚀🚀🚀 [START-LEAD-GEN] Initial state - isLoading:", isLoading)

  const handleStartLeadGeneration = async () => {
    console.log("🚀🚀🚀 [START-LEAD-GEN] ========== BUTTON CLICKED ==========")
    console.log("🚀🚀🚀 [START-LEAD-GEN] handleStartLeadGeneration called")
    console.log("🚀🚀🚀 [START-LEAD-GEN] Campaign ID:", campaignId)
    console.log("🚀🚀🚀 [START-LEAD-GEN] Current loading state:", isLoading)
    console.log("🚀🚀🚀 [START-LEAD-GEN] Timestamp:", new Date().toISOString())
    
    setIsLoading(true)
    console.log("🚀🚀🚀 [START-LEAD-GEN] Loading state set to true")
    
    try {
      console.log("🚀🚀🚀 [START-LEAD-GEN] 🎯 Starting lead generation workflow...")
      console.log("🚀🚀🚀 [START-LEAD-GEN] Calling runFullLeadGenerationWorkflowAction")
      console.log("🚀🚀🚀 [START-LEAD-GEN] Parameters:", { campaignId })
      
      const result = await runFullLeadGenerationWorkflowAction(campaignId)
      
      console.log("🚀🚀🚀 [START-LEAD-GEN] Workflow action completed")
      console.log("🚀🚀🚀 [START-LEAD-GEN] Result:", {
        isSuccess: result.isSuccess,
        message: result.message,
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : []
      })
      
      if (result.data) {
        console.log("🚀🚀🚀 [START-LEAD-GEN] Workflow data:", {
          currentStep: result.data.currentStep,
          totalSteps: result.data.totalSteps,
          completedSteps: result.data.completedSteps,
          isComplete: result.data.isComplete,
          error: result.data.error,
          resultsCount: result.data.results?.length || 0
        })
        
        if (result.data.results) {
          console.log("🚀🚀🚀 [START-LEAD-GEN] Workflow results:")
          result.data.results.forEach((r, i) => {
            console.log(`🚀🚀🚀 [START-LEAD-GEN] Step ${i + 1}:`, {
              step: r.step,
              success: r.success,
              message: r.message,
              hasData: !!r.data
            })
          })
        }
      }
      
      if (result.isSuccess) {
        console.log("🚀🚀🚀 [START-LEAD-GEN] ✅ Workflow succeeded!")
        console.log("🚀🚀🚀 [START-LEAD-GEN] Showing success toast")
        toast.success("Lead generation started!", {
          description: "New leads will appear as they're discovered"
        })
      } else {
        console.log("🚀🚀🚀 [START-LEAD-GEN] ❌ Workflow failed!")
        console.log("🚀🚀🚀 [START-LEAD-GEN] Error message:", result.message)
        console.log("🚀🚀🚀 [START-LEAD-GEN] Showing error toast")
        toast.error("Failed to start lead generation", {
          description: result.message
        })
      }
    } catch (error) {
      console.log("🚀🚀🚀 [START-LEAD-GEN] ❌ Exception caught!")
      console.log("🚀🚀🚀 [START-LEAD-GEN] Error type:", typeof error)
      console.log("🚀🚀🚀 [START-LEAD-GEN] Error:", error)
      console.log("🚀🚀🚀 [START-LEAD-GEN] Error message:", error instanceof Error ? error.message : "Unknown error")
      console.log("🚀🚀🚀 [START-LEAD-GEN] Error stack:", error instanceof Error ? error.stack : "No stack trace")
      console.log("🚀🚀🚀 [START-LEAD-GEN] Showing error toast")
      
      toast.error("Failed to start lead generation", {
        description: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      console.log("🚀🚀🚀 [START-LEAD-GEN] Finally block - resetting loading state")
      setIsLoading(false)
      console.log("🚀🚀🚀 [START-LEAD-GEN] Loading state set to false")
      console.log("🚀🚀🚀 [START-LEAD-GEN] ========== BUTTON HANDLER COMPLETE ==========")
    }
  }

  console.log("🚀🚀🚀 [START-LEAD-GEN] Rendering button with state:", {
    isLoading,
    campaignId,
    disabled: isLoading
  })

  return (
    <Button
      onClick={handleStartLeadGeneration}
      disabled={isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Starting...
        </>
      ) : (
        <>
          <Play className="size-4" />
          Start Lead Generation
        </>
      )}
    </Button>
  )
} 