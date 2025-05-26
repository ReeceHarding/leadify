/*
<ai_context>
This client component provides a team/organization switcher for the sidebar.
Updated to use organizations from Firestore and include create organization functionality.
</ai_context>
*/

"use client"

import { ChevronsUpDown, Plus, Building2 } from "lucide-react"
import * as React from "react"
import { useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar"
import CreateOrganizationDialog from "./create-organization-dialog"
import { useOrganization } from "@/components/utilities/organization-provider"

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const {
    organizations,
    activeOrganization,
    isLoading,
    setActiveOrganization,
    refreshOrganizations
  } = useOrganization()
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)

  const handleOrganizationSwitch = (org: (typeof organizations)[0]) => {
    setActiveOrganization(org)
    // Refresh the page to update all components
    router.refresh()
  }

  const handleCreateSuccess = async (organizationId: string) => {
    // Reload organizations first
    await refreshOrganizations()

    // Wait a bit for the state to update, then find and switch to the new organization
    setTimeout(() => {
      const newOrg = organizations.find(org => org.id === organizationId)
      if (newOrg) {
        handleOrganizationSwitch(newOrg)
      } else {
        // If not found, refresh again and try once more
        refreshOrganizations().then(() => {
          const retryOrg = organizations.find(org => org.id === organizationId)
          if (retryOrg) {
            handleOrganizationSwitch(retryOrg)
          }
        })
      }
    }, 100)

    // Navigate to lead finder
    router.push("/reddit/lead-finder")
  }

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Building2 className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Loading...</span>
              <span className="truncate text-xs">Please wait</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // If no organizations, show create prompt
  if (organizations.length === 0) {
    return (
      <>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => setShowCreateDialog(true)}
              className="hover:bg-sidebar-accent"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Plus className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  Create Organization
                </span>
                <span className="truncate text-xs">Get started</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <CreateOrganizationDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={handleCreateSuccess}
        />
      </>
    )
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {activeOrganization?.name || "Select Organization"}
                  </span>
                  <span className="truncate text-xs">
                    {(activeOrganization?.plan || "free")
                      .charAt(0)
                      .toUpperCase() +
                      (activeOrganization?.plan || "free").slice(1)}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Organizations
              </DropdownMenuLabel>
              {organizations.map((org, index) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleOrganizationSwitch(org)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    <Building2 className="size-4 shrink-0" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{org.name}</div>
                    {org.redditUsername && (
                      <div className="text-muted-foreground text-xs">
                        u/{org.redditUsername}
                      </div>
                    )}
                  </div>
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => setShowCreateDialog(true)}
              >
                <div className="bg-background flex size-6 items-center justify-center rounded-md border">
                  <Plus className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">
                  New Organization
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <CreateOrganizationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
      />
    </>
  )
}
