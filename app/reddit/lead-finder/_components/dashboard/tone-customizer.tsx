"use client"

import React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, RefreshCw, Zap } from "lucide-react"

interface ToneCustomizerProps {
  toneInstruction: string
  onToneInstructionChange: (value: string) => void
  onRegenerateAll: () => void
  onRegenerateAllWithNewPrompts?: () => void
  isRegeneratingAll: boolean
  disabled: boolean // Overall disable state (e.g., no leads)
}

export default function ToneCustomizer({
  toneInstruction,
  onToneInstructionChange,
  onRegenerateAll,
  onRegenerateAllWithNewPrompts,
  isRegeneratingAll,
  disabled
}: ToneCustomizerProps) {
  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="border-b bg-gray-50/30 p-4 dark:bg-gray-900/30">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="size-4 text-blue-500" />
          Regenerate Comments
        </CardTitle>
        <CardDescription className="text-sm">
          Rewrite all comments with custom style or refresh with updated AI prompts
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="e.g., 'Make comments more enthusiastic and add a CTA'"
              value={toneInstruction}
              onChange={e => onToneInstructionChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && toneInstruction.trim()) {
                  onRegenerateAll()
                }
              }}
              className="grow rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:focus:border-blue-400"
              disabled={disabled || isRegeneratingAll}
            />
            <Button
              onClick={onRegenerateAll}
              disabled={disabled || isRegeneratingAll || !toneInstruction.trim()}
              className="w-full gap-2 bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
            >
              {isRegeneratingAll ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Regenerate with Style
            </Button>
          </div>
          
          {onRegenerateAllWithNewPrompts && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-500 dark:text-gray-400">or</span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>
          )}
          
          {onRegenerateAllWithNewPrompts && (
            <Button
              onClick={onRegenerateAllWithNewPrompts}
              disabled={disabled || isRegeneratingAll}
              variant="outline"
              className="w-full gap-2"
            >
              {isRegeneratingAll ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              Regenerate All with Latest AI
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
