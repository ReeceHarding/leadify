"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { KnowledgeBaseDocument, VoiceSettingsDocument } from "@/db/schema"
import { SerializedProfileDocument } from "@/actions/db/profiles-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Brain, MessageSquare } from "lucide-react"
import KnowledgeBaseSection from "./knowledge-base-section"
import VoiceSettingsSection from "./voice-settings-section"

interface PersonalizationClientProps {
  userId: string
  initialKnowledgeBase: KnowledgeBaseDocument | null
  initialVoiceSettings: VoiceSettingsDocument | null
  userProfile: SerializedProfileDocument | null
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export default function PersonalizationClient({
  userId,
  initialKnowledgeBase,
  initialVoiceSettings,
  userProfile
}: PersonalizationClientProps) {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseDocument | null>(initialKnowledgeBase)
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettingsDocument | null>(initialVoiceSettings)

  // Calculate completion status
  const hasKnowledgeBase = knowledgeBase && (knowledgeBase.customInformation || (knowledgeBase.scrapedPages && knowledgeBase.scrapedPages.length > 0))
  const hasVoiceSettings = voiceSettings && voiceSettings.twitterHandle
  const completionPercentage = Math.round(((hasKnowledgeBase ? 1 : 0) + (hasVoiceSettings ? 1 : 0)) / 2 * 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="mx-auto max-w-6xl"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                <Sparkles className="size-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
                Personalization Hub
              </h1>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Transform your Reddit engagement with AI-powered personalization. Train your virtual assistant to write in your unique voice and leverage your business expertise.
            </p>
            
            {/* Progress Indicator */}
            <motion.div 
              variants={itemVariants}
              className="mt-8 max-w-md mx-auto"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Setup Progress</span>
                <Badge variant={completionPercentage === 100 ? "default" : "secondary"} className="text-xs">
                  {completionPercentage}% Complete
                </Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                />
              </div>
            </motion.div>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Knowledge Base Section */}
            <motion.div variants={itemVariants}>
              <Card className="h-full border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg">
                      <Brain className="size-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-900">Knowledge Base</CardTitle>
                      <CardDescription className="text-gray-600">
                        Add your business context for accurate, informed responses
                      </CardDescription>
                    </div>
                  </div>
                  {hasKnowledgeBase && (
                    <Badge className="w-fit bg-emerald-100 text-emerald-700 border-emerald-200">
                      ✓ Configured
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <KnowledgeBaseSection
                    userId={userId}
                    knowledgeBase={knowledgeBase}
                    setKnowledgeBase={setKnowledgeBase}
                    userProfile={userProfile}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Voice Settings Section */}
            <motion.div variants={itemVariants}>
              <Card className="h-full border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                      <MessageSquare className="size-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-900">Voice & Style</CardTitle>
                      <CardDescription className="text-gray-600">
                        Configure your unique writing style and persona
                      </CardDescription>
                    </div>
                  </div>
                  {hasVoiceSettings && (
                    <Badge className="w-fit bg-purple-100 text-purple-700 border-purple-200">
                      ✓ Configured
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <VoiceSettingsSection
                    userId={userId}
                    voiceSettings={voiceSettings}
                    setVoiceSettings={setVoiceSettings}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Success Message */}
          {completionPercentage === 100 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8"
            >
              <Card className="border-0 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-500 rounded-full">
                      <Sparkles className="size-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-green-900">
                        🎉 Personalization Complete!
                      </h3>
                      <p className="text-green-700">
                        Your AI assistant is now trained and ready to generate personalized Reddit comments in your unique voice.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
} 