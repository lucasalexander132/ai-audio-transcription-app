"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface SpeakerLabelEditorProps {
  transcriptId: Id<"transcripts">;
  speakerNumber: number;
  currentLabel: string;
  color: string;
}

export function SpeakerLabelEditor({
  transcriptId,
  speakerNumber,
  currentLabel,
  color,
}: SpeakerLabelEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(currentLabel);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateSpeakerLabel = useMutation(api.transcripts.updateSpeakerLabel);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmedLabel = label.trim();

    // Validation
    if (!trimmedLabel) {
      setError("Label cannot be empty");
      return;
    }
    if (trimmedLabel.length > 50) {
      setError("Label too long (max 50 characters)");
      return;
    }

    try {
      await updateSpeakerLabel({
        transcriptId,
        speakerNumber,
        label: trimmedLabel,
      });
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError("Failed to save label");
      console.error("Error saving speaker label:", err);
    }
  };

  const handleCancel = () => {
    setLabel(currentLabel);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="flex-1 rounded border border-[#D2691E] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#D2691E]"
            maxLength={50}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="flex items-center gap-2 group hover:bg-gray-50 rounded px-2 py-1 -ml-2 transition-colors"
    >
      <span
        className="h-3 w-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="font-semibold text-gray-700">{currentLabel}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
        />
      </svg>
    </button>
  );
}
