"use server"

import { storage } from "@/lib/firebase"
import { ActionState } from "@/types"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"

export async function uploadFileStorage(
  path: string,
  file: File
): Promise<ActionState<{ path: string; downloadURL: string }>> {
  console.log("📤 [UPLOAD-FILE] Starting file upload...")
  console.log("📤 [UPLOAD-FILE] Path:", path)
  console.log("📤 [UPLOAD-FILE] File:", file.name, file.size, file.type)
  
  try {
    // Convert File to ArrayBuffer for server-side upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Create storage reference
    const fileRef = ref(storage, path)
    
    // Upload file with metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      }
    }
    
    console.log("📤 [UPLOAD-FILE] Uploading to Firebase Storage...")
    const uploadResult = await uploadBytes(fileRef, buffer, metadata)
    
    console.log("📤 [UPLOAD-FILE] Getting download URL...")
    const downloadURL = await getDownloadURL(uploadResult.ref)
    
    console.log("📤 [UPLOAD-FILE] ✅ File uploaded successfully")
    console.log("📤 [UPLOAD-FILE] Download URL:", downloadURL)

    return {
      isSuccess: true,
      message: "File uploaded successfully",
      data: { 
        path: uploadResult.ref.fullPath,
        downloadURL 
      }
    }
  } catch (error) {
    console.error("📤 [UPLOAD-FILE] ❌ Error uploading file:", error)
    return { 
      isSuccess: false, 
      message: error instanceof Error ? error.message : "Failed to upload file" 
    }
  }
}

export async function deleteFileStorage(
  path: string
): Promise<ActionState<void>> {
  console.log("🗑️ [DELETE-FILE] Deleting file from storage...")
  console.log("🗑️ [DELETE-FILE] Path:", path)
  
  try {
    const fileRef = ref(storage, path)
    
    console.log("🗑️ [DELETE-FILE] Deleting from Firebase Storage...")
    await deleteObject(fileRef)
    
    console.log("🗑️ [DELETE-FILE] ✅ File deleted successfully")
    
    return {
      isSuccess: true,
      message: "File deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("🗑️ [DELETE-FILE] ❌ Error deleting file:", error)
    
    // If file doesn't exist, consider it a success
    if (error instanceof Error && error.message.includes("object-not-found")) {
      console.log("🗑️ [DELETE-FILE] File doesn't exist, considering as success")
      return {
        isSuccess: true,
        message: "File already deleted",
        data: undefined
      }
    }
    
    return { 
      isSuccess: false, 
      message: error instanceof Error ? error.message : "Failed to delete file" 
    }
  }
} 