"use server"

import { Suspense } from "react"
import LeadFinderDashboard from "./_components/lead-finder-dashboard"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Target, Sparkles, Clock, TrendingUp, Zap } from "lucide-react"

export default async function LeadFinderPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950">
      <div className="section-padding flex size-full flex-col space-y-12">
        {/* Enhanced Header Section */}
        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="shadow-glow rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 dark:from-blue-950 dark:to-blue-900">
              <Target className="size-10 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="mb-4 flex items-center gap-3">
                <h1 className="gradient-text text-4xl font-bold tracking-tight">
                  Reddit Lead Finder
                </h1>
                <Badge className="border-purple-200 bg-gradient-to-r from-purple-100 to-purple-200 px-4 py-2 text-purple-700 dark:border-purple-800 dark:from-purple-950/50 dark:to-purple-900/50 dark:text-purple-300">
                  <Sparkles className="mr-2 size-4" />
                  AI-Powered
                </Badge>
              </div>
              <p className="text-muted-foreground max-w-3xl text-xl leading-relaxed">
                Discover high-quality leads on Reddit using advanced AI analysis
                and automated response generation. Turn conversations into
                customers with intelligent targeting and personalized
                engagement.
              </p>
            </div>
          </div>

          {/* Enhanced Quick Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="glass shadow-glow hover:shadow-glow-lg rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-1">
              <div className="mx-auto mb-4 w-fit rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-3 dark:from-blue-950 dark:to-blue-900">
                <Clock className="size-6 text-blue-600" />
              </div>
              <div className="gradient-text mb-2 text-3xl font-bold">24/7</div>
              <div className="text-muted-foreground font-medium">
                Continuous Monitoring
              </div>
            </div>

            <div className="glass shadow-glow hover:shadow-glow-lg rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-1">
              <div className="mx-auto mb-4 w-fit rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-3 dark:from-green-950 dark:to-green-900">
                <TrendingUp className="size-6 text-green-600" />
              </div>
              <div className="gradient-text mb-2 text-3xl font-bold">95%</div>
              <div className="text-muted-foreground font-medium">
                Lead Accuracy
              </div>
            </div>

            <div className="glass shadow-glow hover:shadow-glow-lg rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-1">
              <div className="mx-auto mb-4 w-fit rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-3 dark:from-purple-950 dark:to-purple-900">
                <Zap className="size-6 text-purple-600" />
              </div>
              <div className="gradient-text mb-2 text-3xl font-bold">3s</div>
              <div className="text-muted-foreground font-medium">
                Avg Response Time
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard */}
        <Suspense
          fallback={
            <div className="space-y-8">
              <div className="grid gap-6 md:grid-cols-3">
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-40 rounded-2xl" />
              </div>
              <Skeleton className="h-96 rounded-2xl" />
            </div>
          }
        >
          <LeadFinderDashboard />
        </Suspense>
      </div>
    </div>
  )
}
