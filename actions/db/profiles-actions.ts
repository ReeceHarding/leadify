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
  serverTimestamp
} from "firebase/firestore"

// Create a serialized version of ProfileDocument that can be passed to client components
export interface SerializedProfileDocument {
  userId: string
  membership: "free" | "basic" | "pro"
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  name?: string
  profilePictureUrl?: string
  website?: string
  onboardingCompleted?: boolean
  createdAt: string // ISO string instead of Timestamp
  updatedAt: string // ISO string instead of Timestamp
}

// Helper function to serialize ProfileDocument to remove Firestore Timestamps
function serializeProfileDocument(profile: ProfileDocument): SerializedProfileDocument {
  return {
    ...profile,
    createdAt: profile.createdAt instanceof Timestamp 
      ? profile.createdAt.toDate().toISOString()
      : new Date().toISOString(),
    updatedAt: profile.updatedAt instanceof Timestamp 
      ? profile.updatedAt.toDate().toISOString() 
      : new Date().toISOString()
  }
}

export async function createProfileAction(
  data: CreateProfileData
): Promise<ActionState<SerializedProfileDocument>> {
  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, data.userId)
    
    // Create profile data and filter out undefined values
    const profileData = removeUndefinedValues({
      userId: data.userId,
      membership: data.membership || "free",
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    await setDoc(profileRef, profileData)
    
    // Get the created document to return with actual timestamps
    const createdDoc = await getDoc(profileRef)
    if (!createdDoc.exists()) {
      return { isSuccess: false, message: "Failed to create profile" }
    }

    const profile = createdDoc.data() as ProfileDocument
    return {
      isSuccess: true,
      message: "Profile created successfully",
      data: serializeProfileDocument(profile)
    }
  } catch (error) {
    console.error("Error creating profile:", error)
    return { isSuccess: false, message: "Failed to create profile" }
  }
}

export async function getProfileByUserIdAction(
  userId: string
): Promise<ActionState<SerializedProfileDocument>> {
  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId)
    const profileDoc = await getDoc(profileRef)
    
    if (!profileDoc.exists()) {
      return { isSuccess: false, message: "Profile not found" }
    }

    const profile = profileDoc.data() as ProfileDocument
    return {
      isSuccess: true,
      message: "Profile retrieved successfully",
      data: serializeProfileDocument(profile)
    }
  } catch (error) {
    console.error("Error getting profile by user id", error)
    return { isSuccess: false, message: "Failed to get profile" }
  }
}

export async function updateProfileAction(
  userId: string,
  data: UpdateProfileData
): Promise<ActionState<SerializedProfileDocument>> {
  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId)
    
    // Check if profile exists
    const profileDoc = await getDoc(profileRef)
    if (!profileDoc.exists()) {
      return { isSuccess: false, message: "Profile not found to update" }
    }

    // Create update data and filter out undefined values
    const updateData = removeUndefinedValues({
      ...data,
      updatedAt: serverTimestamp()
    })

    await updateDoc(profileRef, updateData)
    
    // Get the updated document
    const updatedDoc = await getDoc(profileRef)
    if (!updatedDoc.exists()) {
      return { isSuccess: false, message: "Failed to get updated profile" }
    }

    const profile = updatedDoc.data() as ProfileDocument
    return {
      isSuccess: true,
      message: "Profile updated successfully",
      data: serializeProfileDocument(profile)
    }
  } catch (error) {
    console.error("Error updating profile:", error)
    return { isSuccess: false, message: "Failed to update profile" }
  }
}

export async function updateProfileByStripeCustomerIdAction(
  stripeCustomerId: string,
  data: UpdateProfileData
): Promise<ActionState<SerializedProfileDocument>> {
  try {
    // Query for profile with the given Stripe customer ID
    const profilesRef = collection(db, COLLECTIONS.PROFILES)
    const q = query(profilesRef, where("stripeCustomerId", "==", stripeCustomerId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return {
        isSuccess: false,
        message: "Profile not found by Stripe customer ID"
      }
    }

    // Get the first (should be only) matching document
    const profileDoc = querySnapshot.docs[0]
    const profileRef = profileDoc.ref

    // Create update data and filter out undefined values
    const updateData = removeUndefinedValues({
      ...data,
      updatedAt: serverTimestamp()
    })

    await updateDoc(profileRef, updateData)
    
    // Get the updated document
    const updatedDoc = await getDoc(profileRef)
    if (!updatedDoc.exists()) {
      return { isSuccess: false, message: "Failed to get updated profile" }
    }

    const profile = updatedDoc.data() as ProfileDocument
    return {
      isSuccess: true,
      message: "Profile updated by Stripe customer ID successfully",
      data: serializeProfileDocument(profile)
    }
  } catch (error) {
    console.error("Error updating profile by stripe customer ID:", error)
    return {
      isSuccess: false,
      message: "Failed to update profile by Stripe customer ID"
    }
  }
}

export async function deleteProfileAction(
  userId: string
): Promise<ActionState<void>> {
  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId)
    await deleteDoc(profileRef)
    
    return {
      isSuccess: true,
      message: "Profile deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting profile:", error)
    return { isSuccess: false, message: "Failed to delete profile" }
  }
}
