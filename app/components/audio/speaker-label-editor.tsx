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

  // Update local label when external label changes (after save propagation)
  useEffect(() => {
    if (!isEditing) {
      setLabel(currentLabel);
    }
  }, [currentLabel, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmedLabel = label.trim();

    // Validation: non-empty, max 50 characters
    if (!trimmedLabel) {
      setError("Label cannot be empty");
      return;
    }
    if (trimmedLabel.length > 50) {
      setError("Label too long (max 50 characters)");
      return;
    }

    // Skip save if unchanged
    if (trimmedLabel === currentLabel) {
      setIsEditing(false);
      setError(null);
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
      <div className="flex flex-col" style={{ gap: 4 }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <span
            className="rounded-full shrink-0"
            style={{ width: 12, height: 12, backgroundColor: color, display: "inline-block" }}
          />
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="flex-1 text-sm font-semibold focus:outline-none"
            style={{
              padding: "2px 4px",
              borderBottom: "2px solid #D2691E",
              backgroundColor: "transparent",
              color: "#1A1A1A",
              maxWidth: 160,
            }}
            maxLength={50}
          />
        </div>
        {error && (
          <p style={{ fontSize: 11, color: "#E53E3E", margin: 0, paddingLeft: 20 }}>{error}</p>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="flex items-center group transition-colors"
      style={{
        gap: 8,
        padding: "2px 6px 2px 0",
        borderRadius: 6,
        border: "none",
        background: "transparent",
        cursor: "pointer",
      }}
    >
      <span
        className="rounded-full shrink-0"
        style={{ width: 12, height: 12, backgroundColor: color, display: "inline-block" }}
      />
      <span className="font-semibold" style={{ fontSize: 13, color: "#1A1A1A" }}>
        {currentLabel}
      </span>
      {/* Pencil icon: always visible on mobile (via opacity), hover-visible on desktop */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        style={{ width: 14, height: 14, color: "#B5A99A", opacity: 0.6 }}
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
