"use client";

import { useRecordingStore } from "@/app/lib/stores/recording-store";

interface RecordingControlsProps {
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onDiscard: () => void;
}

export function RecordingControls({
  onStart,
  onPause,
  onResume,
  onStop,
  onDiscard,
}: RecordingControlsProps) {
  const { status } = useRecordingStore();

  if (status === "idle") {
    return (
      <div className="flex justify-center px-12">
        <button
          onClick={onStart}
          className="flex items-center justify-center"
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "#D4622B",
            boxShadow: "0 4px 20px #D4622B40",
          }}
        >
          <svg
            className="w-7 h-7"
            fill="none"
            stroke="#FFFFFF"
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
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-12">
      {/* Trash / Discard */}
      <button
        onClick={onDiscard}
        className="flex items-center justify-center"
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: "#FFFFFF",
          border: "1px solid #EDE6DD",
        }}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="#8B7E74"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <polyline
            points="3 6 5 6 21 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
          />
          <line x1="10" y1="11" x2="10" y2="17" strokeLinecap="round" />
          <line x1="14" y1="11" x2="14" y2="17" strokeLinecap="round" />
        </svg>
      </button>

      {/* Stop */}
      <button
        onClick={onStop}
        className="flex items-center justify-center"
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: "#D4622B",
          boxShadow: "0 4px 20px #D4622B40",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            backgroundColor: "#FFFFFF",
          }}
        />
      </button>

      {/* Pause / Resume */}
      <button
        onClick={status === "recording" ? onPause : onResume}
        className="flex items-center justify-center"
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: "#FFFFFF",
          border: "1px solid #EDE6DD",
        }}
      >
        {status === "recording" ? (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="#8B7E74"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <rect
              x="6"
              y="4"
              width="4"
              height="16"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x="14"
              y="4"
              width="4"
              height="16"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="#8B7E74"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <polygon
              points="5 3 19 12 5 21 5 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
