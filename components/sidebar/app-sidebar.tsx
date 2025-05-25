/*
<ai_context>
This client component provides the sidebar for the app.
</ai_context>
*/

"use client"

import { Building2, User, MessageSquare, Target, Settings } from "lucide-react"
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
      url: "/dashboard",
      icon: User,
      isActive: true,
      items: [
        { title: "Overview", url: "/dashboard" },
        { title: "Profile", url: "/profile" }
      ]
    },
    {
      title: "Reddit",
      url: "/reddit",
      icon: MessageSquare,
      items: [
        { title: "Leads", url: "/reddit/lead-finder" },
        { title: "My Posts", url: "/reddit/my-posts" },
        { title: "Customize", url: "/reddit/personalization" }
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
