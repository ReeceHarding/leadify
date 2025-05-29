/*
<ai_context>
This client component provides the sidebar for the app.
</ai_context>
*/

"use client"

import {
  Building2,
  User,
  MessageSquare,
  Target,
  Settings,
  Search,
  FileText
} from "lucide-react"
import * as React from "react"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from "@/components/ui/sidebar"
import { NavMain } from "./nav-main"
import { NavProjects } from "./nav-projects"
import { NavUser } from "./nav-user"
import { TeamSwitcher } from "./team-switcher"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const [notificationCount, setNotificationCount] = useState(0)

  // Listen for notification updates from lead finder
  useEffect(() => {
    const handleNotificationUpdate = (event: CustomEvent) => {
      console.log("📢 [SIDEBAR] Notification update received:", event.detail)
      setNotificationCount(event.detail.count || 0)
    }

    window.addEventListener(
      "leadFinderNotificationUpdate",
      handleNotificationUpdate as EventListener
    )

    return () => {
      window.removeEventListener(
        "leadFinderNotificationUpdate",
        handleNotificationUpdate as EventListener
      )
    }
  }, [])

  // Generalized data
  const data = {
    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: User,
        isActive: false,
        items: [
          { title: "Overview", url: "/dashboard" },
          { title: "Profile", url: "/profile" }
        ]
      },
      {
        title: "Reddit",
        url: "#",
        icon: MessageSquare,
        isActive: pathname.startsWith("/reddit"),
        items: [
          {
            title: "Lead Finder",
            url: "/reddit/lead-finder",
            isActive: pathname === "/reddit/lead-finder",
            hasNotification: true // Enable notifications for Lead Finder
          },
          {
            title: "My Posts",
            url: "/reddit/my-posts",
            isActive: pathname === "/reddit/my-posts"
          },
          {
            title: "Warm Up",
            url: "/reddit/warm-up",
            isActive: pathname === "/reddit/warm-up"
          },
          {
            title: "Knowledge Base",
            url: "/reddit/knowledge-base",
            isActive: pathname === "/reddit/knowledge-base"
          },
          {
            title: "Voice Settings",
            url: "/reddit/voice-settings",
            isActive: pathname === "/reddit/voice-settings"
          },
          {
            title: "Settings",
            url: "/reddit/settings",
            isActive: pathname === "/reddit/settings"
          }
        ]
      }
    ],
    projects: []
  }

  const redditItems = [
    { title: "Lead Finder", url: "/reddit/lead-finder" },
    { title: "My Posts", url: "/reddit/my-posts" },
    { title: "Warm Up", url: "/reddit/warm-up" },
    { title: "Knowledge Base", url: "/reddit/knowledge-base" },
    { title: "Voice Settings", url: "/reddit/voice-settings" },
    { title: "Settings", url: "/reddit/settings" }
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} notificationCount={notificationCount} />
        {data.projects.length > 0 && <NavProjects projects={data.projects} />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
