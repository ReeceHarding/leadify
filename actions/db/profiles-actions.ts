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

export async function createProfileAction(
  data: CreateProfileData
): Promise<ActionState<ProfileDocument>> {
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

    return {
      isSuccess: true,
      message: "Profile created successfully",
      data: createdDoc.data() as ProfileDocument
    }
  } catch (error) {
    console.error("Error creating profile:", error)
    return { isSuccess: false, message: "Failed to create profile" }
  }
}

export async function getProfileByUserIdAction(
  userId: string
): Promise<ActionState<ProfileDocument>> {
  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId)
    const profileDoc = await getDoc(profileRef)
    
    if (!profileDoc.exists()) {
      return { isSuccess: false, message: "Profile not found" }
    }

    return {
      isSuccess: true,
      message: "Profile retrieved successfully",
      data: profileDoc.data() as ProfileDocument
    }
  } catch (error) {
    console.error("Error getting profile by user id", error)
    return { isSuccess: false, message: "Failed to get profile" }
  }
}

export async function updateProfileAction(
  userId: string,
  data: UpdateProfileData
): Promise<ActionState<ProfileDocument>> {
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

    return {
      isSuccess: true,
      message: "Profile updated successfully",
      data: updatedDoc.data() as ProfileDocument
    }
  } catch (error) {
    console.error("Error updating profile:", error)
    return { isSuccess: false, message: "Failed to update profile" }
  }
}

export async function updateProfileByStripeCustomerIdAction(
  stripeCustomerId: string,
  data: UpdateProfileData
): Promise<ActionState<ProfileDocument>> {
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

    return {
      isSuccess: true,
      message: "Profile updated by Stripe customer ID successfully",
      data: updatedDoc.data() as ProfileDocument
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
