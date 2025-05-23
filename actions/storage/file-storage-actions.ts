"use server"

import { uploadFileStorage as firebaseUploadFileStorage } from "./firebase-storage-actions"
import { ActionState } from "@/types"

export async function uploadFileStorage(
  path: string,
  file: File
): Promise<ActionState<{ path: string; downloadURL: string }>> {
  try {
    // Use the Firebase storage action with a default bucket
    const result = await firebaseUploadFileStorage(
      "user-uploads", // Default bucket for user uploads
      path,
      file,
      { upsert: true } // Allow overwriting existing files
    )

    return result
  } catch (error) {
    console.error("Error uploading file:", error)
    return { 
      isSuccess: false, 
      message: "Failed to upload file" 
    }
  }
} 