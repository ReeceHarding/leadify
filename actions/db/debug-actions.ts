"use server"

import { db } from "@/db/db"
import { COLLECTIONS } from "@/db/firestore/collections"
import { ActionState } from "@/types"
import { doc, updateDoc, serverTimestamp, deleteField } from "firebase/firestore"

export async function resetOnboardingAction(
  userId: string
): Promise<ActionState<void>> {
  console.log("🔧 [DEBUG] resetOnboardingAction called for user:", userId)
  
  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId)
    
    await updateDoc(profileRef, {
      onboardingCompleted: false,
      name: "",
      website: "",
      keywords: deleteField(), // Remove the keywords field entirely
      updatedAt: serverTimestamp()
    })
    
    console.log("✅ [DEBUG] Onboarding reset successfully for user:", userId)
    
    return {
      isSuccess: true,
      message: "Onboarding reset successfully",
      data: undefined
    }
  } catch (error) {
    console.error("❌ [DEBUG] Error resetting onboarding:", error)
    return {
      isSuccess: false,
      message: "Failed to reset onboarding"
    }
  }
} 