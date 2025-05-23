"use client"

import { useState, useRef } from "react"
import { Camera, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

  return (
    <div className="space-y-8 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-black">Your Profile</h1>
        <p className="text-gray-600">
          Let's start by getting to know you a bit better.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Name Input */}
        <div className="space-y-2 text-left">
          <Label htmlFor="name" className="text-sm font-medium text-black">
            Name
          </Label>
          <Input
            id="name"
            type="text"
            value={data.name}
            onChange={e => onUpdate({ name: e.target.value })}
            placeholder="Enter your name"
            className="h-12 border-gray-300 bg-white text-black"
            required
          />
        </div>

        {/* Avatar Upload */}
        <div className="space-y-4 text-left">
          <Label className="text-sm font-medium text-black">Avatar</Label>
          <p className="text-sm text-gray-600">
            Click the circle or drop an image to it to upload your avatar.
          </p>

          <div className="flex justify-center">
            <div className="relative">
              <div
                className="flex size-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-gray-300 bg-gray-100"
                onClick={() => fileInputRef.current?.click()}
              >
                {data.profilePictureUrl ? (
                  <img
                    src={data.profilePictureUrl}
                    alt="Avatar"
                    className="size-full object-cover"
                  />
                ) : (
                  <Camera className="size-6 text-gray-500" />
                )}
              </div>

              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50">
                  <Loader2 className="size-4 animate-spin text-white" />
                </div>
              )}
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

        {/* Continue Button */}
        <Button
          type="submit"
          className="h-12 w-full bg-blue-600 text-white hover:bg-blue-700"
          disabled={!data.name.trim() || uploading}
        >
          Continue
        </Button>
      </form>
    </div>
  )
}
