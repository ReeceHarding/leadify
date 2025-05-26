"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function VoiceSettingsSkeleton() {
  return (
    <div className="flex size-full flex-col">
      {/* Header Section */}
      <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      {/* Voice Settings Content - Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Voice Settings Display */}
        <Card className="bg-white shadow-sm dark:bg-gray-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="size-5" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Writing Style */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
                <Skeleton className="mb-1 h-4 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>

            {/* Persona Type */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/30">
                <Skeleton className="mb-1 h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>

            {/* Twitter Analysis */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/30">
                <Skeleton className="mb-1 h-4 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>

            {/* Writing Style Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-900/30">
                <Skeleton className="mb-1 h-4 w-full" />
                <Skeleton className="mb-1 h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>

            {/* Style Preferences */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="w-18 h-6" />
                <Skeleton className="w-22 h-6" />
              </div>
            </div>

            {/* Metadata */}
            <div className="border-t pt-4">
              <Skeleton className="h-3 w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Edit Voice Settings */}
        <Card className="bg-white shadow-sm dark:bg-gray-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="size-5" />
              <Skeleton className="h-6 w-36" />
            </div>
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Twitter Analysis */}
            <div className="space-y-4">
              <Skeleton className="h-4 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-20" />
              </div>
              <Skeleton className="h-4 w-64" />
            </div>

            {/* Edit Existing Description */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-24 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton className="h-4 w-48" />
            </div>

            {/* Add New Style Description */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-4 w-72" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-10 w-40" />
            </div>

            {/* Writing Style */}
            <div className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>

            {/* Persona Type */}
            <div className="space-y-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>

            {/* Style Preferences */}
            <div className="space-y-4">
              <Skeleton className="h-4 w-32" />
              <div className="space-y-3">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Skeleton className="size-4" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
