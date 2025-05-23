"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Camera, Upload, User, Loader2, CheckCircle, Image } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { uploadFileStorage } from "@/actions/storage/file-storage-actions"

interface ProfileStepProps {
  data: {
    name: string
    profilePictureUrl: string
    website: string
    keywords: string[]
    redditConnected: boolean
  }
  onUpdate: (data: Partial<ProfileStepProps["data"]>) => void
  onNext: () => void
}

export default function ProfileStep({
  data,
  onUpdate,
  onNext
}: ProfileStepProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadSuccess(false)
    try {
      const result = await uploadFileStorage(
        `profile-images/${Date.now()}-${file.name}`,
        file
      )

      if (result.isSuccess) {
        onUpdate({ profilePictureUrl: result.data.downloadURL })
        setUploadSuccess(true)
        setTimeout(() => setUploadSuccess(false), 2000)
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (data.name.trim()) {
      onNext()
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* Enhanced Header */}
      <div className="space-y-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex justify-center"
        >
          <div className="shadow-glow rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 dark:from-blue-950 dark:to-blue-900">
            <User className="size-8 text-blue-600" />
          </div>
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Tell us about yourself
          </h2>
          <p className="text-muted-foreground mx-auto max-w-md text-lg leading-relaxed">
            Let's start by setting up your profile information to personalize
            your experience.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Enhanced Profile Picture Section */}
        <Card className="shadow-glow border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Image className="size-5 text-gray-600" />
                <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Profile Picture
                </Label>
              </div>

              <div className="flex flex-col items-center space-y-6">
                <div className="group relative">
                  <Avatar className="size-32 border-4 border-white shadow-xl ring-4 ring-blue-100 transition-all duration-300 group-hover:ring-blue-200 dark:border-gray-800 dark:ring-blue-900/50 dark:group-hover:ring-blue-800">
                    <AvatarImage
                      src={data.profilePictureUrl}
                      alt={data.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-2xl font-bold text-white">
                      {getInitials(data.name) || "YU"}
                    </AvatarFallback>
                  </Avatar>

                  <Button
                    type="button"
                    size="icon"
                    className={`
                      absolute -bottom-3 -right-3 size-12 rounded-full shadow-lg transition-all duration-300 hover:scale-110
                      ${uploadSuccess ? "bg-green-500 hover:bg-green-600" : "bg-primary hover:bg-primary/90"}
                    `}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : uploadSuccess ? (
                      <CheckCircle className="size-5" />
                    ) : (
                      <Camera className="size-5" />
                    )}
                  </Button>
                </div>

                <div className="space-y-2 text-center">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    Upload your photo
                  </p>
                  <p className="text-muted-foreground text-sm">
                    JPG or PNG up to 10MB. This helps personalize your
                    experience.
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="mr-2 size-4" />
                    {uploading ? "Uploading..." : "Choose File"}
                  </Button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Name Input */}
        <Card className="shadow-glow border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
          <CardContent className="p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="size-5 text-gray-600" />
                <Label
                  htmlFor="name"
                  className="text-base font-semibold text-gray-900 dark:text-gray-100"
                >
                  Full Name *
                </Label>
              </div>

              <Input
                id="name"
                type="text"
                value={data.name}
                onChange={e => onUpdate({ name: e.target.value })}
                placeholder="Enter your full name"
                className="h-14 rounded-xl border-2 border-gray-200 bg-white px-4 text-lg shadow-sm transition-all duration-200 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-blue-400"
                required
              />

              <p className="text-muted-foreground text-sm">
                This name will be used to personalize AI-generated responses
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Button
            type="submit"
            className="h-14 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!data.name.trim()}
          >
            Continue to Website Setup
          </Button>
        </motion.div>
      </form>
    </motion.div>
  )
}
