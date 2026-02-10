"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useFileUpload } from "@/app/lib/hooks/use-file-upload";

const ACCEPT_STRING =
  "audio/mpeg,.mp3,audio/wav,audio/x-wav,audio/wave,.wav,audio/mp4,audio/x-m4a,.m4a,audio/webm,.webm,audio/ogg,.ogg";

export function FileUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { status, progress, error, uploadFile, reset } = useFileUpload();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = "";

    const transcriptId = await uploadFile(file);
    if (transcriptId) {
      router.push(`/transcripts/${transcriptId}`);
    }
  };

  // Idle state - file picker area
  if (status === "idle") {
    return (
      <div style={{ padding: "24px 0" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_STRING}
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "48px 24px",
            borderRadius: 20,
            border: "2px dashed #D2B48C",
            backgroundColor: "#FFF9F0",
            cursor: "pointer",
            gap: 12,
          }}
        >
          {/* Upload icon */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #EDE6DD",
            }}
          >
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="#D4622B"
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
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A1A" }}>
            Select Audio File
          </span>
          <span style={{ fontSize: 13, color: "#8B7E74" }}>
            MP3, WAV, M4A, WebM -- Max 100MB
          </span>
        </button>
      </div>
    );
  }

  // Validating state - brief, shows like uploading at 0%
  if (status === "validating") {
    return (
      <div style={{ padding: "24px 0" }}>
        <div
          style={{
            padding: "32px 24px",
            borderRadius: 20,
            backgroundColor: "#FFFFFF",
            border: "1px solid #EDE6DD",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: "#8B7E74" }}>
            Checking file...
          </span>
        </div>
      </div>
    );
  }

  // Uploading state - progress bar
  if (status === "uploading") {
    return (
      <div style={{ padding: "24px 0" }}>
        <div
          style={{
            padding: "32px 24px",
            borderRadius: 20,
            backgroundColor: "#FFFFFF",
            border: "1px solid #EDE6DD",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Upload icon */}
          <svg
            width="24"
            height="24"
            fill="none"
            stroke="#D4622B"
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

          <span style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>
            Uploading...
          </span>

          {/* Progress bar */}
          <div style={{ width: "100%", maxWidth: 280 }}>
            <div
              style={{
                width: "100%",
                height: 8,
                borderRadius: 4,
                backgroundColor: "#EDE6DD",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  borderRadius: 4,
                  backgroundColor: "#D4622B",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
            <div
              style={{
                textAlign: "center",
                marginTop: 8,
                fontSize: 13,
                fontWeight: 600,
                color: "#D4622B",
              }}
            >
              {progress}%
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Processing state - spinner
  if (status === "processing") {
    return (
      <div style={{ padding: "24px 0" }}>
        <div
          style={{
            padding: "40px 24px",
            borderRadius: 20,
            backgroundColor: "#FFFFFF",
            border: "1px solid #EDE6DD",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Spinner */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "3px solid #EDE6DD",
              borderTopColor: "#D4622B",
              animation: "spin 1s linear infinite",
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#8B7E74" }}>
            Transcribing your file...
          </span>
          <span style={{ fontSize: 12, color: "#B5A99A" }}>
            This usually takes a few seconds
          </span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div style={{ padding: "24px 0" }}>
        <div
          style={{
            padding: "32px 24px",
            borderRadius: 20,
            backgroundColor: "#FFF0E6",
            border: "1px solid #F0D4BC",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Error icon */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #F0D4BC",
            }}
          >
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="#E53E3E"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round" />
              <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#E53E3E" }}>
            {error}
          </span>
          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              borderRadius: 12,
              backgroundColor: "#FFFFFF",
              color: "#D4622B",
              fontSize: 14,
              fontWeight: 600,
              border: "1px solid #D4622B",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Complete state (brief - user gets redirected)
  return null;
}
