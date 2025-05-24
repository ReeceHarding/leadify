"use server"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function TestAuthPage() {
  console.log("🔥🔥🔥 [TEST-AUTH] Page loaded")
  
  const { userId } = await auth()
  console.log("🔥🔥🔥 [TEST-AUTH] userId:", userId)
  
  if (!userId) {
    console.log("🔥🔥🔥 [TEST-AUTH] No userId, redirecting to login")
    redirect("/login")
  }
  
  console.log("🔥🔥🔥 [TEST-AUTH] User authenticated, redirecting to lead finder")
  redirect("/reddit/lead-finder")
} 