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
import { Sparkles, Loader2, RefreshCw } from "lucide-react"

interface ToneCustomizerProps {
  toneInstruction: string
  onToneInstructionChange: (value: string) => void
  onRegenerateAll: () => void
  isRegeneratingAll: boolean
  disabled: boolean // Overall disable state (e.g., no leads)
}

export default function ToneCustomizer({
  toneInstruction,
  onToneInstructionChange,
  onRegenerateAll,
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
          Rewrite all comments below with your own style - you can ask AI to
          make them more helpful, emphasize your product, change the tone, etc.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
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
            Regenerate All
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
