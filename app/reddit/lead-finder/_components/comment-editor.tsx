"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"

interface CommentEditorProps {
  initialValue: string
  onSave: (value: string) => void
  onCancel: () => void
}

export default function CommentEditor({
  initialValue,
  onSave,
  onCancel
}: CommentEditorProps) {
  const [value, setValue] = useState(initialValue)

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        className="min-h-[100px] resize-none"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="mr-1 size-3" />
          Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(value)}>
          <Check className="mr-1 size-3" />
          Save
        </Button>
      </div>
    </div>
  )
}
