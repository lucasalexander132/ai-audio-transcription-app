"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function TagPickerModal({
  transcriptId,
  currentTags,
  isOpen,
  onClose,
}: {
  transcriptId: Id<"transcripts">;
  currentTags: { tagId: string; tagName: string }[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const [newTagName, setNewTagName] = useState("");
  const allTags = useQuery(api.tags.listUserTags);
  const addTag = useMutation(api.tags.addTagToTranscript);
  const removeTag = useMutation(api.tags.removeTagFromTranscript);

  if (!isOpen) return null;

  const currentTagIds = new Set(currentTags.map((t) => t.tagId));

  const handleCreateTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    // Prevent duplicate tag name (case-insensitive check)
    const alreadyExists = currentTags.some(
      (t) => t.tagName.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyExists) {
      setNewTagName("");
      return;
    }
    try {
      await addTag({ transcriptId, tagName: trimmed });
      setNewTagName("");
    } catch (e) {
      console.error("Failed to add tag:", e);
    }
  };

  const handleToggleTag = async (
    tagId: Id<"tags">,
    tagName: string,
    isActive: boolean
  ) => {
    try {
      if (isActive) {
        await removeTag({ transcriptId, tagId });
      } else {
        await addTag({ transcriptId, tagName });
      }
    } catch (e) {
      console.error("Failed to toggle tag:", e);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          maxHeight: "60vh",
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #EDE6DD",
          }}
        >
          <h3
            className="font-serif"
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#1A1A1A",
              margin: 0,
            }}
          >
            Add Tags
          </h3>
          <button
            onClick={onClose}
            aria-label="Close tag picker"
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              borderRadius: 8,
              color: "#8B7E74",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="16" y1="4" x2="4" y2="16" />
            </svg>
          </button>
        </div>

        {/* New tag input */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #EDE6DD" }}>
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateTag();
              }
            }}
            placeholder="Enter tag name..."
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #EDE6DD",
              backgroundColor: "#FBF5EE",
              fontSize: 14,
              color: "#1A1A1A",
              outline: "none",
            }}
          />
        </div>

        {/* Existing tags list */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {allTags === undefined ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#B5A99A",
                fontSize: 13,
              }}
            >
              Loading tags...
            </div>
          ) : allTags.length === 0 ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "#B5A99A",
                fontSize: 13,
              }}
            >
              No tags yet. Type above to create one.
            </div>
          ) : (
            allTags.map((tag) => {
              const isActive = currentTagIds.has(tag._id);
              return (
                <button
                  key={tag._id}
                  onClick={() =>
                    handleToggleTag(tag._id as Id<"tags">, tag.name, isActive)
                  }
                  className="flex items-center justify-between"
                  style={{
                    width: "100%",
                    padding: "12px 20px",
                    backgroundColor: "transparent",
                    border: "none",
                    borderBottom: "1px solid #EDE6DD",
                    cursor: "pointer",
                    fontSize: 14,
                    color: "#1A1A1A",
                    textAlign: "left",
                  }}
                >
                  <span>{tag.name}</span>
                  {isActive && (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#D4622B"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
