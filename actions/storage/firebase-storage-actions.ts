/*
<ai_context>
Contains server actions related to Firebase Storage.
</ai_context>
*/

"use server"

import { storage } from "@/lib/firebase"
import { ActionState } from "@/types"
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getMetadata,
  uploadBytesResumable,
  UploadTaskSnapshot
} from "firebase/storage"

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

function validateFile(file: File): boolean {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds limit")
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("File type not allowed")
  }

  return true
}

export async function uploadFileStorage(
  bucket: string,
  path: string,
  file: File,
  options?: { upsert?: boolean }
): Promise<ActionState<{ path: string; downloadURL: string }>> {
  try {
    validateFile(file)

    const fileRef = ref(storage, `${bucket}/${path}`)

    // Check if file exists when upsert is false
    if (!options?.upsert) {
      try {
        await getMetadata(fileRef)
        return { isSuccess: false, message: "File already exists" }
      } catch (error: any) {
        // File doesn't exist, proceed with upload
        if (error.code !== "storage/object-not-found") {
          throw error
        }
      }
    }

    const uploadResult = await uploadBytes(fileRef, file, {
      contentType: file.type
    })

    const downloadURL = await getDownloadURL(uploadResult.ref)

    return {
      isSuccess: true,
      message: "File uploaded successfully",
      data: {
        path: uploadResult.ref.fullPath,
        downloadURL
      }
    }
  } catch (error) {
    console.error("Error uploading file:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to upload file"
    }
  }
}

export async function getFileDownloadURLStorage(
  bucket: string,
  path: string
): Promise<ActionState<{ downloadURL: string }>> {
  try {
    const fileRef = ref(storage, `${bucket}/${path}`)
    const downloadURL = await getDownloadURL(fileRef)

    return {
      isSuccess: true,
      message: "Download URL retrieved successfully",
      data: { downloadURL }
    }
  } catch (error) {
    console.error("Error getting download URL:", error)
    return {
      isSuccess: false,
      message: "Failed to get download URL"
    }
  }
}

export async function deleteFileStorage(
  bucket: string,
  path: string
): Promise<ActionState<void>> {
  try {
    const fileRef = ref(storage, `${bucket}/${path}`)
    await deleteObject(fileRef)

    return {
      isSuccess: true,
      message: "File deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting file:", error)
    return {
      isSuccess: false,
      message: "Failed to delete file"
    }
  }
}

export async function getFileMetadataStorage(
  bucket: string,
  path: string
): Promise<
  ActionState<{ size: number; contentType: string; timeCreated: string }>
> {
  try {
    const fileRef = ref(storage, `${bucket}/${path}`)
    const metadata = await getMetadata(fileRef)

    return {
      isSuccess: true,
      message: "File metadata retrieved successfully",
      data: {
        size: metadata.size,
        contentType: metadata.contentType || "",
        timeCreated: metadata.timeCreated
      }
    }
  } catch (error) {
    console.error("Error getting file metadata:", error)
    return {
      isSuccess: false,
      message: "Failed to get file metadata"
    }
  }
}
