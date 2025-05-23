"use client"

import React from "react"
import TestWorkflowForm from "./_components/test-workflow-form"

export default function TestWorkflowPage(): React.ReactElement {
  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Test Workflow</h1>

        <TestWorkflowForm />
      </div>
    </div>
  )
}
