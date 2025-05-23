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
      className="space-y-8 text-center"
    >
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-white">Your Profile</h1>
        <p className="text-base leading-relaxed text-gray-400">
          Let's start by getting to know you a bit better.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Picture */}
        <div className="flex flex-col items-center space-y-4">
          <Label
            htmlFor="profile-picture"
            className="text-sm font-medium text-gray-300"
          >
            Avatar
          </Label>
          <div className="relative">
            <Avatar className="size-20 border-2 border-gray-600">
              <AvatarImage src={data.profilePictureUrl} alt={data.name} />
              <AvatarFallback className="bg-gradient-to-r from-blue-600 to-blue-700 text-lg text-white">
                {getInitials(data.name) || "R"}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              size="icon"
              className="absolute -bottom-1 -right-1 size-6 rounded-full bg-gray-800 shadow-sm hover:bg-gray-700"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <div className="size-3 animate-spin rounded-full border border-white border-t-transparent" />
              ) : (
                <Camera className="size-3 text-white" />
              )}
            </Button>
          </div>
          <p className="max-w-xs text-sm text-gray-400">
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
        <div className="space-y-3">
          <Label htmlFor="name" className="text-sm font-medium text-gray-300">
            Name
          </Label>
          <Input
            id="name"
            type="text"
            value={data.name}
            onChange={e => onUpdate({ name: e.target.value })}
            placeholder="Your full name"
            className="rounded-lg border-gray-600 bg-gray-900 py-3 text-center text-base text-white placeholder:text-gray-500"
            required
          />
        </div>

        {/* Continue Button */}
        <Button
          type="submit"
          className="w-full rounded-lg bg-blue-600 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700"
          disabled={!data.name.trim()}
        >
          Continue →
        </Button>
      </form>
    </motion.div>
  )
}
