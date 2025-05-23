"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Camera, Upload, User, Loader2 } from "lucide-react"
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
      className="space-y-6"
    >
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="mb-4 flex justify-center">
          <div className="bg-primary/10 rounded-full p-3">
            <User className="text-primary size-6" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Tell us about yourself</h2>
        <p className="text-muted-foreground">
          Let's start by setting up your profile information.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Profile Picture</Label>
          <div className="flex flex-col items-center space-y-4">
            <div className="group relative">
              <Avatar className="border-background size-24 border-4 shadow-lg">
                <AvatarImage src={data.profilePictureUrl} alt={data.name} />
                <AvatarFallback className="from-primary to-primary/80 text-primary-foreground bg-gradient-to-br text-xl font-semibold">
                  {getInitials(data.name) || "YU"}
                </AvatarFallback>
              </Avatar>

              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute -bottom-2 -right-2 size-8 rounded-full shadow-md transition-transform hover:scale-110"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
              </Button>
            </div>

            <div className="space-y-1 text-center">
              <p className="text-sm font-medium">Upload your photo</p>
              <p className="text-muted-foreground text-xs">
                JPG, PNG up to 10MB
              </p>
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

        {/* Name Input */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Full Name
          </Label>
          <Input
            id="name"
            type="text"
            value={data.name}
            onChange={e => onUpdate({ name: e.target.value })}
            placeholder="Enter your full name"
            className="focus-ring h-12 text-base"
            required
          />
        </div>

        {/* Continue Button */}
        <Button
          type="submit"
          className="h-12 w-full rounded-xl text-base font-semibold"
          disabled={!data.name.trim()}
        >
          Continue
        </Button>
      </form>
    </motion.div>
  )
}
