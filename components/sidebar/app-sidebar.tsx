/*
<ai_context>
This client component provides the sidebar for the app.
</ai_context>
*/

"use client"

import { BookOpen, Building2, Settings2, User, Users } from "lucide-react"
import * as React from "react"

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

// Generalized data
const data = {
  user: {
    name: "User",
    email: "user@example.com",
    avatar: "/avatars/user.jpg"
  },
  teams: [
    {
      name: "My Organization",
      logo: Building2,
      plan: "Pro"
    }
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: User,
      isActive: true,
      items: [
        { title: "Overview", url: "/" },
        { title: "Profile", url: "/profile" }
      ]
    },
    {
      title: "Team",
      url: "/team",
      icon: Users,
      items: [
        { title: "Members", url: "/team/members" },
        { title: "Invites", url: "/team/invites" }
      ]
    },
    {
      title: "Documentation",
      url: "/docs",
      icon: BookOpen,
      items: [
        { title: "Getting Started", url: "/docs/getting-started" },
        { title: "API Reference", url: "/docs/api" }
      ]
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      items: [
        { title: "General", url: "/settings/general" },
        { title: "Security", url: "/settings/security" },
        { title: "Billing", url: "/settings/billing" },
        { title: "Notifications", url: "/settings/notifications" }
      ]
    }
  ],
  projects: []
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {data.projects.length > 0 && <NavProjects projects={data.projects} />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
