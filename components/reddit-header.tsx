"use client"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"

export default function RedditHeader() {
  const pathname = usePathname()
  console.log("🍞 [REDDIT-HEADER] Current pathname:", pathname)

  // Function to generate breadcrumb items based on current path
  const generateBreadcrumbs = () => {
    console.log("🍞 [REDDIT-HEADER] Generating breadcrumbs for:", pathname)

    const breadcrumbs = [
      {
        label: "Dashboard",
        href: "/dashboard",
        isActive: false
      }
    ]

    if (pathname.startsWith("/reddit/lead-finder")) {
      breadcrumbs.push({
        label: "Reddit",
        href: "/reddit",
        isActive: false
      })
      breadcrumbs.push({
        label: "Lead Finder",
        href: "/reddit/lead-finder",
        isActive: true
      })
    } else if (pathname.startsWith("/reddit/my-posts")) {
      breadcrumbs.push({
        label: "Reddit",
        href: "/reddit",
        isActive: false
      })
      breadcrumbs.push({
        label: "My Posts",
        href: "/reddit/my-posts",
        isActive: true
      })
    } else if (pathname.startsWith("/reddit")) {
      breadcrumbs.push({
        label: "Reddit",
        href: "/reddit",
        isActive: true
      })
    }

    console.log("🍞 [REDDIT-HEADER] Generated breadcrumbs:", breadcrumbs)
    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center">
                {index > 0 && (
                  <BreadcrumbSeparator className="hidden md:block" />
                )}
                <BreadcrumbItem
                  className={index === 0 ? "hidden md:block" : ""}
                >
                  {crumb.isActive ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
