"use client";

import { useRecordingTimer } from "@/app/lib/hooks/use-recording-timer";
import { useRecordingStore } from "@/app/lib/stores/recording-store";

interface RecordingControlsProps {
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function RecordingControls({
  onStart,
  onPause,
  onResume,
  onStop,
}: RecordingControlsProps) {
  const { status } = useRecordingStore();
  const { formattedTime } = useRecordingTimer();

  return (
    <div className="fixed bottom-24 left-0 right-0 flex flex-col items-center gap-4 px-4">
      {/* Timer */}
      {(status === "recording" || status === "paused") && (
        <div className="text-3xl font-mono font-bold text-gray-800">{formattedTime}</div>
      )}

      {/* Main Record/Pause/Resume Button */}
      <button
        onClick={() => {
          if (status === "idle") {
            onStart();
          } else if (status === "recording") {
            onPause();
          } else if (status === "paused") {
            onResume();
          }
        }}
        className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${
          status === "recording"
            ? "animate-pulse bg-red-600 shadow-lg shadow-red-300"
            : status === "paused"
              ? "bg-blue-600 shadow-lg shadow-blue-300"
              : "bg-red-500 shadow-lg hover:bg-red-600"
        }`}
        style={{ minWidth: "80px", minHeight: "80px" }}
      >
        {status === "idle" && (
          <svg
            className="h-8 w-8 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
        {status === "recording" && (
          <svg
            className="h-8 w-8 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M6 6h12v12H6z" />
          </svg>
        )}
        {status === "paused" && (
          <svg
            className="h-8 w-8 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Stop Button (appears when recording or paused) */}
      {(status === "recording" || status === "paused") && (
        <button
          onClick={onStop}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-700 shadow-lg hover:bg-gray-800"
          style={{ minWidth: "56px", minHeight: "56px" }}
        >
          <svg
            className="h-6 w-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        </button>
      )}
    </div>
  );
}
