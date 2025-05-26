"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  MessageCircle,
  Twitter,
  User,
  Sparkles,
  FileText,
  Settings
} from "lucide-react"
import { SerializedVoiceSettingsDocument } from "@/types"

interface VoiceSettingsDisplayProps {
  voiceSettings: SerializedVoiceSettingsDocument | null
}

export default function VoiceSettingsDisplay({
  voiceSettings
}: VoiceSettingsDisplayProps) {
  const hasAnyData =
    voiceSettings?.writingStyle ||
    voiceSettings?.personaType ||
    voiceSettings?.twitterHandle ||
    voiceSettings?.manualWritingStyleDescription ||
    voiceSettings?.generatedPrompt

  const getPersonaLabel = (personaType: string) => {
    switch (personaType) {
      case "ceo":
        return "CEO/Founder"
      case "user":
        return "Satisfied User"
      case "subtle":
        return "Subtle Recommender"
      case "custom":
        return "Custom Persona"
      default:
        return personaType
    }
  }

  const getWritingStyleLabel = (writingStyle: string) => {
    switch (writingStyle) {
      case "casual":
        return "Casual"
      case "professional":
        return "Professional"
      case "friendly":
        return "Friendly"
      case "technical":
        return "Technical"
      case "custom":
        return "Custom"
      default:
        return writingStyle
    }
  }

  return (
    <Card className="bg-white shadow-sm dark:bg-gray-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="size-5" />
          Voice Settings
        </CardTitle>
        <CardDescription>
          Your current writing style and persona configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasAnyData ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="mb-4 size-12 text-gray-300" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              No Voice Settings Yet
            </h3>
            <p className="max-w-sm text-sm text-gray-600">
              Configure your writing style and persona to create more authentic
              Reddit comments that match your voice.
            </p>
          </div>
        ) : (
          <>
            {/* Writing Style */}
            {voiceSettings?.writingStyle && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Settings className="size-4 text-blue-600" />
                  <h4 className="text-sm font-medium text-gray-900">
                    Writing Style
                  </h4>
                </div>
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-sm font-medium text-blue-900">
                    {getWritingStyleLabel(voiceSettings.writingStyle)}
                  </p>
                  {voiceSettings.customWritingStyle && (
                    <p className="mt-1 text-xs text-blue-700">
                      {voiceSettings.customWritingStyle}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Persona Type */}
            {voiceSettings?.personaType && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-green-600" />
                  <h4 className="text-sm font-medium text-gray-900">
                    Comment Persona
                  </h4>
                </div>
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-sm font-medium text-green-900">
                    {getPersonaLabel(voiceSettings.personaType)}
                  </p>
                  {voiceSettings.customPersona && (
                    <p className="mt-1 text-xs text-green-700">
                      {voiceSettings.customPersona}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Twitter Analysis */}
            {voiceSettings?.twitterHandle && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Twitter className="size-4 text-purple-600" />
                  <h4 className="text-sm font-medium text-gray-900">
                    Twitter Analysis
                  </h4>
                  {voiceSettings.twitterAnalyzed && (
                    <Badge variant="secondary" className="text-xs">
                      Analyzed
                    </Badge>
                  )}
                </div>
                <div className="rounded-lg bg-purple-50 p-3">
                  <p className="text-sm font-medium text-purple-900">
                    @{voiceSettings.twitterHandle}
                  </p>
                  <p className="mt-1 text-xs text-purple-700">
                    {voiceSettings.twitterAnalyzed
                      ? "Writing style analyzed from recent tweets"
                      : "Ready for analysis"}
                  </p>
                </div>
              </div>
            )}

            {/* Manual Writing Style Description */}
            {voiceSettings?.manualWritingStyleDescription && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-orange-600" />
                  <h4 className="text-sm font-medium text-gray-900">
                    Writing Style Description
                  </h4>
                </div>
                <div className="rounded-lg bg-orange-50 p-3">
                  <p className="whitespace-pre-wrap text-sm text-orange-900">
                    {voiceSettings.manualWritingStyleDescription}
                  </p>
                </div>
              </div>
            )}

            {/* Style Preferences */}
            {(voiceSettings?.useAllLowercase ||
              voiceSettings?.useEmojis ||
              voiceSettings?.useCasualTone ||
              voiceSettings?.useFirstPerson) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">
                  Style Preferences
                </h4>
                <div className="flex flex-wrap gap-2">
                  {voiceSettings.useAllLowercase && (
                    <Badge variant="outline" className="text-xs">
                      Lowercase text
                    </Badge>
                  )}
                  {voiceSettings.useEmojis && (
                    <Badge variant="outline" className="text-xs">
                      Uses emojis
                    </Badge>
                  )}
                  {voiceSettings.useCasualTone && (
                    <Badge variant="outline" className="text-xs">
                      Casual tone
                    </Badge>
                  )}
                  {voiceSettings.useFirstPerson && (
                    <Badge variant="outline" className="text-xs">
                      First person
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Reddit Writing Style */}
            {voiceSettings?.redditWritingStyleAnalysis && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-4 text-orange-600" />
                  <h4 className="text-sm font-medium text-gray-900">
                    Reddit Writing Style
                  </h4>
                </div>
                <div className="rounded-lg bg-orange-50 p-3">
                  <p className="mb-2 text-sm text-orange-900">
                    {voiceSettings.redditWritingStyleAnalysis}
                  </p>
                  {voiceSettings.redditPostSource && (
                    <div className="border-t border-orange-200 pt-2 text-xs text-orange-700">
                      <p>
                        <strong>Source:</strong> r/{voiceSettings.redditPostSource.subreddit} • 
                        u/{voiceSettings.redditPostSource.author} • 
                        {voiceSettings.redditPostSource.score} upvotes
                      </p>
                      <p className="truncate">
                        <strong>Post:</strong> {voiceSettings.redditPostSource.postTitle}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Generated Prompt */}
            {voiceSettings?.generatedPrompt && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-pink-600" />
                  <h4 className="text-sm font-medium text-gray-900">
                    AI Generated Prompt
                  </h4>
                </div>
                <div className="rounded-lg bg-pink-50 p-3">
                  <p className="text-sm text-pink-900">
                    {voiceSettings.generatedPrompt}
                  </p>
                </div>
              </div>
            )}

            {/* Metadata */}
            {voiceSettings && (
              <div className="border-t pt-4">
                <p className="text-xs text-gray-500">
                  Last updated:{" "}
                  {new Date(voiceSettings.updatedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
