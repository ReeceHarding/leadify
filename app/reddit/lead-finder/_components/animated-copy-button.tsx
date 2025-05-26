"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface AnimatedCopyButtonProps {
  text: string
  className?: string
  variant?: "default" | "ghost" | "outline"
  size?: "default" | "sm" | "lg" | "icon"
}

export default function AnimatedCopyButton({
  text,
  className,
  variant = "ghost",
  size = "icon"
}: AnimatedCopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text:", err)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn(
        "transition-all duration-200",
        copied &&
          "bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700",
        className
      )}
    >
      {copied ? (
        <Check className="animate-in zoom-in-50 size-4 duration-200" />
      ) : (
        <Copy className="size-4" />
      )}
    </Button>
  )
}
