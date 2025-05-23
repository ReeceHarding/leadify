"use server"

import { Suspense } from "react"
import TestWorkflowForm from "./_components/test-workflow-form"

export default async function TestWorkflowPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-white p-8 shadow-lg">
          <div className="mb-8">
            <h1 className="mb-4 text-3xl font-bold text-gray-900">
              Reddit Lead Generation Workflow Test
            </h1>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h2 className="mb-2 text-lg font-semibold text-blue-900">
                Enhanced with o3-mini Critical Scoring & Micro-Comments
              </h2>
              <ul className="space-y-1 text-blue-800">
                <li>
                  • More critical scoring (expect lower scores, higher quality)
                </li>
                <li>
                  • Three comment tiers: Free, Medium (subtle CEO mention),
                  Premium (natural Gauntlet AI integration)
                </li>
                <li>
                  • Ultra-minimal comments (1-10 words ideal, max 15-20 words)
                </li>
                <li>• Maximum impact with minimum words - every word counts</li>
              </ul>
            </div>
          </div>

          <Suspense fallback={<div>Loading workflow test...</div>}>
            <TestWorkflowForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
