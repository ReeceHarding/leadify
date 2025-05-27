/*
<ai_context>
This client component provides a user button for the sidebar via Clerk.
</ai_context>
*/

"use client"

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from "@/components/ui/sidebar"
import { UserButton, useUser } from "@clerk/nextjs"
import { User } from "lucide-react"

export function NavUser() {
  const { user } = useUser()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="hover:bg-accent/50 group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox:
                  "h-8 w-8 ring-2 ring-transparent group-hover:ring-primary/20 transition-all",
                userButtonTrigger:
                  "focus:ring-2 focus:ring-offset-2 focus:ring-ring rounded-md",
                userButtonPopoverCard: "shadow-lg",
                userButtonPopoverActionButton: "hover:bg-accent"
              }
            }}
            userProfileMode="modal"
            userProfileProps={{
              appearance: {
                elements: {
                  card: "shadow-xl",
                  navbar: "hidden",
                  navbarMobileMenuButton: "hidden",
                  headerTitle: "text-lg font-semibold",
                  headerSubtitle: "text-sm text-muted-foreground",
                  socialButtonsBlockButton: "border",
                  formButtonPrimary: "bg-primary hover:bg-primary/90"
                }
              }
            }}
          />
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium">
              {user?.fullName || user?.firstName || "User"}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
          </div>
          <div className="text-muted-foreground text-xs opacity-0 transition-opacity group-hover:opacity-100">
            Click to edit
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
