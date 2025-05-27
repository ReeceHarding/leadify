/*
<ai_context>
This client component provides a user button for the sidebar via Clerk.
</ai_context>
*/

"use client"

import { useEffect, useState } from "react"
import { BadgeCheck, Bell, ChevronsUpDown, LogOut, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar"
import { useClerk, useUser } from "@clerk/nextjs"
import { UserProfileDialog } from "@/components/sidebar/user-profile-dialog"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"

export function NavUser() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const { isMobile } = useSidebar()
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [profileData, setProfileData] = useState<{
    name?: string
    profilePictureUrl?: string
  }>({})
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  console.log("🧭🧭🧭 [NAV-USER] Component rendered")
  console.log("🧭🧭🧭 [NAV-USER] User ID:", user?.id)
  console.log("🧭🧭🧭 [NAV-USER] User full name from Clerk:", user?.fullName)
  console.log("🧭🧭🧭 [NAV-USER] User image URL from Clerk:", user?.imageUrl)
  console.log("🧭🧭🧭 [NAV-USER] Is mobile:", isMobile)
  console.log("🧭🧭🧭 [NAV-USER] Profile dialog open:", profileDialogOpen)

  // Load profile data on mount and when user changes
  useEffect(() => {
    console.log("🧭🧭🧭 [NAV-USER] useEffect triggered for profile loading")
    console.log("🧭🧭🧭 [NAV-USER] User ID in effect:", user?.id)

    if (user?.id) {
      console.log("🧭🧭🧭 [NAV-USER] User ID exists, loading profile...")
      loadProfile()
    } else {
      console.log("🧭🧭🧭 [NAV-USER] No user ID, skipping profile load")
      setIsLoadingProfile(false)
    }
  }, [user?.id])

  const loadProfile = async () => {
    if (!user?.id) {
      console.log(
        "🧭🧭🧭 [NAV-USER] loadProfile called but no user ID, returning"
      )
      return
    }

    console.log("🧭🧭🧭 [NAV-USER] ========== LOADING PROFILE START ==========")
    console.log("🧭🧭🧭 [NAV-USER] Loading profile for user:", user.id)

    try {
      console.log("🧭🧭🧭 [NAV-USER] Calling getProfileByUserIdAction...")
      const result = await getProfileByUserIdAction(user.id)

      console.log("🧭🧭🧭 [NAV-USER] getProfileByUserIdAction result:")
      console.log("🧭🧭🧭 [NAV-USER]   - isSuccess:", result.isSuccess)
      console.log("🧭🧭🧭 [NAV-USER]   - message:", result.message)
      console.log(
        "🧭🧭🧭 [NAV-USER]   - data:",
        JSON.stringify(result.data, null, 2)
      )

      if (result.isSuccess && result.data) {
        const newProfileData = {
          name: result.data.name,
          profilePictureUrl: result.data.profilePictureUrl
        }

        console.log("🧭🧭🧭 [NAV-USER] Setting profile data from database:")
        console.log("🧭🧭🧭 [NAV-USER]   - name:", newProfileData.name)
        console.log(
          "🧭🧭🧭 [NAV-USER]   - profilePictureUrl:",
          newProfileData.profilePictureUrl?.substring(0, 100)
        )

        setProfileData(newProfileData)
        console.log(
          "🧭🧭🧭 [NAV-USER] Profile loaded successfully from database"
        )
      } else {
        console.log(
          "🧭🧭🧭 [NAV-USER] No profile in database or failed to load"
        )
        console.log("🧭🧭🧭 [NAV-USER] Using empty profile data")
        setProfileData({})
      }
    } catch (error) {
      console.error("🧭🧭🧭 [NAV-USER] ❌ Error loading profile:", error)
      console.error("🧭🧭🧭 [NAV-USER] Error stack:", (error as Error)?.stack)
      // Don't show error to user, just use Clerk data
      setProfileData({})
    } finally {
      setIsLoadingProfile(false)
      console.log("🧭🧭🧭 [NAV-USER] ========== LOADING PROFILE END ==========")
    }
  }

  // Reload profile when dialog closes
  useEffect(() => {
    console.log(
      "🧭🧭🧭 [NAV-USER] Profile dialog state changed:",
      profileDialogOpen
    )

    if (!profileDialogOpen && user?.id) {
      console.log("🧭🧭🧭 [NAV-USER] Dialog closed, reloading profile...")
      loadProfile()
    }
  }, [profileDialogOpen, user?.id])

  const getInitials = (name: string) => {
    const initials = name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

    console.log(
      "🧭🧭🧭 [NAV-USER] Getting initials for name:",
      name,
      "->",
      initials
    )
    return initials
  }

  // Use profile data if available, otherwise fall back to Clerk data
  const displayName =
    profileData.name ||
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    "User"
  const displayImage = profileData.profilePictureUrl || user?.imageUrl || ""

  console.log("🧭🧭🧭 [NAV-USER] Display values:")
  console.log("🧭🧭🧭 [NAV-USER]   - displayName:", displayName)
  console.log(
    "🧭🧭🧭 [NAV-USER]   - displayImage:",
    displayImage?.substring(0, 100)
  )
  console.log("🧭🧭🧭 [NAV-USER]   - isLoadingProfile:", isLoadingProfile)

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                onClick={e => {
                  console.log("🧭🧭🧭 [NAV-USER] SidebarMenuButton clicked")
                  console.log("🧭🧭🧭 [NAV-USER] Click target:", e.target)
                  console.log(
                    "🧭🧭🧭 [NAV-USER] Current target:",
                    e.currentTarget
                  )
                }}
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage src={displayImage} alt={displayName} />
                  <AvatarFallback className="rounded-lg">
                    {displayName ? (
                      getInitials(displayName)
                    ) : (
                      <User className="size-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs">
                    {user?.primaryEmailAddress?.emailAddress}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <button
                  className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-1 py-1.5 text-left text-sm transition-colors"
                  onClick={() => {
                    console.log(
                      "🧭🧭🧭 [NAV-USER] ========== EDIT PROFILE CLICKED =========="
                    )
                    console.log("🧭🧭🧭 [NAV-USER] Opening profile dialog...")
                    setProfileDialogOpen(true)
                  }}
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={displayImage} alt={displayName} />
                    <AvatarFallback className="rounded-lg">
                      {displayName ? (
                        getInitials(displayName)
                      ) : (
                        <User className="size-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {displayName}
                    </span>
                    <span className="truncate text-xs">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                  </div>
                </button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => {
                    console.log(
                      "🧭🧭🧭 [NAV-USER] Edit Profile menu item clicked"
                    )
                    console.log(
                      "🧭🧭🧭 [NAV-USER] Opening profile dialog from menu..."
                    )
                    setProfileDialogOpen(true)
                  }}
                >
                  <User className="mr-2 size-4" />
                  Edit Profile
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  console.log(
                    "🧭🧭🧭 [NAV-USER] ========== SIGN OUT CLICKED =========="
                  )
                  console.log("🧭🧭🧭 [NAV-USER] Signing out user:", user?.id)
                  signOut()
                }}
              >
                <LogOut className="mr-2 size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <UserProfileDialog
        open={profileDialogOpen}
        onOpenChange={(open: boolean) => {
          console.log(
            "🧭🧭🧭 [NAV-USER] Profile dialog onOpenChange called with:",
            open
          )
          setProfileDialogOpen(open)
        }}
      />
    </>
  )
}
