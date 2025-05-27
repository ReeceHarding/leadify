"use client"

import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { useOrganization } from "./organization-provider"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function OrganizationSelector() {
  const {
    organizations,
    currentOrganization,
    setCurrentOrganization,
    isLoading
  } = useOrganization()
  const [open, setOpen] = useState(false)
  const router = useRouter()

  if (isLoading) {
    return (
      <Button
        variant="outline"
        role="combobox"
        className="w-[200px] justify-between"
        disabled
      >
        <Building2 className="mr-2 size-4" />
        Loading...
      </Button>
    )
  }

  if (!currentOrganization) {
    return (
      <Button
        variant="outline"
        onClick={() => router.push("/onboarding")}
        className="w-[200px] justify-between"
      >
        <Plus className="mr-2 size-4" />
        Create Organization
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          <Building2 className="mr-2 size-4 shrink-0" />
          <span className="truncate">{currentOrganization.name}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search organization..." />
          <CommandList>
            <CommandEmpty>No organization found.</CommandEmpty>
            <CommandGroup heading="Organizations">
              {organizations.map(org => (
                <CommandItem
                  key={org.id}
                  value={org.name}
                  onSelect={() => {
                    setCurrentOrganization(org)
                    setOpen(false)
                    // Refresh the page to load new organization data
                    router.refresh()
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      currentOrganization.id === org.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <span className="truncate">{org.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false)
                  router.push("/settings/organizations/new")
                }}
              >
                <Plus className="mr-2 size-4" />
                Create Organization
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
