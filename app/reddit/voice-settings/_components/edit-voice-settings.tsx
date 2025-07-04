"use client"

import { useState, useEffect } from "react"
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
import { Loader2, Twitter, Edit, Merge, Replace, Copy } from "lucide-react"
import { SerializedVoiceSettingsDocument } from "@/types"
import { PersonaType, WritingStyle } from "@/db/schema"
import { useToast } from "@/lib/hooks/use-toast"
import RedditStyleCopier from "./reddit-style-copier"

interface EditVoiceSettingsProps {
  userId: string
  organizationId: string
  voiceSettings: SerializedVoiceSettingsDocument | null
  setVoiceSettings: (vs: SerializedVoiceSettingsDocument | null) => void
}

export default function EditVoiceSettings({
  userId,
  organizationId,
  voiceSettings,
  setVoiceSettings
}: EditVoiceSettingsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzingTwitter, setIsAnalyzingTwitter] = useState(false)
  const [isCombining, setIsCombining] = useState(false)

  // Form state
  const [editableOldDescription, setEditableOldDescription] = useState(
    voiceSettings?.manualWritingStyleDescription || ""
  )
  const [newStyleDescription, setNewStyleDescription] = useState("")
  const [twitterHandle, setTwitterHandle] = useState(
    voiceSettings?.twitterHandle || ""
  )
  const [personaType, setPersonaType] = useState<PersonaType>(
    voiceSettings?.personaType || "user"
  )
  const [customPersona, setCustomPersona] = useState(
    voiceSettings?.customPersona || ""
  )

  const { toast } = useToast()

  // Update editable old description when voice settings change
  useEffect(() => {
    setEditableOldDescription(
      voiceSettings?.manualWritingStyleDescription || ""
    )
  }, [voiceSettings?.manualWritingStyleDescription])

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
      console.log("🔥 [TWITTER-ANALYSIS] Starting Twitter analysis")
      console.log("🔥 [TWITTER-ANALYSIS] Handle:", twitterHandle)

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

      console.log("🔥 [TWITTER-ANALYSIS] Tweets fetched:", tweets.length)

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

      console.log("🔥 [TWITTER-ANALYSIS] Analysis complete")

      // Save Twitter analysis
      const { createTwitterAnalysisAction } = await import(
        "@/actions/db/personalization-actions"
      )
      await createTwitterAnalysisAction({
        userId,
        organizationId,
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
      setNewStyleDescription(analysisResult.data.writingStyleAnalysis)

      toast({
        title: "Twitter analysis complete",
        description: `Analyzed ${tweets.length} tweets. Review the new style description below.`
      })
    } catch (error) {
      console.error("🔥 [TWITTER-ANALYSIS] Error:", error)
      toast({
        title: "Error",
        description: "Failed to analyze Twitter profile",
        variant: "destructive"
      })
    } finally {
      setIsAnalyzingTwitter(false)
    }
  }

  const handleReplaceDescription = async () => {
    if (!newStyleDescription.trim()) {
      toast({
        title: "No description provided",
        description: "Please enter a style description to save",
        variant: "destructive"
      })
      return
    }

    await saveVoiceSettings(newStyleDescription)
    setNewStyleDescription("")
    setEditableOldDescription(newStyleDescription)
  }

  const handleCombineDescriptions = async () => {
    if (!newStyleDescription.trim()) {
      toast({
        title: "No new description provided",
        description: "Please enter a description to combine",
        variant: "destructive"
      })
      return
    }

    if (!editableOldDescription.trim()) {
      // If no old description, just replace
      await handleReplaceDescription()
      return
    }

    setIsCombining(true)
    try {
      console.log("🔥 [COMBINE-STYLE] Starting combination process")
      console.log(
        "🔥 [COMBINE-STYLE] Old description length:",
        editableOldDescription.length
      )
      console.log(
        "🔥 [COMBINE-STYLE] New description length:",
        newStyleDescription.length
      )

      // Use LLM to combine descriptions
      const { combineInformationAction } = await import(
        "@/actions/integrations/openai/openai-actions"
      )
      const combineResult = await combineInformationAction(
        editableOldDescription,
        newStyleDescription
      )

      if (combineResult.isSuccess) {
        console.log("🔥 [COMBINE-STYLE] LLM combination successful")

        await saveVoiceSettings(combineResult.data.combinedInformation)
        setNewStyleDescription("")
        setEditableOldDescription(combineResult.data.combinedInformation)

        toast({
          title: "Success",
          description: "Style descriptions combined successfully using AI"
        })
      } else {
        toast({
          title: "Error",
          description: combineResult.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("🔥 [COMBINE-STYLE] Error:", error)
      toast({
        title: "Error",
        description: "Failed to combine descriptions",
        variant: "destructive"
      })
    } finally {
      setIsCombining(false)
    }
  }

  const handleSaveEditedDescription = async () => {
    await saveVoiceSettings(editableOldDescription)
  }

  const handleRedditStyleCopied = async (analysis: string, postSource: any) => {
    console.log("🔥 [REDDIT-STYLE] Style copied from Reddit post")
    console.log("🔥 [REDDIT-STYLE] Analysis length:", analysis.length)
    console.log("🔥 [REDDIT-STYLE] Post source:", postSource)

    // Create a comprehensive writing style prompt
    const comprehensivePrompt = `You are writing Reddit comments with the following exact writing style:

WRITING STYLE ANALYSIS:
${analysis}

POST SOURCE:
- Subreddit: r/${postSource.subreddit}
- Post Title: "${postSource.postTitle}"
- Author: u/${postSource.author}
- Score: ${postSource.score} upvotes

INSTRUCTIONS:
- Copy this writing style EXACTLY, including any grammar mistakes, spelling errors, casual language, slang, etc.
- Maintain the same tone, formality level, and personality traits
- Use similar sentence structure and vocabulary level
- Include any quirks or unique patterns from the original style
- Make your comments feel human and authentic, not AI-generated
- Stay true to the persona and voice captured in this analysis

Remember: The goal is to replicate this writing style so perfectly that your comments blend in naturally with authentic Reddit users.`

    // Save the comprehensive prompt as the writing style description
    await saveVoiceSettings(comprehensivePrompt, postSource)

    toast({
      title: "Writing style copied!",
      description: `Successfully copied writing style from r/${postSource.subreddit} post`
    })
  }

  const saveVoiceSettings = async (
    manualWritingStyleDescription?: string,
    redditPostSource?: any
  ) => {
    setIsLoading(true)
    try {
      const settingsData = {
        writingStyle: "casual" as WritingStyle,
        manualWritingStyleDescription:
          manualWritingStyleDescription || editableOldDescription || undefined,
        twitterHandle: twitterHandle || undefined,
        redditWritingStyleAnalysis: redditPostSource
          ? manualWritingStyleDescription
          : undefined,
        redditPostSource: redditPostSource || undefined,
        personaType,
        customPersona: personaType === "custom" ? customPersona : undefined,
        useAllLowercase: false,
        useEmojis: false,
        useCasualTone: true,
        useFirstPerson: false
      }

      if (voiceSettings) {
        // Update existing voice settings
        const { updateVoiceSettingsAction } = await import(
          "@/actions/db/personalization-actions"
        )
        const result = await updateVoiceSettingsAction(
          voiceSettings.id,
          settingsData
        )

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
          organizationId,
          ...settingsData
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
          <Copy className="size-5" />
          Copy Writing Style from Reddit Posts
        </CardTitle>
        <CardDescription>
          Search for subreddits, browse top posts, and copy the exact writing
          style from popular posts to make your comments feel more human and
          authentic.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reddit Style Copier */}
        <RedditStyleCopier onStyleCopied={handleRedditStyleCopied} />

        {/* Manual Writing Style Options */}
        <div className="border-t pt-6">
          <h3 className="mb-4 text-lg font-medium">Or Configure Manually</h3>
          <div className="space-y-6">
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
                  />
                  <Button
                    onClick={handleAnalyzeTwitter}
                    disabled={isAnalyzingTwitter || !twitterHandle.trim()}
                  >
                    {isAnalyzingTwitter ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze"
                    )}
                  </Button>
                </div>
                <p className="text-muted-foreground text-sm">
                  We'll analyze your recent tweets to understand your writing
                  style
                </p>
              </div>
            </div>

            {/* Edit Existing Description */}
            {voiceSettings?.manualWritingStyleDescription && (
              <div className="space-y-2">
                <Label htmlFor="edit-description">
                  Edit Existing Style Description
                </Label>
                <Textarea
                  id="edit-description"
                  placeholder="Edit your existing writing style description..."
                  value={editableOldDescription}
                  onChange={e => setEditableOldDescription(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveEditedDescription}
                    disabled={
                      isLoading ||
                      editableOldDescription ===
                        voiceSettings.manualWritingStyleDescription
                    }
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Edit and refine your existing style description.
                </p>
              </div>
            )}

            {/* Add New Style Description */}
            <div className="space-y-2">
              <Label htmlFor="new-description">Add New Style Description</Label>
              <Textarea
                id="new-description"
                placeholder="Describe your writing style (e.g., casual and conversational, uses emojis, short sentences, etc.)..."
                value={newStyleDescription}
                onChange={e => setNewStyleDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-sm text-gray-600">
                Add a new description of your writing style, or use Twitter
                analysis to auto-fill.
              </p>
            </div>

            {/* Action Buttons for Descriptions */}
            <div className="flex gap-2">
              <Button
                onClick={handleReplaceDescription}
                disabled={
                  isLoading || isCombining || !newStyleDescription.trim()
                }
                variant="outline"
              >
                {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                <Replace className="mr-2 size-4" />
                Replace Old Description
              </Button>

              {voiceSettings?.manualWritingStyleDescription && (
                <Button
                  onClick={handleCombineDescriptions}
                  disabled={
                    isLoading || isCombining || !newStyleDescription.trim()
                  }
                >
                  {isCombining && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  <Merge className="mr-2 size-4" />
                  {isCombining
                    ? "Combining with AI..."
                    : "Add to Old Description"}
                </Button>
              )}
            </div>

            {voiceSettings?.manualWritingStyleDescription && (
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Replace:</strong> Completely replaces existing
                  description with new description.
                </p>
                <p className="mt-1 text-sm text-blue-900 dark:text-blue-100">
                  <strong>Add to Old:</strong> Uses AI to intelligently combine
                  old and new descriptions.
                </p>
              </div>
            )}

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
                    Subtle Recommender - Experienced user who's tried many
                    solutions
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

            {/* Save All Settings */}
            <div className="flex gap-2">
              <Button
                onClick={() => saveVoiceSettings()}
                disabled={isLoading || isCombining}
              >
                {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save All Settings
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
