"use server"

import { Suspense } from "react"
import LeadFinderDashboard from "./_components/lead-finder-dashboard"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Target, Sparkles } from "lucide-react"

export default async function LeadFinderPage() {
  return (
    <div className="flex size-full flex-col space-y-8 p-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-lg p-2">
            <Target className="text-primary size-6" />
          </div>
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                Reddit Lead Finder
              </h1>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles className="size-3" />
                AI-Powered
              </Badge>
            </div>
            <p className="text-muted-foreground text-lg">
              Discover high-quality leads on Reddit using advanced AI analysis
              and automated response generation.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-card rounded-xl border p-4 text-center">
            <div className="text-primary text-2xl font-bold">24/7</div>
            <div className="text-muted-foreground text-sm">Monitoring</div>
          </div>
          <div className="bg-card rounded-xl border p-4 text-center">
            <div className="text-primary text-2xl font-bold">95%</div>
            <div className="text-muted-foreground text-sm">Accuracy</div>
          </div>
          <div className="bg-card rounded-xl border p-4 text-center">
            <div className="text-primary text-2xl font-bold">3s</div>
            <div className="text-muted-foreground text-sm">Avg Response</div>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
            <Skeleton className="h-96 rounded-xl" />
          </div>
        }
      >
        <LeadFinderDashboard />
      </Suspense>
    </div>
  )
}
