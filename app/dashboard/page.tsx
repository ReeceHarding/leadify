/*
<ai_context>
This server page provides the main dashboard view with placeholder content.
</ai_context>
*/

"use server"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-muted-foreground text-xs">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,234</div>
            <p className="text-muted-foreground text-xs">
              +15.3% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-muted-foreground text-xs">+3 new this week</p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Welcome to your Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is your main dashboard where you can manage your application.
            The sidebar provides access to different sections of your app.
          </p>
          <div className="mt-4 grid gap-2">
            <div className="text-sm">
              <strong>Available sections:</strong>
            </div>
            <ul className="text-muted-foreground ml-4 list-disc text-sm">
              <li>Dashboard - Overview of your application</li>
              <li>Team - Manage team members and invites</li>
              <li>Documentation - Access guides and API reference</li>
              <li>Settings - Configure your application</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
