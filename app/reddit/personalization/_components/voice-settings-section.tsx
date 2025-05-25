"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, MessageCircle, Twitter, Sparkles } from "lucide-react"
import { VoiceSettingsDocument, PersonaType, WritingStyle } from "@/db/schema"
import { useToast } from "@/hooks/use-toast"

interface VoiceSettingsSectionProps {
  userId: string
  voiceSettings: VoiceSettingsDocument | null
  setVoiceSettings: (vs: VoiceSettingsDocument | null) => void
}

export default function VoiceSettingsSection({
  userId,
  voiceSettings,
  setVoiceSettings
}: VoiceSettingsSectionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzingTwitter, setIsAnalyzingTwitter] = useState(false)
  
  // Form state
  const [writingStyle, setWritingStyle] = useState<WritingStyle>(voiceSettings?.writingStyle || "casual")
  const [customWritingStyle, setCustomWritingStyle] = useState(voiceSettings?.customWritingStyle || "")
  const [twitterHandle, setTwitterHandle] = useState(voiceSettings?.twitterHandle || "")
  const [personaType, setPersonaType] = useState<PersonaType>(voiceSettings?.personaType || "user")
  const [customPersona, setCustomPersona] = useState(voiceSettings?.customPersona || "")
  const [useAllLowercase, setUseAllLowercase] = useState(voiceSettings?.useAllLowercase || false)
  const [useEmojis, setUseEmojis] = useState(voiceSettings?.useEmojis || false)
  const [useCasualTone, setUseCasualTone] = useState(voiceSettings?.useCasualTone || false)
  const [useFirstPerson, setUseFirstPerson] = useState(voiceSettings?.useFirstPerson || false)

  const { toast } = useToast()

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
      const { fetchUserTweetsAction } = await import("@/actions/integrations/twitter/twitter-aio-actions")
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
      const { analyzeTwitterWritingStyleAction } = await import("@/actions/integrations/openai/writing-style-analysis-actions")
      const analysisResult = await analyzeTwitterWritingStyleAction(tweets, twitterHandle)
      
      if (!analysisResult.isSuccess) {
        toast({
          title: "Error analyzing writing style",
          description: analysisResult.message,
          variant: "destructive"
        })
        return
      }

      // Save Twitter analysis
      const { createTwitterAnalysisAction } = await import("@/actions/db/personalization-actions")
      await createTwitterAnalysisAction({
        userId,
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
      setWritingStyle(analysisResult.data.vocabularyLevel === "professional" ? "professional" : "casual")
      setUseEmojis(analysisResult.data.emojiUsage)
      setUseCasualTone(analysisResult.data.vocabularyLevel === "casual")

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
        const { updateVoiceSettingsAction } = await import("@/actions/db/personalization-actions")
        const result = await updateVoiceSettingsAction(voiceSettings.id, {
          writingStyle,
          customWritingStyle: writingStyle === "custom" ? customWritingStyle : undefined,
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
        const { createVoiceSettingsAction } = await import("@/actions/db/personalization-actions")
        const result = await createVoiceSettingsAction({
          userId,
          writingStyle,
          customWritingStyle: writingStyle === "custom" ? customWritingStyle : undefined,
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="size-5" />
          Voice & Writing Style
        </CardTitle>
        <CardDescription>
          Configure how you want your comments to sound and what persona to adopt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Twitter Analysis */}
        <div className="space-y-4">
          <Label>Twitter Writing Style Analysis</Label>
          <div className="flex gap-2">
            <Input
              placeholder="@username"
              value={twitterHandle}
              onChange={(e) => setTwitterHandle(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleAnalyzeTwitter}
              disabled={isAnalyzingTwitter}
            >
              {isAnalyzingTwitter ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Twitter className="mr-2 size-4" />
              )}
              Analyze
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Enter your Twitter handle to automatically analyze your writing style from your recent tweets.
          </p>
        </div>

        {/* Writing Style */}
        <div className="space-y-4">
          <Label>Writing Style</Label>
          <Select value={writingStyle} onValueChange={(value: WritingStyle) => setWritingStyle(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          
          {writingStyle === "custom" && (
            <Textarea
              placeholder="Describe your custom writing style..."
              value={customWritingStyle}
              onChange={(e) => setCustomWritingStyle(e.target.value)}
              rows={3}
            />
          )}
        </div>

        {/* Persona Type */}
        <div className="space-y-4">
          <Label>Comment Persona</Label>
          <Select value={personaType} onValueChange={(value: PersonaType) => setPersonaType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ceo">CEO/Founder - Direct and authoritative</SelectItem>
              <SelectItem value="user">Satisfied User - Enthusiastic customer</SelectItem>
              <SelectItem value="subtle">Subtle Recommender - Experienced user who's tried many solutions</SelectItem>
              <SelectItem value="custom">Custom Persona</SelectItem>
            </SelectContent>
          </Select>
          
          {personaType === "custom" && (
            <Textarea
              placeholder="Describe your custom persona..."
              value={customPersona}
              onChange={(e) => setCustomPersona(e.target.value)}
              rows={3}
            />
          )}
        </div>

        {/* Style Preferences */}
        <div className="space-y-4">
          <Label>Style Preferences</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="lowercase"
                checked={useAllLowercase}
                onCheckedChange={(checked) => setUseAllLowercase(checked === true)}
              />
              <Label htmlFor="lowercase" className="text-sm">Use all lowercase</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="emojis"
                checked={useEmojis}
                onCheckedChange={(checked) => setUseEmojis(checked === true)}
              />
              <Label htmlFor="emojis" className="text-sm">Use emojis</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="casual"
                checked={useCasualTone}
                onCheckedChange={(checked) => setUseCasualTone(checked === true)}
              />
              <Label htmlFor="casual" className="text-sm">Use casual tone</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="first-person"
                checked={useFirstPerson}
                onCheckedChange={(checked) => setUseFirstPerson(checked === true)}
              />
              <Label htmlFor="first-person" className="text-sm">Write in first person</Label>
            </div>
          </div>
        </div>

        {/* Generated Prompt Preview */}
        {voiceSettings?.generatedPrompt && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Sparkles className="size-4" />
              Generated Writing Style Prompt
            </Label>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-700">{voiceSettings.generatedPrompt}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleSaveSettings}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 