"use server"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import MyPostsDashboard from "./_components/my-posts-dashboard"

export default async function MyPostsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/login")
  }

  return (
    <div className="flex flex-col gap-4">
      <MyPostsDashboard userId={userId} />
    </div>
  )
}
