"use server"

import { storage } from "@/lib/firebase"
import { ActionState } from "@/types"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export async function uploadProfilePictureStorage(
  userId: string,
  file: File
): Promise<ActionState<{ url: string }>> {
  console.log("📤📤📤 [PROFILE-STORAGE] ========== UPLOAD START ==========")
  console.log("📤📤📤 [PROFILE-STORAGE] User ID:", userId)
  console.log("📤📤📤 [PROFILE-STORAGE] File name:", file.name)
  console.log("📤📤📤 [PROFILE-STORAGE] File size:", file.size)
  console.log("📤📤📤 [PROFILE-STORAGE] File type:", file.type)
  console.log("📤📤📤 [PROFILE-STORAGE] Max file size:", MAX_FILE_SIZE)
  console.log("📤📤📤 [PROFILE-STORAGE] Allowed types:", ALLOWED_TYPES)

  try {
    // Validate file size
    console.log("📤📤📤 [PROFILE-STORAGE] Validating file size...")
    if (file.size > MAX_FILE_SIZE) {
      console.log("📤📤📤 [PROFILE-STORAGE] ❌ File too large:", file.size, ">", MAX_FILE_SIZE)
      return {
        isSuccess: false,
        message: "File size must be less than 5MB"
      }
    }
    console.log("📤📤📤 [PROFILE-STORAGE] ✅ File size OK")

    // Validate file type
    console.log("📤📤📤 [PROFILE-STORAGE] Validating file type...")
    if (!ALLOWED_TYPES.includes(file.type)) {
      console.log("📤📤📤 [PROFILE-STORAGE] ❌ Invalid file type:", file.type)
      return {
        isSuccess: false,
        message: "Please upload a valid image file (JPEG, PNG, WebP, or GIF)"
      }
    }
    console.log("📤📤📤 [PROFILE-STORAGE] ✅ File type OK")

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `${timestamp}.${fileExtension}`
    const filePath = `profile-images/${userId}/${fileName}`
    
    console.log("📤📤📤 [PROFILE-STORAGE] Generated file path:", filePath)
    console.log("📤📤📤 [PROFILE-STORAGE] Timestamp:", timestamp)
    console.log("📤📤📤 [PROFILE-STORAGE] File extension:", fileExtension)

    // Create storage reference
    console.log("📤📤📤 [PROFILE-STORAGE] Creating storage reference...")
    const storageRef = ref(storage, filePath)
    console.log("📤📤📤 [PROFILE-STORAGE] Storage reference created")

    // Upload file
    console.log("📤📤📤 [PROFILE-STORAGE] Starting file upload...")
    console.log("📤📤📤 [PROFILE-STORAGE] Upload metadata:", {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString()
      }
    })

    const uploadResult = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString()
      }
    })

    console.log("📤📤📤 [PROFILE-STORAGE] Upload complete!")
    console.log("📤📤📤 [PROFILE-STORAGE] Upload result:", {
      fullPath: uploadResult.ref.fullPath,
      name: uploadResult.ref.name,
      bucket: uploadResult.ref.bucket,
      generation: uploadResult.metadata.generation,
      size: uploadResult.metadata.size,
      contentType: uploadResult.metadata.contentType,
      timeCreated: uploadResult.metadata.timeCreated,
      updated: uploadResult.metadata.updated
    })

    // Get download URL
    console.log("📤📤📤 [PROFILE-STORAGE] Getting download URL...")
    const downloadURL = await getDownloadURL(uploadResult.ref)
    console.log("📤📤📤 [PROFILE-STORAGE] Download URL obtained:", downloadURL)

    const result = {
      isSuccess: true as const,
      message: "Profile picture uploaded successfully",
      data: { url: downloadURL }
    }

    console.log("📤📤📤 [PROFILE-STORAGE] ✅ Upload successful")
    console.log("📤📤📤 [PROFILE-STORAGE] Result:", JSON.stringify(result, null, 2))
    console.log("📤📤📤 [PROFILE-STORAGE] ========== UPLOAD END ==========")

    return result
  } catch (error) {
    console.error("📤📤📤 [PROFILE-STORAGE] ❌ Error uploading profile picture:", error)
    console.error("📤📤📤 [PROFILE-STORAGE] Error type:", typeof error)
    console.error("📤📤📤 [PROFILE-STORAGE] Error message:", (error as Error)?.message)
    console.error("📤📤📤 [PROFILE-STORAGE] Error stack:", (error as Error)?.stack)
    console.log("📤📤📤 [PROFILE-STORAGE] ========== UPLOAD END (ERROR) ==========")
    
    return {
      isSuccess: false,
      message: "Failed to upload profile picture"
    }
  }
}

export async function deleteProfilePictureStorage(
  userId: string,
  imageUrl: string
): Promise<ActionState<void>> {
  console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] ========== DELETE START ==========")
  console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] User ID:", userId)
  console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] Image URL:", imageUrl)

  try {
    // Extract file path from URL
    console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] Extracting file path from URL...")
    const url = new URL(imageUrl)
    const pathMatch = url.pathname.match(/\/o\/(.+?)\?/)
    
    console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] URL object:", {
      href: url.href,
      pathname: url.pathname,
      search: url.search,
      host: url.host
    })
    console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] Path match result:", pathMatch)

    if (!pathMatch || !pathMatch[1]) {
      console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] ❌ Could not extract file path from URL")
      return {
        isSuccess: false,
        message: "Invalid image URL"
      }
    }

    const filePath = decodeURIComponent(pathMatch[1])
    console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] Extracted file path:", filePath)
    console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] Decoded file path:", filePath)

    // Verify the file belongs to the user
    console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] Verifying file ownership...")
    if (!filePath.includes(`profile-images/${userId}/`)) {
      console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] ❌ File does not belong to user")
      console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] Expected path to contain:", `profile-images/${userId}/`)
      return {
        isSuccess: false,
        message: "Unauthorized to delete this image"
      }
    }
    console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] ✅ File ownership verified")

    // Create storage reference and delete
    console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] Creating storage reference...")
    const storageRef = ref(storage, filePath)
    console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] Storage reference created")

    console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] Deleting file...")
    await deleteObject(storageRef)
    console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] ✅ File deleted successfully")

    const result = {
      isSuccess: true as const,
      message: "Profile picture deleted successfully",
      data: undefined
    }

    console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] Result:", JSON.stringify(result, null, 2))
    console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] ========== DELETE END ==========")

    return result
  } catch (error) {
    console.error("🗑️🗑️🗑️ [PROFILE-STORAGE] ❌ Error deleting profile picture:", error)
    console.error("🗑️🗑️🗑️ [PROFILE-STORAGE] Error type:", typeof error)
    console.error("🗑️🗑️🗑️ [PROFILE-STORAGE] Error message:", (error as Error)?.message)
    console.error("🗑️🗑️🗑️ [PROFILE-STORAGE] Error stack:", (error as Error)?.stack)
    console.log("🗑️🗑️🗑️ [PROFILE-STORAGE] ========== DELETE END (ERROR) ==========")
    
    return {
      isSuccess: false,
      message: "Failed to delete profile picture"
    }
  }
} 