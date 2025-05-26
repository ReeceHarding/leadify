"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, FileText, Link, Brain } from "lucide-react"
import { SerializedKnowledgeBaseDocument, SerializedProfileDocument } from "@/types"
import { useOrganization } from "@/components/utilities/organization-provider"

interface KnowledgeBaseDisplayProps {
  knowledgeBase: SerializedKnowledgeBaseDocument | null
  userProfile: SerializedProfileDocument | null
}

export default function KnowledgeBaseDisplay({
  knowledgeBase,
  userProfile
}: KnowledgeBaseDisplayProps) {
  const { activeOrganization } = useOrganization()
  const hasAnyData =
    knowledgeBase?.customInformation ||
    knowledgeBase?.summary ||
    (knowledgeBase?.scrapedPages && knowledgeBase.scrapedPages.length > 0) ||
    activeOrganization?.website

  return (
    <Card className="bg-white shadow-sm dark:bg-gray-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="size-5" />
          Knowledge Base
        </CardTitle>
        <CardDescription>
          Everything we know about your business and services
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasAnyData ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Brain className="mb-4 size-12 text-gray-300" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              No Knowledge Base Yet
            </h3>
            <p className="max-w-sm text-sm text-gray-600">
              Start building your knowledge base by adding website information,
              scraping pages, or providing additional details about your
              business.
            </p>
          </div>
        ) : (
          <>
            {/* Connected Website */}
            {activeOrganization?.website && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="size-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Connected Website
                  </h4>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {activeOrganization?.website}
                  </p>
                  <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                    Primary website from your profile
                  </p>
                </div>
              </div>
            )}

            {/* Scraped Pages */}
            {knowledgeBase?.scrapedPages &&
              knowledgeBase.scrapedPages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Link className="size-4 text-green-600 dark:text-green-400" />
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Scraped Pages
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      {knowledgeBase.scrapedPages.length} pages
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {knowledgeBase.scrapedPages
                      .slice(0, 5)
                      .map((page, index) => (
                        <div
                          key={index}
                          className="rounded-lg bg-green-50 p-2 dark:bg-green-900/30"
                        >
                          <p className="truncate text-xs font-medium text-green-900 dark:text-green-100">
                            {page}
                          </p>
                        </div>
                      ))}
                    {knowledgeBase.scrapedPages.length > 5 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        +{knowledgeBase.scrapedPages.length - 5} more pages
                      </p>
                    )}
                  </div>
                </div>
              )}

            {/* Custom Information */}
            {knowledgeBase?.customInformation && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-purple-600 dark:text-purple-400" />
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Additional Information
                  </h4>
                </div>
                <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/30">
                  <p className="whitespace-pre-wrap text-sm text-purple-900 dark:text-purple-100">
                    {knowledgeBase.customInformation}
                  </p>
                </div>
              </div>
            )}

            {/* AI Summary */}
            {knowledgeBase?.summary && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Brain className="size-4 text-orange-600 dark:text-orange-400" />
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    AI Summary
                  </h4>
                </div>
                <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-900/30">
                  <p className="text-sm text-orange-900 dark:text-orange-100">
                    {knowledgeBase.summary}
                  </p>
                </div>
              </div>
            )}

            {/* Key Facts */}
            {knowledgeBase?.keyFacts && knowledgeBase.keyFacts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Key Facts
                </h4>
                <div className="flex flex-wrap gap-2">
                  {knowledgeBase.keyFacts.map((fact, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {fact}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {knowledgeBase && (
              <div className="border-t pt-4 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last updated:{" "}
                  {new Date(knowledgeBase.updatedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
