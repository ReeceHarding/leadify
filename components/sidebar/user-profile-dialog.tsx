"use client"

import { useState, useEffect, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Upload, User, Camera } from "lucide-react"
import { toast } from "sonner"
import {
  updateProfileAction,
  getProfileByUserIdAction
} from "@/actions/db/profiles-actions"

interface UserProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserProfileDialog({
  open,
  onOpenChange
}: UserProfileDialogProps) {
  const { user } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [profileName, setProfileName] = useState("")
  const [profilePictureUrl, setProfilePictureUrl] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  console.log("👤👤👤 [PROFILE-DIALOG] Component rendered")
  console.log("👤👤👤 [PROFILE-DIALOG] Dialog open state:", open)
  console.log("👤👤👤 [PROFILE-DIALOG] User ID:", user?.id)
  console.log(
    "👤👤👤 [PROFILE-DIALOG] User full name from Clerk:",
    user?.fullName
  )
  console.log(
    "👤👤👤 [PROFILE-DIALOG] User image URL from Clerk:",
    user?.imageUrl
  )

  // Load current profile data when dialog opens
  useEffect(() => {
    console.log("👤👤👤 [PROFILE-DIALOG] useEffect triggered")
    console.log(
      "👤👤👤 [PROFILE-DIALOG] Effect conditions - open:",
      open,
      "user?.id:",
      user?.id
    )

    if (open && user?.id) {
      console.log("👤👤👤 [PROFILE-DIALOG] Conditions met, loading profile...")
      loadProfile()
    } else {
      console.log(
        "👤👤👤 [PROFILE-DIALOG] Conditions not met, skipping profile load"
      )
    }
  }, [open, user?.id])

  const loadProfile = async () => {
    if (!user?.id) {
      console.log(
        "👤👤👤 [PROFILE-DIALOG] loadProfile called but no user ID, returning"
      )
      return
    }

    console.log(
      "👤👤👤 [PROFILE-DIALOG] ========== LOADING PROFILE START =========="
    )
    console.log("👤👤👤 [PROFILE-DIALOG] Loading profile for user:", user.id)
    console.log("👤👤👤 [PROFILE-DIALOG] Current state before load:")
    console.log("👤👤👤 [PROFILE-DIALOG]   - profileName:", profileName)
    console.log(
      "👤👤👤 [PROFILE-DIALOG]   - profilePictureUrl:",
      profilePictureUrl
    )

    setIsLoading(true)
    try {
      console.log("👤👤👤 [PROFILE-DIALOG] Calling getProfileByUserIdAction...")
      const result = await getProfileByUserIdAction(user.id)

      console.log("👤👤👤 [PROFILE-DIALOG] getProfileByUserIdAction result:")
      console.log("👤👤👤 [PROFILE-DIALOG]   - isSuccess:", result.isSuccess)
      console.log("👤👤👤 [PROFILE-DIALOG]   - message:", result.message)
      console.log(
        "👤👤👤 [PROFILE-DIALOG]   - data:",
        JSON.stringify(result.data, null, 2)
      )

      if (result.isSuccess && result.data) {
        const newName = result.data.name || user.fullName || ""
        const newPictureUrl =
          result.data.profilePictureUrl || user.imageUrl || ""

        console.log(
          "👤👤👤 [PROFILE-DIALOG] Setting profile data from database:"
        )
        console.log("👤👤👤 [PROFILE-DIALOG]   - Setting name to:", newName)
        console.log(
          "👤👤👤 [PROFILE-DIALOG]   - Setting picture URL to:",
          newPictureUrl
        )

        setProfileName(newName)
        setProfilePictureUrl(newPictureUrl)

        console.log(
          "👤👤👤 [PROFILE-DIALOG] Profile loaded successfully from database"
        )
      } else {
        // Use Clerk data as fallback
        const fallbackName = user.fullName || ""
        const fallbackPictureUrl = user.imageUrl || ""

        console.log(
          "👤👤👤 [PROFILE-DIALOG] No profile in database, using Clerk data as fallback:"
        )
        console.log("👤👤👤 [PROFILE-DIALOG]   - Fallback name:", fallbackName)
        console.log(
          "👤👤👤 [PROFILE-DIALOG]   - Fallback picture URL:",
          fallbackPictureUrl
        )

        setProfileName(fallbackName)
        setProfilePictureUrl(fallbackPictureUrl)
      }
    } catch (error) {
      console.error("👤👤👤 [PROFILE-DIALOG] ❌ Error loading profile:", error)
      console.error(
        "👤👤👤 [PROFILE-DIALOG] Error stack:",
        (error as Error)?.stack
      )
      toast.error("Failed to load profile")
    } finally {
      setIsLoading(false)
      console.log(
        "👤👤👤 [PROFILE-DIALOG] ========== LOADING PROFILE END =========="
      )
    }
  }

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    console.log(
      "📸📸📸 [PROFILE-DIALOG] ========== IMAGE UPLOAD START =========="
    )
    const file = event.target.files?.[0]
    console.log(
      "📸📸📸 [PROFILE-DIALOG] File selected:",
      file?.name,
      file?.size,
      file?.type
    )

    if (!file || !user?.id) {
      console.log("📸📸📸 [PROFILE-DIALOG] No file or user ID, returning")
      return
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    console.log("📸📸📸 [PROFILE-DIALOG] Validating file type...")
    console.log("📸📸📸 [PROFILE-DIALOG] File type:", file.type)
    console.log("📸📸📸 [PROFILE-DIALOG] Allowed types:", allowedTypes)

    if (!allowedTypes.includes(file.type)) {
      console.log("📸📸📸 [PROFILE-DIALOG] ❌ Invalid file type")
      toast.error("Please upload a valid image file (JPEG, PNG, WebP, or GIF)")
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    console.log("📸📸📸 [PROFILE-DIALOG] Validating file size...")
    console.log("📸📸📸 [PROFILE-DIALOG] File size:", file.size)
    console.log("📸📸📸 [PROFILE-DIALOG] Max size:", maxSize)

    if (file.size > maxSize) {
      console.log("📸📸📸 [PROFILE-DIALOG] ❌ File too large")
      toast.error("Image size must be less than 5MB")
      return
    }

    setUploadingImage(true)
    try {
      console.log("📸📸📸 [PROFILE-DIALOG] Converting image to base64...")

      // Convert file to base64 for client-side preview
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        console.log("📸📸📸 [PROFILE-DIALOG] Base64 conversion complete")
        console.log(
          "📸📸📸 [PROFILE-DIALOG] Base64 string length:",
          base64String.length
        )
        console.log(
          "📸📸📸 [PROFILE-DIALOG] Base64 preview:",
          base64String.substring(0, 100) + "..."
        )

        setProfilePictureUrl(base64String)
        console.log(
          "📸📸📸 [PROFILE-DIALOG] Profile picture URL updated with base64"
        )
      }
      reader.readAsDataURL(file)

      // Note: Actual upload will happen when saving the profile
      toast.success("Image selected. Click 'Save Changes' to upload.")
    } catch (error) {
      console.error("📸📸📸 [PROFILE-DIALOG] ❌ Error processing image:", error)
      console.error(
        "📸📸📸 [PROFILE-DIALOG] Error stack:",
        (error as Error)?.stack
      )
      toast.error("Failed to process image")
    } finally {
      setUploadingImage(false)
      console.log(
        "📸📸📸 [PROFILE-DIALOG] ========== IMAGE UPLOAD END =========="
      )
    }
  }

  const handleSave = async () => {
    if (!user?.id) {
      console.log(
        "💾💾💾 [PROFILE-DIALOG] handleSave called but no user ID, returning"
      )
      return
    }

    console.log(
      "💾💾💾 [PROFILE-DIALOG] ========== SAVE PROFILE START =========="
    )
    console.log("💾💾💾 [PROFILE-DIALOG] User ID:", user.id)
    console.log("💾💾💾 [PROFILE-DIALOG] Profile name to save:", profileName)
    console.log(
      "💾💾💾 [PROFILE-DIALOG] Profile name trimmed:",
      profileName.trim()
    )
    console.log(
      "💾💾💾 [PROFILE-DIALOG] Profile picture URL type:",
      profilePictureUrl.startsWith("data:") ? "base64" : "url"
    )
    console.log(
      "💾💾💾 [PROFILE-DIALOG] Profile picture URL length:",
      profilePictureUrl.length
    )

    setIsSaving(true)
    try {
      console.log("💾💾💾 [PROFILE-DIALOG] Calling updateProfileAction...")

      const updateData = {
        name: profileName.trim(),
        profilePictureUrl: profilePictureUrl || undefined
      }

      console.log(
        "💾💾💾 [PROFILE-DIALOG] Update data:",
        JSON.stringify(updateData, null, 2)
      )

      const result = await updateProfileAction(user.id, updateData)

      console.log("💾💾💾 [PROFILE-DIALOG] updateProfileAction result:")
      console.log("💾💾💾 [PROFILE-DIALOG]   - isSuccess:", result.isSuccess)
      console.log("💾💾💾 [PROFILE-DIALOG]   - message:", result.message)
      console.log(
        "💾💾💾 [PROFILE-DIALOG]   - data:",
        JSON.stringify(result.data, null, 2)
      )

      if (result.isSuccess) {
        console.log("💾💾💾 [PROFILE-DIALOG] ✅ Profile saved successfully")
        toast.success("Profile updated successfully")

        console.log("💾💾💾 [PROFILE-DIALOG] Closing dialog...")
        onOpenChange(false)

        console.log(
          "💾💾💾 [PROFILE-DIALOG] Reloading page to reflect changes..."
        )
        // Reload the page to reflect changes
        window.location.reload()
      } else {
        console.log(
          "💾💾💾 [PROFILE-DIALOG] ❌ Failed to save profile:",
          result.message
        )
        toast.error(result.message)
      }
    } catch (error) {
      console.error("💾💾💾 [PROFILE-DIALOG] ❌ Error saving profile:", error)
      console.error(
        "💾💾💾 [PROFILE-DIALOG] Error stack:",
        (error as Error)?.stack
      )
      toast.error("Failed to save profile")
    } finally {
      setIsSaving(false)
      console.log(
        "💾💾💾 [PROFILE-DIALOG] ========== SAVE PROFILE END =========="
      )
    }
  }

  const getInitials = (name: string) => {
    const initials = name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

    console.log(
      "👤👤👤 [PROFILE-DIALOG] Getting initials for name:",
      name,
      "->",
      initials
    )
    return initials
  }

  // Log state changes
  useEffect(() => {
    console.log(
      "👤👤👤 [PROFILE-DIALOG] State changed - profileName:",
      profileName
    )
  }, [profileName])

  useEffect(() => {
    console.log(
      "👤👤👤 [PROFILE-DIALOG] State changed - profilePictureUrl:",
      profilePictureUrl?.substring(0, 100)
    )
  }, [profilePictureUrl])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information. This is separate from your Clerk
            account.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-8 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="size-24">
                <AvatarImage src={profilePictureUrl} alt={profileName} />
                <AvatarFallback>
                  {profileName ? (
                    getInitials(profileName)
                  ) : (
                    <User className="size-12" />
                  )}
                </AvatarFallback>
              </Avatar>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadingImage}
                  onClick={() => {
                    console.log(
                      "📸📸📸 [PROFILE-DIALOG] Change Photo button clicked"
                    )
                    fileInputRef.current?.click()
                  }}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 size-4" />
                      Change Photo
                    </>
                  )}
                </Button>

                {profilePictureUrl &&
                  profilePictureUrl !== user?.imageUrl &&
                  !profilePictureUrl.startsWith("data:") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log(
                          "👤👤👤 [PROFILE-DIALOG] Use Clerk Photo button clicked"
                        )
                        console.log(
                          "👤👤👤 [PROFILE-DIALOG] Setting picture URL to:",
                          user?.imageUrl
                        )
                        setProfilePictureUrl(user?.imageUrl || "")
                      }}
                    >
                      Use Clerk Photo
                    </Button>
                  )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploadingImage}
              />

              {profilePictureUrl.startsWith("data:") && (
                <p className="text-muted-foreground text-center text-xs">
                  Image selected. Click 'Save Changes' to upload.
                </p>
              )}
            </div>

            {/* Profile Name */}
            <div className="space-y-2">
              <Label htmlFor="profile-name">Display Name</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={e => {
                  const newValue = e.target.value
                  console.log(
                    "👤👤👤 [PROFILE-DIALOG] Name input changed:",
                    newValue
                  )
                  setProfileName(newValue)
                }}
                placeholder="Enter your name"
              />
              <p className="text-muted-foreground text-sm">
                This name will be used throughout the app
              </p>
            </div>

            {/* Clerk Account Info */}
            <div className="bg-muted/50 rounded-lg border p-3 text-sm">
              <p className="font-medium">Clerk Account</p>
              <p className="text-muted-foreground">
                Email: {user?.primaryEmailAddress?.emailAddress}
              </p>
              {user?.fullName && (
                <p className="text-muted-foreground">
                  Clerk Name: {user.fullName}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              console.log("👤👤👤 [PROFILE-DIALOG] Cancel button clicked")
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              console.log("💾💾💾 [PROFILE-DIALOG] Save Changes button clicked")
              handleSave()
            }}
            disabled={isSaving || isLoading || !profileName.trim()}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
