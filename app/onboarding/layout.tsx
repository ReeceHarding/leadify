"use server"

import Image from "next/image"

export default async function OnboardingLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-2">
              <div className="text-xl font-bold text-white">🚀</div>
            </div>
            <span className="text-xl font-bold text-gray-900">Lead Finder</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex min-h-[80vh] items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  )
}
