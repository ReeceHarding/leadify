/*
<ai_context>
Contains server actions related to profiles in Firestore.
</ai_context>
*/

"use server"

import { db } from "@/db/db"
import {
  COLLECTIONS,
  ProfileDocument,
  CreateProfileData,
  UpdateProfileData
} from "@/db/firestore/collections"
import { ActionState } from "@/types"
import { removeUndefinedValues } from "@/lib/firebase-utils"
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  collection,
  where,
  getDocs,
  Timestamp,
  serverTimestamp,
  deleteField
} from "firebase/firestore"
import { clearRedditTokensAction } from "../integrations/reddit-oauth-actions"

// Create a serialized version of ProfileDocument that can be passed to client components
export interface SerializedProfileDocument {
  userId: string
  membership: "free" | "basic" | "pro"
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  name?: string
  profilePictureUrl?: string
  website?: string
  keywords?: string[] // Keywords for lead generation
  onboardingCompleted?: boolean
  createdAt: string // ISO string instead of Timestamp
  updatedAt: string // ISO string instead of Timestamp
}

// Helper function to serialize ProfileDocument to remove Firestore Timestamps
function serializeProfileDocument(
  profile: ProfileDocument
): SerializedProfileDocument {
  console.log("🔥 [PROFILE-SERIALIZE] Starting serialization")
  console.log(
    "🔥 [PROFILE-SERIALIZE] Input profile keys:",
    Object.keys(profile)
  )
  console.log(
    "🔥 [PROFILE-SERIALIZE] Raw profile data:",
    JSON.stringify(profile, null, 2)
  )
  console.log(
    "🔥 [PROFILE-SERIALIZE] createdAt type:",
    typeof profile.createdAt
  )
  console.log(
    "🔥 [PROFILE-SERIALIZE] createdAt instanceof Timestamp:",
    profile.createdAt instanceof Timestamp
  )
  console.log("🔥 [PROFILE-SERIALIZE] createdAt value:", profile.createdAt)
  console.log(
    "🔥 [PROFILE-SERIALIZE] updatedAt type:",
    typeof profile.updatedAt
  )
  console.log(
    "🔥 [PROFILE-SERIALIZE] updatedAt instanceof Timestamp:",
    profile.updatedAt instanceof Timestamp
  )
  console.log("🔥 [PROFILE-SERIALIZE] updatedAt value:", profile.updatedAt)

  const serialized = {
    ...profile,
    createdAt:
      profile.createdAt instanceof Timestamp
        ? profile.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    updatedAt:
      profile.updatedAt instanceof Timestamp
        ? profile.updatedAt.toDate().toISOString()
        : new Date().toISOString()
  }

  console.log(
    "🔥 [PROFILE-SERIALIZE] Serialized profile:",
    JSON.stringify(serialized, null, 2)
  )
  console.log(
    "🔥 [PROFILE-SERIALIZE] Serialized createdAt:",
    serialized.createdAt
  )
  console.log(
    "🔥 [PROFILE-SERIALIZE] Serialized updatedAt:",
    serialized.updatedAt
  )
  console.log("🔥 [PROFILE-SERIALIZE] Serialization complete")

  return serialized
}

export async function createProfileAction(
  data: CreateProfileData
): Promise<ActionState<SerializedProfileDocument>> {
  console.log("🔥 [CREATE-PROFILE] Action called")
  console.log("🔥 [CREATE-PROFILE] Input data:", JSON.stringify(data, null, 2))
  console.log("🔥 [CREATE-PROFILE] Input data keys:", Object.keys(data))
  console.log("🔥 [CREATE-PROFILE] User ID:", data.userId)

  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, data.userId)
    console.log("🔥 [CREATE-PROFILE] Created Firestore document reference")
    console.log("🔥 [CREATE-PROFILE] Collection:", COLLECTIONS.PROFILES)
    console.log("🔥 [CREATE-PROFILE] Document path:", profileRef.path)

    // Create profile data and filter out undefined values
    const rawProfileData = {
      userId: data.userId,
      membership: data.membership || "free",
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    console.log(
      "🔥 [CREATE-PROFILE] Raw profile data before filtering:",
      JSON.stringify(rawProfileData, null, 2)
    )
    console.log(
      "🔥 [CREATE-PROFILE] Raw profile data keys:",
      Object.keys(rawProfileData)
    )
    console.log(
      "🔥 [CREATE-PROFILE] serverTimestamp() type:",
      typeof rawProfileData.createdAt
    )

    const profileData = removeUndefinedValues(rawProfileData)
    console.log(
      "🔥 [CREATE-PROFILE] Profile data after filtering undefined values:",
      JSON.stringify(profileData, null, 2)
    )
    console.log(
      "🔥 [CREATE-PROFILE] Filtered profile data keys:",
      Object.keys(profileData)
    )

    console.log("🔥 [CREATE-PROFILE] Writing to Firestore...")
    await setDoc(profileRef, profileData)
    console.log("🔥 [CREATE-PROFILE] Successfully wrote to Firestore")

    // Get the created document to return with actual timestamps
    console.log("🔥 [CREATE-PROFILE] Reading back created document...")
    const createdDoc = await getDoc(profileRef)

    if (!createdDoc.exists()) {
      console.log(
        "🔥 [CREATE-PROFILE] ERROR: Document does not exist after creation"
      )
      return { isSuccess: false, message: "Failed to create profile" }
    }

    console.log("🔥 [CREATE-PROFILE] Document exists:", createdDoc.exists())
    console.log("🔥 [CREATE-PROFILE] Document id:", createdDoc.id)

    const rawProfile = createdDoc.data()
    console.log(
      "🔥 [CREATE-PROFILE] Raw data from Firestore:",
      JSON.stringify(rawProfile, null, 2)
    )
    console.log(
      "🔥 [CREATE-PROFILE] Raw data keys:",
      Object.keys(rawProfile || {})
    )
    console.log(
      "🔥 [CREATE-PROFILE] Raw createdAt from Firestore:",
      rawProfile?.createdAt
    )
    console.log(
      "🔥 [CREATE-PROFILE] Raw updatedAt from Firestore:",
      rawProfile?.updatedAt
    )

    const profile = rawProfile as ProfileDocument
    console.log("🔥 [CREATE-PROFILE] Casting to ProfileDocument")
    console.log(
      "🔥 [CREATE-PROFILE] ProfileDocument createdAt:",
      profile.createdAt
    )
    console.log(
      "🔥 [CREATE-PROFILE] ProfileDocument updatedAt:",
      profile.updatedAt
    )

    console.log("🔥 [CREATE-PROFILE] Starting serialization...")
    const serializedProfile = serializeProfileDocument(profile)

    const result = {
      isSuccess: true as const,
      message: "Profile created successfully",
      data: serializedProfile
    }

    console.log(
      "🔥 [CREATE-PROFILE] Final result:",
      JSON.stringify(result, null, 2)
    )
    console.log("🔥 [CREATE-PROFILE] Action completed successfully")

    return result
  } catch (error) {
    console.error("🔥 [CREATE-PROFILE] ERROR occurred:", error)
    console.error("🔥 [CREATE-PROFILE] Error stack:", (error as Error)?.stack)
    return { isSuccess: false, message: "Failed to create profile" }
  }
}

export async function getProfileByUserIdAction(
  userId: string
): Promise<ActionState<SerializedProfileDocument>> {
  console.log("🔥 [GET-PROFILE] Action called")
  console.log("🔥 [GET-PROFILE] User ID:", userId)
  console.log("🔥 [GET-PROFILE] User ID type:", typeof userId)

  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId)
    console.log("🔥 [GET-PROFILE] Created Firestore document reference")
    console.log("🔥 [GET-PROFILE] Collection:", COLLECTIONS.PROFILES)
    console.log("🔥 [GET-PROFILE] Document path:", profileRef.path)

    console.log("🔥 [GET-PROFILE] Reading from Firestore...")
    const profileDoc = await getDoc(profileRef)
    console.log("🔥 [GET-PROFILE] Firestore read completed")
    console.log("🔥 [GET-PROFILE] Document exists:", profileDoc.exists())

    if (!profileDoc.exists()) {
      console.log("🔥 [GET-PROFILE] Profile not found in Firestore")
      return { isSuccess: false, message: "Profile not found" }
    }

    console.log("🔥 [GET-PROFILE] Document id:", profileDoc.id)

    const rawProfile = profileDoc.data()
    console.log(
      "🔥 [GET-PROFILE] Raw data from Firestore:",
      JSON.stringify(rawProfile, null, 2)
    )
    console.log(
      "🔥 [GET-PROFILE] Raw data keys:",
      Object.keys(rawProfile || {})
    )
    console.log(
      "🔥 [GET-PROFILE] Raw createdAt from Firestore:",
      rawProfile?.createdAt
    )
    console.log(
      "🔥 [GET-PROFILE] Raw createdAt type:",
      typeof rawProfile?.createdAt
    )
    console.log(
      "🔥 [GET-PROFILE] Raw updatedAt from Firestore:",
      rawProfile?.updatedAt
    )
    console.log(
      "🔥 [GET-PROFILE] Raw updatedAt type:",
      typeof rawProfile?.updatedAt
    )

    const profile = rawProfile as ProfileDocument
    console.log("🔥 [GET-PROFILE] Casting to ProfileDocument")
    console.log(
      "🔥 [GET-PROFILE] ProfileDocument createdAt:",
      profile.createdAt
    )
    console.log(
      "🔥 [GET-PROFILE] ProfileDocument updatedAt:",
      profile.updatedAt
    )

    console.log("🔥 [GET-PROFILE] Starting serialization...")
    const serializedProfile = serializeProfileDocument(profile)

    const result = {
      isSuccess: true as const,
      message: "Profile retrieved successfully",
      data: serializedProfile
    }

    console.log(
      "🔥 [GET-PROFILE] Final result:",
      JSON.stringify(result, null, 2)
    )
    console.log("🔥 [GET-PROFILE] Action completed successfully")

    return result
  } catch (error) {
    console.error("🔥 [GET-PROFILE] ERROR occurred:", error)
    console.error("🔥 [GET-PROFILE] Error stack:", (error as Error)?.stack)
    return { isSuccess: false, message: "Failed to get profile" }
  }
}

export async function updateProfileAction(
  userId: string,
  data: UpdateProfileData
): Promise<ActionState<SerializedProfileDocument>> {
  console.log("🔥 [UPDATE-PROFILE] Action called")
  console.log("🔥 [UPDATE-PROFILE] User ID:", userId)
  console.log("🔥 [UPDATE-PROFILE] Update data:", JSON.stringify(data, null, 2))
  console.log("🔥 [UPDATE-PROFILE] Update data keys:", Object.keys(data))
  console.log("🔥 [UPDATE-PROFILE] Keywords in update data:", data.keywords)
  console.log("🔥 [UPDATE-PROFILE] Keywords type:", typeof data.keywords)
  console.log(
    "🔥 [UPDATE-PROFILE] Keywords array length:",
    data.keywords?.length || 0
  )
  console.log(
    "🔥 [UPDATE-PROFILE] Keywords stringified:",
    JSON.stringify(data.keywords)
  )

  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId)
    console.log("🔥 [UPDATE-PROFILE] Created Firestore document reference")
    console.log("🔥 [UPDATE-PROFILE] Document path:", profileRef.path)

    // Check if profile exists
    console.log("🔥 [UPDATE-PROFILE] Checking if profile exists...")
    const profileDoc = await getDoc(profileRef)
    console.log("🔥 [UPDATE-PROFILE] Profile existence check completed")
    console.log("🔥 [UPDATE-PROFILE] Profile exists:", profileDoc.exists())

    if (!profileDoc.exists()) {
      console.log("🔥 [UPDATE-PROFILE] Profile not found for update")
      return { isSuccess: false, message: "Profile not found to update" }
    }

    const existingData = profileDoc.data()
    console.log(
      "🔥 [UPDATE-PROFILE] Existing profile data:",
      JSON.stringify(existingData, null, 2)
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Existing keywords:",
      existingData?.keywords
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Existing keywords length:",
      existingData?.keywords?.length || 0
    )

    // Create update data and filter out undefined values
    const rawUpdateData = {
      ...data,
      updatedAt: serverTimestamp()
    }

    console.log(
      "🔥 [UPDATE-PROFILE] Raw update data before filtering:",
      JSON.stringify(rawUpdateData, null, 2)
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Raw update data keys:",
      Object.keys(rawUpdateData)
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Raw keywords before filtering:",
      rawUpdateData.keywords
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Raw keywords type before filtering:",
      typeof rawUpdateData.keywords
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Raw keywords stringified before filtering:",
      JSON.stringify(rawUpdateData.keywords)
    )
    console.log(
      "🔥 [UPDATE-PROFILE] serverTimestamp() for updatedAt type:",
      typeof rawUpdateData.updatedAt
    )

    const updateData = removeUndefinedValues(rawUpdateData)
    console.log(
      "🔥 [UPDATE-PROFILE] Update data after filtering undefined values:",
      JSON.stringify(updateData, null, 2)
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Filtered update data keys:",
      Object.keys(updateData)
    )
    console.log("🔥 [UPDATE-PROFILE] Filtered keywords:", updateData.keywords)
    console.log(
      "🔥 [UPDATE-PROFILE] Filtered keywords type:",
      typeof updateData.keywords
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Filtered keywords length:",
      updateData.keywords?.length || 0
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Filtered keywords stringified:",
      JSON.stringify(updateData.keywords)
    )

    console.log("🔥 [UPDATE-PROFILE] Writing update to Firestore...")
    await updateDoc(profileRef, updateData)
    console.log("🔥 [UPDATE-PROFILE] Successfully updated Firestore")

    // Get the updated document
    console.log("🔥 [UPDATE-PROFILE] Reading back updated document...")
    const updatedDoc = await getDoc(profileRef)

    if (!updatedDoc.exists()) {
      console.log(
        "🔥 [UPDATE-PROFILE] ERROR: Document does not exist after update"
      )
      return { isSuccess: false, message: "Failed to get updated profile" }
    }

    console.log(
      "🔥 [UPDATE-PROFILE] Updated document exists:",
      updatedDoc.exists()
    )
    console.log("🔥 [UPDATE-PROFILE] Updated document id:", updatedDoc.id)

    const rawUpdatedProfile = updatedDoc.data()
    console.log(
      "🔥 [UPDATE-PROFILE] Raw updated data from Firestore:",
      JSON.stringify(rawUpdatedProfile, null, 2)
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Raw updated data keys:",
      Object.keys(rawUpdatedProfile || {})
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Raw updated createdAt:",
      rawUpdatedProfile?.createdAt
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Raw updated updatedAt:",
      rawUpdatedProfile?.updatedAt
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Raw updated keywords:",
      rawUpdatedProfile?.keywords
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Raw updated keywords type:",
      typeof rawUpdatedProfile?.keywords
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Raw updated keywords length:",
      rawUpdatedProfile?.keywords?.length || 0
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Raw updated keywords stringified:",
      JSON.stringify(rawUpdatedProfile?.keywords)
    )

    const profile = rawUpdatedProfile as ProfileDocument
    console.log("🔥 [UPDATE-PROFILE] Casting to ProfileDocument")
    console.log(
      "🔥 [UPDATE-PROFILE] ProfileDocument createdAt:",
      profile.createdAt
    )
    console.log(
      "🔥 [UPDATE-PROFILE] ProfileDocument updatedAt:",
      profile.updatedAt
    )
    console.log(
      "🔥 [UPDATE-PROFILE] ProfileDocument keywords:",
      profile.keywords
    )
    console.log(
      "🔥 [UPDATE-PROFILE] ProfileDocument keywords type:",
      typeof profile.keywords
    )
    console.log(
      "🔥 [UPDATE-PROFILE] ProfileDocument keywords length:",
      profile.keywords?.length || 0
    )

    console.log("🔥 [UPDATE-PROFILE] Starting serialization...")
    const serializedProfile = serializeProfileDocument(profile)
    console.log(
      "🔥 [UPDATE-PROFILE] Serialized profile keywords:",
      serializedProfile.keywords
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Serialized profile keywords type:",
      typeof serializedProfile.keywords
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Serialized profile keywords length:",
      serializedProfile.keywords?.length || 0
    )

    const result = {
      isSuccess: true as const,
      message: "Profile updated successfully",
      data: serializedProfile
    }

    console.log(
      "🔥 [UPDATE-PROFILE] Final result:",
      JSON.stringify(result, null, 2)
    )
    console.log(
      "🔥 [UPDATE-PROFILE] Final result keywords:",
      result.data.keywords
    )
    console.log("🔥 [UPDATE-PROFILE] Action completed successfully")

    return result
  } catch (error) {
    console.error("🔥 [UPDATE-PROFILE] ERROR occurred:", error)
    console.error("🔥 [UPDATE-PROFILE] Error stack:", (error as Error)?.stack)
    return { isSuccess: false, message: "Failed to update profile" }
  }
}

export async function updateProfileByStripeCustomerIdAction(
  stripeCustomerId: string,
  data: UpdateProfileData
): Promise<ActionState<SerializedProfileDocument>> {
  console.log("🔥 [UPDATE-PROFILE-STRIPE] Action called")
  console.log(
    "🔥 [UPDATE-PROFILE-STRIPE] Stripe Customer ID:",
    stripeCustomerId
  )
  console.log(
    "🔥 [UPDATE-PROFILE-STRIPE] Update data:",
    JSON.stringify(data, null, 2)
  )

  try {
    // Query for profile with the given Stripe customer ID
    const profilesRef = collection(db, COLLECTIONS.PROFILES)
    console.log("🔥 [UPDATE-PROFILE-STRIPE] Created collection reference")
    console.log("🔥 [UPDATE-PROFILE-STRIPE] Collection:", COLLECTIONS.PROFILES)

    const q = query(
      profilesRef,
      where("stripeCustomerId", "==", stripeCustomerId)
    )
    console.log("🔥 [UPDATE-PROFILE-STRIPE] Created query for stripeCustomerId")

    console.log("🔥 [UPDATE-PROFILE-STRIPE] Executing query...")
    const querySnapshot = await getDocs(q)
    console.log("🔥 [UPDATE-PROFILE-STRIPE] Query completed")
    console.log("🔥 [UPDATE-PROFILE-STRIPE] Query empty:", querySnapshot.empty)
    console.log("🔥 [UPDATE-PROFILE-STRIPE] Query size:", querySnapshot.size)

    if (querySnapshot.empty) {
      console.log(
        "🔥 [UPDATE-PROFILE-STRIPE] No profile found with Stripe Customer ID"
      )
      return {
        isSuccess: false,
        message: "Profile not found by Stripe customer ID"
      }
    }

    // Get the first (should be only) matching document
    const profileDoc = querySnapshot.docs[0]
    const profileRef = profileDoc.ref
    console.log("🔥 [UPDATE-PROFILE-STRIPE] Found profile document")
    console.log("🔥 [UPDATE-PROFILE-STRIPE] Document id:", profileDoc.id)
    console.log("🔥 [UPDATE-PROFILE-STRIPE] Document path:", profileRef.path)

    const existingData = profileDoc.data()
    console.log(
      "🔥 [UPDATE-PROFILE-STRIPE] Existing profile data:",
      JSON.stringify(existingData, null, 2)
    )

    // Create update data and filter out undefined values
    const rawUpdateData = {
      ...data,
      updatedAt: serverTimestamp()
    }

    console.log(
      "🔥 [UPDATE-PROFILE-STRIPE] Raw update data:",
      JSON.stringify(rawUpdateData, null, 2)
    )

    const updateData = removeUndefinedValues(rawUpdateData)
    console.log(
      "🔥 [UPDATE-PROFILE-STRIPE] Filtered update data:",
      JSON.stringify(updateData, null, 2)
    )

    console.log("🔥 [UPDATE-PROFILE-STRIPE] Writing update to Firestore...")
    await updateDoc(profileRef, updateData)
    console.log("🔥 [UPDATE-PROFILE-STRIPE] Successfully updated Firestore")

    // Get the updated document
    console.log("🔥 [UPDATE-PROFILE-STRIPE] Reading back updated document...")
    const updatedDoc = await getDoc(profileRef)

    if (!updatedDoc.exists()) {
      console.log(
        "🔥 [UPDATE-PROFILE-STRIPE] ERROR: Document does not exist after update"
      )
      return { isSuccess: false, message: "Failed to get updated profile" }
    }

    const rawUpdatedProfile = updatedDoc.data()
    console.log(
      "🔥 [UPDATE-PROFILE-STRIPE] Raw updated data:",
      JSON.stringify(rawUpdatedProfile, null, 2)
    )

    const profile = rawUpdatedProfile as ProfileDocument
    console.log("🔥 [UPDATE-PROFILE-STRIPE] Starting serialization...")
    const serializedProfile = serializeProfileDocument(profile)

    const result = {
      isSuccess: true as const,
      message: "Profile updated by Stripe customer ID successfully",
      data: serializedProfile
    }

    console.log(
      "🔥 [UPDATE-PROFILE-STRIPE] Final result:",
      JSON.stringify(result, null, 2)
    )
    console.log("🔥 [UPDATE-PROFILE-STRIPE] Action completed successfully")

    return result
  } catch (error) {
    console.error("🔥 [UPDATE-PROFILE-STRIPE] ERROR occurred:", error)
    console.error(
      "🔥 [UPDATE-PROFILE-STRIPE] Error stack:",
      (error as Error)?.stack
    )
    return {
      isSuccess: false,
      message: "Failed to update profile by Stripe customer ID"
    }
  }
}

export async function deleteProfileAction(
  userId: string
): Promise<ActionState<void>> {
  console.log("🔥 [DELETE-PROFILE] Action called")
  console.log("🔥 [DELETE-PROFILE] User ID:", userId)

  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId)
    console.log("🔥 [DELETE-PROFILE] Created Firestore document reference")
    console.log("🔥 [DELETE-PROFILE] Document path:", profileRef.path)

    console.log("🔥 [DELETE-PROFILE] Deleting from Firestore...")
    await deleteDoc(profileRef)
    console.log("🔥 [DELETE-PROFILE] Successfully deleted from Firestore")

    const result = {
      isSuccess: true,
      message: "Profile deleted successfully",
      data: undefined
    }

    console.log(
      "🔥 [DELETE-PROFILE] Final result:",
      JSON.stringify(result, null, 2)
    )
    console.log("🔥 [DELETE-PROFILE] Action completed successfully")

    return result
  } catch (error) {
    console.error("🔥 [DELETE-PROFILE] ERROR occurred:", error)
    console.error("🔥 [DELETE-PROFILE] Error stack:", (error as Error)?.stack)
    return { isSuccess: false, message: "Failed to delete profile" }
  }
}

export async function resetOnboardingAction(
  userId: string
): Promise<ActionState<void>> {
  console.log("🔧 [RESET-ONBOARDING] Action called for user:", userId)

  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId)

    await updateDoc(profileRef, {
      onboardingCompleted: false,
      name: "",
      website: "",
      keywords: deleteField(), // Remove the keywords field entirely
      updatedAt: serverTimestamp()
    })

    console.log("✅ [RESET-ONBOARDING] Successfully reset for user:", userId)

    return {
      isSuccess: true,
      message: "Onboarding reset successfully",
      data: undefined
    }
  } catch (error) {
    console.error("❌ [RESET-ONBOARDING] Error resetting onboarding:", error)
    return {
      isSuccess: false,
      message: "Failed to reset onboarding"
    }
  }
}

export async function resetAccountAction(
  userId: string
): Promise<ActionState<void>> {
  console.log(
    "🔧 [RESET-ACCOUNT] COMPLETE ACCOUNT RESET called for user:",
    userId
  )

  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId)

    // Check if profile exists first
    const profileDoc = await getDoc(profileRef)

    if (!profileDoc.exists()) {
      console.log("🔧 [RESET-ACCOUNT] No profile found, nothing to reset")
      return {
        isSuccess: true,
        message: "No profile found to reset",
        data: undefined
      }
    }

    console.log("🔧 [RESET-ACCOUNT] Clearing Reddit tokens...")

    // Clear Reddit OAuth tokens first
    await clearRedditTokensAction()

    console.log("🔧 [RESET-ACCOUNT] Resetting all profile data...")

    // Reset to completely fresh state - keep only essential fields
    await updateDoc(profileRef, {
      // Reset onboarding data
      onboardingCompleted: false,
      name: deleteField(),
      profilePictureUrl: deleteField(),
      website: deleteField(),
      keywords: deleteField(),

      // Keep membership and billing info
      // membership: keep existing
      // stripeCustomerId: keep existing
      // stripeSubscriptionId: keep existing

      updatedAt: serverTimestamp()
    })

    console.log(
      "✅ [RESET-ACCOUNT] Complete account reset successful for user:",
      userId
    )

    return {
      isSuccess: true,
      message: "Account completely reset - ready for fresh onboarding",
      data: undefined
    }
  } catch (error) {
    console.error("❌ [RESET-ACCOUNT] Error resetting account:", error)
    console.error("❌ [RESET-ACCOUNT] Error stack:", (error as Error)?.stack)
    return {
      isSuccess: false,
      message: "Failed to reset account"
    }
  }
}
