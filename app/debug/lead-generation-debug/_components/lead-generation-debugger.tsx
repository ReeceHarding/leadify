"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function LeadGenerationDebugger() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lead Generation Debug (Temporarily Disabled)</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>Debug Component Under Maintenance</AlertTitle>
            <AlertDescription>
              This debug component is being updated to work with the new organization-based architecture.
              It will be restored in a future update.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
