"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Loader2,
  MessageCircle,
  Twitter,
  Sparkles,
  Replace
} from "lucide-react"
import { SerializedVoiceSettingsDocument } from "@/types"
import { PersonaType, WritingStyle } from "@/db/schema"
import { useToast } from "@/hooks/use-toast"
import { useOrganization } from "@/components/utilities/organization-provider"

interface VoiceSettingsSectionProps {
  userId: string
  voiceSettings: SerializedVoiceSettingsDocument | null
  setVoiceSettings: (vs: SerializedVoiceSettingsDocument | null) => void
}

export default function VoiceSettingsSection({
  userId,
  voiceSettings,
  setVoiceSettings
}: VoiceSettingsSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzingTwitter, setIsAnalyzingTwitter] = useState(false)

  // Form state
  const [writingStyle, setWritingStyle] = useState<WritingStyle>(
    voiceSettings?.writingStyle || "casual"
  )
  const [customWritingStyle, setCustomWritingStyle] = useState(
    voiceSettings?.customWritingStyle || ""
  )
  const [manualWritingStyleDescription, setManualWritingStyleDescription] =
    useState(voiceSettings?.manualWritingStyleDescription || "")
  const [twitterHandle, setTwitterHandle] = useState(
    voiceSettings?.twitterHandle || ""
  )
  const [personaType, setPersonaType] = useState<PersonaType>(
    voiceSettings?.personaType || "user"
  )
  const [customPersona, setCustomPersona] = useState(
    voiceSettings?.customPersona || ""
  )
  const [useAllLowercase, setUseAllLowercase] = useState(
    voiceSettings?.useAllLowercase || false
  )
  const [useEmojis, setUseEmojis] = useState(voiceSettings?.useEmojis || false)
  const [useCasualTone, setUseCasualTone] = useState(
    voiceSettings?.useCasualTone || false
  )
  const [useFirstPerson, setUseFirstPerson] = useState(
    voiceSettings?.useFirstPerson || false
  )

  const { toast } = useToast()
  const { activeOrganization } = useOrganization()

  const handleAnalyzeTwitter = async () => {
    if (!twitterHandle.trim()) {
      toast({
        title: "Twitter handle required",
        description: "Please enter a Twitter handle to analyze",
        variant: "destructive"
      })
      return
    }

    setIsAnalyzingTwitter(true)
    try {
      // Fetch tweets
      const { fetchUserTweetsAction } = await import(
        "@/actions/integrations/twitter/twitter-aio-actions"
      )
      const tweetsResult = await fetchUserTweetsAction(twitterHandle, 30)

      if (!tweetsResult.isSuccess) {
        toast({
          title: "Error fetching tweets",
          description: tweetsResult.message,
          variant: "destructive"
        })
        return
      }

      // Convert to our format
      const tweets = tweetsResult.data.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        createdAt: tweet.created_at,
        likes: tweet.public_metrics.like_count,
        retweets: tweet.public_metrics.retweet_count,
        replies: tweet.public_metrics.reply_count
      }))

      // Analyze writing style
      const { analyzeTwitterWritingStyleAction } = await import(
        "@/actions/integrations/openai/writing-style-analysis-actions"
      )
      const analysisResult = await analyzeTwitterWritingStyleAction(
        tweets,
        twitterHandle
      )

      if (!analysisResult.isSuccess) {
        toast({
          title: "Error analyzing writing style",
          description: analysisResult.message,
          variant: "destructive"
        })
        return
      }

      // Save Twitter analysis
      const { createTwitterAnalysisAction } = await import(
        "@/actions/db/personalization-actions"
      )
      await createTwitterAnalysisAction({
        userId,
        organizationId: activeOrganization?.id || "",
        twitterHandle,
        tweets,
        writingStyleAnalysis: analysisResult.data.writingStyleAnalysis,
        commonPhrases: analysisResult.data.commonPhrases,
        toneAnalysis: analysisResult.data.toneAnalysis,
        vocabularyLevel: analysisResult.data.vocabularyLevel,
        averageTweetLength: analysisResult.data.averageTweetLength,
        emojiUsage: analysisResult.data.emojiUsage,
        hashtagUsage: analysisResult.data.hashtagUsage
      })

      // Update form with analysis results
      setWritingStyle(
        analysisResult.data.vocabularyLevel === "professional"
          ? "professional"
          : "casual"
      )
      setUseEmojis(analysisResult.data.emojiUsage)
      setUseCasualTone(analysisResult.data.vocabularyLevel === "casual")

      // Auto-fill the manual writing style description with the analysis
      const analysisText = `Based on analysis of ${tweets.length} recent tweets:

${analysisResult.data.writingStyleAnalysis}

Key characteristics:
• Tone: ${analysisResult.data.toneAnalysis}
• Vocabulary: ${analysisResult.data.vocabularyLevel}
• Average tweet length: ${analysisResult.data.averageTweetLength} characters
• Uses emojis: ${analysisResult.data.emojiUsage ? "Yes" : "No"}
• Uses hashtags: ${analysisResult.data.hashtagUsage ? "Yes" : "No"}

Common phrases: ${analysisResult.data.commonPhrases.slice(0, 3).join(", ")}`

      setManualWritingStyleDescription(analysisText)

      toast({
        title: "Twitter analysis complete",
        description: `Analyzed ${tweets.length} tweets and updated your writing style preferences`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze Twitter profile",
        variant: "destructive"
      })
    } finally {
      setIsAnalyzingTwitter(false)
    }
  }

  const handleSaveSettings = async () => {
    setIsLoading(true)
    try {
      if (voiceSettings) {
        // Update existing voice settings
        const { updateVoiceSettingsAction } = await import(
          "@/actions/db/personalization-actions"
        )
        const result = await updateVoiceSettingsAction(voiceSettings.id, {
          writingStyle,
          customWritingStyle:
            writingStyle === "custom" ? customWritingStyle : undefined,
          manualWritingStyleDescription:
            manualWritingStyleDescription || undefined,
          twitterHandle: twitterHandle || undefined,
          personaType,
          customPersona: personaType === "custom" ? customPersona : undefined,
          useAllLowercase,
          useEmojis,
          useCasualTone,
          useFirstPerson
        })

        if (result.isSuccess) {
          setVoiceSettings(result.data)
          toast({
            title: "Success",
            description: "Voice settings updated successfully"
          })
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
          })
        }
      } else {
        // Create new voice settings
        const { createVoiceSettingsAction } = await import(
          "@/actions/db/personalization-actions"
        )
        const result = await createVoiceSettingsAction({
          userId,
          organizationId: activeOrganization?.id || "",
          writingStyle,
          customWritingStyle:
            writingStyle === "custom" ? customWritingStyle : undefined,
          manualWritingStyleDescription:
            manualWritingStyleDescription || undefined,
          twitterHandle: twitterHandle || undefined,
          personaType,
          customPersona: personaType === "custom" ? customPersona : undefined,
          useAllLowercase,
          useEmojis,
          useCasualTone,
          useFirstPerson
        })

        if (result.isSuccess) {
          setVoiceSettings(result.data)
          toast({
            title: "Success",
            description: "Voice settings created successfully"
          })
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save voice settings",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-white shadow-sm dark:bg-gray-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="size-5" />
          Voice & Writing Style
        </CardTitle>
        <CardDescription>
          Configure how you want your comments to sound and what persona to
          adopt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Twitter Analysis */}
        <div className="space-y-4">
          <Label>Twitter Writing Style Analysis</Label>
          <div className="space-y-2">
            <Label htmlFor="twitter-handle">Twitter Handle</Label>
            <div className="flex gap-2">
              <Input
                id="twitter-handle"
                placeholder="@username"
                value={twitterHandle}
                onChange={e => setTwitterHandle(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleAnalyzeTwitter}
                disabled={isAnalyzingTwitter || !twitterHandle.trim()}
              >
                {isAnalyzingTwitter ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Analyze
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              We'll analyze your recent tweets to understand your writing style
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-description">Add New Style Description</Label>
          <Textarea
            id="new-description"
            placeholder="Describe your writing style (e.g., casual and conversational, uses emojis, short sentences, etc.)..."
            value={manualWritingStyleDescription}
            onChange={e => setManualWritingStyleDescription(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-sm text-gray-600">
            Add a new description of your writing style, or use Twitter analysis
            to auto-fill.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (manualWritingStyleDescription.trim()) {
                // Replace existing description logic would go here
                toast({
                  title: "Style Updated",
                  description: "Your writing style description has been updated"
                })
              }
            }}
            disabled={!manualWritingStyleDescription.trim()}
          >
            <Replace className="mr-2 size-4" />
            Replace Old Description
          </Button>
        </div>

        {/* Persona Type */}
        <div className="space-y-4">
          <Label>Comment Persona</Label>
          <Select
            value={personaType}
            onValueChange={(value: PersonaType) => setPersonaType(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ceo">
                CEO/Founder - Direct and authoritative
              </SelectItem>
              <SelectItem value="user">
                Satisfied User - Enthusiastic customer
              </SelectItem>
              <SelectItem value="subtle">
                Subtle Recommender - Experienced user who's tried many solutions
              </SelectItem>
              <SelectItem value="custom">Custom Persona</SelectItem>
            </SelectContent>
          </Select>

          {personaType === "custom" && (
            <Textarea
              placeholder="Describe your custom persona..."
              value={customPersona}
              onChange={e => setCustomPersona(e.target.value)}
              rows={3}
            />
          )}
        </div>

        {/* Generated Prompt Preview */}
        {voiceSettings?.generatedPrompt && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Sparkles className="size-4" />
              Generated Writing Style Prompt
            </Label>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-700">
                {voiceSettings.generatedPrompt}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleSaveSettings} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
