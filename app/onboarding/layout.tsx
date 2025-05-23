"use server"

import { Target, Sparkles } from "lucide-react"

export default async function OnboardingLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950">
      {/* Enhanced Background Elements */}
      <div className="bg-dots absolute inset-0 opacity-30" />
      <div className="absolute left-1/4 top-1/4 size-96 animate-pulse rounded-full bg-blue-500/10 blur-3xl" />
      <div
        className="absolute bottom-1/4 right-1/4 size-96 animate-pulse rounded-full bg-purple-500/10 blur-3xl"
        style={{ animationDelay: "1s" }}
      />

      <div className="container-padding relative flex min-h-screen flex-col">
        {/* Enhanced Header */}
        <header className="py-12 text-center">
          <div className="glass shadow-glow inline-flex items-center gap-4 rounded-3xl p-2">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
              <Target className="size-8" />
            </div>
            <div className="pr-6">
              <h1 className="gradient-text text-3xl font-bold">Lead Finder</h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4" />
                Setup Your Account
              </p>
            </div>
          </div>
        </header>

        {/* Enhanced Main Content */}
        <main className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-4xl">{children}</div>
        </main>

        {/* Enhanced Footer */}
        <footer className="py-8 text-center">
          <div className="glass inline-flex items-center gap-4 rounded-2xl px-8 py-4 shadow-sm">
            <div className="text-2xl text-green-600">🔒</div>
            <div className="text-left">
              <p className="text-foreground text-sm font-semibold">
                Secure & Private Setup
              </p>
              <p className="text-muted-foreground text-xs">
                Takes less than 3 minutes • SSL encrypted
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
