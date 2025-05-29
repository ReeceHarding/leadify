/*
<ai_context>
This client component provides a main navigation for the sidebar.
</ai_context>
*/

"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from "@/components/ui/sidebar"
import { ChevronRight, type LucideIcon, Bell } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function NavMain({
  items,
  notificationCount
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: { title: string; url: string; hasNotification?: boolean }[]
  }[]
  notificationCount?: number
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map(item => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map(subItem => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild>
                        <a
                          href={subItem.url}
                          className="flex items-center justify-between"
                        >
                          <span>{subItem.title}</span>
                          {subItem.hasNotification &&
                            notificationCount &&
                            notificationCount > 0 && (
                              <div className="flex items-center gap-1">
                                <Bell className="size-3.5 text-orange-500" />
                                <Badge
                                  variant="destructive"
                                  className="flex size-5 items-center justify-center p-0 text-xs"
                                >
                                  {notificationCount > 99
                                    ? "99+"
                                    : notificationCount}
                                </Badge>
                              </div>
                            )}
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
