"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function PersonalizationSkeleton() {
  return (
    <div className="space-y-8">
      {/* Knowledge Base Section */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
        </CardContent>
      </Card>

      {/* Voice Settings Section */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-28" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    </div>
  )
} 