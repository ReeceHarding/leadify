"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Camera, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await uploadFileStorage(
        `profile-images/${Date.now()}-${file.name}`,
        file
      )

      if (result.isSuccess) {
        onUpdate({ profilePictureUrl: result.data.downloadURL })
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
      className="space-y-6 text-center"
    >
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Your Profile</h1>
        <p className="mx-auto max-w-lg text-lg text-gray-600">
          Let's start by getting to know you a bit better.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture */}
        <div className="flex flex-col items-center space-y-4">
          <Label
            htmlFor="profile-picture"
            className="text-sm font-medium text-gray-700"
          >
            Avatar
          </Label>
          <div className="relative">
            <Avatar className="size-24 border-4 border-white shadow-lg">
              <AvatarImage src={data.profilePictureUrl} alt={data.name} />
              <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-xl text-white">
                {getInitials(data.name) || "?"}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              size="icon"
              className="absolute -bottom-2 -right-2 size-8 rounded-full bg-gray-800 hover:bg-gray-700"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Camera className="size-4 text-white" />
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            Click the circle or drop an image to it to upload your avatar.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Name Input */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-gray-700">
            Name
          </Label>
          <Input
            id="name"
            type="text"
            value={data.name}
            onChange={e => onUpdate({ name: e.target.value })}
            placeholder="Your full name"
            className="py-3 text-center text-lg"
            required
          />
        </div>

        {/* Continue Button */}
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-3 text-lg font-medium text-white hover:from-blue-700 hover:to-purple-700"
          disabled={!data.name.trim()}
        >
          Continue →
        </Button>
      </form>
    </motion.div>
  )
}
