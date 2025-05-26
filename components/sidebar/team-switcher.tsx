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
import { toast } from "sonner"

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
import { getOrganizationsByUserIdAction } from "@/actions/db/organizations-actions"
import { useUser } from "@clerk/nextjs"
import { SerializedOrganizationDocument } from "@/db/schema"

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { user } = useUser()
  const router = useRouter()
  const [organizations, setOrganizations] = React.useState<
    SerializedOrganizationDocument[]
  >([])
  const [activeOrg, setActiveOrg] =
    React.useState<SerializedOrganizationDocument | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)

  // Load organizations on mount
  React.useEffect(() => {
    if (user?.id) {
      loadOrganizations()
    }
  }, [user?.id])

  const loadOrganizations = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const result = await getOrganizationsByUserIdAction(user.id)

      if (result.isSuccess && result.data) {
        setOrganizations(result.data)

        // Set the first organization as active if none is selected
        if (result.data.length > 0 && !activeOrg) {
          setActiveOrg(result.data[0])
          // Store in localStorage for persistence
          localStorage.setItem("activeOrgId", result.data[0].id)
        } else if (activeOrg) {
          // Update activeOrg with fresh data
          const updated = result.data.find(
            (org: SerializedOrganizationDocument) => org.id === activeOrg.id
          )
          if (updated) {
            setActiveOrg(updated)
          }
        }
      }
    } catch (error) {
      console.error("Error loading organizations:", error)
      toast.error("Failed to load organizations")
    } finally {
      setIsLoading(false)
    }
  }

  // Load active org from localStorage on mount
  React.useEffect(() => {
    const storedOrgId = localStorage.getItem("activeOrgId")
    if (storedOrgId && organizations.length > 0) {
      const org = organizations.find(o => o.id === storedOrgId)
      if (org) {
        setActiveOrg(org)
      }
    }
  }, [organizations])

  const handleOrganizationSwitch = (org: SerializedOrganizationDocument) => {
    setActiveOrg(org)
    localStorage.setItem("activeOrgId", org.id)
    // Optionally refresh the page or update context
    router.refresh()
  }

  const handleCreateSuccess = (organizationId: string) => {
    // Reload organizations and switch to the new one
    loadOrganizations().then(() => {
      const newOrg = organizations.find(org => org.id === organizationId)
      if (newOrg) {
        handleOrganizationSwitch(newOrg)
      }
    })
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
                    {activeOrg?.name || "Select Organization"}
                  </span>
                  <span className="truncate text-xs">
                    {activeOrg?.plan || "Free"}
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
                  New Organization & Campaign
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
