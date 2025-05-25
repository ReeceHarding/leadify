"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MessageSquare, Database, Settings } from "lucide-react"

export default function PersonalizationNavigation() {
  const pathname = usePathname()

  const tabs = [
    {
      name: "Voice Settings",
      href: "/reddit/voice-settings",
      icon: MessageSquare,
      description: "Customize your writing style and tone"
    },
    {
      name: "Knowledge Base",
      href: "/reddit/knowledge-base", 
      icon: Database,
      description: "Build your knowledge base with content and data"
    }
  ]

  return (
    <div className="flex size-full flex-col">
      {/* Header Section */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Personalization</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Customize your writing style and knowledge base to create more authentic and effective Reddit comments.
          </p>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Link key={tab.href} href={tab.href}>
              <div className="group rounded-lg border bg-white p-6 shadow-sm transition-all hover:shadow-md dark:bg-gray-900 dark:hover:bg-gray-800">
                <div className="flex items-start space-x-4">
                  <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900">
                    <Icon className="size-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                      {tab.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {tab.description}
                    </p>
                    <Button variant="outline" size="sm" className="mt-3">
                      Configure <Settings className="ml-2 size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
} 