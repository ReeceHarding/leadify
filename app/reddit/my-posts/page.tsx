"use server"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import InboxDashboard from "./_components/inbox-dashboard"

export default async function MyPostsInboxPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Reply Management & Inbox</h1>
        <p className="text-muted-foreground">
          Centralize viewing and managing replies to your posted comments. 
          Engage with leads efficiently and track conversation progress.
        </p>
      </div>
      
      <InboxDashboard userId={userId} />
    </div>
  )
}
