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

  // Load current profile data when dialog opens
  useEffect(() => {
    if (open && user?.id) {
      loadProfile()
    }
  }, [open, user?.id])

  const loadProfile = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      console.log("👤 [PROFILE-DIALOG] Loading profile for user:", user.id)
      const result = await getProfileByUserIdAction(user.id)

      if (result.isSuccess && result.data) {
        setProfileName(result.data.name || user.fullName || "")
        setProfilePictureUrl(
          result.data.profilePictureUrl || user.imageUrl || ""
        )
        console.log("👤 [PROFILE-DIALOG] Profile loaded successfully")
      } else {
        // Use Clerk data as fallback
        setProfileName(user.fullName || "")
        setProfilePictureUrl(user.imageUrl || "")
        console.log("👤 [PROFILE-DIALOG] Using Clerk data as fallback")
      }
    } catch (error) {
      console.error("👤 [PROFILE-DIALOG] Error loading profile:", error)
      toast.error("Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file || !user?.id) return

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPEG, PNG, WebP, or GIF)")
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error("Image size must be less than 5MB")
      return
    }

    setUploadingImage(true)
    try {
      console.log("📸 [PROFILE-DIALOG] Converting image to base64...")

      // Convert file to base64 for client-side preview
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setProfilePictureUrl(base64String)
        console.log("📸 [PROFILE-DIALOG] Image converted to base64 for preview")
      }
      reader.readAsDataURL(file)

      // Note: Actual upload will happen when saving the profile
      toast.success("Image selected. Click 'Save Changes' to upload.")
    } catch (error) {
      console.error("📸 [PROFILE-DIALOG] Error processing image:", error)
      toast.error("Failed to process image")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    if (!user?.id) return

    setIsSaving(true)
    try {
      console.log("💾 [PROFILE-DIALOG] Saving profile...")

      // For now, we'll save the image URL directly
      // In a production app, you'd upload to a storage service first
      const result = await updateProfileAction(user.id, {
        name: profileName.trim(),
        profilePictureUrl: profilePictureUrl || undefined
      })

      if (result.isSuccess) {
        console.log("💾 [PROFILE-DIALOG] Profile saved successfully")
        toast.success("Profile updated successfully")
        onOpenChange(false)

        // Reload the page to reflect changes
        window.location.reload()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("💾 [PROFILE-DIALOG] Error saving profile:", error)
      toast.error("Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

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
                  onClick={() => fileInputRef.current?.click()}
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
                      onClick={() => setProfilePictureUrl(user?.imageUrl || "")}
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
                onChange={e => setProfileName(e.target.value)}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
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
