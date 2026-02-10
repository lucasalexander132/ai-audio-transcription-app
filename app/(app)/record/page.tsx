"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAudioRecorder } from "@/app/lib/hooks/use-audio-recorder";
import { useRecordingStore } from "@/app/lib/stores/recording-store";
import { useRecordingTimer } from "@/app/lib/hooks/use-recording-timer";
import { WaveformVisualizer } from "@/app/components/audio/waveform-visualizer";
import { RecordingControls } from "@/app/components/audio/recording-controls";
import { LiveTranscript } from "@/app/components/audio/live-transcript";
import { FileUpload } from "@/app/components/audio/file-upload";

export default function RecordPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"microphone" | "upload">("microphone");
  const { error } = useRecordingStore();
  const { formattedTime } = useRecordingTimer();

  // Reset stale state from a previous recording session
  useEffect(() => {
    const store = useRecordingStore.getState();
    if (store.status === "stopped") {
      store.setStatus("idle");
      store.setTranscriptId(null);
      store.resetTimer();
      store.setError(null);
    }
  }, []);
  const {
    status,
    transcriptId,
    mediaStream,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
  } = useAudioRecorder();

  const handleStop = async () => {
    const { transcriptId: finalTranscriptId, saved } = stopRecording();
    if (finalTranscriptId) {
      await saved;
      router.push(`/transcripts/view?id=${finalTranscriptId}`);
    }
  };

  return (
    <div
      className="flex flex-col"
      style={{ backgroundColor: "#FBF5EE", height: "100dvh", paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 shrink-0"
        style={{ height: 72 }}
      >
        <button
          onClick={() => router.push("/transcripts")}
          className="flex items-center"
          style={{ gap: 6 }}
        >
          <svg
            style={{ width: 22, height: 22 }}
            fill="none"
            stroke="#1A1A1A"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <polyline
              points="15 18 9 12 15 6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{ fontSize: 16, fontWeight: 500, color: "#1A1A1A" }}
          >
            Back
          </span>
        </button>
        <h1
          className="font-serif"
          style={{ fontSize: 18, fontWeight: 600, color: "#1A1A1A" }}
        >
          New Recording
        </h1>
        <button
          className="flex items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#FFFFFF",
            border: "1px solid #EDE6DD",
          }}
        >
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
            <line
              x1="12"
              y1="3"
              x2="12"
              y2="15"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      {/* Source Selector - hidden during recording/paused */}
      {status === "idle" && (
        <div
          className="flex justify-center shrink-0"
          style={{ gap: 12, padding: "12px 24px 0" }}
        >
          <button
            onClick={() => setActiveTab("microphone")}
            className="flex items-center"
            style={{
              gap: 8,
              padding: "10px 20px",
              borderRadius: 24,
              backgroundColor: activeTab === "microphone" ? "#D4622B" : "#FFFFFF",
              color: activeTab === "microphone" ? "#FFFFFF" : "#8B7E74",
              border: activeTab === "microphone" ? "none" : "1px solid #EDE6DD",
            }}
          >
            <svg
              style={{ width: 16, height: 16 }}
              fill="none"
              stroke="currentColor"
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
            <span style={{ fontSize: 13, fontWeight: activeTab === "microphone" ? 600 : 500 }}>
              Microphone
            </span>
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className="flex items-center"
            style={{
              gap: 8,
              padding: "10px 20px",
              borderRadius: 24,
              backgroundColor: activeTab === "upload" ? "#D4622B" : "#FFFFFF",
              color: activeTab === "upload" ? "#FFFFFF" : "#8B7E74",
              border: activeTab === "upload" ? "none" : "1px solid #EDE6DD",
            }}
          >
            <svg
              style={{ width: 16, height: 16 }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"
              />
            </svg>
            <span style={{ fontSize: 13, fontWeight: activeTab === "upload" ? 600 : 500 }}>
              Upload File
            </span>
          </button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "microphone" ? (
        <>
          {/* Spacer */}
          <div className="shrink-0" style={{ height: 30 }} />

          {/* Waveform */}
          <div className="shrink-0 px-8" style={{ height: 120 }}>
            <WaveformVisualizer mediaStream={mediaStream} />
          </div>

          {/* Timer */}
          <div
            className="flex flex-col items-center shrink-0 px-6"
            style={{ gap: 4 }}
          >
            <span
              className="font-serif"
              style={{
                fontSize: 56,
                fontWeight: 600,
                letterSpacing: -1,
                color: "#1A1A1A",
                lineHeight: 1.1,
              }}
            >
              {formattedTime}
            </span>
            {status === "recording" && (
              <div className="flex items-center" style={{ gap: 6 }}>
                <div
                  className="rounded-full animate-pulse"
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: "#E53E3E",
                  }}
                />
                <span style={{ fontSize: 14, fontWeight: 500, color: "#E53E3E" }}>
                  Recording
                </span>
              </div>
            )}
            {status === "paused" && (
              <div className="flex items-center" style={{ gap: 6 }}>
                <div
                  className="rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: "#D69E2E",
                  }}
                />
                <span style={{ fontSize: 14, fontWeight: 500, color: "#D69E2E" }}>
                  Paused
                </span>
              </div>
            )}
            {status === "idle" && (
              <span style={{ fontSize: 14, fontWeight: 500, color: "#B5A99A" }}>
                Ready to record
              </span>
            )}
          </div>

          {/* Spacer */}
          <div className="shrink-0" style={{ height: 24 }} />

          {/* Controls */}
          <div className="shrink-0">
            <RecordingControls
              onStart={startRecording}
              onPause={pauseRecording}
              onResume={resumeRecording}
              onStop={handleStop}
              onDiscard={discardRecording}
            />
          </div>

          {/* Spacer */}
          <div className="shrink-0" style={{ height: 24 }} />

          {/* Error */}
          {error && (
            <div
              className="mx-6 rounded-lg p-3 text-sm shrink-0"
              style={{ backgroundColor: "#FFF0E6", color: "#E53E3E" }}
            >
              {error}
            </div>
          )}

          {/* Live Transcript */}
          <LiveTranscript transcriptId={transcriptId} />
        </>
      ) : (
        /* Upload File tab */
        <div className="flex-1 px-6" style={{ overflowY: "auto" }}>
          <FileUpload />
        </div>
      )}
    </div>
  );
}
