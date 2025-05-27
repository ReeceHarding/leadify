/*
<ai_context>
This client component provides a user button for the sidebar via Clerk.
</ai_context>
*/

"use client"

import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar"
import { UserButton, useUser } from "@clerk/nextjs"
import { useEffect } from "react"

export function NavUser() {
  const { user, isLoaded, isSignedIn } = useUser()

  // Debug logging
  useEffect(() => {
    console.log("🔍 [NAV-USER] User loaded:", isLoaded)
    console.log("🔍 [NAV-USER] User signed in:", isSignedIn)
    console.log("🔍 [NAV-USER] User data:", user)
  }, [isLoaded, isSignedIn, user])

  // Don't render until user is loaded
  if (!isLoaded) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="bg-muted size-8 animate-pulse rounded-full" />
            <div className="flex-1 space-y-1">
              <div className="bg-muted h-4 w-24 animate-pulse rounded" />
              <div className="bg-muted h-3 w-32 animate-pulse rounded" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // Don't render if not signed in
  if (!isSignedIn) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex w-full items-center gap-2 px-2 py-1.5">
          {/* UserButton with explicit configuration */}
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox:
                  "h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity",
                userButtonTrigger:
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring",
                userButtonPopoverCard: "shadow-lg"
              }
            }}
          />

          {/* User info */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium">
              {user?.fullName || user?.firstName || user?.username || "User"}
            </span>
            {user?.primaryEmailAddress?.emailAddress && (
              <span className="text-muted-foreground truncate text-xs">
                {user.primaryEmailAddress.emailAddress}
              </span>
            )}
          </div>

          {/* Click hint */}
          <div className="text-muted-foreground text-xs">
            Click avatar to edit
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
