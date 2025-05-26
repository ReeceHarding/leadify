"use server"

import LeadGenerationDebugger from "./_components/lead-generation-debugger"

export default async function LeadGenerationDebugPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="mb-6 text-2xl font-bold">Lead Generation Debug Panel</h1>
      <LeadGenerationDebugger />
    </div>
  )
}
