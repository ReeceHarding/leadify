/*
<ai_context>
This server page provides the main dashboard view with placeholder content.
</ai_context>
*/

"use server"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { auth } from "@clerk/nextjs/server"
import {
  getProfileByUserIdAction,
  createProfileAction
} from "@/actions/db/profiles-actions"
import { redirect } from "next/navigation"
import {
  ArrowUpRight,
  Target,
  Users,
  MessageSquare,
  TrendingUp,
  Plus,
  Rocket,
  BarChart3,
  Clock,
  Zap,
  CheckCircle2,
  Sparkles
} from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/login")
  }

  // Check if user has a profile, create one if not
  const profileRes = await getProfileByUserIdAction(userId)

  if (!profileRes.isSuccess) {
    const createRes = await createProfileAction({ userId })
    if (!createRes.isSuccess) {
      console.error("Failed to create profile:", createRes.message)
    }
  }

  // Redirect to onboarding if profile doesn't exist or onboarding isn't completed
  if (!profileRes.isSuccess || !profileRes.data.onboardingCompleted) {
    redirect("/onboarding")
  }

  const metrics = [
    {
      title: "Active Campaigns",
      value: "3",
      description: "Lead generation campaigns",
      icon: Target,
      change: "+2 this month",
      changeType: "positive" as const,
      color: "blue"
    },
    {
      title: "Quality Leads",
      value: "42",
      description: "Score 70+ opportunities",
      icon: Users,
      change: "+12 this week",
      changeType: "positive" as const,
      color: "green"
    },
    {
      title: "AI Responses",
      value: "38",
      description: "Generated this month",
      icon: MessageSquare,
      change: "+8 today",
      changeType: "positive" as const,
      color: "purple"
    },
    {
      title: "Conversion Rate",
      value: "8.4%",
      description: "Leads to customers",
      icon: TrendingUp,
      change: "+2.1% vs last month",
      changeType: "positive" as const,
      color: "orange"
    }
  ]

  const quickActions = [
    {
      title: "Create Campaign",
      description: "Start finding new leads with AI-powered targeting",
      icon: Plus,
      href: "/reddit/lead-finder",
      primary: true,
      badge: "Popular"
    },
    {
      title: "View Analytics",
      description: "Track performance and optimize your campaigns",
      icon: BarChart3,
      href: "/analytics",
      primary: false,
      badge: null
    }
  ]

  const features = [
    "AI-powered lead detection and scoring",
    "Automated response generation with your voice",
    "Real-time campaign performance tracking",
    "Advanced analytics and conversion insights",
    "24/7 Reddit monitoring and engagement",
    "Custom keyword targeting and optimization"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950">
      <div className="section-padding flex flex-1 flex-col gap-12">
        {/* Enhanced Header */}
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="shadow-glow rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-3 dark:from-blue-950 dark:to-blue-900">
                <Rocket className="size-8 text-blue-600" />
              </div>
              <div>
                <h1 className="gradient-text text-4xl font-bold tracking-tight">
                  Dashboard
                </h1>
                <p className="text-muted-foreground text-lg">
                  Welcome back! Here's your lead generation performance
                  overview.
                </p>
              </div>
            </div>
          </div>

          <Link href="/reddit/lead-finder">
            <Button className="h-12 bg-gradient-to-r from-blue-600 to-blue-700 px-8 font-semibold shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl">
              <Plus className="mr-2 size-5" />
              New Campaign
            </Button>
          </Link>
        </div>

        {/* Enhanced Metrics Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <Card
              key={metric.title}
              className={`
              shadow-glow hover:shadow-glow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 transition-all duration-300 hover:-translate-y-1 dark:from-gray-900 dark:to-gray-800/50
              ${index === 0 ? "ring-2 ring-blue-500/20" : ""}
            `}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
                  {metric.title}
                </CardTitle>
                <div
                  className={`
                  rounded-xl p-3 shadow-sm
                  ${metric.color === "blue" ? "bg-blue-100 dark:bg-blue-950" : ""}
                  ${metric.color === "green" ? "bg-green-100 dark:bg-green-950" : ""}
                  ${metric.color === "purple" ? "bg-purple-100 dark:bg-purple-950" : ""}
                  ${metric.color === "orange" ? "bg-orange-100 dark:bg-orange-950" : ""}
                `}
                >
                  <metric.icon
                    className={`
                    size-5
                    ${metric.color === "blue" ? "text-blue-600" : ""}
                    ${metric.color === "green" ? "text-green-600" : ""}
                    ${metric.color === "purple" ? "text-purple-600" : ""}
                    ${metric.color === "orange" ? "text-orange-600" : ""}
                  `}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {metric.value}
                </div>
                <p className="text-muted-foreground text-sm">
                  {metric.description}
                </p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    {metric.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enhanced Quick Actions */}
        <div className="grid gap-8 md:grid-cols-2">
          {quickActions.map((action, index) => (
            <Link key={action.title} href={action.href}>
              <Card
                className={`
                hover:shadow-glow-lg shadow-glow group cursor-pointer overflow-hidden border-0 transition-all duration-300 hover:-translate-y-2
                ${
                  action.primary
                    ? "bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 text-white"
                    : "bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50"
                }
              `}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`
                        rounded-xl p-4 transition-transform group-hover:scale-110
                        ${
                          action.primary
                            ? "bg-white/20 backdrop-blur-sm"
                            : "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"
                        }
                      `}
                      >
                        <action.icon
                          className={`
                          size-7
                          ${action.primary ? "text-white" : "text-blue-600"}
                        `}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <CardTitle
                            className={`
                            text-xl font-bold
                            ${action.primary ? "text-white" : "text-gray-900 dark:text-gray-100"}
                          `}
                          >
                            {action.title}
                          </CardTitle>
                          {action.badge && (
                            <Badge
                              variant="secondary"
                              className={`
                              text-xs font-medium
                              ${
                                action.primary
                                  ? "border-white/20 bg-white/20 text-white"
                                  : "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              }
                            `}
                            >
                              {action.badge}
                            </Badge>
                          )}
                        </div>
                        <p
                          className={`
                          leading-relaxed
                          ${action.primary ? "text-white/90" : "text-muted-foreground"}
                        `}
                        >
                          {action.description}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight
                      className={`
                      size-6 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1
                      ${action.primary ? "text-white/80" : "text-muted-foreground"}
                    `}
                    />
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {/* Enhanced Welcome Card */}
        <Card className="shadow-glow relative overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
          <div className="absolute right-0 top-0 size-32 -translate-y-16 translate-x-16 rounded-full bg-blue-500/5" />
          <div className="absolute bottom-0 left-0 size-24 -translate-x-12 translate-y-12 rounded-full bg-purple-500/5" />

          <CardHeader className="relative">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 shadow-sm dark:from-blue-950 dark:to-blue-900">
                <Sparkles className="size-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Welcome to Lead Finder
                </CardTitle>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Your AI-powered Reddit lead generation platform is ready to
                  help you discover and engage with high-quality prospects.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative space-y-6">
            <p className="text-muted-foreground leading-relaxed">
              Our advanced AI continuously monitors Reddit to identify
              high-intent prospects, analyze their needs, and generate
              personalized responses that convert browsers into buyers.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <div key={index} className="group flex items-start gap-3">
                  <div className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-blue-500 shadow-sm transition-transform group-hover:scale-110">
                    <CheckCircle2 className="size-3 text-white" />
                  </div>
                  <span className="text-sm font-medium leading-relaxed text-gray-900 dark:text-gray-100">
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-6 dark:border-blue-800 dark:from-blue-950/20 dark:to-purple-950/20">
              <div className="flex items-center gap-3">
                <Clock className="size-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    24/7 Monitoring Active
                  </p>
                  <p className="text-muted-foreground text-sm">
                    AI is continuously scanning Reddit for opportunities
                  </p>
                </div>
              </div>
              <Badge className="border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                <Zap className="mr-1 size-3" />
                Live
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
