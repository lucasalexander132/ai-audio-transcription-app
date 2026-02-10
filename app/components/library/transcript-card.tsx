"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface TranscriptCardProps {
  transcript: {
    _id: Id<"transcripts">;
    title: string;
    createdAt: number;
    duration?: number;
    status: string;
    source?: string;
    isStarred?: boolean;
  };
  tags: string[];
  onClick: () => void;
}

function formatDate(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (date >= today) {
    return `Today, ${time}`;
  } else if (date >= yesterday) {
    return `Yesterday, ${time}`;
  }
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m} min`;
  }
  const m = Math.floor(seconds / 60);
  return m < 1 ? "< 1 min" : `${m} min`;
}

export function TranscriptCard({ transcript, tags, onClick }: TranscriptCardProps) {
  const toggleStar = useMutation(api.transcripts.toggleStar);

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStar({ transcriptId: transcript._id });
  };

  const displayTags = tags.slice(0, 5);
  const extraTagCount = tags.length - 5;

  return (
    <button
      onClick={onClick}
      className="flex flex-col text-left w-full"
      style={{
        gap: 10,
        padding: 16,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        border: "1px solid #EDE6DD",
      }}
    >
      {/* Top row: source icon + title + star */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center" style={{ gap: 8, minWidth: 0, flex: 1 }}>
          {/* Source icon */}
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor:
                transcript.source === "recording" ? "#FFF0E6" : "#EDE6DD",
            }}
          >
            {transcript.source === "recording" ? (
              <svg
                style={{ width: 18, height: 18 }}
                fill="none"
                stroke="#D4622B"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 10v2a7 7 0 01-14 0v-2"
                />
                <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
                <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
              </svg>
            ) : transcript.source === "upload" ? (
              <svg
                style={{ width: 18, height: 18 }}
                fill="none"
                stroke="#8B7E74"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"
                />
                <polyline
                  points="17 8 12 3 7 8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
              </svg>
            ) : (
              <svg
                style={{ width: 18, height: 18 }}
                fill="none"
                stroke="#8B7E74"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                />
                <polyline
                  points="14 2 14 8 20 8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" />
                <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" />
              </svg>
            )}
          </div>

          {/* Title */}
          <span
            className="font-serif truncate"
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#1A1A1A",
              minWidth: 0,
            }}
          >
            {transcript.title}
          </span>
        </div>

        {/* Star button */}
        <button
          onClick={handleStarClick}
          className="flex items-center justify-center shrink-0"
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          {transcript.isStarred ? (
            <svg
              style={{ width: 20, height: 20 }}
              fill="#D4622B"
              stroke="#D4622B"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ) : (
            <svg
              style={{ width: 20, height: 20 }}
              fill="none"
              stroke="#B5A99A"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )}
        </button>
      </div>

      {/* Info row: date + duration + status */}
      <div className="flex items-center" style={{ gap: 12 }}>
        <span style={{ fontSize: 12, color: "#8B7E74" }}>
          {formatDate(transcript.createdAt)}
        </span>
        {transcript.duration != null && (
          <div className="flex items-center" style={{ gap: 4 }}>
            <svg
              style={{ width: 14, height: 14 }}
              fill="none"
              stroke="#B5A99A"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline
                points="12 6 12 12 16 14"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontSize: 12, color: "#8B7E74" }}>
              {formatDuration(transcript.duration)}
            </span>
          </div>
        )}
        {transcript.status === "recording" && (
          <div className="flex items-center" style={{ gap: 4 }}>
            <div
              className="rounded-full animate-pulse"
              style={{
                width: 6,
                height: 6,
                backgroundColor: "#E53E3E",
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#E53E3E",
              }}
            >
              Recording
            </span>
          </div>
        )}
        {transcript.status === "processing" && (
          <div className="flex items-center" style={{ gap: 4 }}>
            <div
              className="rounded-full animate-pulse"
              style={{
                width: 6,
                height: 6,
                backgroundColor: "#D4622B",
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#D4622B",
              }}
            >
              Processing
            </span>
          </div>
        )}
        {transcript.status === "completed" && (
          <div className="flex items-center" style={{ gap: 4 }}>
            <svg
              style={{ width: 14, height: 14 }}
              fill="none"
              stroke="#B5A99A"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <polyline
                points="20 6 9 17 4 12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontSize: 12, color: "#8B7E74" }}>Completed</span>
          </div>
        )}
        {transcript.status === "error" && (
          <div className="flex items-center" style={{ gap: 4 }}>
            <svg
              style={{ width: 14, height: 14 }}
              fill="none"
              stroke="#E53E3E"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round" />
              <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 12, color: "#E53E3E" }}>Error</span>
          </div>
        )}
      </div>

      {/* Tag chips row */}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
          {displayTags.map((tag) => (
            <span
              key={tag}
              style={{
                backgroundColor: "#F5EDE4",
                color: "#8B7E74",
                borderRadius: 9999,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {tag}
            </span>
          ))}
          {extraTagCount > 0 && (
            <span
              style={{
                color: "#B5A99A",
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              +{extraTagCount} more
            </span>
          )}
        </div>
      )}
    </button>
  );
}
