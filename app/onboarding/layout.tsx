"use server"

import Image from "next/image"

export default async function OnboardingLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-12">
        {/* Main Content */}
        <div className="flex min-h-[80vh] items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  )
}
