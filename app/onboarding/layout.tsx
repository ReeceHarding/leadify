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
        {/* Logo */}
        <div className="mb-16 flex justify-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-3">
              <div className="text-2xl">✨</div>
            </div>
            <span className="text-2xl font-bold text-white">Lead Finder</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex min-h-[60vh] items-start justify-center">
          {children}
        </div>
      </div>
    </div>
  )
}
