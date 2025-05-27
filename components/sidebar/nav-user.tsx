/*
<ai_context>
This client component provides a user button for the sidebar via Clerk.
</ai_context>
*/

"use client"

import { useState, useEffect } from "react"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from "@/components/ui/sidebar"
import { UserButton, useUser } from "@clerk/nextjs"
import { UserProfileDialog } from "./user-profile-dialog"
import { ChevronRight } from "lucide-react"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"

export function NavUser() {
  const { user } = useUser()
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [profilePictureUrl, setProfilePictureUrl] = useState("")

  useEffect(() => {
    if (user?.id) {
      loadProfile()
    }
  }, [user?.id])

  const loadProfile = async () => {
    if (!user?.id) return

    try {
      console.log("👤 [NAV-USER] Loading profile for sidebar")
      const result = await getProfileByUserIdAction(user.id)

      if (result.isSuccess && result.data) {
        setDisplayName(
          result.data.name || user.fullName || user.firstName || "User"
        )
        setProfilePictureUrl(
          result.data.profilePictureUrl || user.imageUrl || ""
        )
        console.log("👤 [NAV-USER] Profile loaded:", result.data.name)
      } else {
        // Use Clerk data as fallback
        setDisplayName(user.fullName || user.firstName || "User")
        setProfilePictureUrl(user.imageUrl || "")
        console.log("👤 [NAV-USER] Using Clerk data as fallback")
      }
    } catch (error) {
      console.error("👤 [NAV-USER] Error loading profile:", error)
      // Use Clerk data as fallback
      setDisplayName(user.fullName || user.firstName || "User")
      setProfilePictureUrl(user.imageUrl || "")
    }
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setShowProfileDialog(true)}
            className="w-full cursor-pointer"
          >
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  userButtonBox: "pointer-events-none",
                  userButtonTrigger: "pointer-events-none",
                  avatarBox: profilePictureUrl ? "hidden" : undefined
                }
              }}
            />
            {profilePictureUrl && (
              <img
                src={profilePictureUrl}
                alt={displayName}
                className="size-8 rounded-full object-cover"
              />
            )}
            <span className="flex-1 truncate text-left">{displayName}</span>
            <ChevronRight className="ml-auto size-4 opacity-50" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <UserProfileDialog
        open={showProfileDialog}
        onOpenChange={(open: boolean) => {
          setShowProfileDialog(open)
          // Reload profile when dialog closes
          if (!open && user?.id) {
            loadProfile()
          }
        }}
      />
    </>
  )
}
