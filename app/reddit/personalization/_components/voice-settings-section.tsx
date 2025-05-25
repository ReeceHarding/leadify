"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, MessageCircle, Twitter, Sparkles, User, Crown, Target, CheckCircle, AlertCircle } from "lucide-react"
import { VoiceSettingsDocument, PersonaType, WritingStyle } from "@/db/schema"
import { useToast } from "@/hooks/use-toast"

interface VoiceSettingsSectionProps {
  userId: string
  voiceSettings: VoiceSettingsDocument | null
  setVoiceSettings: (vs: VoiceSettingsDocument | null) => void
}

const personaIcons = {
  ceo: Crown,
  user: User,
  subtle: Target,
  custom: Sparkles
}

const personaColors = {
  ceo: "from-amber-500 to-orange-600",
  user: "from-blue-500 to-indigo-600", 
  subtle: "from-green-500 to-emerald-600",
  custom: "from-purple-500 to-pink-600"
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

  const hasSettings = twitterHandle.trim().length > 0 || writingStyle !== "casual" || personaType !== "user"

  return (
    <div className="space-y-6">
      {/* Twitter Analysis Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Twitter className="size-4 text-blue-500" />
          <Label className="text-sm font-medium text-gray-700">Twitter Writing Style Analysis</Label>
          {twitterHandle && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              <CheckCircle className="size-3 mr-1" />
              @{twitterHandle}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-3">
          <Input
            placeholder="@username"
            value={twitterHandle}
            onChange={(e) => setTwitterHandle(e.target.value)}
            className="flex-1 border-gray-200 focus:border-blue-300 focus:ring-blue-200"
          />
          <Button
            variant="outline"
            onClick={handleAnalyzeTwitter}
            disabled={isAnalyzingTwitter || !twitterHandle.trim()}
            className="bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
          >
            {isAnalyzingTwitter ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Twitter className="mr-2 size-4" />
            )}
            Analyze
          </Button>
        </div>
        
        <p className="text-sm text-gray-600 flex items-start gap-2">
          <Sparkles className="size-4 text-blue-500 mt-0.5 flex-shrink-0" />
          Enter your Twitter handle to automatically analyze your writing style from recent tweets. This will help configure your voice settings.
        </p>
      </motion.div>

      {/* Writing Style Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-purple-600" />
          <Label className="text-sm font-medium text-gray-700">Writing Style</Label>
          {writingStyle !== "casual" && (
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
              {writingStyle}
            </Badge>
          )}
        </div>
        
        <Select value={writingStyle} onValueChange={(value: WritingStyle) => setWritingStyle(value)}>
          <SelectTrigger className="border-gray-200 focus:border-purple-300 focus:ring-purple-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="casual">Casual - Relaxed and conversational</SelectItem>
            <SelectItem value="professional">Professional - Formal and polished</SelectItem>
            <SelectItem value="friendly">Friendly - Warm and approachable</SelectItem>
            <SelectItem value="technical">Technical - Detailed and precise</SelectItem>
            <SelectItem value="custom">Custom - Define your own style</SelectItem>
          </SelectContent>
        </Select>
        
        <AnimatePresence>
          {writingStyle === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Textarea
                placeholder="Describe your custom writing style in detail. Include tone, vocabulary, sentence structure, and any specific characteristics..."
                value={customWritingStyle}
                onChange={(e) => setCustomWritingStyle(e.target.value)}
                rows={3}
                className="border-gray-200 focus:border-purple-300 focus:ring-purple-200"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Persona Type Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          {React.createElement(personaIcons[personaType], { className: "size-4 text-indigo-600" })}
          <Label className="text-sm font-medium text-gray-700">Comment Persona</Label>
          <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
            {personaType === "ceo" ? "CEO/Founder" : 
             personaType === "user" ? "Satisfied User" :
             personaType === "subtle" ? "Subtle Recommender" : "Custom"}
          </Badge>
        </div>
        
        <Select value={personaType} onValueChange={(value: PersonaType) => setPersonaType(value)}>
          <SelectTrigger className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ceo">
              <div className="flex items-center gap-2">
                <Crown className="size-4 text-amber-500" />
                <div>
                  <div className="font-medium">CEO/Founder</div>
                  <div className="text-xs text-gray-500">Direct and authoritative</div>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="user">
              <div className="flex items-center gap-2">
                <User className="size-4 text-blue-500" />
                <div>
                  <div className="font-medium">Satisfied User</div>
                  <div className="text-xs text-gray-500">Enthusiastic customer</div>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="subtle">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-green-500" />
                <div>
                  <div className="font-medium">Subtle Recommender</div>
                  <div className="text-xs text-gray-500">Experienced user who's tried many solutions</div>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="custom">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-purple-500" />
                <div>
                  <div className="font-medium">Custom Persona</div>
                  <div className="text-xs text-gray-500">Define your own character</div>
                </div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        
        <AnimatePresence>
          {personaType === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Textarea
                placeholder="Describe your custom persona. Who are you in relation to your business? What's your background and perspective?"
                value={customPersona}
                onChange={(e) => setCustomPersona(e.target.value)}
                rows={3}
                className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Style Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-pink-600" />
          <Label className="text-sm font-medium text-gray-700">Style Preferences</Label>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <motion.div 
            className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Checkbox
              id="lowercase"
              checked={useAllLowercase}
              onCheckedChange={(checked) => setUseAllLowercase(checked === true)}
              className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
            />
            <Label htmlFor="lowercase" className="text-sm cursor-pointer">Use all lowercase</Label>
          </motion.div>
          
          <motion.div 
            className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Checkbox
              id="emojis"
              checked={useEmojis}
              onCheckedChange={(checked) => setUseEmojis(checked === true)}
              className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
            />
            <Label htmlFor="emojis" className="text-sm cursor-pointer">Use emojis 😊</Label>
          </motion.div>
          
          <motion.div 
            className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Checkbox
              id="casual"
              checked={useCasualTone}
              onCheckedChange={(checked) => setUseCasualTone(checked === true)}
              className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
            />
            <Label htmlFor="casual" className="text-sm cursor-pointer">Use casual tone</Label>
          </motion.div>
          
          <motion.div 
            className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Checkbox
              id="first-person"
              checked={useFirstPerson}
              onCheckedChange={(checked) => setUseFirstPerson(checked === true)}
              className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
            />
            <Label htmlFor="first-person" className="text-sm cursor-pointer">Write in first person</Label>
          </motion.div>
        </div>
      </motion.div>

      {/* Generated Prompt Preview */}
      <AnimatePresence>
        {voiceSettings?.generatedPrompt && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-green-600" />
              <Label className="text-sm font-medium text-gray-700">AI-Generated Writing Style Prompt</Label>
            </div>
            
            <div className="rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4">
              <p className="text-sm text-gray-700 leading-relaxed">{voiceSettings.generatedPrompt}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-3 pt-2"
      >
        <Button
          onClick={handleSaveSettings}
          disabled={isLoading}
          className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {voiceSettings ? "Update Settings" : "Save Settings"}
        </Button>
        
        {hasSettings && (
          <Badge className="flex items-center gap-1 bg-purple-100 text-purple-700 border-purple-200 px-3 py-1">
            <CheckCircle className="size-3" />
            Voice Configured
          </Badge>
        )}
      </motion.div>
    </div>
  )
} 