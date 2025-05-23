"use server"

export default async function OnboardingLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-8 py-16">{children}</div>
    </div>
  )
}
