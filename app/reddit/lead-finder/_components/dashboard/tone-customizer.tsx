"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";

interface ToneCustomizerProps {
  toneInstruction: string;
  onToneInstructionChange: (value: string) => void;
  onRegenerateAll: () => void;
  isRegeneratingAll: boolean;
  disabled: boolean; // Overall disable state (e.g., no leads)
}

export default function ToneCustomizer({
  toneInstruction,
  onToneInstructionChange,
  onRegenerateAll,
  isRegeneratingAll,
  disabled
}: ToneCustomizerProps) {
  return (
    <Card className="overflow-hidden shadow-lg dark:border-gray-700">
      <CardHeader className="border-b bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100">
          <Sparkles className="size-5 text-purple-500" />
          Customize Comment Tone
        </CardTitle>
        <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
          Refine the tone of all generated comments below based on your brand's
          voice or specific instructions.
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
                onRegenerateAll();
              }
            }}
            className="grow rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:border-blue-400"
            disabled={disabled || isRegeneratingAll}
          />
          <Button
            onClick={onRegenerateAll}
            disabled={disabled || isRegeneratingAll || !toneInstruction.trim()}
            className="w-full gap-2 rounded-md bg-purple-600 text-white shadow-md transition-all hover:bg-purple-700 hover:shadow-lg disabled:opacity-70 sm:w-auto"
          >
            {isRegeneratingAll ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Regenerate All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 