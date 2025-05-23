/*
<ai_context>
This server page provides the main dashboard view with placeholder content.
</ai_context>
*/

"use server"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@clerk/nextjs/server"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { redirect } from "next/navigation"

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

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-muted-foreground text-xs">
              Lead generation campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quality Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-muted-foreground text-xs">
              Score 70+ opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Comments Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">38</div>
            <p className="text-muted-foreground text-xs">
              AI-powered responses
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Welcome to Leadify</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Find and engage with high-quality leads on Reddit using AI-powered
            analysis. Start by creating a campaign or viewing your existing
            results.
          </p>
          <div className="mt-4 grid gap-2">
            <div className="text-sm">
              <strong>Available features:</strong>
            </div>
            <ul className="text-muted-foreground ml-4 list-disc text-sm">
              <li>Reddit Leadify - AI-powered lead generation on Reddit</li>
              <li>
                Campaign Management - Track and organize your lead generation
                efforts
              </li>
              <li>
                AI Comment Generation - Create engaging responses automatically
              </li>
              <li>
                Analytics Dashboard - Monitor your lead generation performance
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
