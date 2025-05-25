"use server"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import PersonalizationNavigation from "./_components/personalization-navigation"

export default async function PersonalizationPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect("/login")
  }

  return (
    <div className="flex size-full flex-col">
      <PersonalizationNavigation />
    </div>
  )
} 