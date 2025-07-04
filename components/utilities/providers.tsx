/*
<ai_context>
This client component provides the providers for the app.
</ai_context>
*/

"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { ThemeProviderProps } from "next-themes/dist/types"
import { CSPostHogProvider } from "./posthog/posthog-provider"
import { OrganizationProvider } from "./organization-provider"

export const Providers = ({ children, ...props }: ThemeProviderProps) => {
  return (
    <NextThemesProvider {...props}>
      <OrganizationProvider>
        <TooltipProvider>
          <CSPostHogProvider>{children}</CSPostHogProvider>
        </TooltipProvider>
      </OrganizationProvider>
    </NextThemesProvider>
  )
}
