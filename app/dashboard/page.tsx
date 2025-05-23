/*
<ai_context>
This server page provides the main dashboard view with placeholder content.
</ai_context>
*/

"use server"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { auth } from "@clerk/nextjs/server"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { redirect } from "next/navigation"
import {
  ArrowUpRight,
  Target,
  Users,
  MessageSquare,
  TrendingUp,
  Plus,
  Rocket
} from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const { userId } = await auth()

  if (userId) {
    const profileRes = await getProfileByUserIdAction(userId)

    // Redirect to onboarding if profile doesn't exist or onboarding isn't completed
    if (!profileRes.isSuccess || !profileRes.data.onboardingCompleted) {
      redirect("/onboarding")
    }
  } else {
    redirect("/login")
  }

  const metrics = [
    {
      title: "Active Campaigns",
      value: "3",
      description: "Lead generation campaigns",
      icon: Target,
      change: "+2 this month",
      changeType: "positive" as const
    },
    {
      title: "Quality Leads",
      value: "42",
      description: "Score 70+ opportunities",
      icon: Users,
      change: "+12 this week",
      changeType: "positive" as const
    },
    {
      title: "AI Responses",
      value: "38",
      description: "Generated this month",
      icon: MessageSquare,
      change: "+8 today",
      changeType: "positive" as const
    },
    {
      title: "Conversion Rate",
      value: "8.4%",
      description: "Leads to customers",
      icon: TrendingUp,
      change: "+2.1% vs last month",
      changeType: "positive" as const
    }
  ]

  const quickActions = [
    {
      title: "Create Campaign",
      description: "Start finding new leads",
      icon: Plus,
      href: "/reddit/lead-finder",
      primary: true
    },
    {
      title: "View Analytics",
      description: "Track your performance",
      icon: TrendingUp,
      href: "/analytics",
      primary: false
    }
  ]

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your lead generation.
          </p>
        </div>

        <Link href="/reddit/lead-finder">
          <Button className="h-11 px-6 font-semibold">
            <Plus className="mr-2 size-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map(metric => (
          <Card key={metric.title} className="card-hover border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {metric.title}
              </CardTitle>
              <div className="bg-primary/10 rounded-lg p-2">
                <metric.icon className="text-primary size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metric.value}</div>
              <p className="text-muted-foreground mt-1 text-xs">
                {metric.description}
              </p>
              <div className="mt-2 flex items-center">
                <span className="text-xs font-medium text-green-600">
                  {metric.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {quickActions.map(action => (
          <Link key={action.title} href={action.href}>
            <Card
              className={`card-hover cursor-pointer transition-all duration-300 ${
                action.primary
                  ? "from-primary/5 to-primary/10 border-primary/20 bg-gradient-to-br"
                  : "border-0 shadow-sm"
              }`}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-xl p-3 ${
                      action.primary
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <action.icon className="size-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{action.title}</CardTitle>
                    <p className="text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ArrowUpRight className="text-muted-foreground size-5" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* Welcome Card */}
      <Card className="from-background to-muted/20 border-0 bg-gradient-to-br shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-xl p-3">
              <Rocket className="text-primary size-6" />
            </div>
            <div>
              <CardTitle className="text-xl">Welcome to Lead Finder</CardTitle>
              <p className="text-muted-foreground">
                Your AI-powered Reddit lead generation platform
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Find and engage with high-quality leads on Reddit using AI-powered
            analysis. Our platform helps you identify high-intent prospects and
            generates personalized responses that convert.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <div className="bg-primary size-2 rounded-full"></div>
              <span className="text-sm">AI-powered lead detection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-primary size-2 rounded-full"></div>
              <span className="text-sm">Automated response generation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-primary size-2 rounded-full"></div>
              <span className="text-sm">Campaign performance tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-primary size-2 rounded-full"></div>
              <span className="text-sm">Real-time analytics dashboard</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
