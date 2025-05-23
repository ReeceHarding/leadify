"use server"

import { Target } from "lucide-react"

export default async function OnboardingLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-gradient-to-br">
      {/* Background Pattern */}
      <div className="bg-grid-pattern absolute inset-0 opacity-5" />

      <div className="container relative mx-auto px-4 py-8">
        {/* Header */}
        <header className="py-8 text-center">
          <div className="bg-card inline-flex items-center gap-3 rounded-2xl border p-1 shadow-sm">
            <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl">
              <Target className="size-6" />
            </div>
            <div className="pr-4">
              <h1 className="from-primary to-primary/70 bg-gradient-to-r bg-clip-text text-2xl font-bold text-transparent">
                Lead Finder
              </h1>
              <p className="text-muted-foreground text-xs font-medium">
                Setup Your Account
              </p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex min-h-[70vh] items-center justify-center">
          <div className="w-full max-w-md">
            <div className="bg-card rounded-3xl border p-8 shadow-lg backdrop-blur-sm">
              {children}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            Secure setup • Takes less than 3 minutes
          </p>
        </footer>
      </div>
    </div>
  )
}
